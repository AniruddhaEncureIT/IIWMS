import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// UX4G mandated font — Noto Sans for all Indian government digital products
const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IIMS — Integrated Infrastructure Management System",
  description: "Integrated Infrastructure Management System — Zilla Parishad, Pune Division, Government of Maharashtra",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSans.variable} font-sans antialiased`}>
        {/* Skip to main content — WCAG 2.4.1 bypass blocks */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
