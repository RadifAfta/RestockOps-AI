import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RestockOps AI - B2B Autonomous Restock & Order Management',
  description: 'AI-driven proactive restock predictions and WhatsApp order review dashboard for distributors',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
