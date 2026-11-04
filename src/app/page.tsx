import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  FileDown,
  FileText,
  Layers,
  LayoutList,
  MousePointerClick,
  Printer,
  Table2,
  Workflow,
} from "lucide-react";
import { BrandMark } from "@/components/layout/brand";

const FEATURES = [
  {
    icon: Table2,
    title: "Global Tables",
    body: "Data pegawai, kegiatan, atau unit kerja menjadi sumber variabel tunggal. Ubah sekali, seluruh surat ikut menyesuaikan.",
  },
  {
    icon: Blocks,
    title: "Components reusable",
    body: "Kop surat, blok tanda tangan, dan tabel dinamis disusun sekali lalu dipakai lintas template sebagai referensi, bukan salinan.",
  },
  {
    icon: MousePointerClick,
    title: "Editor yang mengenal data",
    body: "Klik kanan di kanvas untuk menyisipkan variabel. Loop dan kondisi dibuat lewat builder visual, tanpa menulis sintaks.",
  },
  {
    icon: Workflow,
    title: "Administrasi multi-step",
    body: "Susun alur seperti SPPD: surat perintah, laporan, dan berita acara dalam satu paket yang berjalan berurutan.",
  },
  {
    icon: LayoutList,
    title: "Mode mailing list",
    body: "Pilih baris data, seluruh dokumen berubah. Nomor surat berurutan otomatis dan status tersimpan per baris.",
  },
  {
    icon: FileDown,
    title: "Cetak, PDF, DOCX",
    body: "Preview, hasil cetak, dan unduhan memakai mesin render yang sama — tata letak tetap konsisten di ketiganya.",
  },
];

const LAYERS = [
  { label: "Global Tables", icon: Table2 },
  { label: "Components", icon: Blocks },
  { label: "Templates", icon: FileText },
  { label: "Administrasi", icon: Workflow },
  { label: "Surat", icon: Layers },
];

