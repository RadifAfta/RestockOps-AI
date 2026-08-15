import { predictionsCalculator } from './predictions.calculator.js';
import { predictionsRepository } from './predictions.repository.js';
import type {
  PredictionCalculationResult,
  PurchaseHistoryPoint,
  StoreProductPredictionRow,
} from './predictions.types.js';
import type { NewRestockPrediction } from '../../database/schema/index.js';
import { logger } from '../../core/logger/index.js';

export interface RecalculationOptions {
  storeId?: string;
  productId?: string;
  bufferDays?: number;
  defaultCycleDays?: number;
}

export interface RecalculationSummary {
  totalPairsProcessed: number;
  optimalPredictions: number;
  moderatePredictions: number;
  insufficientDataPredictions: number;
  results: PredictionCalculationResult[];
}

export class PredictionsService {
  /**
   * Recalculate restock predictions from raw historical transactions
   */
  async recalculateAll(options: RecalculationOptions = {}): Promise<RecalculationSummary> {
    const { storeId, productId, bufferDays = 3, defaultCycleDays = 30 } = options;

    logger.info({ storeId, productId }, 'Starting restock prediction recalculation...');

    const historyRecords = await predictionsRepository.getPurchaseHistory(storeId, productId);

    if (historyRecords.length === 0) {
      logger.warn('No purchase history found for calculation');
      return {
        totalPairsProcessed: 0,
        optimalPredictions: 0,
        moderatePredictions: 0,
        insufficientDataPredictions: 0,
        results: [],
      };
    }

    // Group history points by store_id and product_id
    const pairMap = new Map<string, PurchaseHistoryPoint[]>();

    for (const rec of historyRecords) {
      const key = `${rec.store_id}:::${rec.product_id}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, []);
      }
      pairMap.get(key)!.push({
        invoiceDate: rec.invoice_date,
        quantity: rec.quantity,
      });
    }

    const calculatedResults: PredictionCalculationResult[] = [];
    const dbPayloads: NewRestockPrediction[] = [];

    let optimalCount = 0;
    let moderateCount = 0;
    let insufficientCount = 0;

    for (const [key, history] of pairMap.entries()) {
      const [sId, pId] = key.split(':::') as [string, string];

      try {
        const result = predictionsCalculator.calculate({
          storeId: sId,
          productId: pId,
          history,
          bufferDays,
          defaultCycleDays,
        });

        calculatedResults.push(result);

        if (result.status === 'OPTIMAL') optimalCount++;
        else if (result.status === 'MODERATE') moderateCount++;
        else insufficientCount++;

        dbPayloads.push({
          store_id: result.storeId,
          product_id: result.productId,
          avg_cycle_days: result.avgCycleDays,
          last_purchase_date: result.lastPurchaseDate,
          predicted_runout_date: result.predictedRunoutDate,
          buffer_days: result.bufferDays,
          suggested_restock_date: result.suggestedRestockDate,
          suggested_quantity: result.suggestedQuantity,
          confidence_score: result.confidenceScore,
          total_transactions_analyzed: result.totalTransactionsAnalyzed,
          last_calculated_at: new Date(),
        });
      } catch (err) {
        logger.error({ err, storeId: sId, productId: pId }, 'Failed to calculate prediction for pair');
      }
    }

    // Persist all predictions to DB
    await predictionsRepository.upsertBatch(dbPayloads);

    logger.info(
      {
        totalPairs: calculatedResults.length,
        optimal: optimalCount,
        moderate: moderateCount,
        insufficient: insufficientCount,
      },
      'Restock prediction recalculation completed successfully'
    );

    return {
      totalPairsProcessed: calculatedResults.length,
      optimalPredictions: optimalCount,
      moderatePredictions: moderateCount,
      insufficientDataPredictions: insufficientCount,
      results: calculatedResults,
    };
  }

  /**
   * Get list of restocks due on or before a target date
   */
  async getUpcomingRestocks(targetDate?: string): Promise<StoreProductPredictionRow[]> {
    const date = targetDate || new Date().toISOString().split('T')[0]!;
    return predictionsRepository.findUpcomingRestocks(date);
  }

  /**
   * List all current predictions
   */
  async listAllPredictions(limit = 100): Promise<StoreProductPredictionRow[]> {
    return predictionsRepository.listAll(limit);
  }
}

export const predictionsService = new PredictionsService();
