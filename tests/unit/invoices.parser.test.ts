import { describe, it, expect } from 'vitest';
import { invoiceCsvParser } from '../../src/modules/invoices/invoices.parser.js';

describe('InvoiceCsvParser', () => {
  it('should parse valid CSV data successfully', async () => {
    const csv = `StoreName,PhoneNumber,InvoiceNumber,InvoiceDate,SKU,ProductName,Category,Quantity,UnitPrice
Toko Makmur,6281234567890,INV-001,2026-01-01,SKU-A,Product A,Beverage,10,15000
Toko Makmur,6281234567890,INV-001,2026-01-01,SKU-B,Product B,Dairy,5,20000`;

    const result = await invoiceCsvParser.parseString(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0]?.data.store_name).toBe('Toko Makmur');
    expect(result.validRows[0]?.data.phone_number).toBe('6281234567890');
    expect(result.validRows[0]?.data.invoice_number).toBe('INV-001');
    expect(result.validRows[0]?.data.quantity).toBe(10);
    expect(result.validRows[0]?.data.unit_price).toBe(15000);
  });

  it('should handle Indonesian header aliases', async () => {
    const csv = `Nama_Toko,No_HP,No_Faktur,Tanggal,Kode_Produk,Nama_Produk,Kategori,Jumlah,Harga
Warung Berkah,081987654321,FAK-999,2026-02-15,SKU-KOPI,Kopi Sachet,Minuman,50,2500`;

    const result = await invoiceCsvParser.parseString(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0]?.data.store_name).toBe('Warung Berkah');
    expect(result.validRows[0]?.data.phone_number).toBe('081987654321');
    expect(result.validRows[0]?.data.invoice_number).toBe('FAK-999');
    expect(result.validRows[0]?.data.sku).toBe('SKU-KOPI');
    expect(result.validRows[0]?.data.quantity).toBe(50);
  });

  it('should capture invalid rows with descriptive error messages', async () => {
    const csv = `StoreName,PhoneNumber,InvoiceNumber,InvoiceDate,SKU,ProductName,Category,Quantity,UnitPrice
,123,INV-002,not-a-date,SKU-C,Product C,Snack,-5,-1000`;

    const result = await invoiceCsvParser.parseString(csv);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(1);
    expect(result.errors[0]?.errors.length).toBeGreaterThan(0);
  });
});
