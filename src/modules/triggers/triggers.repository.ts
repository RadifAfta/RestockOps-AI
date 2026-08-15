import { sql, type Kysely, type SqlBool } from 'kysely';
import { db } from '../../database/client.js';
import type {
  Database,
  RestockTrigger,
  NewRestockTrigger,
  RestockTriggerStatus,
} from '../../database/schema/index.js';

export interface EligibleRestockTarget {
  prediction_id: string;
  store_id: string;
  store_name: string;
  phone_number: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  price: number;
  suggested_quantity: number;
  buffer_days: number;
  suggested_restock_date: string;
}

export class TriggersRepository {
  constructor(private readonly client: Kysely<Database> = db) {}

  /**
   * Find eligible predictions for outreach that do NOT have an active trigger sent in the last cooldown hours
   */
  async findEligibleTargets(targetDate: string, cooldownHours = 48): Promise<EligibleRestockTarget[]> {
    const rows = await this.client
      .selectFrom('restock_predictions')
      .innerJoin('stores', 'stores.id', 'restock_predictions.store_id')
      .innerJoin('products', 'products.id', 'restock_predictions.product_id')
      .select([
        'restock_predictions.id as prediction_id',
        'restock_predictions.store_id',
        'stores.name as store_name',
        'stores.phone_number',
        'restock_predictions.product_id',
        'products.name as product_name',
        'products.sku',
        'products.unit',
        'products.price',
        'restock_predictions.suggested_quantity',
        'restock_predictions.buffer_days',
        sql<string>`to_char(restock_predictions.suggested_restock_date, 'YYYY-MM-DD')`.as('suggested_restock_date'),
      ])
      .where('restock_predictions.suggested_restock_date', '<=', targetDate)
      .where('stores.is_active', '=', true)
      .where('products.is_active', '=', true)
      .where((eb) =>
        eb.not(
          eb.exists(
            this.client
              .selectFrom('restock_triggers')
              .select('id')
              .where(sql<SqlBool>`restock_triggers.store_id = restock_predictions.store_id`)
              .where(sql<SqlBool>`restock_triggers.product_id = restock_predictions.product_id`)
              .where('restock_triggers.status', 'in', ['PENDING', 'SENT'])
              .where(
                'restock_triggers.created_at',
                '>=',
                sql<Date>`NOW() - (${cooldownHours} || ' hours')::interval`
              )
          )
        )
      )
      .orderBy('restock_predictions.suggested_restock_date', 'asc')
      .execute();

    return rows.map((r) => ({
      ...r,
      price: Number(r.price),
      suggested_quantity: Number(r.suggested_quantity),
    }));
  }

  async create(data: NewRestockTrigger): Promise<RestockTrigger> {
    return this.client
      .insertInto('restock_triggers')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateStatus(
    id: string,
    status: RestockTriggerStatus,
    waMessageId?: string
  ): Promise<RestockTrigger | undefined> {
    return this.client
      .updateTable('restock_triggers')
      .set({
        status,
        ...(waMessageId ? { wa_message_id: waMessageId } : {}),
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Find most recent active (SENT) trigger for a store
   */
  async findActiveTriggerByStoreId(storeId: string): Promise<
    | (RestockTrigger & {
        product_name: string;
        sku: string;
        unit: string;
        price: number;
        suggested_quantity: number;
      })
    | undefined
  > {
    const row = await this.client
      .selectFrom('restock_triggers')
      .innerJoin('products', 'products.id', 'restock_triggers.product_id')
      .innerJoin('restock_predictions', 'restock_predictions.id', 'restock_triggers.prediction_id')
      .select([
        'restock_triggers.id',
        'restock_triggers.prediction_id',
        'restock_triggers.store_id',
        'restock_triggers.product_id',
        'restock_triggers.trigger_date',
        'restock_triggers.status',
        'restock_triggers.message_payload',
        'restock_triggers.wa_message_id',
        'restock_triggers.created_at',
        'restock_triggers.updated_at',
        'products.name as product_name',
        'products.sku',
        'products.unit',
        'products.price',
        'restock_predictions.suggested_quantity',
      ])
      .where('restock_triggers.store_id', '=', storeId)
      .where('restock_triggers.status', '=', 'SENT')
      .orderBy('restock_triggers.created_at', 'desc')
      .executeTakeFirst();

    if (!row) return undefined;

    return {
      ...row,
      price: Number(row.price),
      suggested_quantity: Number(row.suggested_quantity),
    };
  }

  async list(status?: RestockTriggerStatus, limit = 100): Promise<RestockTrigger[]> {
    let query = this.client.selectFrom('restock_triggers').selectAll();
    if (status) {
      query = query.where('status', '=', status);
    }
    return query.orderBy('created_at', 'desc').limit(limit).execute();
  }
}

export const triggersRepository = new TriggersRepository();
