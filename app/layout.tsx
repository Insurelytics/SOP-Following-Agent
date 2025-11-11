import type { Metadata } from "next";
import "./globals.css";
import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "SOP Following Agent",
  description: "AI agent for following Standard Operating Procedures",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}

