import { invoiceCsvParser } from './invoices.parser.js';
import { invoicesRepository } from './invoices.repository.js';
import { storesRepository } from '../stores/stores.repository.js';
import { productsRepository } from '../products/products.repository.js';
import type { IngestionResult } from './invoices.schema.js';
import type { Store, Product } from '../../database/schema/index.js';
import { logger } from '../../core/logger/index.js';

export class InvoicesService {
  /**
   * Ingest CSV content from raw string or buffer
   */
  async ingestCsv(csvContent: string): Promise<IngestionResult> {
    const parseResult = await invoiceCsvParser.parseString(csvContent);

    const result: IngestionResult = {
      totalRowsProcessed: parseResult.totalRows,
      successfulRows: 0,
      failedRows: parseResult.errors.length,
      storesCreatedOrResolved: 0,
      productsCreatedOrResolved: 0,
      invoicesCreated: 0,
      invoicesSkippedDuplicate: 0,
      itemsCreated: 0,
      errors: [...parseResult.errors],
    };

    if (parseResult.validRows.length === 0) {
      return result;
    }

    // Cache to minimize DB calls during batch ingestion
    const storeCache = new Map<string, Store>();
    const productCache = new Map<string, Product>();

    // 1. Resolve Stores
    for (const { data } of parseResult.validRows) {
      if (!storeCache.has(data.phone_number)) {
        try {
          const store = await storesRepository.findOrCreate(
            data.store_name,
            data.phone_number,
            data.address
          );
          storeCache.set(data.phone_number, store);
          result.storesCreatedOrResolved++;
        } catch (err) {
          logger.error({ err, storeName: data.store_name }, 'Failed to resolve store');
        }
      }
    }

    // 2. Resolve Products
    for (const { data } of parseResult.validRows) {
      if (!productCache.has(data.sku)) {
        try {
          const product = await productsRepository.findOrCreate(
            data.sku,
            data.product_name,
            data.unit_price,
            data.category,
            data.unit
          );
          productCache.set(data.sku, product);
          result.productsCreatedOrResolved++;
        } catch (err) {
          logger.error({ err, sku: data.sku }, 'Failed to resolve product');
        }
      }
    }

    // 3. Group line items by Invoice: key = `${storeId}:${invoiceNumber}`
    interface GroupedInvoice {
      storeId: string;
      invoiceNumber: string;
      invoiceDate: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;
    }

    const groupedInvoices = new Map<string, GroupedInvoice>();

    for (const { rowNumber, data } of parseResult.validRows) {
      const store = storeCache.get(data.phone_number);
      const product = productCache.get(data.sku);

      if (!store || !product) {
        result.failedRows++;
        result.errors.push({
          row: rowNumber,
          data: data as unknown as Record<string, unknown>,
          errors: ['Gagal mengaitkan toko atau produk dari baris CSV'],
        });
        continue;
      }

      const invoiceKey = `${store.id}:${data.invoice_number}`;
      const subtotal = Number((data.quantity * data.unit_price).toFixed(2));

      if (!groupedInvoices.has(invoiceKey)) {
        groupedInvoices.set(invoiceKey, {
          storeId: store.id,
          invoiceNumber: data.invoice_number,
          invoiceDate: data.invoice_date,
          items: [],
        });
      }

      const currentGroup = groupedInvoices.get(invoiceKey)!;
      currentGroup.items.push({
        productId: product.id,
        quantity: data.quantity,
        unitPrice: data.unit_price,
        subtotal,
      });

      result.successfulRows++;
    }

    // 4. Ingest Invoices & Items Atomically
    for (const group of groupedInvoices.values()) {
      const totalAmount = group.items.reduce((sum, item) => sum + item.subtotal, 0);

      try {
        const saved = await invoicesRepository.createWithItems({
          invoice: {
            store_id: group.storeId,
            invoice_number: group.invoiceNumber,
            invoice_date: group.invoiceDate,
            total_amount: Number(totalAmount.toFixed(2)),
          },
          items: group.items.map((it) => ({
            product_id: it.productId,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            subtotal: it.subtotal,
          })),
        });

        if (saved.isDuplicate) {
          result.invoicesSkippedDuplicate++;
        } else {
          result.invoicesCreated++;
          result.itemsCreated += saved.items.length;
        }
      } catch (err) {
        logger.error({ err, invoiceNumber: group.invoiceNumber }, 'Failed to persist invoice');
        result.errors.push({
          row: 0,
          data: { invoiceNumber: group.invoiceNumber },
          errors: [`Gagal menyimpan faktur ke database: ${(err as Error).message}`],
        });
      }
    }

    return result;
  }
}

export const invoicesService = new InvoicesService();
