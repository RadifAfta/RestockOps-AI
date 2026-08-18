'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatTanggalSimple, formatPhoneNumber } from '@/lib/formatters';
import { api } from '@/lib/api';
import type { RestockPredictionItem } from '@/types';
import { RefreshCw, Calculator, Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<RestockPredictionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getPredictions();
      setPredictions(data);
    } catch (err) {
      console.error('Failed to load predictions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await api.recalculatePredictions({ bufferDays: 3 });
      await loadData();
    } catch (err) {
      alert(`Gagal menghitung ulang prediksi: ${(err as Error).message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Prediksi Siklus Restock"
        subtitle="Analisis otomatis interval pembelian toko untuk memprediksi tanggal habis stok (H - buffer)"
        onRefresh={loadData}
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Mesin Prediksi Siklus Aktif</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dihitung berdasarkan rata-rata interval antar faktur historis dengan buffer 3 hari.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={handleRecalculate}
            isLoading={isRecalculating}
          >
            <Calculator className="w-4 h-4" />
            Hitung Ulang Semua Prediksi
          </Button>
        </div>

        {/* Predictions Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Toko / Kontak</th>
                  <th className="py-3 px-5">Produk Master</th>
                  <th className="py-3 px-5 text-center">Siklus Rata-rata</th>
                  <th className="py-3 px-5">Faktur Terakhir</th>
                  <th className="py-3 px-5">Perkiraan Habis</th>
                  <th className="py-3 px-5 font-bold text-slate-900">Jadwal Restock (H-3)</th>
                  <th className="py-3 px-5 text-right">Saran Qty</th>
                  <th className="py-3 px-5 text-center">Akurasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                        <span className="text-xs font-medium">Memuat data prediksi siklus...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading && predictions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Belum ada data prediksi. Lakukan upload faktur CSV terlebih dahulu.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  predictions.map((p) => {
                    const confidencePercent = Math.round(p.confidence_score * 100);
                    const statusKey =
                      p.confidence_score >= 0.75
                        ? 'OPTIMAL'
                        : p.confidence_score >= 0.5
                        ? 'MODERATE'
                        : 'INSUFFICIENT_DATA';

                    return (
                      <tr key={`${p.store_id}-${p.product_id}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <p className="font-semibold text-slate-900">{p.store_name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{formatPhoneNumber(p.phone_number)}</p>
                        </td>
                        <td className="py-4 px-5">
                          <p className="font-semibold text-slate-800">{p.product_name}</p>
                          <p className="text-xs text-slate-400 font-mono">SKU: {p.sku}</p>
                        </td>
                        <td className="py-4 px-5 text-center font-bold text-slate-900 font-mono">
                          {p.avg_cycle_days} <span className="text-xs font-normal text-slate-500">hari</span>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600 font-mono">
                          {formatTanggalSimple(p.last_purchase_date)}
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600 font-mono">
                          {formatTanggalSimple(p.predicted_runout_date)}
                        </td>
                        <td className="py-4 px-5 font-bold text-emerald-800 bg-emerald-50/50 font-mono text-xs">
                          {formatTanggalSimple(p.suggested_restock_date)}
                        </td>
                        <td className="py-4 px-5 text-right font-extrabold text-slate-900 font-mono text-sm">
                          {p.suggested_quantity}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <StatusBadge status={statusKey} />
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{confidencePercent}% confidence</p>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
