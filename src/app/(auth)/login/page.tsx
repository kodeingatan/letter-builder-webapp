import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/features/auth/login-form";
import { BrandMark } from "@/components/layout/brand";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke ruang kerja Aksara untuk mengelola surat dinas Anda.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1f1e1c] p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #ffffff33 0, transparent 40%), radial-gradient(circle at 80% 70%, #ffffff22 0, transparent 35%)",
          }}
        />
        <div className="relative flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-white font-serif text-[15px] font-semibold text-[#1f1e1c]">
            A
          </span>
          <span className="text-[13.5px] font-semibold tracking-[-0.02em]">Aksara</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Platform dokumen & persuratan
          </p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-1.6px] text-balance">
            Satu sumber data,
            <br />
            seluruh surat selesai.
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/60">
            Data pegawai, komponen surat, template, dan alur administrasi terhubung dalam satu
            mesin render deterministik.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Live preview di samping formulir pengisian",
              "Mail merge: geser baris data, seluruh dokumen berubah",
              "Ekspor PDF & DOCX dari tampilan yang sama",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-white/75">
                <span className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Check className="h-2.5 w-2.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/35">
          © {new Date().getFullYear()} Aksara. Dirancang untuk administrasi pemerintahan dan
          organisasi.
        </p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Beranda
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark className="h-6 w-6 text-[12px]" />
            <span className="text-[12.5px] font-semibold">Aksara</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-14 pt-4 sm:px-8">
          <div className="w-full max-w-[360px] animate-in">
            <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-ink">Masuk ke ruang kerja</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Gunakan akun yang diberikan administrator organisasi Anda.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
            <p className="mt-8 text-center text-[11px] leading-relaxed text-faint">
              Dengan masuk, Anda menyetujui kebijakan penggunaan internal organisasi.
              Sesi berakhir otomatis setelah 14 hari.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
