import { describe, it, expect, beforeEach } from 'vitest';
import { WhatsAppService } from '../../src/modules/whatsapp/whatsapp.service.js';
import { MockWhatsAppAdapter } from '../../src/modules/whatsapp/mock.adapter.js';
import type { MetaWebhookPayload } from '../../src/modules/whatsapp/whatsapp.types.js';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let mockAdapter: MockWhatsAppAdapter;

  beforeEach(() => {
    service = new WhatsAppService();
    mockAdapter = new MockWhatsAppAdapter();
    service.setAdapter(mockAdapter);
  });

  it('should send messages and record them in mock outbox logs', async () => {
    const res = await service.sendTextMessage({
      to: '6281234567890',
      text: 'Halo ini pesan tes restock',
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toContain('wamid.MOCK_');

    const logs = mockAdapter.getSentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.to).toBe('6281234567890');
    expect(logs[0]?.text).toBe('Halo ini pesan tes restock');
  });

  it('should extract inbound text messages from standard Meta webhook payload structure', () => {
    const payload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '62800000000',
                  phone_number_id: '999999',
                },
                contacts: [{ profile: { name: 'Pak Budi' }, wa_id: '6281234567890' }],
                messages: [
                  {
                    from: '6281234567890',
                    id: 'wamid.HBgLMjA=',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Siap kirim 20 pcs ya mas' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const extracted = service.extractInboundMessages(payload);
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.from).toBe('6281234567890');
    expect(extracted[0]?.senderName).toBe('Pak Budi');
    expect(extracted[0]?.text).toBe('Siap kirim 20 pcs ya mas');
  });
});
