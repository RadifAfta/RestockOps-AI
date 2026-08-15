import type { FastifyPluginAsync } from 'fastify';
import { triggersService } from './triggers.service.js';
import { triggersRepository } from './triggers.repository.js';
import type { RestockTriggerStatus } from '../../database/schema/index.js';

export const triggersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/triggers/run-outreach
   * Body: { targetDate?: string }
   */
  fastify.post<{ Body: { targetDate?: string } }>(
    '/run-outreach',
    async (request, reply) => {
      const { targetDate } = request.body || {};
      const result = await triggersService.runOutreach(targetDate);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * GET /api/v1/triggers
   * Query: ?status=PENDING|SENT|RESPONDED&limit=100
   */
  fastify.get<{ Querystring: { status?: RestockTriggerStatus; limit?: string } }>(
    '/',
    async (request, reply) => {
      const { status } = request.query;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const list = await triggersRepository.list(status, limit);
      return reply.send({
        success: true,
        count: list.length,
        data: list,
      });
    }
  );
};
