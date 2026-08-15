import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Enable UUID Extension if not available
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`.execute(db);

  // 2. STORES TABLE
  await db.schema
    .createTable('stores')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('phone_number', 'varchar(30)', (col) => col.unique().notNull())
    .addColumn('address', 'text')
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  // 3. PRODUCTS TABLE
  await db.schema
    .createTable('products')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('sku', 'varchar(100)', (col) => col.unique().notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('category', 'varchar(100)')
    .addColumn('unit', 'varchar(50)', (col) => col.notNull().defaultTo('pcs'))
    .addColumn('price', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  // 4. INVOICES TABLE
  await db.schema
    .createTable('invoices')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('store_id', 'uuid', (col) => col.references('stores.id').onDelete('cascade').notNull())
    .addColumn('invoice_number', 'varchar(100)', (col) => col.notNull())
    .addColumn('invoice_date', 'date', (col) => col.notNull())
    .addColumn('total_amount', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('unique_store_invoice_number', ['store_id', 'invoice_number'])
    .execute();

  // 5. INVOICE ITEMS TABLE
  await db.schema
    .createTable('invoice_items')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('invoice_id', 'uuid', (col) => col.references('invoices.id').onDelete('cascade').notNull())
    .addColumn('product_id', 'uuid', (col) => col.references('products.id').onDelete('restrict').notNull())
    .addColumn('quantity', 'numeric(12, 2)', (col) => col.notNull())
    .addColumn('unit_price', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('subtotal', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  // 6. RESTOCK PREDICTIONS TABLE
  await db.schema
    .createTable('restock_predictions')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('store_id', 'uuid', (col) => col.references('stores.id').onDelete('cascade').notNull())
    .addColumn('product_id', 'uuid', (col) => col.references('products.id').onDelete('cascade').notNull())
    .addColumn('avg_cycle_days', 'numeric(6, 2)', (col) => col.notNull())
    .addColumn('last_purchase_date', 'date', (col) => col.notNull())
    .addColumn('predicted_runout_date', 'date', (col) => col.notNull())
    .addColumn('buffer_days', 'integer', (col) => col.notNull().defaultTo(3))
    .addColumn('suggested_restock_date', 'date', (col) => col.notNull())
    .addColumn('suggested_quantity', 'numeric(12, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('confidence_score', 'numeric(3, 2)', (col) => col.notNull().defaultTo(1.0))
    .addColumn('total_transactions_analyzed', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('last_calculated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('unique_store_product_prediction', ['store_id', 'product_id'])
    .execute();

  // 7. RESTOCK TRIGGERS TABLE
  await db.schema
    .createTable('restock_triggers')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('prediction_id', 'uuid', (col) => col.references('restock_predictions.id').onDelete('set null'))
    .addColumn('store_id', 'uuid', (col) => col.references('stores.id').onDelete('cascade').notNull())
    .addColumn('product_id', 'uuid', (col) => col.references('products.id').onDelete('cascade').notNull())
    .addColumn('trigger_date', 'date', (col) => col.notNull())
    .addColumn('status', 'varchar(50)', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('message_payload', 'text')
    .addColumn('wa_message_id', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  // 8. DRAFT PURCHASE ORDERS TABLE
  await db.schema
    .createTable('draft_pos')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('store_id', 'uuid', (col) => col.references('stores.id').onDelete('cascade').notNull())
    .addColumn('trigger_id', 'uuid', (col) => col.references('restock_triggers.id').onDelete('set null'))
    .addColumn('po_number', 'varchar(100)', (col) => col.unique().notNull())
    .addColumn('status', 'varchar(50)', (col) => col.notNull().defaultTo('DRAFT'))
    .addColumn('total_amount', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('raw_ai_transcript', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  // 9. DRAFT PO ITEMS TABLE
  await db.schema
    .createTable('draft_po_items')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('draft_po_id', 'uuid', (col) => col.references('draft_pos.id').onDelete('cascade').notNull())
    .addColumn('product_id', 'uuid', (col) => col.references('products.id').onDelete('restrict').notNull())
    .addColumn('quantity', 'numeric(12, 2)', (col) => col.notNull())
    .addColumn('unit_price', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('subtotal', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  // 10. INDEXES FOR HIGH QUERY PERFORMANCE
  await db.schema
    .createIndex('idx_invoices_store_date')
    .ifNotExists()
    .on('invoices')
    .columns(['store_id', 'invoice_date'])
    .execute();

  await db.schema
    .createIndex('idx_invoice_items_invoice_id')
    .ifNotExists()
    .on('invoice_items')
    .column('invoice_id')
    .execute();

  await db.schema
    .createIndex('idx_invoice_items_product_id')
    .ifNotExists()
    .on('invoice_items')
    .column('product_id')
    .execute();

  await db.schema
    .createIndex('idx_restock_predictions_lookup')
    .ifNotExists()
    .on('restock_predictions')
    .columns(['suggested_restock_date', 'store_id'])
    .execute();

  await db.schema
    .createIndex('idx_restock_triggers_date_status')
    .ifNotExists()
    .on('restock_triggers')
    .columns(['trigger_date', 'status'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('draft_po_items').ifExists().execute();
  await db.schema.dropTable('draft_pos').ifExists().execute();
  await db.schema.dropTable('restock_triggers').ifExists().execute();
  await db.schema.dropTable('restock_predictions').ifExists().execute();
  await db.schema.dropTable('invoice_items').ifExists().execute();
  await db.schema.dropTable('invoices').ifExists().execute();
  await db.schema.dropTable('products').ifExists().execute();
  await db.schema.dropTable('stores').ifExists().execute();
}
