import { hashPassword } from "@/lib/password";
import {
  seedAdministrasi,
  seedComponents,
  seedSurat,
  seedTemplates,
} from "./seed-documents";
import type { Db } from "./index";

export function seedDatabase(db: Db): void {
  const now = new Date().toISOString();

  const insertUser = db.prepare(
    "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );

  insertUser.run("usr_admin", "Anindya Prameswari", "admin@demo.id", "admin", hashPassword("Admin1234!"), now);
  insertUser.run("usr_operator", "Raka Prasetyo", "operator@demo.id", "operator", hashPassword("Operator1234!"), now);

  db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  ).run(
    "organization",
    JSON.stringify({
      name: "PEMERINTAH KOTA NUSANTARA",
      subtitle: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
      address: "Jalan Merdeka No. 12, Kelurahan Sukamaju, Kecamatan Nusantara Tengah",
      city: "Nusantara 65123",
      phone: "(0341) 555-0123",
      email: "dispendik@nusantara.go.id",
      website: "dispendik.nusantara.go.id",
      signerName: "Dr. Anindya Prameswari, M.Pd.",
      signerRole: "Kepala Dinas Pendidikan dan Kebudayaan",
      signerNip: "19780412 200312 2 001",
    }),
    now,
  );

  seedTables(db, now);
  seedComponents(db, now);
  seedTemplates(db, now);
  seedAdministrasi(db, now);
  seedSurat(db, now);
}

