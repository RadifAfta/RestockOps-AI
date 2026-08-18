'use client';

import React, { useState } from 'react';
import { Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function Header({
  title,
  subtitle,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}) {
  const [isOutreachLoading, setIsOutreachLoading] = useState(false);
  const [outreachSuccess, setOutreachSuccess] = useState(false);

  const handleTriggerOutreach = async () => {
    try {
      setIsOutreachLoading(true);
      await api.runOutreach();
      setOutreachSuccess(true);
      setTimeout(() => setOutreachSuccess(false), 3000);
      onRefresh?.();
    } catch (err) {
      alert(`Gagal menjalankan outreach: ${(err as Error).message}`);
    } finally {
      setIsOutreachLoading(false);
    }
  };

  return (
    <header className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} title="Segarkan Data">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}

        <Button
          variant={outreachSuccess ? 'success' : 'primary'}
          size="sm"
          onClick={handleTriggerOutreach}
          isLoading={isOutreachLoading}
        >
          {outreachSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pesan Terkirim!
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Kirim Outreach Restock
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
