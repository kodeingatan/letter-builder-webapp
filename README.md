# Aksara — Platform Dokumen & Persuratan

Aksara mengubah data administrasi menjadi surat dinas yang siap cetak. Susun sumber data, komponen dokumen, template, dan alur administrasi satu kali — lalu terbitkan surat per baris data dengan nomor otomatis, pratinjau langsung, ekspor DOCX, dan cetak/PDF dari tampilan yang sama.

Dibangun untuk organisasi pemerintahan, sekolah, kampus, dan unit kerja yang masih menyalin data pegawai ke Word satu per satu.

---

## Konsep

Lima lapisan yang saling terhubung:

| Lapisan | Isi | Contoh |
| --- | --- | --- |
| **Global Tables** | Data induk sebagai baris dan field | Pegawai, Kegiatan |
| **Components** | Blok dokumen reusable | Kop surat, tanda tangan, tabel pegawai |
| **Templates** | Dokumen lengkap dengan variabel, loop, kondisi | Surat Perintah, Berita Acara |
| **Administrasi** | Paket alur: banyak step + sumber data + pola nomor | SPPD (3 step) |
| **Surat** | Instance per baris data, wizard + pratinjau | SP-005/DISPENDIK/XI/2026 |

Mesin render bersifat deterministik: ekspresi `{{nama}}`, loop struktural, dan kondisi dievaluasi tanpa `eval`. Satu hasil render dipakai untuk pratinjau, cetak, dan DOCX sehingga tampilan tidak pernah berbeda antar-output.

---

## Stack & alasan

- **Next.js 15 (App Router) + React 19 + TypeScript** — satu aplikasi full-stack: server components untuk data, route handlers untuk API, tanpa server terpisah.
- **Tailwind CSS v4** — token desain konsisten (warm neutral, border tipis, satu aksen biru) tanpa runtime CSS.
- **SQLite + better-sqlite3** — transaksi sinkron, nol layanan eksternal, cocok untuk deployment satu instansi. Skema idempoten dijalankan saat start.
- **zod** — validasi request yang sama ketatnya untuk semua endpoint.
- **docx + jszip** — ekspor Word asli dan arsip ZIP tanpa layanan pihak ketiga.
- **lucide-react** — ikon konsisten dan ringan.

Tidak ada state library, UI kit, atau ORM berat: state lokal + server actions/route handler sudah cukup untuk skala aplikasi ini.

---

## Struktur proyek

```
src/
├─ app/
│  ├─ page.tsx                 # landing page
│  ├─ (auth)/login/            # login + demo accounts
│  ├─ app/                     # area terautentikasi (sidebar + header)
│  │  ├─ page.tsx              # ringkasan & checklist onboarding
│  │  ├─ tables/               # Global Tables list + editor
│  │  ├─ components/           # Components list + editor
│  │  ├─ templates/            # Templates list + editor
│  │  ├─ administrasi/         # Alur & step builder
│  │  ├─ surat/                # Daftar surat + wizard
│  │  └─ settings/             # Instansi, pengguna, data & cadangan
│  ├─ print/                   # Tampilan cetak (single & bulk)
│  └─ api/                     # Route handlers per modul
├─ components/
│  ├─ document/                # DocumentView (satu sumber render)
│  ├─ editor/                  # Block editor, dialog variabel/loop/kondisi
│  ├─ layout/                  # AppShell, Brand
│  └─ ui/                      # Button, Input, Dialog, Drawer, Toast, dll.
├─ features/
│  ├─ global-tables/           # server + schema + workspace
│  ├─ components/
│  ├─ templates/
│  ├─ administrasi/
│  ├─ surat/                   # workspace, wizard, DOCX, print
│  └─ settings/                # organisasi, pengguna, backup/import/reset
└─ lib/
   ├─ db/                      # koneksi, skema, seed demo
   ├─ documents/               # tipe blok, engine, validasi, inline DOM
   ├─ auth.ts / password.ts    # sesi & scrypt
   ├─ http.ts                  # withApi, guard, error handling
   ├─ entities.ts              # mapper baris DB → tipe domain
   ├─ numbering.ts             # pola nomor surat
   └─ utils.ts
scripts/reset-db.mjs           # hapus DB lokal (npm run db:reset)
data/letter-builder.db         # dibuat otomatis, tidak di-commit
```

