'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { DraftPOMetrics } from '@/components/draft-pos/draft-po-metrics';
import { DraftPOTable } from '@/components/draft-pos/draft-po-table';
import { DraftPODrawer } from '@/components/draft-pos/draft-po-drawer';
import { api } from '@/lib/api';
import type { DraftPOListItem } from '@/types';

export default function DraftPOsPage() {
  const [items, setItems] = useState<DraftPOListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getDraftPOs();
      setItems(data);
    } catch (err) {
      console.error('Failed to load Draft POs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Daftar Pesanan (Draft PO)"
        subtitle="Verifikasi dan setujui pesanan otomatis dari percakapan WhatsApp customer"
        onRefresh={loadData}
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Summary Cards */}
        <DraftPOMetrics items={items} />

        {/* PO Table with Status Filter & Search */}
        <DraftPOTable
          items={items}
          isLoading={isLoading}
          onSelectPO={(id) => setSelectedPOId(id)}
        />
      </main>

      {/* Slide-over Detail & Approval Drawer */}
      <DraftPODrawer
        poId={selectedPOId}
        onClose={() => setSelectedPOId(null)}
        onStatusUpdated={loadData}
      />
    </div>
  );
}
