# PRD: Document & Correspondence Generation Platform

Versi 1.0 | Status: Draft untuk implementasi | Bahasa: Indonesia

## 1. Ringkasan

Aplikasi ini adalah **platform pembuat dokumen/surat dinamis**, bukan aplikasi CRUD biasa. Data, blok dokumen, template, alur administrasi, dan surat hasil dipisahkan menjadi lima layer yang saling terhubung, dengan satu engine rendering sebagai penghubung.

Alur inti:

`Global Tables -> Components -> Templates -> Administrasi -> Surat -> Generated Document (Preview / Print / PDF / DOCX)`

**Tujuan produk**

- Admin cukup mendefinisikan sekali: data, komponen, template, dan alur surat.
- User membuat surat dengan mengisi data per langkah sambil melihat live preview dokumen.
- Hasil surat dapat diedit, dicetak, dan diunduh sebagai PDF atau DOCX.

* Bekerja seperti **mailing list / mail merge**: data diambil dari Global Table, pengguna tidak perlu menginput data surat berulang kali, cukup menggeser baris data untuk mengganti seluruh isi Administrasi.

**Bukan tujuan (out of scope v1)**

- Tanda tangan elektronik tersertifikasi.
- Persetujuan/approval berjenjang antar pengguna.
- Kolaborasi real-time multi-user pada satu dokumen.
- Aplikasi mobile native.

## 2. Peran Pengguna

| Peran | Tugas utama |
| --- | --- |
| Admin | Mengelola Global Tables, Components, Templates, Administrasi, dan Settings |
| Operator / User | Membuat, mengedit, mencetak, dan mengunduh Surat berdasarkan Administrasi |

## 3. Glosarium

| Istilah | Definisi |
| --- | --- |
| Global Table | Tabel data dinamis (mis. Pegawai, Kegiatan) yang menjadi sumber variabel |
| Component | Blok dokumen reusable (mis. Kop Surat, Daftar Pegawai, Tanda Tangan) |
| Template | Dokumen lengkap yang menyusun teks, variabel, dan component |
| Administrasi | Paket alur (workflow) berisi urutan step; tiap step memakai satu Template |
| Surat | Instance nyata yang dibuat dari sebuah Administrasi (menggantikan istilah lama Hasil Surat) |
| Expression | Sintaks dinamis di dalam dokumen, mis. {{nomor}}, loop, dan IF/ELSE |
| Rendering Engine | Mesin yang menggabungkan Template + Component + data menjadi dokumen akhir |

## 4. Arsitektur Konseptual

```
Global Tables  --(sumber data / binding)-->  Components
Components     --(blok reusable)----------->  Templates
Templates      --(dipilih per step)-------->  Administrasi
Administrasi   --(membuat instance)-------->  Surat
Surat          --(rendering)--------------->  Preview / Print / PDF / DOCX
```

Satu **Rendering Engine** dipakai bersama oleh Component, Template, live preview, dan export, sehingga hasil preview identik dengan hasil cetak/unduh.

## 5. Model Data (Entitas)

| Entitas | Field utama | Relasi |
| --- | --- | --- |
| GlobalTable | id, nama, deskripsi | punya banyak GlobalField dan GlobalRecord |
| GlobalField | id, table\_id, nama\_field, tipe (text, number, date, select, boolean) | milik GlobalTable |
| GlobalRecord | id, table\_id, data (JSON) | milik GlobalTable |
| Component | id, nama, kategori, konten (JSON rich text), data\_source (table\_id, opsional), config (kolom, loop, kondisi) | dipakai banyak Template |
| Template | id, nama, konten (JSON TipTap), created\_at, updated\_at | memuat banyak Component; dipakai banyak Step |
| TemplateVersion | id, template\_id, nomor\_versi, konten, created\_at, created\_by | milik Template |
| Administrasi | id, nama, deskripsi, status | punya banyak AdministrasiStep |
| AdministrasiStep | id, administrasi\_id, urutan, nama\_step, template\_id | merujuk Template |
| Surat | id, administrasi\_id, nomor, tanggal, status (Draft/Completed), current\_step | punya banyak SuratStepData |
| SuratStepData | id, surat\_id, step\_id, data (JSON input), konten\_override (JSON, hasil edit manual) | milik Surat |
| SuratVersion | id, surat\_step\_id, nomor\_versi, snapshot, created\_at, created\_by | riwayat versi dokumen |