### Model data singkat

`global_tables → global_fields → global_records`  
`templates → template_versions`  
`administrasi → administrasi_steps`  
`surat → surat_step_data` (override per step) dan `surat_versions` (snapshot)  
`users → sessions`, `settings` (identitas instansi)

---

## UI

- **Warm neutral**: latar `#f6f5f4`, teks near-black, border `rgba(0,0,0,0.1)`, aksen biru `#0075de`.
- **Pola konsisten**: header halaman + tombol aksi, konten padat, panel kanan (drawer) untuk daftar tanpa menggeser editor.
- **Editor blok**: setiap paragraf dapat memuat variabel, loop, kondisi, component, tabel, atau page break. Toolbar sticky, undo/redo, dialog variabel dengan pencarian.
- **Wizard surat**: step tabs, pratinjau A4 yang menyesuaikan lebar layar, sidebar data + navigator baris + riwayat, autosave dengan indikator status.
- **State lengkap**: loading, kosong, error validasi, dan konfirmasi destruktif di semua alur utama.
- **Responsif**: sidebar collapsible/mobile drawer, tabel dapat digeser horizontal, pratinjau diperkecil otomatis.

---

## Menjalankan

Prasyarat: **Node.js 20+** dan build tools untuk `better-sqlite3` (di Windows biasanya sudah tersedia; jika gagal, pasang Visual Studio Build Tools).

```bash
npm install
cp .env.example .env        # opsional, ubah DATABASE_PATH bila perlu
npm run dev                 # http://localhost:3000
```

Saat pertama kali dijalankan, database dibuat di `data/letter-builder.db` beserta data contoh Dinas Pendidikan Kota Nusantara.

**Akun demo**

| Peran | Surel | Kata sandi |
| --- | --- | --- |
| Admin | `admin@demo.id` | `Admin1234!` |
| Operator | `operator@demo.id` | `Operator1234!` |

Ganti kata sandi melalui **Pengaturan → Pengguna**, dan hapus akun demo sebelum dipakai produksi.

### Perintah

```bash
npm run dev        # server pengembangan
npm run build      # build produksi
npm run start      # jalankan hasil build
npm run typecheck  # TypeScript tanpa emit
npm run db:reset   # hapus database lokal; data demo dibuat ulang saat start
```

Reset juga tersedia dari UI: **Pengaturan → Data & Cadangan** (dengan konfirmasi ketik `HAPUS`).

---

## Keamanan & validasi

- Kata sandi di-hash dengan **scrypt** + salt acak; token sesi acak 256-bit, hanya hash SHA-256 yang disimpan.
- Cookie sesi `HttpOnly`, `SameSite=Lax`, `Secure` di produksi, berlaku 14 hari.
- Setiap mutasi API memeriksa origin (`assertSameOrigin`) dan peran (`requireAdmin` untuk data master, template, hapus surat, dan pengaturan).
- Semua input divalidasi zod di server; form juga memvalidasi di klien. Pesan error dikembalikan tanpa membocorkan detail internal.
- Ekspresi dokumen tidak menggunakan `eval`/`Function`; hanya path, perbandingan, dan logika terbatas.
- Backup/import/reset hanya untuk admin; impor divalidasi dan dijalankan dalam satu transaksi.

**Catatan produksi**

