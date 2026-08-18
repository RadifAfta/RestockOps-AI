'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { IngestionResult } from '@/types';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

const SAMPLE_CSV = `StoreName,PhoneNumber,InvoiceNumber,InvoiceDate,SKU,ProductName,Category,Quantity,UnitPrice
Toko Berkah Sejahtera,6281234567890,INV-2026-101,2026-02-01,SKU-KOPI-01,Kopi Arabika 250g,Beverage,20,45000
Toko Berkah Sejahtera,6281234567890,INV-2026-102,2026-02-15,SKU-KOPI-01,Kopi Arabika 250g,Beverage,20,45000
Minimarket Sumber Rejeki,6281987654321,INV-2026-103,2026-02-05,SKU-SUSU-02,Susu UHT Full Cream 1L,Dairy,30,18000
Minimarket Sumber Rejeki,6281987654321,INV-2026-104,2026-02-15,SKU-SUSU-02,Susu UHT Full Cream 1L,Dairy,30,18000`;

export default function InvoicesPage() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!csvText.trim()) {
      alert('Teks CSV tidak boleh kosong');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.ingestCsv(csvText);
      setResult(res);
      // Auto trigger recalculation after ingestion
      await api.recalculatePredictions({ bufferDays: 3 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Ingest Faktur Penjualan (CSV)"
        subtitle="Import riwayat faktur transaksi penjualan untuk melatih mesin prediksi siklus restock"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-5xl w-full mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Input Data Faktur Transaksi</CardTitle>
                <CardDescription>
                  Masukkan teks CSV atau template di bawah ini. Format kolom: StoreName, PhoneNumber, InvoiceNumber, InvoiceDate, SKU, ProductName, Category, Quantity, UnitPrice.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsvText(SAMPLE_CSV)}
              >
                <Copy className="w-3.5 h-3.5" />
                Gunakan Contoh Data
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <textarea
              rows={9}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste teks CSV Anda di sini..."
              className="w-full p-4 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-slate-800"
            />

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Import Berhasil Diselesaikan!
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-slate-500">Baris Diproses</p>
                    <p className="text-base font-bold text-slate-900">{result.totalRowsProcessed}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-slate-500">Faktur Baru</p>
                    <p className="text-base font-bold text-emerald-700">{result.invoicesCreated}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-slate-500">Duplikat Terlewati</p>
                    <p className="text-base font-bold text-amber-700">{result.invoicesSkippedDuplicate}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-slate-500">Item Produk</p>
                    <p className="text-base font-bold text-slate-900">{result.itemsCreated}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="lg"
                onClick={handleUpload}
                isLoading={isLoading}
              >
                <Upload className="w-4 h-4" />
                Proses & Ingest CSV Faktur
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
