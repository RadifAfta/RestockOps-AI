import type {
  PredictionCalculationInput,
  PredictionCalculationResult,
  PurchaseHistoryPoint,
} from './predictions.types.js';

export class PredictionsCalculator {
  /**
   * Helper: Parse YYYY-MM-DD into UTC Date object
   */
  private parseUtcDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!));
  }

  /**
   * Helper: Format Date object into YYYY-MM-DD
   */
  private formatUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Add or subtract days from YYYY-MM-DD string
   */
  public addDays(dateStr: string, days: number): string {
    const date = this.parseUtcDate(dateStr);
    date.setUTCDate(date.getUTCDate() + days);
    return this.formatUtcDate(date);
  }

  /**
   * Helper: Difference in integer days between date2 and date1 (date2 - date1)
   */
  public diffDays(date1Str: string, date2Str: string): number {
    const d1 = this.parseUtcDate(date1Str);
    const d2 = this.parseUtcDate(date2Str);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
  }

  /**
   * Main calculation engine
   */
  public calculate(input: PredictionCalculationInput): PredictionCalculationResult {
    const {
      storeId,
      productId,
      history,
      bufferDays = 3,
      defaultCycleDays = 30,
    } = input;

    if (history.length === 0) {
      throw new Error('History cannot be empty for prediction calculation');
    }

    // 1. Sort points chronologically ascending
    const sortedHistory = [...history].sort((a, b) =>
      a.invoiceDate.localeCompare(b.invoiceDate)
    );

    // Group / deduplicate transactions on the exact same date
    const mergedMap = new Map<string, number>();
    for (const item of sortedHistory) {
      mergedMap.set(
        item.invoiceDate,
        (mergedMap.get(item.invoiceDate) || 0) + item.quantity
      );
    }

    const uniqueHistory: PurchaseHistoryPoint[] = Array.from(mergedMap.entries()).map(
      ([invoiceDate, quantity]) => ({
        invoiceDate,
        quantity,
      })
    );

    const totalTransactions = uniqueHistory.length;
    const lastItem = uniqueHistory[totalTransactions - 1]!;
    const lastPurchaseDate = lastItem.invoiceDate;

    // Calculate Average Quantity
    const totalQuantity = uniqueHistory.reduce((sum, item) => sum + item.quantity, 0);
    const avgQuantity = Number((totalQuantity / totalTransactions).toFixed(2));

    // Case 1: Only 1 transaction point available (Insufficient historical baseline)
    if (totalTransactions < 2) {
      const predictedRunoutDate = this.addDays(lastPurchaseDate, defaultCycleDays);
      const suggestedRestockDate = this.addDays(predictedRunoutDate, -bufferDays);

      return {
        storeId,
        productId,
        avgCycleDays: defaultCycleDays,
        lastPurchaseDate,
        predictedRunoutDate,
        bufferDays,
        suggestedRestockDate,
        suggestedQuantity: avgQuantity,
        confidenceScore: 0.3,
        totalTransactionsAnalyzed: totalTransactions,
        status: 'INSUFFICIENT_DATA',
      };
    }

    // Case 2: Multi-transaction history (n >= 2)
    const intervals: number[] = [];
    for (let i = 1; i < totalTransactions; i++) {
      const prevDate = uniqueHistory[i - 1]!.invoiceDate;
      const currDate = uniqueHistory[i]!.invoiceDate;
      const diff = this.diffDays(prevDate, currDate);
      if (diff > 0) {
        intervals.push(diff);
      }
    }

    // Fallback if all same-day or zero intervals
    if (intervals.length === 0) {
      const predictedRunoutDate = this.addDays(lastPurchaseDate, defaultCycleDays);
      const suggestedRestockDate = this.addDays(predictedRunoutDate, -bufferDays);

      return {
        storeId,
        productId,
        avgCycleDays: defaultCycleDays,
        lastPurchaseDate,
        predictedRunoutDate,
        bufferDays,
        suggestedRestockDate,
        suggestedQuantity: avgQuantity,
        confidenceScore: 0.3,
        totalTransactionsAnalyzed: totalTransactions,
        status: 'INSUFFICIENT_DATA',
      };
    }

    // Calculate Mean Interval
    const sumIntervals = intervals.reduce((sum, val) => sum + val, 0);
    const meanInterval = sumIntervals / intervals.length;
    const roundedAvgCycleDays = Number(meanInterval.toFixed(2));

    // Calculate Variance & Standard Deviation
    let variance = 0;
    if (intervals.length > 1) {
      const sumSquaredDiffs = intervals.reduce(
        (sum, val) => sum + Math.pow(val - meanInterval, 2),
        0
      );
      variance = sumSquaredDiffs / (intervals.length - 1);
    }
    const stdDev = Math.sqrt(variance);
    const cv = meanInterval > 0 ? stdDev / meanInterval : 1.0; // Coefficient of Variation

    // Calculate Confidence Score
    // Base formula: 0.40 + 0.10 * count - 0.20 * CV
    const countBonus = Math.min(0.5, (totalTransactions - 2) * 0.1);
    const cvPenalty = Math.min(0.4, cv * 0.2);
    let confidence = 0.5 + countBonus - cvPenalty;
    confidence = Math.max(0.3, Math.min(1.0, confidence));
    const roundedConfidence = Number(confidence.toFixed(2));

    const status =
      roundedConfidence >= 0.75
        ? 'OPTIMAL'
        : roundedConfidence >= 0.5
        ? 'MODERATE'
        : 'INSUFFICIENT_DATA';

    // Calculate predicted runout and restock dates
    const cycleDaysRounded = Math.max(1, Math.round(meanInterval));
    const predictedRunoutDate = this.addDays(lastPurchaseDate, cycleDaysRounded);
    const suggestedRestockDate = this.addDays(predictedRunoutDate, -bufferDays);

    return {
      storeId,
      productId,
      avgCycleDays: roundedAvgCycleDays,
      lastPurchaseDate,
      predictedRunoutDate,
      bufferDays,
      suggestedRestockDate,
      suggestedQuantity: avgQuantity,
      confidenceScore: roundedConfidence,
      totalTransactionsAnalyzed: totalTransactions,
      status,
    };
  }
}

export const predictionsCalculator = new PredictionsCalculator();
