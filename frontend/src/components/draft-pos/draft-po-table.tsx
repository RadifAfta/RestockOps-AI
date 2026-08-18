'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Filter, Inbox } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { formatRupiah, formatTanggalId, formatPhoneNumber } from '@/lib/formatters';
import type { DraftPOListItem, DraftPOStatus } from '@/types';

interface DraftPOTableProps {
  items: DraftPOListItem[];
  isLoading: boolean;
  onSelectPO: (id: string) => void;
}

export function DraftPOTable({ items, isLoading, onSelectPO }: DraftPOTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DraftPOStatus | 'ALL'>('ALL');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesPO = item.po_number.toLowerCase().includes(query);
        const matchesStore = item.store_name.toLowerCase().includes(query);
        const matchesPhone = item.store_phone.includes(query);
        return matchesPO || matchesStore || matchesPhone;
      }

      return true;
    });
  }, [items, selectedStatus, searchQuery]);

  const draftCount = items.filter((i) => i.status === 'DRAFT').length;
  const approvedCount = items.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = items.filter((i) => i.status === 'REJECTED').length;

  const tabs: Array<{ id: DraftPOStatus | 'ALL'; label: string; count: number }> = [
    { id: 'ALL', label: 'Semua Pesanan', count: items.length },
    { id: 'DRAFT', label: 'Perlu Ditinjau', count: draftCount },
    { id: 'APPROVED', label: 'Disetujui', count: approvedCount },
    { id: 'REJECTED', label: 'Ditolak', count: rejectedCount },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* 1. Filter Bar & Search Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko, no. PO, atau telepon..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 2. Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-5">Nomor PO</th>
              <th className="py-3 px-5">Toko / Kontak</th>
              <th className="py-3 px-5 text-right">Total Estimasi</th>
              <th className="py-3 px-5">Waktu Diterima</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                    <span className="text-xs font-medium">Memuat data pesanan...</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                    <Inbox className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Tidak ada pesanan ditemukan</p>
                    <p className="text-xs text-slate-400">
                      {searchQuery
                        ? 'Coba ubah kata kunci pencarian Anda.'
                        : 'Belum ada data pesanan Draft PO yang tercatat.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading &&
              filteredItems.map((item) => {
                const isDraft = item.status === 'DRAFT';
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPO(item.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-5 font-bold font-mono text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {item.po_number}
                    </td>
                    <td className="py-4 px-5">
                      <p className="font-semibold text-slate-900">{item.store_name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{formatPhoneNumber(item.store_phone)}</p>
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-slate-900 font-mono text-base">
                      {formatRupiah(item.total_amount)}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {formatTanggalId(item.created_at)}
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPO(item.id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isDraft
                            ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{isDraft ? 'Tinjau PO' : 'Lihat Detail'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="p-4 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Menampilkan {filteredItems.length} pesanan</span>
          <span>Klik baris untuk membuka transkrip WhatsApp & item lengkap</span>
        </div>
      )}
    </div>
  );
}