Catatan implementasi: konten dokumen disimpan sebagai JSON (format dokumen TipTap/ProseMirror), bukan HTML mentah, agar aman dan mudah dirender ulang.

## 6. Persyaratan Fungsional

### 6.1 Global Tables

- FR-GT-1: Admin dapat membuat, mengubah, dan menghapus tabel beserta field-nya.
- FR-GT-2: Admin dapat CRUD record pada tiap tabel.
- FR-GT-3: Data tabel dapat dipakai sebagai: satu record terpilih, field tunggal, list, tabel, loop, dan hasil filter berkondisi.
- FR-GT-4: Tabel dan field yang sedang dipakai Template/Component tidak boleh dihapus tanpa peringatan dan daftar dependensi.

### 6.2 Components

- FR-CP-1: Admin membuat Component berupa blok dokumen reusable (contoh: Kop Surat, Nomor Surat, Identitas Pegawai, Tanda Tangan, Daftar Pegawai, Tabel Kegiatan, Dasar Surat, Footer, Lampiran).
- FR-CP-2: Component dapat terikat ke satu Global Table dan memiliki konfigurasi kolom (mis. No, Nama, NIP, Pangkat, Jabatan).
- FR-CP-3: Component mendukung loop dan kondisi, contoh: untuk setiap Pegawai dengan jabatan tidak sama dengan Honorer, atau unit\_kerja sama dengan Intelijen.
- FR-CP-4: Editor Component memakai rich text editor yang sama dengan Template (lihat 6.3).
- FR-CP-5: Perubahan Component otomatis berlaku di semua Template yang memakainya (referensi, bukan salinan).

### 6.3 Templates dan Editor

**Konten rich text (clone Microsoft Word)**

- FR-TP-1: Editor memakai TipTap (ProseMirror), tampil sebagai kanvas halaman (ukuran kertas A4/F4, margin, pemisah halaman).
- FR-TP-2: Toolbar melayang (floating) berisi: bold, italic, underline, heading (H1-H3), alignment (kiri, tengah, kanan, rata kanan-kiri), list (bullet dan numbering), indent, font family dan ukuran, warna teks, serta tools tabel (sisip tabel, tambah/hapus baris dan kolom, gabung/pisah sel).
- FR-TP-3: Undo/redo, copy/paste dari Word, dan shortcut keyboard standar (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z).

**Expression via klik kanan**

- FR-TP-4: Klik kanan pada kanvas membuka context menu kustom (menggantikan menu browser) dengan item Sisipkan Variabel, Sisipkan Component, Sisipkan Loop, Sisipkan Kondisi.
- FR-TP-5: Sisipkan Variabel membuka popup berisi daftar Global Table dan field (pencarian dan pengelompokan per tabel). Memilih field menyisipkan expression seperti {{pegawai.nama}} di posisi kursor.
- FR-TP-6: Expression ditampilkan sebagai chip/inline node yang dapat dipilih dan dihapus sebagai satu kesatuan, bukan teks biasa.

**Conditional Logic builder (GUI)**

- FR-TP-7: Builder visual untuk blok IF / ELSE IF / ELSE pada component atau section, berdasarkan nilai Global Table.
- FR-TP-8: Kondisi dibuat lewat form: field, operator (sama dengan, tidak sama, berisi, lebih besar, lebih kecil, kosong), nilai; mendukung gabungan AND/OR.
- FR-TP-9: Blok kondisional tampil di editor sebagai bingkai berlabel yang dapat dilipat.

**Daftar dan pencarian Template**

- FR-TP-10: Halaman Templates memiliki global search dan filter: nama, tanggal pembuatan, dan Administrasi terkait.
- FR-TP-11: Daftar template, pencarian, dan filter berada di drawer kanan; area utama adalah editor penuh.

**Version history Template**

- FR-TP-12: Setiap simpan membuat TemplateVersion. User dapat melihat daftar versi, membandingkan/pratinjau, dan memulihkan (restore) versi lama. Restore membuat versi baru, tidak menimpa riwayat.

### 6.4 Administrasi

- FR-AD-1: Admin membuat Administrasi (paket alur) dengan beberapa Step berurutan; tiap Step memilih satu Template.
- FR-AD-2: Step dapat ditambah, diubah, dihapus, dan diurutkan ulang (drag and drop).
- FR-AD-3: Daftar paket Administrasi dan filter berada di drawer kanan.
- FR-AD-4: Contoh: Surat Perintah Perjalanan Dinas = Step 1 Surat Perintah, Step 2 Laporan Perjalanan, Step 3 Berita Acara, Step 4 Pertanggungjawaban.

