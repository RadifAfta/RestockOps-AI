import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { csvInvoiceRowSchema, type CsvInvoiceRow, type IngestionError } from './invoices.schema.js';

export interface ParseResult {
  validRows: { rowNumber: number; data: CsvInvoiceRow }[];
  errors: IngestionError[];
  totalRows: number;
}

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s\-_]+/g, '_');
}

export class InvoiceCsvParser {
  /**
   * Parse CSV content from string or buffer
   */
  async parseString(csvContent: string): Promise<ParseResult> {
    const stream = Readable.from([csvContent]);
    return this.parseStream(stream);
  }

  /**
   * Parse CSV stream row-by-row
   */
  async parseStream(stream: NodeJS.ReadableStream): Promise<ParseResult> {
    const validRows: { rowNumber: number; data: CsvInvoiceRow }[] = [];
    const errors: IngestionError[] = [];
    let rowNumber = 0;

    const parser = stream.pipe(
      parse({
        columns: (header: string[]) => header.map(normalizeHeaderKey),
        skip_empty_lines: true,
        trim: true,
        cast: false,
      })
    );

    for await (const rawRecord of parser) {
      rowNumber++;
      const record = rawRecord as Record<string, unknown>;

      // Map potential aliases
      const normalizedRecord = {
        store_name: record['store_name'] || record['store'] || record['toko'] || record['nama_toko'],
        phone_number: record['phone_number'] || record['phone'] || record['no_hp'] || record['telepon'] || record['whatsapp'],
        address: record['address'] || record['alamat'] || undefined,
        invoice_number: record['invoice_number'] || record['invoice_no'] || record['no_faktur'] || record['no_invoice'],
        invoice_date: record['invoice_date'] || record['date'] || record['tanggal'] || record['tgl_faktur'],
        sku: record['sku'] || record['product_sku'] || record['kode_produk'] || record['kode_barang'],
        product_name: record['product_name'] || record['product'] || record['nama_produk'] || record['nama_barang'],
        category: record['category'] || record['kategori'] || undefined,
        unit: record['unit'] || record['satuan'] || 'pcs',
        quantity: record['quantity'] || record['qty'] || record['jumlah'],
        unit_price: record['unit_price'] || record['price'] || record['harga'] || record['harga_satuan'],
      };

      const parseValidation = csvInvoiceRowSchema.safeParse(normalizedRecord);

      if (parseValidation.success) {
        validRows.push({
          rowNumber,
          data: parseValidation.data,
        });
      } else {
        const errorMessages = parseValidation.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        errors.push({
          row: rowNumber,
          data: record,
          errors: errorMessages,
        });
      }
    }

    return {
      validRows,
      errors,
      totalRows: rowNumber,
    };
  }
}

export const invoiceCsvParser = new InvoiceCsvParser();
