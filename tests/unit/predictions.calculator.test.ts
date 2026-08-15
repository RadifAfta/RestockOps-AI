import { describe, it, expect } from 'vitest';
import { predictionsCalculator } from '../../src/modules/predictions/predictions.calculator.js';

describe('PredictionsCalculator', () => {
  it('should handle single transaction with fallback default cycle and INSUFFICIENT_DATA status', () => {
    const result = predictionsCalculator.calculate({
      storeId: 'store-1',
      productId: 'prod-1',
      history: [{ invoiceDate: '2026-01-10', quantity: 15 }],
      bufferDays: 3,
      defaultCycleDays: 30,
    });

    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.avgCycleDays).toBe(30);
    expect(result.lastPurchaseDate).toBe('2026-01-10');
    expect(result.predictedRunoutDate).toBe('2026-02-09');
    expect(result.suggestedRestockDate).toBe('2026-02-06');
    expect(result.suggestedQuantity).toBe(15);
    expect(result.confidenceScore).toBe(0.3);
  });

  it('should calculate accurate cycle, runout date, and restock date for 2 transactions', () => {
    const result = predictionsCalculator.calculate({
      storeId: 'store-1',
      productId: 'prod-1',
      history: [
        { invoiceDate: '2026-01-01', quantity: 20 },
        { invoiceDate: '2026-01-15', quantity: 20 }, // 14 days interval
      ],
      bufferDays: 3,
    });

    expect(result.avgCycleDays).toBe(14);
    expect(result.lastPurchaseDate).toBe('2026-01-15');
    expect(result.predictedRunoutDate).toBe('2026-01-29');
    expect(result.suggestedRestockDate).toBe('2026-01-26'); // 29 Jan - 3 days = 26 Jan
    expect(result.suggestedQuantity).toBe(20);
    expect(result.totalTransactionsAnalyzed).toBe(2);
  });

  it('should compute high confidence score for multiple consistent interval purchases', () => {
    const result = predictionsCalculator.calculate({
      storeId: 'store-1',
      productId: 'prod-1',
      history: [
        { invoiceDate: '2026-01-01', quantity: 10 },
        { invoiceDate: '2026-01-11', quantity: 12 }, // +10 days
        { invoiceDate: '2026-01-21', quantity: 10 }, // +10 days
        { invoiceDate: '2026-01-31', quantity: 14 }, // +10 days
        { invoiceDate: '2026-02-10', quantity: 10 }, // +10 days
      ],
      bufferDays: 2,
    });

    expect(result.avgCycleDays).toBe(10);
    expect(result.lastPurchaseDate).toBe('2026-02-10');
    expect(result.predictedRunoutDate).toBe('2026-02-20');
    expect(result.suggestedRestockDate).toBe('2026-02-18');
    expect(result.suggestedQuantity).toBe(11.2);
    expect(result.status).toBe('OPTIMAL');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
  });

  it('should correctly merge multiple transactions on the exact same date', () => {
    const result = predictionsCalculator.calculate({
      storeId: 'store-1',
      productId: 'prod-1',
      history: [
        { invoiceDate: '2026-01-01', quantity: 5 },
        { invoiceDate: '2026-01-01', quantity: 10 }, // same day -> total 15
        { invoiceDate: '2026-01-11', quantity: 15 },
      ],
      bufferDays: 3,
    });

    expect(result.totalTransactionsAnalyzed).toBe(2);
    expect(result.avgCycleDays).toBe(10);
    expect(result.suggestedQuantity).toBe(15);
  });
});