export default function LandingPage() {
  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 px-5">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <span className="text-[14px] font-semibold tracking-[-0.02em] text-ink">Aksara</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-5 text-[12.5px] font-medium text-muted md:flex">
            <a href="#fitur" className="transition-colors hover:text-ink">Fitur</a>
            <a href="#alur" className="transition-colors hover:text-ink">Alur kerja</a>
            <a href="#mulai" className="transition-colors hover:text-ink">Mulai</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-[5px] px-2.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-warm hover:text-ink"
            >
              Masuk
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-[5px] bg-brand px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Buka demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, rgba(0,117,222,0.06) 0%, rgba(255,255,255,0) 70%)",
            }}
          />
          <div className="relative mx-auto max-w-[1120px] px-5 pb-16 pt-14 sm:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-warm px-2.5 py-1 text-[11px] font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  Dokumen dinamis, bukan aplikasi CRUD
                </span>
                <h1 className="mt-5 text-[40px] font-semibold leading-[1.04] tracking-[-1.8px] text-ink sm:text-[52px] sm:tracking-[-2.1px]">
                  Surat dinas selesai
                  <br />
                  dalam hitungan menit.
                </h1>
                <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-muted">
                  Aksara menyatukan data, komponen, template, dan alur administrasi. Operator
                  cukup menggeser baris data — seluruh isi dokumen berubah, siap cetak dan diunduh.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-[5px] bg-brand px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-colors hover:bg-brand-strong"
                  >
                    Coba ruang kerja demo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <a
                    href="#fitur"
                    className="inline-flex items-center gap-2 rounded-[5px] border border-line px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-warm"
                  >
                    Lihat kemampuan
                  </a>
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Tanpa instalasi
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Akun demo admin & operator
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Data contoh siap pakai
                  </span>
                </p>
              </div>

              <ProductMock />
            </div>

            <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
              {[
                ["5", "lapisan dokumen terhubung"],
                ["Live", "pratinjau saat mengetik"],
                ["3 format", "cetak, PDF, dan DOCX"],
                ["2 peran", "admin dan operator"],
              ].map(([value, label]) => (
                <div key={label} className="bg-canvas px-4 py-3.5">
                  <p className="text-[19px] font-semibold tracking-[-0.03em] text-ink">{value}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fitur" className="mx-auto max-w-[1120px] px-5 py-16 sm:py-20">
          <div className="max-w-[560px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
              Kemampuan inti
            </p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-1.1px] text-ink sm:text-[36px]">
              Dibangun untuk surat yang berulang, bukan sekali jadi.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Setiap bagian dokumen dapat dipakai ulang dan diuji. Administrator mengatur sekali,
              operator bekerja cepat tanpa mengorbankan konsistensi.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group bg-canvas p-5 transition-colors hover:bg-warm/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line bg-warm text-ink transition-colors group-hover:bg-canvas">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-3 text-[13.5px] font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="alur" className="border-y border-line bg-warm/50">
          <div className="mx-auto max-w-[1120px] px-5 py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                  Alur kerja
                </p>
                <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-1.1px] text-ink">
                  Lima lapisan, satu mesin render.
                </h2>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">
                  Data mengalir dari tabel ke komponen, komponen dipakai template, template
                  dirangkai menjadi administrasi, lalu menjadi surat nyata. Preview, cetak, dan
                  ekspor membaca model yang sama.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Tidak ada HTML mentah yang disimpan — hanya JSON dokumen.",
                    "Ekspresi dievaluasi tanpa eval, dengan whitelist operator.",
                    "Surat selesai menyimpan snapshot data agar tidak berubah.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12.5px] text-muted">
                      <CheckCircle2 className="mt-[2px] h-3.5 w-3.5 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[12px] border border-line bg-canvas p-5 shadow-[var(--shadow-card)]">
                <div className="grid gap-2">
                  {LAYERS.map((layer, index) => {
                    const Icon = layer.icon;
                    return (
                      <div key={layer.label}>
                        <div className="flex items-center gap-3 rounded-[7px] border border-line bg-canvas px-3 py-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-warm text-[10px] font-semibold text-muted">
                            {index + 1}
                          </span>
                          <Icon className="h-4 w-4 text-brand" strokeWidth={1.8} />
                          <span className="text-[12.5px] font-medium text-ink">{layer.label}</span>
                          <span className="ml-auto rounded-full bg-warm px-2 py-0.5 text-[10px] font-medium text-muted">
                            {index === 4 ? "Preview · Print · PDF · DOCX" : "Referensi"}
                          </span>
                        </div>
                        {index < LAYERS.length - 1 ? (
                          <div className="ml-[26px] h-3 w-px bg-line" aria-hidden />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="mulai" className="mx-auto max-w-[1120px] px-5 py-16 sm:py-20">
          <div className="rounded-[16px] border border-line bg-[#1f1e1c] px-6 py-10 text-white sm:px-10 sm:py-12">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div className="max-w-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Mulai sekarang
                </p>
                <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-1.1px] sm:text-[34px]">
                  Lihat sendiri bagaimana satu baris data mengubah seluruh dokumen.
                </h2>
                <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">
                  Ruang kerja demo sudah berisi data pegawai, template, dan paket SPPD lengkap.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1f1e1c] transition-colors hover:bg-white/90"
                >
                  Masuk ke demo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="text-center text-[10.5px] text-white/40">
                  admin@demo.id · Admin1234!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-6">
          <div className="flex items-center gap-2">
            <BrandMark className="h-5 w-5 text-[10px]" />
            <span className="text-[12px] font-medium text-muted">
              Aksara — platform dokumen & persuratan
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11.5px] text-faint">
            <span className="inline-flex items-center gap-1">
              <Printer className="h-3 w-3" /> Siap cetak
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> JSON-native
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductMock() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-4 -bottom-6 top-8 rounded-[16px] bg-warm"
      />
      <div className="relative overflow-hidden rounded-[12px] border border-line bg-canvas shadow-[var(--shadow-deep)]">
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#e5e2df]" />
          <span className="h-2 w-2 rounded-full bg-[#e5e2df]" />
          <span className="h-2 w-2 rounded-full bg-[#e5e2df]" />
          <span className="ml-2 rounded-[3px] bg-warm px-2 py-0.5 text-[9.5px] text-faint">
            aksara.app/surat
          </span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[8.5px] font-semibold text-success">
            <span className="h-1 w-1 rounded-full bg-success" /> Tersimpan
          </span>
        </div>

        <div className="grid grid-cols-[112px_1fr]">
          <div className="border-r border-line bg-[#fbfaf9] p-2.5">
            <div className="mb-2.5 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-ink text-[8px] font-semibold text-white">
                A
              </span>
              <span className="text-[9px] font-semibold text-ink">Aksara</span>
            </div>
            {["Ringkasan", "Global Tables", "Components", "Templates", "Administrasi", "Surat"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`mb-0.5 flex items-center gap-1 rounded-[3px] px-1.5 py-1 text-[8.5px] ${
                    index === 5 ? "bg-warm font-medium text-ink" : "text-faint"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-[1px] border border-current opacity-50" />
                  {item}
                </div>
              ),
            )}
          </div>

          <div className="bg-warm/60 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="rounded-[3px] bg-canvas px-1.5 py-0.5 text-[8px] font-medium text-muted ring-1 ring-line">
                  Surat Perintah
                </span>
                <span className="px-1.5 py-0.5 text-[8px] text-faint">Laporan</span>
                <span className="px-1.5 py-0.5 text-[8px] text-faint">Berita Acara</span>
              </div>
              <span className="rounded-[3px] bg-brand px-1.5 py-0.5 text-[8px] font-medium text-white">
                Simpan
              </span>
            </div>

            <div className="grid grid-cols-[0.78fr_1fr] gap-2">
              <div className="rounded-[4px] border border-line bg-canvas p-2">
                {[
                  ["Nomor surat", "SP-003/DISPENDIK/IX/2026"],
                  ["Tanggal", "20 September 2026"],
                  ["Tempat tujuan", "Hotel Grand Nusantara"],
                  ["Maksud", "Rapat Koordinasi Kurikulum"],
                ].map(([label, value]) => (
                  <div key={label} className="mb-1.5">
                    <p className="text-[7px] uppercase tracking-wide text-faint">{label}</p>
                    <div className="mt-0.5 truncate rounded-[2px] border border-line px-1 py-0.5 text-[7.5px] text-ink">
                      {value}
                    </div>
                  </div>
                ))}
                <div className="mt-2 rounded-[3px] border border-line px-1 py-1">
                  <p className="text-[6.5px] uppercase tracking-wide text-faint">Baris data</p>
                  <div className="mt-1 flex items-center justify-between text-[8px] text-ink">
                    <span>‹</span>
                    <span>3 dari 8</span>
                    <span>›</span>
                  </div>
                  <div className="mt-1 h-0.5 rounded-full bg-warm">
                    <div className="h-0.5 w-[38%] rounded-full bg-brand" />
                  </div>
                </div>
              </div>

              <div className="rounded-[4px] border border-line bg-canvas p-2.5">
                <div className="mx-auto w-full max-w-[150px] bg-white p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.1)]">
                  <p className="text-center text-[5px] font-semibold tracking-wide">
                    PEMERINTAH KOTA NUSANTARA
                  </p>
                  <p className="text-center text-[6px] font-bold">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
                  <p className="mt-0.5 text-center text-[3.5px] text-neutral-500">
                    Jalan Merdeka No. 12, Nusantara 65123
                  </p>
                  <div className="my-1 border-t border-black/50" />
                  <p className="mt-1.5 text-center text-[6px] font-bold tracking-wide">
                    SURAT PERINTAH
                  </p>
                  <p className="text-center text-[4px]">Nomor: SP-003/DISPENDIK/IX/2026</p>
                  <div className="mt-1.5 space-y-[2px]">
                    <div className="h-[2px] w-full rounded-full bg-neutral-200" />
                    <div className="h-[2px] w-[92%] rounded-full bg-neutral-200" />
                    <div className="h-[2px] w-[96%] rounded-full bg-neutral-200" />
                  </div>
                  <div className="mt-1.5 space-y-[3px]">
                    {["Nama", "NIP", "Jabatan"].map((label) => (
                      <div key={label} className="flex gap-1 text-[3.5px]">
                        <span className="w-[22px] text-neutral-500">{label}</span>
                        <span className="flex-1 border-b border-dotted border-neutral-300">
                          <span className="rounded-[1px] bg-brand/10 px-0.5">
                            {label === "Nama" ? "Bagas Nugroho, S.Kom." : label === "NIP" ? "19871104 201001 1 009" : "Pranata Komputer"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <div className="w-[52px] text-center">
                      <p className="text-[3px] text-neutral-500">Nusantara, 20 September 2026</p>
                      <p className="mt-2 text-[3px] font-semibold underline">Dr. Anindya Prameswari</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-3 hidden items-center gap-1.5 rounded-[6px] border border-line bg-canvas px-2 py-1.5 shadow-[var(--shadow-float)] sm:flex">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-2.5 w-2.5" />
        </span>
        <span className="text-[9px] font-medium text-ink">Preview diperbarui · 214 ms</span>
      </div>
    </div>
  );
}
