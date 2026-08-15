import { triggersRepository, type EligibleRestockTarget } from './triggers.repository.js';
import { buildRestockOfferMessage } from './triggers.template.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { logger } from '../../core/logger/index.js';

export interface OutreachRunResult {
  targetDate: string;
  totalEligible: number;
  messagesSent: number;
  messagesFailed: number;
  details: Array<{
    storeName: string;
    phoneNumber: string;
    productName: string;
    suggestedQuantity: number;
    status: 'SENT' | 'FAILED';
    messageId?: string;
    error?: string;
  }>;
}

export class TriggersService {
  /**
   * Run automated restock outreach for eligible stores
   */
  async runOutreach(targetDate?: string): Promise<OutreachRunResult> {
    const date = targetDate || new Date().toISOString().split('T')[0]!;
    logger.info({ targetDate: date }, '🚀 Running Restock Outreach Worker...');

    const targets: EligibleRestockTarget[] = await triggersRepository.findEligibleTargets(date);

    const result: OutreachRunResult = {
      targetDate: date,
      totalEligible: targets.length,
      messagesSent: 0,
      messagesFailed: 0,
      details: [],
    };

    if (targets.length === 0) {
      logger.info('No eligible restock targets found for today');
      return result;
    }

    for (const target of targets) {
      const messageText = buildRestockOfferMessage({
        storeName: target.store_name,
        productName: target.product_name,
        bufferDays: target.buffer_days,
        suggestedQuantity: target.suggested_quantity,
        unit: target.unit,
        unitPrice: target.price,
      });

      // 1. Create PENDING trigger record
      const trigger = await triggersRepository.create({
        prediction_id: target.prediction_id,
        store_id: target.store_id,
        product_id: target.product_id,
        trigger_date: date,
        status: 'PENDING',
        message_payload: messageText,
      });

      try {
        // 2. Dispatch via WhatsApp Adapter
        const sendResult = await whatsappService.sendTextMessage({
          to: target.phone_number,
          text: messageText,
        });

        // 3. Mark trigger as SENT
        await triggersRepository.updateStatus(trigger.id, 'SENT', sendResult.messageId);

        result.messagesSent++;
        result.details.push({
          storeName: target.store_name,
          phoneNumber: target.phone_number,
          productName: target.product_name,
          suggestedQuantity: target.suggested_quantity,
          status: 'SENT',
          messageId: sendResult.messageId,
        });
      } catch (err) {
        logger.error({ err, store: target.store_name, phone: target.phone_number }, 'Failed to dispatch WhatsApp restock message');
        result.messagesFailed++;
        result.details.push({
          storeName: target.store_name,
          phoneNumber: target.phone_number,
          productName: target.product_name,
          suggestedQuantity: target.suggested_quantity,
          status: 'FAILED',
          error: (err as Error).message,
        });
      }
    }

    logger.info(
      {
        total: result.totalEligible,
        sent: result.messagesSent,
        failed: result.messagesFailed,
      },
      '✅ Restock Outreach Run finished'
    );

    return result;
  }
}

export const triggersService = new TriggersService();