- Jalankan di belakang HTTPS (cookie `Secure` aktif otomatis dengan `NODE_ENV=production`).
- SQLite adalah satu berkas: gunakan satu instance aplikasi (bukan serverless multi-instance) dan backup berkala. Untuk multi-tenant besar, port `src/lib/db` ke Postgres tanpa mengubah lapisan fitur.
- Tidak ada verifikasi surel/undangan lewat email; admin membuat akun dan membagikan kata sandi awal secara aman.

---

## Deploy

### VPS / Docker / Node host

```bash
npm ci
npm run build
NODE_ENV=production DATABASE_PATH=/var/lib/aksara/aksara.db npm run start -- -p 3000
```

- Mount volume persisten untuk direktori database dan cadangkan berkas `.db` (sertakan `-wal`/`-shm` saat menyalin, atau hentikan proses sebentar).
- Proses `next start` cukup satu replika. Gunakan reverse proxy (Nginx/Caddy) untuk TLS dan kompresi.
- Set `DATABASE_PATH` ke lokasi di luar folder build agar deploy ulang tidak menghapus data.

### Platform serverless

Aplikasi ini memakai SQLite lokal, sehingga **tidak cocok** untuk platform yang tidak menyediakan filesystem persisten (Vercel/Netlify functions). Gunakan VPS, container dengan volume, atau port database ke Postgres/MySQL bila ingin serverless.

### PDF

Ekspor PDF menggunakan dialog cetak browser (**Cetak / Simpan PDF**) dari halaman `/print/surat/[id]`, sehingga hasil PDF identik dengan pratinjau dan tidak membutuhkan Chromium di server. Cetak massal tersedia lewat `/print/surat?ids=...`.

---

## Alur kerja yang disarankan

1. **Global Tables** — impor/buat data pegawai dan kegiatan; tambahkan field yang dipakai surat.
2. **Components** — buat kop surat dan blok tanda tangan sekali; ubah di satu tempat untuk semua template.
3. **Templates** — susun dokumen, sisipkan variabel (`{{nama}}`, `{{surat.nomor}}`), loop tabel, dan kondisi.
4. **Administrasi** — pilih sumber data, atur filter, pola nomor (`SP-{seq}/DISPENDIK/{romanMonth}/{year}`), lalu urutkan step.
5. **Surat** — pilih baris data, isi field wizard, pantau pratinjau, ekspor DOCX atau cetak PDF, lalu selesaikan untuk mengunci nomor dan snapshot.

---

## Ide monetisasi & onboarding

- **Paket berlangganan per instansi**: Starter (1 admin, 3 template, 100 surat/bulan), Pro (template tak terbatas, ekspor massal, riwayat versi), Enterprise (SSO, audit log, SLA).
- **Add-on bernilai**: impor Excel/CSV otomatis, koneksi ke database kepegawaian (SIMPEG), e-signature, watermark/Qr verifikasi surat, portal tanda tangan.
- **Onboarding berbayar**: paket "siap pakai" berisi template resmi per jenis instansi (sekolah, puskesmas, kecamatan) + pelatihan 2 jam.
- **Pendekatan akuisisi**: mulai dari satu jenis surat yang paling menyakitkan (SPPD atau surat tugas massal), tunjukkan penghematan waktu per surat, lalu ekspansi ke seluruh administrasi.
- **Retensi**: checklist persiapan di dashboard, email ringkasan mingguan (surat draft, template berubah), dan backup otomatis ke object storage.
- **Kepercayaan**: halaman status, kebijakan retensi data, dan opsi ekspor penuh kapan saja — penting untuk sektor publik.

---

## Batasan yang diketahui

- PDF mengandalkan dialog cetak browser, bukan renderer headless.
- DOCX mengikuti struktur blok dan gaya dasar; tata letak mengambang (mis. teks di samping gambar) tidak didukung.
- Nomor surat unik per administrasi; pembatalan nomor belum memiliki seri terpisah.
- Editor blok menggunakan `contentEditable` per blok — cocok untuk dokumen terstruktur, bukan tata letak bebas seperti Canva.
