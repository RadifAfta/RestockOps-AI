import { z } from 'zod';

export const csvInvoiceRowSchema = z.object({
  store_name: z.string().min(1, 'Nama toko wajib diisi'),
  phone_number: z
    .string()
    .min(8, 'Nomor telepon minimal 8 karakter')
    .transform((val) => val.replace(/[^0-9+]/g, ''))
    .refine((val) => val.length >= 8, 'Nomor telepon tidak valid'),
  address: z.string().optional(),
  invoice_number: z.string().min(1, 'Nomor faktur wajib diisi'),
  invoice_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .refine((val) => !isNaN(Date.parse(val)), 'Tanggal tidak valid'),
  sku: z.string().min(1, 'SKU produk wajib diisi'),
  product_name: z.string().min(1, 'Nama produk wajib diisi'),
  category: z.string().optional(),
  unit: z.string().optional().default('pcs'),
  quantity: z.coerce.number().positive('Quantity harus lebih dari 0'),
  unit_price: z.coerce.number().min(0, 'Harga satuan minimal 0'),
});

export type CsvInvoiceRow = z.infer<typeof csvInvoiceRowSchema>;

export interface IngestionError {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

export interface IngestionResult {
  totalRowsProcessed: number;
  successfulRows: number;
  failedRows: number;
  storesCreatedOrResolved: number;
  productsCreatedOrResolved: number;
  invoicesCreated: number;
  invoicesSkippedDuplicate: number;
  itemsCreated: number;
  errors: IngestionError[];
}
