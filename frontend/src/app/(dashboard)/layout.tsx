'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const drafts = await api.getDraftPOs('DRAFT');
      setPendingCount(drafts.length);
    } catch {
      // Backend not reached or offline
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000); // Polling every 10s for new inbound orders
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
