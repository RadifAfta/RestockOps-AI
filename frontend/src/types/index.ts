export type DraftPOStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface DraftPOListItem {
  id: string;
  po_number: string;
  store_id: string;
  store_name: string;
  store_phone: string;
  status: DraftPOStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DraftPOItemDetail {
  id: string;
  sku: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface DraftPODetail extends DraftPOListItem {
  trigger_id: string | null;
  raw_ai_transcript: string | null;
  items: DraftPOItemDetail[];
}

export interface RestockPredictionItem {
  store_id: string;
  store_name: string;
  phone_number: string;
  product_id: string;
  product_name: string;
  sku: string;
  avg_cycle_days: number;
  last_purchase_date: string;
  predicted_runout_date: string;
  buffer_days: number;
  suggested_restock_date: string;
  suggested_quantity: number;
  confidence_score: number;
  total_transactions_analyzed: number;
  last_calculated_at: string;
}

export interface IngestionResult {
  totalRowsProcessed: number;
  successfulRows: number;
  failedRows: number;
  storesCreatedOrResolved: number;
  productsCreatedOrResolved: number;
  invoicesCreated: number;
  invoicesSkippedDuplicate: number;
  itemsCreated: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
}
