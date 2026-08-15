import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
  stores: StoreTable;
  products: ProductTable;
  invoices: InvoiceTable;
  invoice_items: InvoiceItemTable;
  restock_predictions: RestockPredictionTable;
  restock_triggers: RestockTriggerTable;
  draft_pos: DraftPOTable;
  draft_po_items: DraftPOItemTable;
}

// ================= STORES =================
export interface StoreTable {
  id: Generated<string>;
  name: string;
  phone_number: string;
  address: string | null;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Store = Selectable<StoreTable>;
export type NewStore = Insertable<StoreTable>;
export type StoreUpdate = Updateable<StoreTable>;

// ================= PRODUCTS =================
export interface ProductTable {
  id: Generated<string>;
  sku: string;
  name: string;
  category: string | null;
  unit: Generated<string>;
  price: ColumnType<number, number | string, number | string>;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Product = Selectable<ProductTable>;
export type NewProduct = Insertable<ProductTable>;
export type ProductUpdate = Updateable<ProductTable>;

// ================= INVOICES =================
export interface InvoiceTable {
  id: Generated<string>;
  store_id: string;
  invoice_number: string;
  invoice_date: ColumnType<string, string | Date, string | Date>;
  total_amount: ColumnType<number, number | string, number | string>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Invoice = Selectable<InvoiceTable>;
export type NewInvoice = Insertable<InvoiceTable>;
export type InvoiceUpdate = Updateable<InvoiceTable>;

// ================= INVOICE ITEMS =================
export interface InvoiceItemTable {
  id: Generated<string>;
  invoice_id: string;
  product_id: string;
  quantity: ColumnType<number, number | string, number | string>;
  unit_price: ColumnType<number, number | string, number | string>;
  subtotal: ColumnType<number, number | string, number | string>;
  created_at: Generated<Date>;
}

export type InvoiceItem = Selectable<InvoiceItemTable>;
export type NewInvoiceItem = Insertable<InvoiceItemTable>;
export type InvoiceItemUpdate = Updateable<InvoiceItemTable>;

// ================= RESTOCK PREDICTIONS =================
export interface RestockPredictionTable {
  id: Generated<string>;
  store_id: string;
  product_id: string;
  avg_cycle_days: ColumnType<number, number | string, number | string>;
  last_purchase_date: ColumnType<string, string | Date, string | Date>;
  predicted_runout_date: ColumnType<string, string | Date, string | Date>;
  buffer_days: Generated<number>;
  suggested_restock_date: ColumnType<string, string | Date, string | Date>;
  suggested_quantity: ColumnType<number, number | string, number | string>;
  confidence_score: ColumnType<number, number | string, number | string>;
  total_transactions_analyzed: Generated<number>;
  last_calculated_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type RestockPrediction = Selectable<RestockPredictionTable>;
export type NewRestockPrediction = Insertable<RestockPredictionTable>;
export type RestockPredictionUpdate = Updateable<RestockPredictionTable>;

// ================= RESTOCK TRIGGERS =================
export type RestockTriggerStatus = 'PENDING' | 'SENT' | 'RESPONDED' | 'EXPIRED' | 'CANCELLED';

export interface RestockTriggerTable {
  id: Generated<string>;
  prediction_id: string | null;
  store_id: string;
  product_id: string;
  trigger_date: ColumnType<string, string | Date, string | Date>;
  status: Generated<RestockTriggerStatus>;
  message_payload: string | null;
  wa_message_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type RestockTrigger = Selectable<RestockTriggerTable>;
export type NewRestockTrigger = Insertable<RestockTriggerTable>;
export type RestockTriggerUpdate = Updateable<RestockTriggerTable>;

// ================= DRAFT PURCHASE ORDERS =================
export type DraftPOStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface DraftPOTable {
  id: Generated<string>;
  store_id: string;
  trigger_id: string | null;
  po_number: string;
  status: Generated<DraftPOStatus>;
  total_amount: ColumnType<number, number | string, number | string>;
  raw_ai_transcript: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type DraftPO = Selectable<DraftPOTable>;
export type NewDraftPO = Insertable<DraftPOTable>;
export type DraftPOUpdate = Updateable<DraftPOTable>;

// ================= DRAFT PO ITEMS =================
export interface DraftPOItemTable {
  id: Generated<string>;
  draft_po_id: string;
  product_id: string;
  quantity: ColumnType<number, number | string, number | string>;
  unit_price: ColumnType<number, number | string, number | string>;
  subtotal: ColumnType<number, number | string, number | string>;
  created_at: Generated<Date>;
}

export type DraftPOItem = Selectable<DraftPOItemTable>;
export type NewDraftPOItem = Insertable<DraftPOItemTable>;
export type DraftPOItemUpdate = Updateable<DraftPOItemTable>;
