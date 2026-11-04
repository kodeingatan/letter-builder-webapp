import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aksara — Platform Dokumen & Persuratan",
    template: "%s · Aksara",
  },
  description:
    "Aksara menghubungkan data pegawai, komponen surat, template, dan alur administrasi menjadi surat dinas yang siap cetak, PDF, dan DOCX.",
  applicationName: "Aksara",
  keywords: ["surat dinas", "mail merge", "template dokumen", "administrasi", "persuratan"],
  authors: [{ name: "Aksara" }],
  openGraph: {
    title: "Aksara — Platform Dokumen & Persuratan",
    description:
      "Satu sumber data, satu mesin render, dan alur administrasi yang rapi untuk seluruh surat dinas Anda.",
    type: "website",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
