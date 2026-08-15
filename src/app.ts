import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { AppError } from './core/errors/app-error.js';
import { invoicesRoutes } from './modules/invoices/invoices.routes.js';
import { predictionsRoutes } from './modules/predictions/predictions.routes.js';
import { triggersRoutes } from './modules/triggers/triggers.routes.js';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes.js';
import { draftPORoutes } from './modules/draft-pos/draft-pos.routes.js';
import { logger } from './core/logger/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Managed custom via pino
    bodyLimit: 10 * 1024 * 1024, // 10MB limit
  });

  // Global Middlewares
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(sensible);

  // Health Check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'RestockOps AI Backend',
      timestamp: new Date().toISOString(),
    };
  });

  // Register API Routes
  await app.register(invoicesRoutes, { prefix: '/api/v1/invoices' });
  await app.register(predictionsRoutes, { prefix: '/api/v1/predictions' });
  await app.register(triggersRoutes, { prefix: '/api/v1/triggers' });
  await app.register(whatsappRoutes, { prefix: '/api/v1/whatsapp' });
  await app.register(draftPORoutes, { prefix: '/api/v1/draft-pos' });

  // Global Error Handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
        details: error.details,
      });
    }

    // Fastify Validation Errors
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }

    logger.error({ err: error }, 'Unhandled Server Exception');
    return reply.code(500).send({
      success: false,
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan internal pada server.',
    });
  });

  return app;
}
