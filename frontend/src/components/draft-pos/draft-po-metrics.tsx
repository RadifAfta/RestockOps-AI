import React from 'react';
import { ClipboardList, CheckCircle2, Store, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatRupiah } from '@/lib/formatters';
import type { DraftPOListItem } from '@/types';

export function DraftPOMetrics({ items }: { items: DraftPOListItem[] }) {
  const pendingItems = items.filter((i) => i.status === 'DRAFT');
  const approvedItems = items.filter((i) => i.status === 'APPROVED');

  const pendingAmount = pendingItems.reduce((sum, it) => sum + it.total_amount, 0);
  const approvedAmount = approvedItems.reduce((sum, it) => sum + it.total_amount, 0);

  const uniqueStores = new Set(items.map((i) => i.store_id)).size;

  const metrics = [
    {
      title: 'PO Perlu Ditinjau',
      value: pendingItems.length,
      subValue: formatRupiah(pendingAmount),
      icon: ClipboardList,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      iconColor: 'text-amber-600',
    },
    {
      title: 'PO Telah Disetujui',
      value: approvedItems.length,
      subValue: formatRupiah(approvedAmount),
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Toko Terlibat',
      value: uniqueStores,
      subValue: `${items.length} Total Transaksi Chat`,
      icon: Store,
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      iconColor: 'text-slate-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.title} className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.title}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{m.value}</span>
                <span className="text-xs font-medium text-slate-500">pesanan</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1">{m.subValue}</p>
            </div>
            <div className={`p-3 rounded-xl border ${m.color}`}>
              <Icon className={`w-5 h-5 ${m.iconColor}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
