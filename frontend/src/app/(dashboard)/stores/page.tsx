'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { MessageSquare, Send, CheckCircle2, AlertCircle, Bot, Sparkles } from 'lucide-react';

export default function StoresPage() {
  const [phoneNumber, setPhoneNumber] = useState('6281234567890');
  const [chatMessage, setChatMessage] = useState('Boleh kirim 25 pcs ya mas kopi nya, sama tambah Susu UHT 5 box.');
  const [isLoading, setIsLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!phoneNumber.trim() || !chatMessage.trim()) {
      alert('Nomor HP dan Pesan Chat wajib diisi');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = (await api.simulateInboundMessage(phoneNumber, chatMessage)) as any;
      setSimResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Katalog & Simulator Interaktif"
        subtitle="Simulasi balasan chat WhatsApp toko untuk menguji ekstraksi LLM dan pembuatan Draft PO secara langsung"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              <div>
                <CardTitle>WhatsApp Inbound Chat Simulator</CardTitle>
                <CardDescription>
                  Kirim pesan simulasi dari nomor toko terdaftar untuk melihat bagaimana AI mengekstrak intent dan membuat Draft PO.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor WhatsApp Toko (E.164)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="6281234567890"
                className="w-full h-10 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                Toko contoh: <code>6281234567890</code> (Toko Berkah), <code>6281987654321</code> (Minimarket Sumber Rejeki).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pesan Balasan Chat Toko
              </label>
              <textarea
                rows={3}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Tulis balasan toko di sini..."
                className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-slate-800"
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {simResult && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Hasil Pemrosesan AI Agent:
                </div>

                <div className="space-y-1.5 text-xs">
                  <p>
                    <span className="text-slate-400">Toko:</span> {simResult.store?.name} ({simResult.store?.phone})
                  </p>
                  <p>
                    <span className="text-slate-400">Intent Terdeteksi:</span>{' '}
                    <strong className="text-amber-400 font-mono">{simResult.aiIntent?.intent}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Ringkasan AI:</span> {simResult.aiIntent?.summary}
                  </p>
                  {simResult.draftPO && (
                    <p>
                      <span className="text-slate-400">Draft PO Terbuat:</span>{' '}
                      <strong className="text-emerald-400 font-mono">#{simResult.draftPO.po_number}</strong> (Rp{' '}
                      {Number(simResult.draftPO.total_amount).toLocaleString('id-ID')})
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Balasan Otomatis WA Terkirim:</p>
                  <p className="italic">"{simResult.replySent}"</p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSimulate}
                isLoading={isLoading}
              >
                <Send className="w-4 h-4" />
                Kirim Simulasi Balasan Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
