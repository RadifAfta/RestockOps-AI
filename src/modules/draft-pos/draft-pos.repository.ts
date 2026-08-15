import type { Kysely } from 'kysely';
import { db } from '../../database/client.js';
import type {
  Database,
  DraftPO,
  NewDraftPO,
  DraftPOItem,
  NewDraftPOItem,
  DraftPOStatus,
} from '../../database/schema/index.js';

export interface CreateDraftPOParams {
  draftPO: NewDraftPO;
  items: Omit<NewDraftPOItem, 'draft_po_id'>[];
}

export class DraftPORepository {
  constructor(private readonly client: Kysely<Database> = db) {}

  async createWithItems(params: CreateDraftPOParams): Promise<{
    draftPO: DraftPO;
    items: DraftPOItem[];
  }> {
    return this.client.transaction().execute(async (trx) => {
      const createdPO = await trx
        .insertInto('draft_pos')
        .values(params.draftPO)
        .returningAll()
        .executeTakeFirstOrThrow();

      if (params.items.length === 0) {
        return {
          draftPO: createdPO,
          items: [],
        };
      }

      const itemsToInsert: NewDraftPOItem[] = params.items.map((item) => ({
        ...item,
        draft_po_id: createdPO.id,
      }));

      const createdItems = await trx
        .insertInto('draft_po_items')
        .values(itemsToInsert)
        .returningAll()
        .execute();

      return {
        draftPO: createdPO,
        items: createdItems,
      };
    });
  }

  async findById(id: string): Promise<DraftPO | undefined> {
    return this.client
      .selectFrom('draft_pos')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async getDetails(id: string) {
    const po = await this.client
      .selectFrom('draft_pos')
      .innerJoin('stores', 'stores.id', 'draft_pos.store_id')
      .select([
        'draft_pos.id',
        'draft_pos.po_number',
        'draft_pos.store_id',
        'stores.name as store_name',
        'stores.phone_number as store_phone',
        'draft_pos.trigger_id',
        'draft_pos.status',
        'draft_pos.total_amount',
        'draft_pos.raw_ai_transcript',
        'draft_pos.created_at',
        'draft_pos.updated_at',
      ])
      .where('draft_pos.id', '=', id)
      .executeTakeFirst();

    if (!po) return null;

    const items = await this.client
      .selectFrom('draft_po_items')
      .innerJoin('products', 'products.id', 'draft_po_items.product_id')
      .select([
        'draft_po_items.id',
        'draft_po_items.quantity',
        'draft_po_items.unit_price',
        'draft_po_items.subtotal',
        'products.sku',
        'products.name as product_name',
        'products.unit',
      ])
      .where('draft_po_items.draft_po_id', '=', id)
      .execute();

    return {
      ...po,
      total_amount: Number(po.total_amount),
      items: items.map((it) => ({
        ...it,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        subtotal: Number(it.subtotal),
      })),
    };
  }

  async list(status?: DraftPOStatus, limit = 100) {
    let query = this.client
      .selectFrom('draft_pos')
      .innerJoin('stores', 'stores.id', 'draft_pos.store_id')
      .select([
        'draft_pos.id',
        'draft_pos.po_number',
        'draft_pos.store_id',
        'stores.name as store_name',
        'stores.phone_number as store_phone',
        'draft_pos.status',
        'draft_pos.total_amount',
        'draft_pos.created_at',
        'draft_pos.updated_at',
      ]);

    if (status) {
      query = query.where('draft_pos.status', '=', status);
    }

    const rows = await query.orderBy('draft_pos.created_at', 'desc').limit(limit).execute();

    return rows.map((r) => ({
      ...r,
      total_amount: Number(r.total_amount),
    }));
  }

  async updateStatus(id: string, status: DraftPOStatus): Promise<DraftPO | undefined> {
    return this.client
      .updateTable('draft_pos')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }
}

export const draftPORepository = new DraftPORepository();