### 6.5 Surat (Instance)

- FR-SR-1: Halaman Surat mengelompokkan surat per Administrasi, dengan tabel: Nomor, Tanggal, Status (Draft/Completed) dan tombol Buat Surat.
- FR-SR-2: Buat/Ubah Surat berupa **wizard step-by-step** (stepper vertikal atau horizontal), bukan satu form panjang.
- FR-SR-3: Tiap step menampilkan **dua panel**: kiri form data, kanan live document preview. Perubahan input memperbarui preview secara langsung (debounce maksimal 300 ms).
- FR-SR-4: Opsi cakupan preview: Full Document, Current Component, Current Section, Current Page.
- FR-SR-5: Aksi: Save Draft, Previous, Next, Print, PDF, DOCX.
- FR-SR-6: Hasil dokumen dapat diedit manual (override) tanpa mengubah Template; override tersimpan di SuratStepData.
- FR-SR-7: Version history dokumen: user dapat melihat dan memulihkan iterasi sebelumnya dari sebuah instance dokumen.

### 6.5A Mode Mailing List (Data Navigator)

Pengguna tidak mengetik ulang data untuk setiap surat: pilih sumber data dari Global Table, lalu geser baris data dan seluruh dokumen dalam Administrasi (semua step) berubah mengikuti baris tersebut.

**Konsep**

- Satu Administrasi/Surat diikat ke satu Global Table sebagai **sumber data utama** (mis. Pegawai, Kegiatan), dengan filter opsional.
- Hasil filter menjadi **daftar baris** (seperti daftar penerima mailing list). Baris yang sedang dipilih disebut **Active Record**.
- Semua step (Surat Perintah, Laporan, Berita Acara, Pertanggungjawaban) membaca Active Record yang sama, sehingga satu geseran baris memperbarui seluruh dokumen.

```
Global Table (N baris)
   -> filter -> Daftar Baris
                  [ < Sebelumnya ]  Baris 3 dari 25  [ Berikutnya > ]
                          |
                    Active Record
                          |
        Step 1 | Step 2 | Step 3 | Step 4  (semua preview ikut berubah)
```

**Persyaratan**

- FR-ML-1 Pengikatan data: Admin menetapkan sumber data utama, filter bawaan, dan pemetaan kolom tabel ke variabel template pada pengaturan Administrasi.
- FR-ML-2 Navigator baris: bar navigasi berisi Sebelumnya/Berikutnya, penanda Baris X dari N, lompat ke baris tertentu (dropdown dengan pencarian), dan pintasan keyboard (panah). Berpindah baris mengubah Active Record dan memperbarui semua preview step maksimal 300 ms.
- FR-ML-3 Panel daftar baris: tabel data pada drawer kanan (fixed) dengan pencarian, filter, dan centang baris; klik baris menjadikannya Active Record.
- FR-ML-4 Data tambahan: field yang tidak ada di tabel (nomor surat, tanggal, dasar) bisa bersifat **bersama** (diisi sekali, berlaku semua baris) atau **per baris**. Nomor surat dapat dibuat otomatis berurutan per baris.
- FR-ML-5 Status per baris: Belum dibuat, Draft, Completed. Berpindah baris tidak menghilangkan input (autosave otomatis).
- FR-ML-6 Aksi massal: Print, PDF, dan DOCX untuk baris terpilih atau seluruh daftar, dengan pilihan satu file gabungan atau ZIP berisi satu file per baris.
- FR-ML-7 Edit manual per baris (override) tetap tersimpan terpisah untuk tiap baris dan tidak terbawa ke baris lain.
- FR-ML-8 Perubahan data sumber: Surat berstatus Draft mengikuti data terbaru; Surat Completed menyimpan **snapshot** data sehingga tidak berubah bila Global Table diedit.

**Dua mode penggunaan**

| Mode | Perilaku | Contoh |
| --- | --- | --- |
| Satu surat per baris | Tiap baris menghasilkan satu set surat sendiri | Surat Perintah untuk masing-masing pegawai |
| Satu surat memuat banyak baris | Baris terpilih dimasukkan ke loop/tabel dalam satu dokumen | Surat Perintah dengan daftar pegawai |

### 6.6 Rendering Engine dan Sintaks Expression

