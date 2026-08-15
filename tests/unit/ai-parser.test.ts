import { describe, it, expect } from 'vitest';
import { RuleBasedMockAIProvider } from '../../src/modules/ai-parser/ai-parser.provider.js';
import type { ParseOrderContext } from '../../src/modules/ai-parser/ai-parser.types.js';

describe('AI Order Parser (RuleBasedMockAIProvider)', () => {
  const provider = new RuleBasedMockAIProvider();

  const baseCatalog = [
    { id: 'p1', sku: 'SKU-KOPI-01', name: 'Kopi Arabika 250g', category: 'Beverage', unit: 'pcs', price: 45000 },
    { id: 'p2', sku: 'SKU-SUSU-02', name: 'Susu UHT Full Cream 1L', category: 'Dairy', unit: 'box', price: 18000 },
    { id: 'p3', sku: 'SKU-GULA-03', name: 'Gula Pasir 1kg', category: 'Staple', unit: 'kg', price: 17500 },
  ];

  const baseOffer = {
    productSku: 'SKU-KOPI-01',
    productName: 'Kopi Arabika 250g',
    suggestedQuantity: 20,
    unit: 'pcs',
    unitPrice: 45000,
  };

  it('should parse CONFIRM intent when customer accepts offer as is', async () => {
    const context: ParseOrderContext = {
      storeName: 'Toko Berkah',
      phoneNumber: '6281234567890',
      customerReplyText: 'Siap kirim ya mas seperti biasa, makasih',
      originalOffer: baseOffer,
      catalog: baseCatalog,
    };

    const result = await provider.extractOrderIntent(context);

    expect(result.intent).toBe('CONFIRM');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.matchedSku).toBe('SKU-KOPI-01');
    expect(result.items[0]?.quantity).toBe(20);
    expect(result.items[0]?.action).toBe('ORIGINAL');
  });

  it('should parse MODIFY_QTY intent when customer changes offer quantity', async () => {
    const context: ParseOrderContext = {
      storeName: 'Toko Berkah',
      phoneNumber: '6281234567890',
      customerReplyText: 'Boleh, tapi kirim 30 pcs aja ya jangan 20',
      originalOffer: baseOffer,
      catalog: baseCatalog,
    };

    const result = await provider.extractOrderIntent(context);

    expect(result.intent).toBe('MODIFY_QTY');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.matchedSku).toBe('SKU-KOPI-01');
    expect(result.items[0]?.quantity).toBe(30);
    expect(result.items[0]?.action).toBe('MODIFIED');
  });

  it('should parse ADD_ITEM intent when customer adds other catalog products', async () => {
    const context: ParseOrderContext = {
      storeName: 'Toko Berkah',
      phoneNumber: '6281234567890',
      customerReplyText: 'Boleh kirim 20 kopi, sama tambah Susu UHT 10 box ya',
      originalOffer: baseOffer,
      catalog: baseCatalog,
    };

    const result = await provider.extractOrderIntent(context);

    expect(result.intent).toBe('ADD_ITEM');
    expect(result.items.length).toBeGreaterThanOrEqual(2);

    const kopiItem = result.items.find((i) => i.matchedSku === 'SKU-KOPI-01');
    const susuItem = result.items.find((i) => i.matchedSku === 'SKU-SUSU-02');

    expect(kopiItem).toBeDefined();
    expect(kopiItem?.quantity).toBe(20);
    expect(susuItem).toBeDefined();
    expect(susuItem?.action).toBe('ADDED');
  });

  it('should parse REJECT intent when customer declines restock', async () => {
    const context: ParseOrderContext = {
      storeName: 'Toko Berkah',
      phoneNumber: '6281234567890',
      customerReplyText: 'Stok masih banyak mas, belum perlu restock dulu ya',
      originalOffer: baseOffer,
      catalog: baseCatalog,
    };

    const result = await provider.extractOrderIntent(context);

    expect(result.intent).toBe('REJECT');
    expect(result.items).toHaveLength(0);
  });

  it('should parse INQUIRY_ONLY intent when customer only asks questions', async () => {
    const context: ParseOrderContext = {
      storeName: 'Toko Berkah',
      phoneNumber: '6281234567890',
      customerReplyText: 'Berapa harga per pcs nya sekarang ya mas?',
      originalOffer: baseOffer,
      catalog: baseCatalog,
    };

    const result = await provider.extractOrderIntent(context);

    expect(result.intent).toBe('INQUIRY_ONLY');
    expect(result.items).toHaveLength(0);
  });
});
