import { pool, db } from '../database/client.js';
import { invoicesService } from '../modules/invoices/invoices.service.js';
import { predictionsService } from '../modules/predictions/predictions.service.js';
import { triggersService } from '../modules/triggers/triggers.service.js';
import { whatsappService } from '../modules/whatsapp/whatsapp.service.js';
import { processInboundMessage } from '../modules/whatsapp/whatsapp.routes.js';
import { draftPORepository } from '../modules/draft-pos/draft-pos.repository.js';
import { mockWhatsAppAdapter } from '../modules/whatsapp/mock.adapter.js';

async function runDemo() {
  console.log('\n===============================================================');
  console.log('🚀 RESTOCKOPS AI - END-TO-END DEMO RUNNER');
  console.log('===============================================================\n');

  // 1. Ensure DB Connection & Run Migrations
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ 1. Terhubung ke PostgreSQL Database.');
  } catch (err) {
    console.error('❌ Gagal terhubung ke database. Pastikan PostgreSQL sedang berjalan.');
    console.error('   Detail:', (err as Error).message);
    process.exit(1);
  }

  whatsappService.setAdapter(mockWhatsAppAdapter);
  mockWhatsAppAdapter.clearLogs();

  // 2. Ingest Sample Multi-Interval Invoices (Historical Data)
  console.log('\n📥 2. Melakukan Ingest CSV Faktur Historis (3 Toko, 3 Produk)...');

  const sampleCsv = `StoreName,PhoneNumber,InvoiceNumber,InvoiceDate,SKU,ProductName,Category,Quantity,UnitPrice
Toko Berkah Sejahtera,6281234567890,INV-2026-001,2026-01-01,SKU-KOPI-01,Kopi Arabika 250g,Beverage,20,45000
Toko Berkah Sejahtera,6281234567890,INV-2026-002,2026-01-15,SKU-KOPI-01,Kopi Arabika 250g,Beverage,20,45000
Toko Berkah Sejahtera,6281234567890,INV-2026-003,2026-01-29,SKU-KOPI-01,Kopi Arabika 250g,Beverage,20,45000
Minimarket Sumber Rejeki,6281987654321,INV-2026-004,2026-01-05,SKU-SUSU-02,Susu UHT Full Cream 1L,Dairy,30,18000
Minimarket Sumber Rejeki,6281987654321,INV-2026-005,2026-01-15,SKU-SUSU-02,Susu UHT Full Cream 1L,Dairy,30,18000
Minimarket Sumber Rejeki,6281987654321,INV-2026-006,2026-01-25,SKU-SUSU-02,Susu UHT Full Cream 1L,Dairy,30,18000
Warung Kelontong Barokah,6285711223344,INV-2026-007,2026-01-10,SKU-GULA-03,Gula Pasir Kristal 1kg,Staple,50,17500
Warung Kelontong Barokah,6285711223344,INV-2026-008,2026-01-24,SKU-GULA-03,Gula Pasir Kristal 1kg,Staple,50,17500`;

  const ingestResult = await invoicesService.ingestCsv(sampleCsv);
  console.log(`   • Total baris CSV diproses : ${ingestResult.totalRowsProcessed}`);
  console.log(`   • Faktur baru tersimpan    : ${ingestResult.invoicesCreated}`);
  console.log(`   • Toko terdaftar           : ${ingestResult.storesCreatedOrResolved}`);
  console.log(`   • Master produk terdaftar  : ${ingestResult.productsCreatedOrResolved}`);

  // 3. Run Prediction Engine
  console.log('\n🧠 3. Menjalankan Mesin Prediksi Siklus Restock (avg_cycle_days & H-buffer)...');
  const predictionSummary = await predictionsService.recalculateAll({ bufferDays: 3 });
  console.log(`   • Pasangan toko-produk dihitung : ${predictionSummary.totalPairsProcessed}`);
  console.log(`   • Prediksi akurasi optimal      : ${predictionSummary.optimalPredictions}`);

  for (const p of predictionSummary.results) {
    console.log(
      `     -> Siklus Rata-rata: ${p.avgCycleDays} hari | Tanggal Habis: ${p.predictedRunoutDate} | Target Restock (H-3): ${p.suggestedRestockDate} | Qty Saran: ${p.suggestedQuantity}`
    );
  }

  // 4. Run Restock Outreach Worker
  console.log('\n📲 4. Menjalankan Trigger Worker (Outreach WhatsApp Proaktif)...');
  // Use a date that matches suggested restock dates
  const targetDate = '2026-12-31'; // Future date to trigger all predictions in demo
  const outreachResult = await triggersService.runOutreach(targetDate);
  console.log(`   • Target eligible dihubungi : ${outreachResult.totalEligible}`);
  console.log(`   • Pesan WA terkirim         : ${outreachResult.messagesSent}`);

  const outbox = mockWhatsAppAdapter.getSentLogs();
  console.log('\n📋 [Mock WhatsApp Outbox Logs]:');
  outbox.forEach((msg, idx) => {
    console.log(`\n--- Pesan #${idx + 1} ke ${msg.to} ---`);
    console.log(msg.text);
  });

  // 5. Simulate Inbound WhatsApp Chat from Customers
  console.log('\n💬 5. Simulasi Balasan Chat WhatsApp dari Toko (Inbound Webhook / Simulator)...');

  // Scenario A: Toko Berkah replies with modification + addition
  console.log('\n[Skenario A - Toko Berkah Sejahtera]');
  const replyA = 'Boleh mas, tapi kirim 25 pcs aja ya kopi nya. Sama tambah Susu UHT 5 box sekalian ya.';
  console.log(`   Toko Mengirim: "${replyA}"`);
  const resultA = await processInboundMessage('6281234567890', replyA);
  if (resultA.handled && resultA.aiIntent) {
    console.log(`   -> AI Intent Terdeteksi : ${resultA.aiIntent.intent}`);
    console.log(`   -> Ringkasan AI        : ${resultA.aiIntent.summary}`);
    console.log(
      `   -> Draft PO Dibuat     : ${resultA.draftPO?.po_number} (Total: Rp ${resultA.draftPO?.total_amount.toLocaleString('id-ID')})`
    );
    console.log(`   -> Balasan Otomatis    : "${resultA.replySent?.replace(/\n/g, ' ')}"`);
  }

  // Scenario B: Minimarket Sumber Rejeki declines
  console.log('\n[Skenario B - Minimarket Sumber Rejeki]');
  const replyB = 'Stok susu masih banyak mas, belum perlu restock dulu ya.';
  console.log(`   Toko Mengirim: "${replyB}"`);
  const resultB = await processInboundMessage('6281987654321', replyB);
  if (resultB.handled && resultB.aiIntent) {
    console.log(`   -> AI Intent Terdeteksi : ${resultB.aiIntent.intent}`);
    console.log(`   -> Ringkasan AI        : ${resultB.aiIntent.summary}`);
    console.log(
      `   -> Draft PO Dibuat     : ${resultB.draftPO ? resultB.draftPO.po_number : 'Tidak Ada (Sesuai Maksud Penolakan)'}`
    );
  }

  // 6. View Draft PO Database Summary
  console.log('\n📊 6. Ringkasan Draft PO yang Siap Ditinjau di Dashboard Admin:');
  const allDrafts = await draftPORepository.list();
  console.table(
    allDrafts.map((d) => ({
      'No. PO': d.po_number,
      'Nama Toko': d.store_name,
      'Kontak WA': d.store_phone,
      'Status': d.status,
      'Total Nominal (IDR)': `Rp ${d.total_amount.toLocaleString('id-ID')}`,
      'Waktu Dibuat': d.created_at.toISOString().replace('T', ' ').substring(0, 19),
    }))
  );

  console.log('\n===============================================================');
  console.log('🎉 DEMONSTRASI PIPELINE RESTOCKOPS AI SELESAI DENGAN SUKSES!');
  console.log('===============================================================\n');

  await db.destroy();
  await pool.end();
}

runDemo().catch(async (err) => {
  console.error('❌ Demo encountered an error:', err);
  await db.destroy();
  await pool.end();
  process.exit(1);
});