| Fitur | Sintaks | Perilaku |
| --- | --- | --- |
| Field | {{pegawai.nama}} | Menampilkan nilai field |
| Field Surat | {{nomor}}, {{tanggal}} | Nilai dari input wizard |
| Component | \[Component: Daftar Pegawai\] | Menyisipkan blok component |
| Loop | FOR EACH pegawai ... END | Mengulang blok per record |
| Kondisi | IF jabatan != 'Honorer' ... ELSE ... END | Render bersyarat |

- FR-EN-1: Engine bersifat deterministik dan tanpa eksekusi kode bebas (tidak boleh eval JavaScript); ekspresi di-parse ke AST dan dievaluasi dengan whitelist operator.
- FR-EN-2: Field yang tidak ditemukan ditampilkan sebagai penanda jelas (mis. highlight merah) di preview, tidak membuat render gagal.
- FR-EN-3: Format tanggal dan angka mengikuti locale Indonesia (mis. 24 September 2026).

### 6.7 Export dan Print

- FR-EX-1: Print memakai CSS print dengan ukuran halaman sesuai Template.
- FR-EX-2: Download PDF dan DOCX menghasilkan tampilan yang setara dengan preview (tabel, alignment, kop surat, nomor halaman).

### 6.8 Settings, Import, Export, Reset

- FR-ST-1: Menu Settings, Import, Export, dan Reset berada di **sidebar**, bukan di header.
- FR-ST-2: Export menghasilkan file JSON seluruh konfigurasi dan data; Import memvalidasi struktur sebelum menimpa data.
- FR-ST-3: Reset menampilkan dialog konfirmasi dengan peringatan jelas.

## 7. Persyaratan UI/UX

**Layout global**

- Navigasi utama (Global Tables, Components, Templates, Administrasi, Surat, lalu Settings, Import, Export, Reset) berada di sidebar kiri.
- Sidebar dapat di-minimize/buka. Saat minimize, tampil hanya ikon (item menu diganti ikon) dengan tooltip nama menu. Ikon tidak boleh terpotong pada mode minimize.
- Header ramping, tanpa tombol Import, Export, Reset Demo.
- Area konten selalu **full width**.
- Desain **compact**: spacing rapat, ukuran font dan kontrol kecil, tabel padat.

**Pola drawer kanan (konsisten di semua modul)**

| Halaman | Isi drawer kanan | Area utama |
| --- | --- | --- |
| Templates | Daftar template, pencarian, semua filter | Editor template penuh |
| Components | Daftar component dan filter | Editor component penuh |
| Administrasi | Daftar paket alur dan filter | Editor alur/step |
| Global Tables | Daftar tabel dan filter | Editor struktur dan data tabel |

- Drawer berposisi **fixed** di sisi kanan, dapat dibuka/ditutup, tidak menggeser atau mengacaukan layout editor.
- Visual dan perilaku drawer harus seragam antar modul (komponen shared).

## 8. Persyaratan Non-Fungsional

| Kategori | Target |
| --- | --- |
| Performa | Update live preview kurang dari 300 ms untuk dokumen hingga 10 halaman |
| Keamanan | Sanitasi konten, tanpa eval, kontrol akses berbasis peran |
| Keandalan | Autosave draft, perlindungan kehilangan data saat tab ditutup |
| Kompatibilitas | Browser modern (Chrome, Edge, Firefox) desktop |
| Aksesibilitas | Navigasi keyboard pada toolbar, menu klik kanan, dan stepper |
| Audit | Catat siapa dan kapan membuat/mengubah Template dan Surat |

## 9. ARSITEKTUR

Proyek memakai monorepo dengan frontend Next.js dan backend NestJS, disusun per fitur (feature-based) agar tiap modul mandiri dan mudah dipahami developer baru.

### 9.1 Struktur Monorepo

