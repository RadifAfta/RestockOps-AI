export interface PurchaseHistoryPoint {
  invoiceDate: string; // YYYY-MM-DD
  quantity: number;
}

export interface PredictionCalculationInput {
  storeId: string;
  productId: string;
  history: PurchaseHistoryPoint[];
  bufferDays?: number;
  defaultCycleDays?: number;
}

export interface PredictionCalculationResult {
  storeId: string;
  productId: string;
  avgCycleDays: number;
  lastPurchaseDate: string;
  predictedRunoutDate: string;
  bufferDays: number;
  suggestedRestockDate: string;
  suggestedQuantity: number;
  confidenceScore: number;
  totalTransactionsAnalyzed: number;
  status: 'OPTIMAL' | 'MODERATE' | 'INSUFFICIENT_DATA';
}

export interface StoreProductPredictionRow {
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
  last_calculated_at: Date;
}
