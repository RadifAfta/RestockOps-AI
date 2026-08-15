export interface SendMessageOptions {
  to: string;
  text: string;
  contextMessageId?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId: string;
}

export interface SentMessageLog {
  messageId: string;
  to: string;
  text: string;
  contextMessageId?: string;
  sentAt: Date;
}

export interface IWhatsAppAdapter {
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
  getSentLogs(): SentMessageLog[];
  clearLogs(): void;
}

// Meta Webhook Inbound Interfaces
export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
          context?: {
            id: string;
            from: string;
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface NormalizedInboundMessage {
  messageId: string;
  from: string;
  senderName?: string;
  text: string;
  timestamp: string;
  contextMessageId?: string;
}
