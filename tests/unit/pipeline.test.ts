import { describe, it, expect, vi } from 'vitest';
import { DraftPOService } from '../../src/modules/draft-pos/draft-pos.service.js';
import { draftPORepository } from '../../src/modules/draft-pos/draft-pos.repository.js';
import { productsRepository } from '../../src/modules/products/products.repository.js';
import { triggersRepository } from '../../src/modules/triggers/triggers.repository.js';
import type { ParsedOrderIntent } from '../../src/modules/ai-parser/ai-parser.schema.js';

describe('DraftPOService (Pipeline Verification)', () => {
  const service = new DraftPOService();

  it('should generate draft PO with line items and update trigger status when intent is CONFIRM / MODIFY_QTY', async () => {
    // Mock productsRepository
    vi.spyOn(productsRepository, 'findBySku').mockImplementation(async (sku: string) => {
      if (sku === 'SKU-KOPI-01') {
        return {
          id: 'prod-uuid-1',
          sku: 'SKU-KOPI-01',
          name: 'Kopi Arabika 250g',
          category: 'Beverage',
          unit: 'pcs',
          price: 45000,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      return undefined;
    });

    // Mock draftPORepository
    vi.spyOn(draftPORepository, 'createWithItems').mockImplementation(async (params) => {
      return {
        draftPO: {
          id: 'po-uuid-1',
          store_id: params.draftPO.store_id,
          trigger_id: params.draftPO.trigger_id || null,
          po_number: params.draftPO.po_number,
          status: 'DRAFT',
          total_amount: params.draftPO.total_amount,
          raw_ai_transcript: params.draftPO.raw_ai_transcript || null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        items: params.items.map((item, idx) => ({
          id: `item-uuid-${idx}`,
          draft_po_id: 'po-uuid-1',
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          created_at: new Date(),
        })),
      };
    });

    // Mock triggersRepository
    const updateTriggerSpy = vi
      .spyOn(triggersRepository, 'updateStatus')
      .mockImplementation(async () => undefined);

    const parsedIntent: ParsedOrderIntent = {
      intent: 'MODIFY_QTY',
      summary: 'Toko mengubah jumlah pesanan menjadi 30 pcs.',
      items: [
        {
          matchedSku: 'SKU-KOPI-01',
          productName: 'Kopi Arabika 250g',
          quantity: 30,
          unit: 'pcs',
          unitPrice: 45000,
          action: 'MODIFIED',
        },
      ],
      customerNotes: 'Kirim sebelum siang',
    };

    const result = await service.createFromParsedIntent({
      storeId: 'store-uuid-1',
      triggerId: 'trigger-uuid-1',
      parsedIntent,
      rawTranscript: 'Boleh, tapi kirim 30 pcs aja ya jangan 20',
    });

    expect(result.draftPO).toBeDefined();
    expect(result.draftPO?.po_number).toMatch(/^PO-\d{8}-[A-Z0-9]{4}$/);
    expect(result.draftPO?.total_amount).toBe(1350000); // 30 * 45,000 = 1,350,000
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0]?.quantity).toBe(30);
    expect(updateTriggerSpy).toHaveBeenCalledWith('trigger-uuid-1', 'RESPONDED');
  });

  it('should not create draft PO if customer REJECTS the offer', async () => {
    const updateTriggerSpy = vi
      .spyOn(triggersRepository, 'updateStatus')
      .mockImplementation(async () => undefined);

    const parsedIntent: ParsedOrderIntent = {
      intent: 'REJECT',
      summary: 'Toko menolak penawaran karena stok masih banyak.',
      items: [],
    };

    const result = await service.createFromParsedIntent({
      storeId: 'store-uuid-1',
      triggerId: 'trigger-uuid-2',
      parsedIntent,
      rawTranscript: 'Stok masih banyak mas, belum perlu dulu',
    });

    expect(result.draftPO).toBeUndefined();
    expect(result.intent).toBe('REJECT');
    expect(updateTriggerSpy).toHaveBeenCalledWith('trigger-uuid-2', 'RESPONDED');
  });
});
