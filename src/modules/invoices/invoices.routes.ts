import type { FastifyPluginAsync } from 'fastify';
import { invoicesService } from './invoices.service.js';
import { invoicesRepository } from './invoices.repository.js';
import { BadRequestError } from '../../core/errors/app-error.js';

export const invoicesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/invoices/ingest-csv
   * Body: { csvContent: string }
   */
  fastify.post<{ Body: { csvContent: string } }>(
    '/ingest-csv',
    async (request, reply) => {
      const { csvContent } = request.body || {};

      if (!csvContent || typeof csvContent !== 'string') {
        throw new BadRequestError('Field "csvContent" berupa teks CSV wajib disertakan');
      }

      const result = await invoicesService.ingestCsv(csvContent);

      return reply.code(200).send({
        success: true,
        message: `Berhasil memproses ${result.totalRowsProcessed} baris CSV`,
        data: result,
      });
    }
  );

  /**
   * GET /api/v1/invoices/store/:storeId
   */
  fastify.get<{ Params: { storeId: string } }>(
    '/store/:storeId',
    async (request, reply) => {
      const { storeId } = request.params;
      const invoices = await invoicesRepository.listByStoreId(storeId);
      return reply.send({
        success: true,
        data: invoices,
      });
    }
  );

  /**
   * GET /api/v1/invoices/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const invoice = await invoicesRepository.getInvoiceDetails(id);

      if (!invoice) {
        return reply.code(404).send({
          success: false,
          message: 'Faktur tidak ditemukan',
        });
      }

      return reply.send({
        success: true,
        data: invoice,
      });
    }
  );
};