```
my-project/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # NestJS backend
├── packages/
│   ├── shared/                 # Shared types & constants
│   ├── eslint-config/          # ESLint configuration
│   ├── typescript-config/      # TypeScript configuration
│   └── ui/                     # Shared UI components (optional)
├── docs/
│   ├── architecture/
│   ├── api/
│   └── development-guide.md
├── scripts/
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### 9.2 Arsitektur Folder Frontend (Next.js)

```
apps/web/
├── public/
├── src/
│   ├── app/                         # Routing Next.js
│   │   ├── (public)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── users/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── providers.tsx
│   ├── features/                    # Modul berdasarkan fitur
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── users/                   # struktur sama seperti auth
│   │   └── reports/                 # struktur sama seperti auth
│   ├── components/                  # Komponen global
│   │   ├── ui/
│   │   ├── layout/
│   │   └── shared/
│   ├── hooks/                       # Global hooks
│   ├── lib/                         # Library & integrations
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── config/                      # Konfigurasi aplikasi
│   ├── constants/                   # Konstanta global
│   ├── types/                       # Global types
│   └── middleware.ts
├── next.config.ts
└── package.json
```

**Contoh implementasi satu fitur**

```
features/users/
├── components/
│   ├── user-table.tsx
│   ├── user-form.tsx
│   ├── user-detail.tsx
│   └── user-filter.tsx
├── hooks/
│   ├── use-users.ts
│   └── use-user-detail.ts
├── services/
│   └── user-api.ts
├── schemas/
│   └── user.schema.ts
├── types/
│   └── user.types.ts
└── index.ts
```

**Alur kerja frontend**

```
app/(dashboard)/users/page.tsx
        |
        v
features/users/components/
        |
        v
features/users/hooks/
        |
        v
features/users/services/
        |
        v
lib/api-client.ts
        |
        v
NestJS API
```

### 9.3 Arsitektur Folder Backend (NestJS)

Setiap modul memakai empat lapisan: domain, application, infrastructure, dan presentation.

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   ├── interfaces/
│   │   │   │   └── exceptions/
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   └── services/
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   └── repositories/
│   │   │   ├── presentation/
│   │   │   │   ├── controllers/
│   │   │   │   └── dto/
│   │   │   ├── auth.module.ts
│   │   │   └── index.ts
│   │   ├── users/                   # struktur sama seperti auth
│   │   └── reports/                 # struktur sama seperti auth
│   ├── common/                      # Komponen lintas modul
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── validation.ts
│   └── database/
│       ├── prisma/
│       └── database.module.ts
├── test/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
```

**Alur kode backend**

```
HTTP Request
    |
    v
UsersController
    |
    v
CreateUserUseCase
    |
    v
UserRepository (Interface)
    |
    v
PrismaUserRepository
    |
    v
PostgreSQL
```

### 9.4 Pemetaan Modul Aplikasi ke Arsitektur

Nama fitur pada contoh (users, reports) diganti dengan modul domain aplikasi ini. Setiap modul ada di frontend (features/) dan backend (modules/) dengan nama yang sama.

| Modul | Tanggung jawab |
| --- | --- |
| auth, users | Login, peran Admin dan Operator |
| global-tables | Tabel, field, dan record sumber data |
| components | Blok dokumen reusable |
| templates | Template, editor, dan version history |
| administrasi | Paket alur dan step |
| surat | Instance surat, wizard, mailing list navigator, version history |
| rendering | Rendering Engine: parser, evaluator, renderer expression |
| export | Print, PDF, dan DOCX |
| settings | Pengaturan, import, export, dan reset data |

Kontrak tipe data bersama (mis. tipe expression, status surat) ditempatkan di packages/shared agar frontend dan backend memakai definisi yang sama.

### 9.5 Standar Penamaan File

| Jenis | Standar | Contoh |
| --- | --- | --- |
| React Component | kebab-case | user-table.tsx |
| Custom Hook | use + kebab-case | use-users.ts |
| Service | kebab-case | user-api.ts |
| Schema | kebab-case | user.schema.ts |
| Type | kebab-case | user.types.ts |
| NestJS Controller | kebab-case | users.controller.ts |
| NestJS Service | kebab-case | users.service.ts |
| Use Case | kebab-case | create-user.use-case.ts |
| DTO | kebab-case | create-user.dto.ts |
| Repository | kebab-case | user.repository.ts |

Aturan penamaan:

- Folder menggunakan kebab-case.
- File menggunakan kebab-case.
- Class menggunakan PascalCase.
- Variable dan function menggunakan camelCase.
- Constant menggunakan UPPER\_SNAKE\_CASE.
- Satu file sebaiknya memiliki satu tanggung jawab utama.

### 9.6 Teknologi yang Direkomendasikan

| Kebutuhan | Teknologi |
| --- | --- |
| Frontend | Next.js |
| Backend | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| API Documentation | Swagger / OpenAPI |
| Data Fetching | TanStack Query |
| Form Validation | Zod |
| Backend Validation | class-validator |
| Monorepo | Turborepo |
| Package Manager | pnpm |
| Testing | Jest / Vitest / Playwright |
| Code Quality | ESLint + Prettier |

