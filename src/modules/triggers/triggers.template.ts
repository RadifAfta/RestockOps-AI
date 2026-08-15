export interface RestockOfferTemplateData {
  storeName: string;
  productName: string;
  bufferDays: number;
  suggestedQuantity: number;
  unit: string;
  unitPrice?: number;
}

export function buildRestockOfferMessage(data: RestockOfferTemplateData): string {
  const formattedPrice = data.unitPrice
    ? ` (Rp ${data.unitPrice.toLocaleString('id-ID')}/${data.unit})`
    : '';

  return (
    `Halo *${data.storeName}*, salam dari tim RestockOps! 👋\n\n` +
    `Berdasarkan riwayat pemesanan rutin Anda, stok *${data.productName}* diperkirakan akan habis dalam *${data.bufferDays} hari ke depan*.\n\n` +
    `📦 *Saran Restock Hari Ini*:\n` +
    `• Produk: ${data.productName}\n` +
    `• Jumlah: *${data.suggestedQuantity} ${data.unit}*${formattedPrice}\n\n` +
    `Apakah ingin kami siapkan pengiriman ini? Cukup balas pesan ini untuk *konfirmasi* atau *beri tahu jika ingin mengubah jumlah/tambah barang lain*.\n\n` +
    `Terima kasih! 🙏`
  );
}
