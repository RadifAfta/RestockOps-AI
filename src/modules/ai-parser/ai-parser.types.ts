import type { ParsedOrderIntent } from './ai-parser.schema.js';

export interface CatalogProductItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  price: number;
}

export interface OriginalRestockOfferContext {
  productSku: string;
  productName: string;
  suggestedQuantity: number;
  unit: string;
  unitPrice: number;
}

export interface ParseOrderContext {
  storeName: string;
  phoneNumber: string;
  customerReplyText: string;
  originalOffer?: OriginalRestockOfferContext;
  catalog: CatalogProductItem[];
}

export interface ILLMProvider {
  extractOrderIntent(context: ParseOrderContext): Promise<ParsedOrderIntent>;
}
