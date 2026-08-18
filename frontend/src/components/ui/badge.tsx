import React from 'react';
import { cn } from '@/lib/utils';
import type { DraftPOStatus } from '@/types';

interface StatusBadgeProps {
  status: DraftPOStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let label = status;
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-500';

  switch (status) {
    case 'DRAFT':
      label = 'Perlu Ditinjau';
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
      dotColor = 'bg-amber-500';
      break;
    case 'APPROVED':
      label = 'Disetujui';
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      dotColor = 'bg-emerald-500';
      break;
    case 'REJECTED':
      label = 'Ditolak';
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-200/80';
      dotColor = 'bg-rose-500';
      break;
    case 'CONVERTED':
      label = 'Terkonversi Faktur';
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200/80';
      dotColor = 'bg-blue-500';
      break;
    case 'OPTIMAL':
      label = 'Akurasi Tinggi';
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      dotColor = 'bg-emerald-500';
      break;
    case 'MODERATE':
      label = 'Akurasi Sedang';
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
      dotColor = 'bg-amber-500';
      break;
    case 'INSUFFICIENT_DATA':
      label = 'Data Belum Cukup';
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        colorClasses,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
      {label}
    </span>
  );
}
