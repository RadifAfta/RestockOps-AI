import type {
  IWhatsAppAdapter,
  MetaWebhookPayload,
  NormalizedInboundMessage,
  SendMessageOptions,
  SendMessageResult,
} from './whatsapp.types.js';
import { mockWhatsAppAdapter } from './mock.adapter.js';
import { metaCloudWhatsAppAdapter } from './meta.adapter.js';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger/index.js';

export class WhatsAppService {
  private adapter: IWhatsAppAdapter;

  constructor() {
    if (config.WA_ADAPTER === 'meta') {
      this.adapter = metaCloudWhatsAppAdapter;
      logger.info('WhatsApp Service initialized with Meta Cloud API Adapter');
    } else {
      this.adapter = mockWhatsAppAdapter;
      logger.info('WhatsApp Service initialized with Mock Adapter (Local Testing)');
    }
  }

  getAdapter(): IWhatsAppAdapter {
    return this.adapter;
  }

  setAdapter(adapter: IWhatsAppAdapter) {
    this.adapter = adapter;
  }

  async sendTextMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    return this.adapter.sendMessage(options);
  }

  /**
   * Extract and normalize inbound text messages from Meta Webhook payload
   */
  extractInboundMessages(payload: MetaWebhookPayload): NormalizedInboundMessage[] {
    const messages: NormalizedInboundMessage[] = [];

    if (!payload.entry || !Array.isArray(payload.entry)) {
      return messages;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !value.messages || !Array.isArray(value.messages)) {
          continue;
        }

        const contactsMap = new Map<string, string>();
        for (const contact of value.contacts || []) {
          contactsMap.set(contact.wa_id, contact.profile.name);
        }

        for (const msg of value.messages) {
          if (msg.type === 'text' && msg.text?.body) {
            messages.push({
              messageId: msg.id,
              from: msg.from,
              senderName: contactsMap.get(msg.from),
              text: msg.text.body,
              timestamp: msg.timestamp,
              contextMessageId: msg.context?.id,
            });
          }
        }
      }
    }

    return messages;
  }
}

export const whatsappService = new WhatsAppService();
