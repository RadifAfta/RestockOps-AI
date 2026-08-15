import { z } from 'zod';

export const orderItemSchema = z.object({
  matchedSku: z.string().describe('SKU produk dari katalog master yang cocok'),
  productName: z.string().describe('Nama produk'),
  quantity: z.number().positive().describe('Kuantitas yang diminta atau disetujui oleh customer'),
  unit: z.string().describe('Satuan produk (contoh: pcs, box, ctn, pack)'),
  unitPrice: z.number().nonnegative().describe('Harga satuan produk'),
  action: z.enum(['ORIGINAL', 'MODIFIED', 'ADDED']).describe(
    'ORIGINAL jika sesuai tawaran awal, MODIFIED jika jumlah diubah, ADDED jika item tambahan baru'
  ),
});

export const parsedOrderIntentSchema = z.object({
  intent: z
    .enum(['CONFIRM', 'MODIFY_QTY', 'ADD_ITEM', 'REJECT', 'INQUIRY_ONLY', 'UNKNOWN'])
    .describe(
      'Klasifikasi maksud customer: CONFIRM (setuju tawaran), MODIFY_QTY (ubah jumlah tawaran), ADD_ITEM (tambah item lain), REJECT (menolak), INQUIRY_ONLY (hanya tanya-tanya), UNKNOWN (tidak jelas)'
    ),
  summary: z.string().describe('Ringkasan maksud customer dalam 1 kalimat bahasa Indonesia'),
  items: z
    .array(orderItemSchema)
    .describe('Daftar produk yang disetujui / dipesan oleh customer. Kosong jika REJECT/INQUIRY_ONLY/UNKNOWN'),
  customerNotes: z
    .string()
    .optional()
    .describe('Catatan khusus customer jika ada (contoh: minta dikirim pagi, minta diskon, dll)'),
});

export type OrderItemIntent = z.infer<typeof orderItemSchema>;
export type ParsedOrderIntent = z.infer<typeof parsedOrderIntentSchema>;
