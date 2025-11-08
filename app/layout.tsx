import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GPT-5 Chat Interface",
  description: "Chat interface for GPT-5-nano and GPT-5-mini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}

