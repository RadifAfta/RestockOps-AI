import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { db } from '../../database/client.js';
import type {
  Database,
  NewRestockPrediction,
} from '../../database/schema/index.js';
import type { StoreProductPredictionRow } from './predictions.types.js';

export interface StoreProductHistoryRecord {
  store_id: string;
  product_id: string;
  invoice_date: string;
  quantity: number;
}

export class PredictionsRepository {
  constructor(private readonly client: Kysely<Database> = db) {}

  /**
   * Fetch historical purchase ledger grouped by store & product
   */
  async getPurchaseHistory(
    storeId?: string,
    productId?: string
  ): Promise<StoreProductHistoryRecord[]> {
    let query = this.client
      .selectFrom('invoices')
      .innerJoin('invoice_items', 'invoice_items.invoice_id', 'invoices.id')
      .select([
        'invoices.store_id',
        'invoice_items.product_id',
        sql<string>`to_char(invoices.invoice_date, 'YYYY-MM-DD')`.as('invoice_date'),
        'invoice_items.quantity',
      ]);

    if (storeId) {
      query = query.where('invoices.store_id', '=', storeId);
    }
    if (productId) {
      query = query.where('invoice_items.product_id', '=', productId);
    }

    const rows = await query
      .orderBy('invoices.store_id', 'asc')
      .orderBy('invoice_items.product_id', 'asc')
      .orderBy('invoices.invoice_date', 'asc')
      .execute();

    return rows.map((r) => ({
      store_id: r.store_id,
      product_id: r.product_id,
      invoice_date: r.invoice_date,
      quantity: Number(r.quantity),
    }));
  }

  /**
   * Batch Upsert Predictions into database
   */
  async upsertBatch(predictions: NewRestockPrediction[]): Promise<void> {
    if (predictions.length === 0) return;

    // PostgreSQL bulk insert with ON CONFLICT DO UPDATE
    for (const pred of predictions) {
      await this.client
        .insertInto('restock_predictions')
        .values(pred)
        .onConflict((oc) =>
          oc.columns(['store_id', 'product_id']).doUpdateSet({
            avg_cycle_days: pred.avg_cycle_days,
            last_purchase_date: pred.last_purchase_date,
            predicted_runout_date: pred.predicted_runout_date,
            buffer_days: pred.buffer_days,
            suggested_restock_date: pred.suggested_restock_date,
            suggested_quantity: pred.suggested_quantity,
            confidence_score: pred.confidence_score,
            total_transactions_analyzed: pred.total_transactions_analyzed,
            last_calculated_at: new Date(),
            updated_at: new Date(),
          })
        )
        .execute();
    }
  }

  /**
   * Find predictions due for restock on a given target date or up to a date
   */
  async findUpcomingRestocks(targetDate: string): Promise<StoreProductPredictionRow[]> {
    const rows = await this.client
      .selectFrom('restock_predictions')
      .innerJoin('stores', 'stores.id', 'restock_predictions.store_id')
      .innerJoin('products', 'products.id', 'restock_predictions.product_id')
      .select([
        'restock_predictions.store_id',
        'stores.name as store_name',
        'stores.phone_number',
        'restock_predictions.product_id',
        'products.name as product_name',
        'products.sku',
        'restock_predictions.avg_cycle_days',
        sql<string>`to_char(restock_predictions.last_purchase_date, 'YYYY-MM-DD')`.as('last_purchase_date'),
        sql<string>`to_char(restock_predictions.predicted_runout_date, 'YYYY-MM-DD')`.as('predicted_runout_date'),
        'restock_predictions.buffer_days',
        sql<string>`to_char(restock_predictions.suggested_restock_date, 'YYYY-MM-DD')`.as('suggested_restock_date'),
        'restock_predictions.suggested_quantity',
        'restock_predictions.confidence_score',
        'restock_predictions.total_transactions_analyzed',
        'restock_predictions.last_calculated_at',
      ])
      .where('restock_predictions.suggested_restock_date', '<=', targetDate)
      .where('stores.is_active', '=', true)
      .where('products.is_active', '=', true)
      .orderBy('restock_predictions.suggested_restock_date', 'asc')
      .execute();

    return rows.map((r) => ({
      ...r,
      avg_cycle_days: Number(r.avg_cycle_days),
      suggested_quantity: Number(r.suggested_quantity),
      confidence_score: Number(r.confidence_score),
    }));
  }

  /**
   * List all stored predictions
   */
  async listAll(limit = 100): Promise<StoreProductPredictionRow[]> {
    const rows = await this.client
      .selectFrom('restock_predictions')
      .innerJoin('stores', 'stores.id', 'restock_predictions.store_id')
      .innerJoin('products', 'products.id', 'restock_predictions.product_id')
      .select([
        'restock_predictions.store_id',
        'stores.name as store_name',
        'stores.phone_number',
        'restock_predictions.product_id',
        'products.name as product_name',
        'products.sku',
        'restock_predictions.avg_cycle_days',
        sql<string>`to_char(restock_predictions.last_purchase_date, 'YYYY-MM-DD')`.as('last_purchase_date'),
        sql<string>`to_char(restock_predictions.predicted_runout_date, 'YYYY-MM-DD')`.as('predicted_runout_date'),
        'restock_predictions.buffer_days',
        sql<string>`to_char(restock_predictions.suggested_restock_date, 'YYYY-MM-DD')`.as('suggested_restock_date'),
        'restock_predictions.suggested_quantity',
        'restock_predictions.confidence_score',
        'restock_predictions.total_transactions_analyzed',
        'restock_predictions.last_calculated_at',
      ])
      .orderBy('restock_predictions.suggested_restock_date', 'asc')
      .limit(limit)
      .execute();

    return rows.map((r) => ({
      ...r,
      avg_cycle_days: Number(r.avg_cycle_days),
      suggested_quantity: Number(r.suggested_quantity),
      confidence_score: Number(r.confidence_score),
    }));
  }
}

export const predictionsRepository = new PredictionsRepository();
