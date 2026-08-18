'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  TrendingUp,
  FileSpreadsheet,
  Store,
  MessageSquare,
  Sparkles,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      name: 'Daftar Pesanan (Draft PO)',
      href: '/draft-pos',
      icon: ClipboardList,
      badge: pendingCount,
    },
    {
      name: 'Prediksi Siklus Restock',
      href: '/predictions',
      icon: TrendingUp,
    },
    {
      name: 'Ingest Faktur (CSV)',
      href: '/invoices',
      icon: FileSpreadsheet,
    },
    {
      name: 'Katalog & Toko',
      href: '/stores',
      icon: Store,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
          <Bot className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-900 leading-none">RestockOps AI</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            B2B Agent Active
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Menu Operasional
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/draft-pos' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group select-none',
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  )}
                />
                <span>{item.name}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-bold rounded-full',
                    isActive ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Service Card */}
      <div className="p-4 border-t border-slate-200">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI Autonomous Outreach
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Prediksi stok otomatis & pesan penawaran WhatsApp terhubung aktif.
          </p>
        </div>
      </div>
    </aside>
  );
}
