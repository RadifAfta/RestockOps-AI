import type {
  IWhatsAppAdapter,
  SendMessageOptions,
  SendMessageResult,
  SentMessageLog,
} from './whatsapp.types.js';
import { logger } from '../../core/logger/index.js';

export class MockWhatsAppAdapter implements IWhatsAppAdapter {
  private logs: SentMessageLog[] = [];

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const messageId = `wamid.MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const logEntry: SentMessageLog = {
      messageId,
      to: options.to,
      text: options.text,
      contextMessageId: options.contextMessageId,
      sentAt: new Date(),
    };

    this.logs.push(logEntry);

    logger.info(
      {
        to: options.to,
        messageId,
        preview: options.text.length > 80 ? `${options.text.substring(0, 80)}...` : options.text,
      },
      '📱 [Mock WhatsApp Outbox] Message sent successfully'
    );

    return {
      success: true,
      messageId,
    };
  }

  getSentLogs(): SentMessageLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const mockWhatsAppAdapter = new MockWhatsAppAdapter();