Tidak semua teknologi wajib digunakan sekaligus; pilih sesuai kompleksitas aplikasi. Teknologi khusus fitur (TipTap, Rendering Engine, export PDF/DOCX) ada di bagian 10.

### 9.7 Aturan Wajib Agar Arsitektur Tidak Berantakan

1. **Hindari Fat Controller.** Controller hanya menangani HTTP request, validasi input, dan response. Jangan menaruh business logic di dalamnya.
2. **Hindari Fat Service.** Pisahkan proses bisnis berdasarkan use case jika kompleksitas meningkat. Jangan membuat satu service berisi puluhan fungsi yang tidak saling berkaitan.
3. **Jangan mencampur fitur.** Tiap fitur punya folder sendiri (users, roles, permissions, reports, notifications). Jangan membuat satu folder services/ global yang berisi seluruh business logic.
4. **Hindari circular dependency.** Modul Users tidak boleh bergantung langsung pada internal modul Reports, dan sebaliknya. Gunakan kontrak atau application service yang jelas jika diperlukan.
5. **Shared hanya untuk kebutuhan bersama.** Jangan semua kode dimasukkan ke shared, common, atau utils. Kode yang hanya dipakai satu fitur tetap berada di fitur tersebut.
6. **Dokumentasikan setiap modul.** Minimal ada README berisi: tujuan fitur, alur bisnis, endpoint API, struktur folder, dependensi dengan modul lain, serta cara menjalankan dan menguji.

## 10. Rekomendasi Teknis

- Editor: TipTap (ProseMirror) dengan custom node untuk Expression, Component, Loop, dan Conditional.
- Frontend: React + state management terpusat; komponen UI shared (Sidebar, RightDrawer, Stepper, SplitPreview).
- Penyimpanan konten: JSON dokumen; relasi dan versi di database relasional.
- Export PDF: rendering HTML ke PDF (headless browser) di server; DOCX via library konversi dokumen (mis. docx).
- Engine: modul terpisah yang dapat diuji unit (parser, evaluator, renderer).

## 11. Rencana Rilis

| Fase | Cakupan |
| --- | --- |
| 1 - Fondasi | Layout (sidebar, drawer kanan, compact), Global Tables, model data |
| 2 - Editor | TipTap, toolbar, klik kanan variabel, Components, Templates |
| 3 - Logika | Rendering Engine, loop, Conditional builder, version history Template |
| 4 - Alur | Administrasi, Surat wizard, live preview |
| 5 - Output | Print, PDF, DOCX, version history Surat |
| 6 - Penyelesaian | Settings, Import/Export/Reset, pencarian global, hardening |

## 12. Kriteria Penerimaan (Contoh)

- Admin dapat mengklik kanan di editor, memilih field Pegawai.nama, dan chip {{pegawai.nama}} muncul di posisi kursor.
- Mengubah Nomor di wizard memperbarui preview tanpa reload dalam waktu kurang dari 300 ms.
- Template dengan IF jabatan != 'Honorer' tidak menampilkan pegawai Honorer di dokumen hasil.
- Memulihkan versi lama membuat versi baru dan konten kembali sesuai versi tersebut.
- Sidebar minimize menampilkan ikon utuh (tidak terpotong) dan area konten melebar penuh.
- Drawer kanan di Templates, Components, Administrasi, dan Global Tables berposisi fixed dan tampil seragam.
- PDF dan DOCX hasil unduhan sesuai tampilan preview.

* Menekan Berikutnya pada navigator mengganti Active Record dan semua preview step berubah tanpa input ulang dalam waktu kurang dari 300 ms.
* Surat Completed tetap menampilkan data lama setelah record Global Table diubah; Surat Draft mengikuti data terbaru.
* Aksi massal menghasilkan satu PDF gabungan atau ZIP berisi satu file per baris terpilih.

## 13. Risiko dan Pertanyaan Terbuka

- Kesetaraan visual PDF/DOCX dengan preview untuk tabel kompleks dan pemisah halaman perlu diuji sejak dini.
- Apakah kebutuhan hak akses perlu lebih detail dari dua peran (Admin, Operator)?
- Format penomoran surat otomatis (mis. SP-001/IX/2026): manual atau digenerate dengan aturan?
- Apakah data Global Tables perlu diimpor dari Excel/CSV pada v1?
- Perlu tidaknya penyimpanan lokal (offline) atau cukup server database?
