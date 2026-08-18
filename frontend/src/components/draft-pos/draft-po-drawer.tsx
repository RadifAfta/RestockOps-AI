'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  MessageSquare,
  Package,
  Phone,
  Store,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatRupiah, formatTanggalId, formatPhoneNumber } from '@/lib/formatters';
import { api } from '@/lib/api';
import type { DraftPODetail, DraftPOStatus } from '@/types';

interface DraftPODrawerProps {
  poId: string | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export function DraftPODrawer({ poId, onClose, onStatusUpdated }: DraftPODrawerProps) {
  const [po, setPo] = useState<DraftPODetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poId) {
      setPo(null);
      return;
    }

    async function fetchDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getDraftPODetail(poId!);
        setPo(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [poId]);

  if (!poId) return null;

  const handleUpdateStatus = async (newStatus: DraftPOStatus) => {
    if (!po) return;

    const confirmMsg =
      newStatus === 'APPROVED'
        ? `Apakah Anda yakin ingin MENYETUJUI pesanan #${po.po_number}?`
        : `Apakah Anda yakin ingin MENOLAK pesanan #${po.po_number}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsUpdating(true);
      await api.updateDraftPOStatus(po.id, newStatus);
      setPo({ ...po, status: newStatus });
      onStatusUpdated();
    } catch (err) {
      alert(`Gagal memperbarui status: ${(err as Error).message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Parse raw AI transcript
  let parsedTranscript: { summary?: string; customerNotes?: string; rawChat?: string } = {};
  if (po?.raw_ai_transcript) {
    try {
      parsedTranscript = JSON.parse(po.raw_ai_transcript);
    } catch {
      parsedTranscript = { rawChat: po.raw_ai_transcript };
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* 1. Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{po ? `#${po.po_number}` : 'Memuat PO...'}</h2>
              {po && <StatusBadge status={po.status} />}
            </div>
            {po && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Diterima {formatTanggalId(po.created_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="space-y-4 py-8">
              <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {po && !isLoading && (
            <>
              {/* Info Toko & Kontak */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  Identitas Toko / Retailer
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-xs text-slate-500">Nama Toko</p>
                    <p className="text-sm font-semibold text-slate-900">{po.store_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Nomor WhatsApp</p>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {formatPhoneNumber(po.store_phone)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transkrip Chat Masuk WhatsApp & AI Analysis */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Konteks Balasan Chat WhatsApp
                </h3>
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">
                      Pesan Asli Toko:
                    </span>
                    <div className="mt-1 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs text-sm text-slate-800 italic">
                      "{parsedTranscript.rawChat || 'Konfirmasi pesanan diterima dari WhatsApp.'}"
                    </div>
                  </div>

                  {parsedTranscript.summary && (
                    <div className="flex items-start gap-2 pt-1">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Analisis AI:</strong> {parsedTranscript.summary}
                      </p>
                    </div>
                  )}

                  {parsedTranscript.customerNotes && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg text-xs text-amber-900">
                      <strong>Catatan Pengiriman:</strong> {parsedTranscript.customerNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Line Items Pesanan */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-600" />
                  Rincian Item Pesanan
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5">Produk</th>
                        <th className="py-2.5 px-3 text-right">Jumlah</th>
                        <th className="py-2.5 px-3 text-right">Harga</th>
                        <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {po.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3.5">
                            <p className="font-semibold text-slate-900 leading-tight">{item.product_name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-800">
                            {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                          </td>
                          <td className="py-3 px-3 text-right text-xs text-slate-600 font-mono">
                            {formatRupiah(item.unit_price)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold text-slate-900 font-mono">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-3.5 px-3.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Total Estimasi Pesanan
                        </td>
                        <td className="py-3.5 px-3.5 text-right text-base text-slate-900 font-extrabold font-mono">
                          {formatRupiah(po.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Action Bar Bawah (Large Touch Targets & Explicit Wording) */}
        {po && po.status === 'DRAFT' && (
          <div className="p-5 border-t border-slate-200 bg-white flex items-center gap-3">
            <Button
              variant="danger"
              size="lg"
              onClick={() => handleUpdateStatus('REJECTED')}
              isLoading={isUpdating}
              className="flex-1"
            >
              <XCircle className="w-4 h-4" />
              Tolak Pesanan
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => handleUpdateStatus('APPROVED')}
              isLoading={isUpdating}
              className="flex-2 bg-slate-900 hover:bg-slate-800"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Setujui Pesanan
            </Button>
          </div>
        )}

        {po && po.status !== 'DRAFT' && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
            <p className="text-xs text-slate-500">
              Pesanan ini telah memiliki status tetap (<strong>{po.status}</strong>).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
