import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Referly — Shopify Affiliate Programs",
  description: "Run affiliate programs for your Shopify store: unique referral links, automatic commission tracking, and payouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
