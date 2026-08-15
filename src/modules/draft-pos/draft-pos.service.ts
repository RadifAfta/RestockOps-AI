import { draftPORepository } from './draft-pos.repository.js';
import { productsRepository } from '../products/products.repository.js';
import { triggersRepository } from '../triggers/triggers.repository.js';
import type { ParsedOrderIntent } from '../ai-parser/ai-parser.schema.js';
import type { DraftPO, DraftPOItem } from '../../database/schema/index.js';
import { logger } from '../../core/logger/index.js';

export interface CreateFromIntentParams {
  storeId: string;
  triggerId?: string;
  parsedIntent: ParsedOrderIntent;
  rawTranscript: string;
}

export interface CreateFromIntentResult {
  draftPO?: DraftPO;
  items?: DraftPOItem[];
  intent: ParsedOrderIntent['intent'];
  summary: string;
  message: string;
}

export class DraftPOService {
  private generatePONumber(): string {
    const today = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PO-${today}-${rand}`;
  }

  async createFromParsedIntent(params: CreateFromIntentParams): Promise<CreateFromIntentResult> {
    const { storeId, triggerId, parsedIntent, rawTranscript } = params;

    // If customer rejected or is just inquiring
    if (parsedIntent.intent === 'REJECT' || parsedIntent.intent === 'INQUIRY_ONLY' || parsedIntent.intent === 'UNKNOWN') {
      if (triggerId) {
        await triggersRepository.updateStatus(triggerId, 'RESPONDED');
      }
      return {
        intent: parsedIntent.intent,
        summary: parsedIntent.summary,
        message: `Pesan customer diproses sebagai ${parsedIntent.intent}. Tidak ada Draft PO yang dibuat.`,
      };
    }

    if (parsedIntent.items.length === 0) {
      if (triggerId) {
        await triggersRepository.updateStatus(triggerId, 'RESPONDED');
      }
      return {
        intent: parsedIntent.intent,
        summary: parsedIntent.summary,
        message: 'Tidak ada item produk terdeteksi dalam pesanan.',
      };
    }

    // Resolve products from database
    const lineItemsToCreate: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }> = [];

    for (const item of parsedIntent.items) {
      const product = await productsRepository.findBySku(item.matchedSku);
      if (!product) {
        logger.warn({ sku: item.matchedSku }, 'Product SKU from AI intent not found in master catalog, skipping');
        continue;
      }

      const unitPrice = item.unitPrice || Number(product.price);
      const subtotal = Number((item.quantity * unitPrice).toFixed(2));

      lineItemsToCreate.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal,
      });
    }

    if (lineItemsToCreate.length === 0) {
      return {
        intent: parsedIntent.intent,
        summary: parsedIntent.summary,
        message: 'Gagal mencocokkan produk ke katalog master.',
      };
    }

    const totalAmount = lineItemsToCreate.reduce((sum, it) => sum + it.subtotal, 0);
    const poNumber = this.generatePONumber();

    const created = await draftPORepository.createWithItems({
      draftPO: {
        store_id: storeId,
        trigger_id: triggerId || null,
        po_number: poNumber,
        status: 'DRAFT',
        total_amount: Number(totalAmount.toFixed(2)),
        raw_ai_transcript: JSON.stringify({
          summary: parsedIntent.summary,
          customerNotes: parsedIntent.customerNotes,
          rawChat: rawTranscript,
        }),
      },
      items: lineItemsToCreate,
    });

    if (triggerId) {
      await triggersRepository.updateStatus(triggerId, 'RESPONDED');
    }

    logger.info(
      {
        poNumber,
        storeId,
        totalAmount,
        itemCount: created.items.length,
      },
      '📝 Draft PO created successfully from AI Intent'
    );

    return {
      draftPO: created.draftPO,
      items: created.items,
      intent: parsedIntent.intent,
      summary: parsedIntent.summary,
      message: `Draft PO ${poNumber} berhasil dibuat dengan ${created.items.length} item.`,
    };
  }
}

export const draftPOService = new DraftPOService();
