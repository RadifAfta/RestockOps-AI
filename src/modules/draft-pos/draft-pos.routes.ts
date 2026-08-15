import type { FastifyPluginAsync } from 'fastify';
import { draftPORepository } from './draft-pos.repository.js';
import type { DraftPOStatus } from '../../database/schema/index.js';
import { BadRequestError, NotFoundError } from '../../core/errors/app-error.js';

export const draftPORoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/draft-pos
   * Query: ?status=DRAFT|APPROVED|REJECTED&limit=100
   */
  fastify.get<{ Querystring: { status?: DraftPOStatus; limit?: string } }>(
    '/',
    async (request, reply) => {
      const { status } = request.query;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const list = await draftPORepository.list(status, limit);
      return reply.send({
        success: true,
        count: list.length,
        data: list,
      });
    }
  );

  /**
   * GET /api/v1/draft-pos/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const details = await draftPORepository.getDetails(id);

      if (!details) {
        throw new NotFoundError(`Draft PO dengan ID ${id} tidak ditemukan`);
      }

      return reply.send({
        success: true,
        data: details,
      });
    }
  );

  /**
   * PATCH /api/v1/draft-pos/:id/status
   * Body: { status: 'APPROVED' | 'REJECTED' | 'CONVERTED' }
   */
  fastify.patch<{
    Params: { id: string };
    Body: { status: DraftPOStatus };
  }>('/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body || {};

    const validStatuses: DraftPOStatus[] = ['DRAFT', 'APPROVED', 'REJECTED', 'CONVERTED'];
    if (!status || !validStatuses.includes(status)) {
      throw new BadRequestError(
        `Status tidak valid. Pilihan status: ${validStatuses.join(', ')}`
      );
    }

    const updated = await draftPORepository.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundError(`Draft PO dengan ID ${id} tidak ditemukan`);
    }

    return reply.send({
      success: true,
      message: `Status Draft PO berhasil diubah menjadi ${status}`,
      data: updated,
    });
  });
};
