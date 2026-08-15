import type {
  IWhatsAppAdapter,
  SendMessageOptions,
  SendMessageResult,
  SentMessageLog,
} from './whatsapp.types.js';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger/index.js';
import { AppError } from '../../core/errors/app-error.js';

export class MetaCloudWhatsAppAdapter implements IWhatsAppAdapter {
  private logs: SentMessageLog[] = [];

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    if (!config.WA_PHONE_NUMBER_ID || !config.WA_ACCESS_TOKEN) {
      throw new AppError(
        'Meta WhatsApp credentials (WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN) are missing in environment configuration',
        500
      );
    }

    const url = `https://graph.facebook.com/v20.0/${config.WA_PHONE_NUMBER_ID}/messages`;

    // Clean recipient phone number
    const recipient = options.to.replace(/[^0-9]/g, '');

    const bodyPayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        preview_url: false,
        body: options.text,
      },
    };

    if (options.contextMessageId) {
      bodyPayload['context'] = {
        message_id: options.contextMessageId,
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code: number };
      };

      if (!response.ok || !data.messages?.[0]?.id) {
        logger.error({ error: data.error, status: response.status }, 'Meta Cloud API error sending message');
        throw new AppError(`Meta Cloud API error: ${data.error?.message || 'Unknown error'}`, 502);
      }

      const messageId = data.messages[0].id;

      this.logs.push({
        messageId,
        to: options.to,
        text: options.text,
        contextMessageId: options.contextMessageId,
        sentAt: new Date(),
      });

      return {
        success: true,
        messageId,
      };
    } catch (err) {
      logger.error({ err, to: options.to }, 'Failed to send WhatsApp message via Meta Cloud API');
      throw err;
    }
  }

  getSentLogs(): SentMessageLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const metaCloudWhatsAppAdapter = new MetaCloudWhatsAppAdapter();
