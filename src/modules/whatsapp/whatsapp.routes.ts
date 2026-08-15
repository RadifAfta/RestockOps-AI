import type { FastifyPluginAsync } from 'fastify';
import { whatsappService } from './whatsapp.service.js';
import { storesRepository } from '../stores/stores.repository.js';
import { productsRepository } from '../products/products.repository.js';
import { triggersRepository } from '../triggers/triggers.repository.js';
import { aiParserService } from '../ai-parser/ai-parser.service.js';
import { draftPOService } from '../draft-pos/draft-pos.service.js';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger/index.js';
import type { MetaWebhookPayload } from './whatsapp.types.js';

export const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/whatsapp/webhook
   * Verification endpoint required by Meta WhatsApp Cloud API
   */
  fastify.get<{
    Querystring: {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };
  }>('/webhook', async (request, reply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.WA_VERIFY_TOKEN) {
      logger.info('Meta WhatsApp Webhook verified successfully');
      return reply.code(200).send(challenge);
    }

    logger.warn({ mode, token }, 'Unauthorized WhatsApp webhook verification attempt');
    return reply.code(403).send('Forbidden');
  });

  /**
   * POST /api/v1/whatsapp/webhook
   * Inbound message event receiver from Meta Cloud API
   */
  fastify.post<{ Body: MetaWebhookPayload }>('/webhook', async (request, reply) => {
    // Immediately respond 200 OK to WhatsApp server
    reply.code(200).send({ status: 'EVENT_RECEIVED' });

    const inboundMessages = whatsappService.extractInboundMessages(request.body);

    for (const msg of inboundMessages) {
      try {
        await processInboundMessage(msg.from, msg.text, msg.contextMessageId);
      } catch (err) {
        logger.error({ err, from: msg.from }, 'Error processing inbound webhook message');
      }
    }
  });

  /**
   * POST /api/v1/whatsapp/simulator/inbound
   * Simulator endpoint to test customer replies locally
   */
  fastify.post<{
    Body: {
      from: string;
      text: string;
      contextMessageId?: string;
    };
  }>('/simulator/inbound', async (request, reply) => {
    const { from, text, contextMessageId } = request.body || {};

    if (!from || !text) {
      return reply.code(400).send({
        success: false,
        message: 'Field "from" (nomor HP) dan "text" (isi pesan chat) wajib diisi',
      });
    }

    const processResult = await processInboundMessage(from, text, contextMessageId);

    return reply.send({
      success: true,
      message: 'Simulasi pesan masuk berhasil diproses',
      data: processResult,
    });
  });

  /**
   * GET /api/v1/whatsapp/mock/outbox
   * View recent mock messages sent
   */
  fastify.get('/mock/outbox', async (_request, reply) => {
    const logs = whatsappService.getAdapter().getSentLogs();
    return reply.send({
      success: true,
      count: logs.length,
      data: logs,
    });
  });
};

/**
 * Shared Inbound Message Processor (Webhook & Simulator)
 */
export async function processInboundMessage(
  fromPhoneNumber: string,
  chatText: string,
  _contextMessageId?: string
) {
  logger.info({ from: fromPhoneNumber, chatText }, '📩 Processing incoming WhatsApp message');

  // 1. Resolve Store
  const store = await storesRepository.findByPhoneNumber(fromPhoneNumber);
  if (!store) {
    logger.warn({ from: fromPhoneNumber }, 'Incoming message from unknown store number');
    return {
      handled: false,
      reason: 'Store not registered',
    };
  }

  // 2. Resolve Active Trigger and Master Products
  const activeTrigger = await triggersRepository.findActiveTriggerByStoreId(store.id);
  const catalogProducts = await productsRepository.listActive();

  const originalOffer = activeTrigger
    ? {
        productSku: activeTrigger.sku,
        productName: activeTrigger.product_name,
        suggestedQuantity: activeTrigger.suggested_quantity,
        unit: activeTrigger.unit,
        unitPrice: activeTrigger.price,
      }
    : undefined;

  // 3. Extract Order Intent with AI Parser
  const parsedIntent = await aiParserService.parseCustomerReply({
    storeName: store.name,
    phoneNumber: store.phone_number,
    customerReplyText: chatText,
    originalOffer,
    catalog: catalogProducts.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: Number(p.price),
    })),
  });

  // 4. Create Draft PO if intent has items
  const draftResult = await draftPOService.createFromParsedIntent({
    storeId: store.id,
    triggerId: activeTrigger?.id,
    parsedIntent,
    rawTranscript: chatText,
  });

  // 5. Send automated confirmation reply
  let autoReplyText = '';
  if (draftResult.draftPO) {
    autoReplyText =
      `Terima kasih *${store.name}*! 🙏\n\n` +
      `Pesanan restock Anda telah dicatat dalam *Draft PO #${draftResult.draftPO.po_number}* ` +
      `(Total: Rp ${draftResult.draftPO.total_amount.toLocaleString('id-ID')}).\n\n` +
      `Tim kami akan segera memverifikasi dan memproses pengiriman ke lokasi Anda. 🚚`;
  } else if (parsedIntent.intent === 'REJECT') {
    autoReplyText =
      `Baik *${store.name}*, terima kasih atas konfirmasinya! Kami akan jadwalkan kembali saat mendekati jadwal restock Anda berikutnya. 🙏`;
  } else {
    autoReplyText =
      `Terima kasih pesannya *${store.name}*! Tim sales kami akan segera menindaklanjuti pesan Anda. 🙏`;
  }

  await whatsappService.sendTextMessage({
    to: store.phone_number,
    text: autoReplyText,
  });

  return {
    handled: true,
    store: { id: store.id, name: store.name, phone: store.phone_number },
    activeTriggerId: activeTrigger?.id,
    aiIntent: parsedIntent,
    draftPO: draftResult.draftPO,
    replySent: autoReplyText,
  };
}
