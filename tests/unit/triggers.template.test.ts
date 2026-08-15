import { describe, it, expect } from 'vitest';
import { buildRestockOfferMessage } from '../../src/modules/triggers/triggers.template.js';

describe('TriggersTemplate', () => {
  it('should format a polite personalized Indonesian restock offer message', () => {
    const msg = buildRestockOfferMessage({
      storeName: 'Toko Berkah Sejahtera',
      productName: 'Kopi Arabika 250g',
      bufferDays: 3,
      suggestedQuantity: 24,
      unit: 'pcs',
      unitPrice: 45000,
    });

    expect(msg).toContain('Toko Berkah Sejahtera');
    expect(msg).toContain('Kopi Arabika 250g');
    expect(msg).toContain('3 hari ke depan');
    expect(msg).toContain('24 pcs');
    expect(msg).toContain('Rp 45.000/pcs');
    expect(msg).toContain('konfirmasi');
  });
});