function seedTables(db: Db, now: string): void {
  const insertTable = db.prepare(
    "INSERT INTO global_tables (id, name, slug, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertField = db.prepare(
    `INSERT INTO global_fields (id, table_id, name, label, type, options, required, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertRecord = db.prepare(
    "INSERT INTO global_records (id, table_id, data, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );

  insertTable.run(
    "tbl_pegawai",
    "Pegawai",
    "pegawai",
    "Data induk pegawai dinas — sumber variabel untuk surat perintah dan surat tugas.",
    "users",
    now,
    now,
  );

  const pegawaiFields: Array<[string, string, string, string, string, number]> = [
    ["nip", "NIP", "text", "[]", "", 1],
    ["nama", "Nama Lengkap", "text", "[]", "", 1],
    ["jabatan", "Jabatan", "text", "[]", "", 1],
    ["pangkat", "Pangkat / Golongan", "text", "[]", "", 0],
    ["unit_kerja", "Unit Kerja", "select", JSON.stringify(["Sekretariat", "Bidang Pembinaan", "Bidang Kebudayaan", "UPT SMP 3"]), "", 1],
    ["status_kepegawaian", "Status Kepegawaian", "select", JSON.stringify(["PNS", "PPPK", "Honorer"]), "", 1],
    ["email", "Surel", "email", "[]", "", 0],
    ["telepon", "Telepon", "text", "[]", "", 0],
  ];

  pegawaiFields.forEach(([name, label, type, options, _placeholder, required], index) => {
    insertField.run(`fld_${name}`, "tbl_pegawai", name, label, type, options, required, index);
  });

  const pegawai: Array<[string, Record<string, string>]> = [
    ["rka", {
      nip: "19820315 200801 1 004",
      nama: "Raka Prasetyo, S.Pd.",
      jabatan: "Analis Kurikulum Ahli Muda",
      pangkat: "Penata Muda Tk. I / III b",
      unit_kerja: "Bidang Pembinaan",
      status_kepegawaian: "PNS",
      email: "raka.prasetyo@nusantara.go.id",
      telepon: "0812-3456-7801",
    }],
    ["snt", {
      nip: "19900122 201503 2 007",
      nama: "Sinta Maharani, M.Pd.",
      jabatan: "Pengembang Teknologi Pembelajaran",
      pangkat: "Penata / III c",
      unit_kerja: "Bidang Pembinaan",
      status_kepegawaian: "PNS",
      email: "sinta.maharani@nusantara.go.id",
      telepon: "0812-3456-7802",
    }],
    ["bgs", {
      nip: "19871104 201001 1 009",
      nama: "Bagas Nugroho, S.Kom.",
      jabatan: "Pranata Komputer Ahli Pertama",
      pangkat: "Penata Muda / III a",
      unit_kerja: "Sekretariat",
      status_kepegawaian: "PNS",
      email: "bagas.nugroho@nusantara.go.id",
      telepon: "0812-3456-7803",
    }],
    ["ayu", {
      nip: "19930518 201903 2 011",
      nama: "Ayu Lestari, S.Pd.",
      jabatan: "Guru Ahli Pertama",
      pangkat: "Ahli Pertama / IX",
      unit_kerja: "UPT SMP 3",
      status_kepegawaian: "PPPK",
      email: "ayu.lestari@nusantara.go.id",
      telepon: "0812-3456-7804",
    }],
    ["dms", {
      nip: "19850630 200902 1 006",
      nama: "Dimas Aditya, S.E.",
      jabatan: "Perencana Ahli Muda",
      pangkat: "Penata / III c",
      unit_kerja: "Sekretariat",
      status_kepegawaian: "PNS",
      email: "dimas.aditya@nusantara.go.id",
      telepon: "0812-3456-7805",
    }],
    ["fjr", {
      nip: "19961207 202203 1 015",
      nama: "Fajar Ramadhan, S.Pd.",
      jabatan: "Pengelola Kesiswaan",
      pangkat: "Ahli Pertama / IX",
      unit_kerja: "Bidang Pembinaan",
      status_kepegawaian: "PPPK",
      email: "fajar.ramadhan@nusantara.go.id",
      telepon: "0812-3456-7806",
    }],
    ["rtn", {
      nip: "19800921 200501 2 003",
      nama: "Ratna Kusumawati, M.Si.",
      jabatan: "Kepala Bidang Kebudayaan",
      pangkat: "Pembina / IV a",
      unit_kerja: "Bidang Kebudayaan",
      status_kepegawaian: "PNS",
      email: "ratna.kusumawati@nusantara.go.id",
      telepon: "0812-3456-7807",
    }],
    ["nds", {
      nip: "19980105 202401 2 019",
      nama: "Nadia Safitri, S.Ds.",
      jabatan: "Pengelola Program Kebudayaan",
      pangkat: "—",
      unit_kerja: "Bidang Kebudayaan",
      status_kepegawaian: "Honorer",
      email: "nadia.safitri@nusantara.go.id",
      telepon: "0812-3456-7808",
    }],
  ];

  pegawai.forEach(([key, data], index) => {
    insertRecord.run(`rec_${key}`, "tbl_pegawai", JSON.stringify(data), index, now, now);
  });

  insertTable.run(
    "tbl_kegiatan",
    "Kegiatan",
    "kegiatan",
    "Daftar kegiatan dinas yang dapat dirujuk pada surat dan laporan.",
    "calendar",
    now,
    now,
  );

  const kegiatanFields: Array<[string, string, string, string]> = [
    ["nama_kegiatan", "Nama Kegiatan", "text", "[]"],
    ["jenis", "Jenis", "select", JSON.stringify(["Rapat", "Workshop", "Festival", "Studi Tiru"])],
    ["tempat", "Tempat", "text", "[]"],
    ["tanggal_mulai", "Tanggal Mulai", "date", "[]"],
    ["tanggal_selesai", "Tanggal Selesai", "date", "[]"],
    ["anggaran", "Anggaran (Rp)", "number", "[]"],
  ];
  kegiatanFields.forEach(([name, label, type, options], index) => {
    insertField.run(`fld_keg_${name}`, "tbl_kegiatan", name, label, type, options, index < 3 ? 1 : 0, index);
  });

  const kegiatan: Array<[string, Record<string, string | number>]> = [
    ["rakor", {
      nama_kegiatan: "Rapat Koordinasi Implementasi Kurikulum Merdeka",
      jenis: "Rapat",
      tempat: "Hotel Grand Nusantara",
      tanggal_mulai: "2026-09-24",
      tanggal_selesai: "2026-09-26",
      anggaran: 45000000,
    }],
    ["literasi", {
      nama_kegiatan: "Workshop Penguatan Literasi Digital Guru",
      jenis: "Workshop",
      tempat: "Aula Dinas Pendidikan",
      tanggal_mulai: "2026-10-12",
      tanggal_selesai: "2026-10-13",
      anggaran: 28500000,
    }],
    ["festival", {
      nama_kegiatan: "Festival Kebudayaan Nusantara 2026",
      jenis: "Festival",
      tempat: "Alun-alun Kota Nusantara",
      tanggal_mulai: "2026-11-08",
      tanggal_selesai: "2026-11-10",
      anggaran: 120000000,
    }],
  ];

  kegiatan.forEach(([key, data], index) => {
    insertRecord.run(`rec_keg_${key}`, "tbl_kegiatan", JSON.stringify(data), index, now, now);
  });
}
