import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger/index.js';
import { parsedOrderIntentSchema, type ParsedOrderIntent, type OrderItemIntent } from './ai-parser.schema.js';
import type { ILLMProvider, ParseOrderContext } from './ai-parser.types.js';

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY || 'dummy-key',
    });
  }

  async extractOrderIntent(context: ParseOrderContext): Promise<ParsedOrderIntent> {
    const catalogString = context.catalog
      .map(
        (p) => `- SKU: "${p.sku}", Nama: "${p.name}", Satuan: "${p.unit}", Harga: Rp ${p.price}`
      )
      .join('\n');

    const offerString = context.originalOffer
      ? `Produk: ${context.originalOffer.productName} (SKU: ${context.originalOffer.productSku}), Saran Kuantitas: ${context.originalOffer.suggestedQuantity} ${context.originalOffer.unit}, Harga: Rp ${context.originalOffer.unitPrice}`
      : 'Tidak ada penawaran awal aktif.';

    const systemPrompt = `Anda adalah asisten AI parser pemesanan B2B untuk RestockOps AI.
Tugas Anda adalah mengekstrak maksud pesanan (intent) dari pesan balasan chat WhatsApp toko/retailer, lalu memetakan pesanan ke katalog produk master.

Katalog Produk Master yang Tersedia:
${catalogString}

Penawaran Restock Awal yang Dikirim ke Toko:
${offerString}

Aturan Penentuan Intent:
1. "CONFIRM": Customer menyetujui penawaran awal tanpa mengubah jumlah (ambil data dari penawaran awal, action: "ORIGINAL").
2. "MODIFY_QTY": Customer setuju tetapi mengubah kuantitas barang yang ditawarkan (action: "MODIFIED").
3. "ADD_ITEM": Customer meminta barang tambahan selain atau bersama penawaran (action: "ADDED" untuk barang baru, "ORIGINAL"/"MODIFIED" untuk barang tawaran).
4. "REJECT": Customer menolak penawaran (misal: "stok masih banyak", "belum dulu", "jangan kirim"). Items harus [].
5. "INQUIRY_ONLY": Customer hanya bertanya (harga, ongkir, stok, dll). Items harus [].
6. "UNKNOWN": Pesan tidak dapat dipahami atau tidak relevan. Items harus [].

Format Output WAJIB berupa JSON murni sesuai skema berikut:
{
  "intent": "CONFIRM" | "MODIFY_QTY" | "ADD_ITEM" | "REJECT" | "INQUIRY_ONLY" | "UNKNOWN",
  "summary": "Ringkasan maksud customer...",
  "items": [
    {
      "matchedSku": "SKU...",
      "productName": "Nama...",
      "quantity": 10,
      "unit": "pcs",
      "unitPrice": 15000,
      "action": "ORIGINAL" | "MODIFIED" | "ADDED"
    }
  ],
  "customerNotes": "catatan..."
}`;

    const userPrompt = `Pesan Balasan dari Toko "${context.storeName}" (${context.phoneNumber}):
"${context.customerReplyText}"

Ekstrak intent dan rincian pesanan sekarang dalam JSON valid.`;

    const response = await this.client.chat.completions.create({
      model: config.OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const rawJson = JSON.parse(content);
    return parsedOrderIntentSchema.parse(rawJson);
  }
}

export class RuleBasedMockAIProvider implements ILLMProvider {
  async extractOrderIntent(context: ParseOrderContext): Promise<ParsedOrderIntent> {
    const text = context.customerReplyText.toLowerCase().trim();
    const offer = context.originalOffer;

    logger.debug({ text, store: context.storeName }, '🤖 [RuleBasedMockAI] Parsing customer chat');

    // 1. Check if message has explicit affirmative action keywords (e.g. "kirim", "order", "pesan", "boleh", "siap", "oke")
    const isAffirmative = ['kirim', 'order', 'pesan', 'boleh', 'siap', 'oke', 'ya', 'deal', 'ambil'].some(
      (kw) => text.includes(kw)
    );

    // 2. Check REJECT (only if not an affirmative order or explicit full rejection phrase)
    const rejectPhrases = [
      'belum dulu',
      'tidak perlu',
      'tidak usah',
      'nggak usah',
      'gk usah',
      'masih banyak',
      'masih ada',
      'jangan kirim',
      'skip dulu',
      'nanti aja',
      'tolak',
      'belum butuh',
    ];
    const isPureReject =
      rejectPhrases.some((kw) => text.includes(kw)) ||
      (!isAffirmative && ['belum', 'tidak', 'nggak', 'tdk', 'gk', 'jangan'].some((kw) => text.includes(kw)));

    if (isPureReject) {
      return {
        intent: 'REJECT',
        summary: `Toko menolak penawaran restock karena stok masih ada atau belum butuh.`,
        items: [],
      };
    }

    // 2. Check INQUIRY
    const inquiryKeywords = ['berapa', 'kapan', 'apakah', 'ongkir', 'diskon', 'price list', 'tanya'];
    if (inquiryKeywords.some((kw) => text.includes(kw)) && !text.includes('kirim') && !text.includes('order')) {
      return {
        intent: 'INQUIRY_ONLY',
        summary: `Toko menanyakan informasi lebih lanjut.`,
        items: [],
      };
    }

    const items: OrderItemIntent[] = [];
    let intent: ParsedOrderIntent['intent'] = 'CONFIRM';

    // 3. Detect quantities and additions
    const hasAddKeyword = ['tambah', 'sama', 'plus', 'sekalian', 'juga'].some((kw) => text.includes(kw));

    // Check if modifying offer quantity (e.g. "kirim 25 pcs", "jadi 30 aja")
    const numbersInText = text.match(/\b\d+(\.\d+)?\b/g);

    if (offer) {
      let qty = offer.suggestedQuantity;
      let action: OrderItemIntent['action'] = 'ORIGINAL';

      if (numbersInText && numbersInText.length > 0) {
        const parsedFirstNum = parseFloat(numbersInText[0]!);
        if (parsedFirstNum !== offer.suggestedQuantity) {
          qty = parsedFirstNum;
          action = 'MODIFIED';
          intent = 'MODIFY_QTY';
        }
      }

      items.push({
        matchedSku: offer.productSku,
        productName: offer.productName,
        quantity: qty,
        unit: offer.unit,
        unitPrice: offer.unitPrice,
        action,
      });
    }

    // Check if adding other catalog items
    if (hasAddKeyword) {
      for (const prod of context.catalog) {
        // Don't match the original offer product again as addition
        if (offer && prod.sku === offer.productSku) continue;

        const prodNameLower = prod.name.toLowerCase();
        const words = prodNameLower.split(/\s+/);
        const matchesProduct = words.some((w) => w.length > 3 && text.includes(w));

        if (matchesProduct) {
          // Look for quantity near product or default to 5
          let addedQty = 5;
          if (numbersInText && numbersInText.length > 1) {
            addedQty = parseFloat(numbersInText[1]!);
          }

          items.push({
            matchedSku: prod.sku,
            productName: prod.name,
            quantity: addedQty,
            unit: prod.unit,
            unitPrice: prod.price,
            action: 'ADDED',
          });
          intent = 'ADD_ITEM';
        }
      }
    }

    return {
      intent,
      summary: `Toko mengonfirmasi pesanan (${intent}) dengan total ${items.length} item.`,
      items,
    };
  }
}
