import type { FastifyPluginAsync } from 'fastify';
import { predictionsService } from './predictions.service.js';

export const predictionsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/predictions/recalculate
   */
  fastify.post<{
    Body: {
      storeId?: string;
      productId?: string;
      bufferDays?: number;
      defaultCycleDays?: number;
    };
  }>('/recalculate', async (request, reply) => {
    const { storeId, productId, bufferDays, defaultCycleDays } = request.body || {};

    const summary = await predictionsService.recalculateAll({
      storeId,
      productId,
      bufferDays,
      defaultCycleDays,
    });

    return reply.send({
      success: true,
      message: `Kalkulasi selesai untuk ${summary.totalPairsProcessed} pasangan toko-produk`,
      data: summary,
    });
  });

  /**
   * GET /api/v1/predictions/upcoming
   * Query: ?targetDate=YYYY-MM-DD
   */
  fastify.get<{ Querystring: { targetDate?: string } }>(
    '/upcoming',
    async (request, reply) => {
      const { targetDate } = request.query;
      const predictions = await predictionsService.getUpcomingRestocks(targetDate);

      return reply.send({
        success: true,
        count: predictions.length,
        data: predictions,
      });
    }
  );

  /**
   * GET /api/v1/predictions
   * Query: ?limit=100
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/',
    async (request, reply) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const predictions = await predictionsService.listAllPredictions(limit);

      return reply.send({
        success: true,
        count: predictions.length,
        data: predictions,
      });
    }
  );
};
