import type { Kysely } from 'kysely';
import { db } from '../../database/client.js';
import type { Database, Invoice, NewInvoice, InvoiceItem, NewInvoiceItem } from '../../database/schema/index.js';

export interface CreateInvoiceWithItemsParams {
  invoice: NewInvoice;
  items: Omit<NewInvoiceItem, 'invoice_id'>[];
}

export class InvoicesRepository {
  constructor(private readonly client: Kysely<Database> = db) {}

  async findByStoreAndInvoiceNumber(
    storeId: string,
    invoiceNumber: string
  ): Promise<Invoice | undefined> {
    return this.client
      .selectFrom('invoices')
      .selectAll()
      .where('store_id', '=', storeId)
      .where('invoice_number', '=', invoiceNumber)
      .executeTakeFirst();
  }

  async createWithItems(params: CreateInvoiceWithItemsParams): Promise<{
    invoice: Invoice;
    items: InvoiceItem[];
    isDuplicate: boolean;
  }> {
    return this.client.transaction().execute(async (trx) => {
      // Check if invoice already exists for this store
      const existing = await trx
        .selectFrom('invoices')
        .selectAll()
        .where('store_id', '=', params.invoice.store_id)
        .where('invoice_number', '=', params.invoice.invoice_number)
        .executeTakeFirst();

      if (existing) {
        const existingItems = await trx
          .selectFrom('invoice_items')
          .selectAll()
          .where('invoice_id', '=', existing.id)
          .execute();

        return {
          invoice: existing,
          items: existingItems,
          isDuplicate: true,
        };
      }

      // Insert Invoice Header
      const createdInvoice = await trx
        .insertInto('invoices')
        .values(params.invoice)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Insert Line Items
      if (params.items.length === 0) {
        return {
          invoice: createdInvoice,
          items: [],
          isDuplicate: false,
        };
      }

      const itemsToInsert: NewInvoiceItem[] = params.items.map((item) => ({
        ...item,
        invoice_id: createdInvoice.id,
      }));

      const createdItems = await trx
        .insertInto('invoice_items')
        .values(itemsToInsert)
        .returningAll()
        .execute();

      return {
        invoice: createdInvoice,
        items: createdItems,
        isDuplicate: false,
      };
    });
  }

  async listByStoreId(storeId: string): Promise<Invoice[]> {
    return this.client
      .selectFrom('invoices')
      .selectAll()
      .where('store_id', '=', storeId)
      .orderBy('invoice_date', 'desc')
      .execute();
  }

  async getInvoiceDetails(invoiceId: string) {
    const invoice = await this.client
      .selectFrom('invoices')
      .selectAll()
      .where('id', '=', invoiceId)
      .executeTakeFirst();

    if (!invoice) return null;

    const items = await this.client
      .selectFrom('invoice_items')
      .innerJoin('products', 'products.id', 'invoice_items.product_id')
      .select([
        'invoice_items.id',
        'invoice_items.quantity',
        'invoice_items.unit_price',
        'invoice_items.subtotal',
        'products.sku',
        'products.name as product_name',
        'products.unit',
      ])
      .where('invoice_items.invoice_id', '=', invoiceId)
      .execute();

    return {
      ...invoice,
      items,
    };
  }
}

export const invoicesRepository = new InvoicesRepository();
