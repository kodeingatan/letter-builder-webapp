import type {
  Block,
  BlockAlign,
  ComponentRefBlock,
  DocumentContent,
  HeadingBlock,
  InlineNode,
  PageConfig,
  ParagraphBlock,
  TableBlock,
  TextMark,
} from "@/lib/documents/types";
import { formatLetterNumber } from "@/lib/numbering";
import type { Db } from "./index";

let counter = 0;
function bid(): string {
  counter += 1;
  return `blk_seed_${counter}`;
}

function t(value: string, marks?: TextMark): InlineNode {
  return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
}

function ex(path: string): InlineNode {
  return { type: "expression", path };
}

function p(
  content: InlineNode[],
  attrs: Omit<Partial<ParagraphBlock>, "type" | "id" | "content"> = {},
): ParagraphBlock {
  return { id: bid(), type: "paragraph", content, ...attrs };
}

function h(
  level: 1 | 2 | 3,
  content: InlineNode[],
  align: BlockAlign = "center",
): HeadingBlock {
  return { id: bid(), type: "heading", level, content, align };
}

function table(
  rows: InlineNode[][][],
  options: { header?: boolean; widths?: number[]; repeat?: TableBlock["repeat"] } = {},
): TableBlock {
  return {
    id: bid(),
    type: "table",
    header: options.header ?? true,
    rows,
    widths: options.widths,
    repeat: options.repeat,
  };
}

function componentRef(componentId: string): ComponentRefBlock {
  return { id: bid(), type: "componentRef", componentId };
}

function spacer(height: number): Block {
  return { id: bid(), type: "spacer", height };
}

function doc(blocks: Block[]): DocumentContent {
  return { version: 1, blocks };
}

const PAGE: PageConfig = {
  paper: "A4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 20, left: 25 },
  fontFamily: "Times New Roman",
  fontSize: 12,
  lineHeight: 1.5,
};

function kopSurat(): DocumentContent {
  return doc([
    p([t("PEMERINTAH KOTA NUSANTARA", { bold: true, fontSize: 14 })], {
      align: "center",
      spacing: { after: 2 },
    }),
    p([t("DINAS PENDIDIKAN DAN KEBUDAYAAN", { bold: true, fontSize: 16 })], {
      align: "center",
      spacing: { after: 4 },
    }),
    p(
      [
        t(
          "Jalan Merdeka No. 12, Kelurahan Sukamaju, Kecamatan Nusantara Tengah",
          { fontSize: 10 },
        ),
      ],
      { align: "center", spacing: { after: 0 } },
    ),
    p(
      [
        t(
          "Nusantara 65123 · Telepon (0341) 555-0123 · dispendik@nusantara.go.id",
          { fontSize: 10 },
        ),
      ],
      { align: "center", spacing: { after: 8 } },
    ),
    { id: bid(), type: "divider" },
  ]);
}

function tandaTangan(): DocumentContent {
  return doc([
    spacer(12),
    p([t("Nusantara, "), ex("surat.tanggal")], { align: "right" }),
    p([t("Kepala Dinas Pendidikan dan Kebudayaan")], { align: "right" }),
    spacer(56),
    p(
      [
        t("Dr. Anindya Prameswari, M.Pd.", { bold: true, underline: true }),
      ],
      { align: "right" },
    ),
    p([t("NIP. 19780412 200312 2 001", { fontSize: 11 })], {
      align: "right",
      spacing: { after: 0 },
    }),
  ]);
}

function tabelPegawai(): DocumentContent {
  return doc([
    table(
      [
        [
          [t("No", { bold: true })],
          [t("Nama / NIP", { bold: true })],
          [t("Jabatan", { bold: true })],
          [t("Unit Kerja", { bold: true })],
        ],
        [
          [ex("_index")],
          [ex("nama"), t("\n"), ex("nip")],
          [ex("jabatan")],
          [ex("unit_kerja")],
        ],
      ],
      {
        header: true,
        widths: [6, 36, 34, 24],
        repeat: { source: "active" },
      },
    ),
  ]);
}

function identityRows(): Block[] {
  return [
    p([t("Nama", { bold: true }), t("  :  "), ex("nama")], { indent: 1 }),
    p([t("NIP", { bold: true }), t("  :  "), ex("nip")], { indent: 1 }),
    p([t("Jabatan", { bold: true }), t("  :  "), ex("jabatan")], { indent: 1 }),
    p([t("Unit Kerja", { bold: true }), t("  :  "), ex("unit_kerja")], { indent: 1 }),
  ];
}

export function seedComponents(db: Db, now: string): void {
  const insert = db.prepare(
    `INSERT INTO components (id, name, category, description, content, table_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  insert.run(
    "cmp_kop",
    "Kop Surat",
    "Kop & Identitas",
    "Kepala surat resmi dinas beserta alamat dan kontak.",
    JSON.stringify(kopSurat()),
    null,
    now,
    now,
  );

  insert.run(
    "cmp_ttd",
    "Blok Tanda Tangan",
    "Pengesahan",
    "Blok tanda tangan kepala dinas lengkap dengan tempat dan tanggal.",
    JSON.stringify(tandaTangan()),
    null,
    now,
    now,
  );

  insert.run(
    "cmp_tabel_pegawai",
    "Tabel Daftar Pegawai",
    "Tabel",
    "Tabel pegawai yang mengikuti baris data aktif — nomor urut otomatis.",
    JSON.stringify(tabelPegawai()),
    "tbl_pegawai",
    now,
    now,
  );
}

export function seedTemplates(db: Db, now: string): void {
  const insert = db.prepare(
    `INSERT INTO templates (id, name, description, content, page, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertVersion = db.prepare(
    `INSERT INTO template_versions (id, template_id, version, name, content, page, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const templates: Array<[string, string, string, DocumentContent]> = [
    [
      "tpl_surat_perintah",
      "Surat Perintah",
      "Perintah penugasan perjalanan dinas untuk satu pegawai.",
      doc([
        componentRef("cmp_kop"),
        spacer(8),
        h(1, [t("SURAT PERINTAH", { bold: true, fontSize: 16 })]),
        p([t("Nomor: "), ex("surat.nomor")], { align: "center" }),
        spacer(10),
        p([t("Dasar", { bold: true }), t("  :  "), ex("surat.dasar")], { indent: 1 }),
        p(
          [
            t(
              "Berdasarkan pertimbangan sebagaimana dimaksud dalam dasar tersebut di atas, dengan ini Kepala Dinas Pendidikan dan Kebudayaan Kota Nusantara memerintahkan kepada:",
            ),
          ],
          { align: "justify", indent: 1 },
        ),
        spacer(4),
        ...identityRows(),
        spacer(4),
        p(
          [
            t("Untuk melaksanakan perjalanan dinas ke "),
            ex("surat.tempat"),
            t(" pada tanggal "),
            ex("surat.tanggal_berangkat"),
            t(" sampai dengan "),
            ex("surat.tanggal_kembali"),
            t(", dalam rangka "),
            ex("surat.maksud"),
            t("."),
          ],
          { align: "justify", indent: 1 },
        ),
        p(
          [
            t(
              "Surat perintah ini diberikan untuk dilaksanakan dengan penuh tanggung jawab dan melaporkan hasilnya kepada atasan langsung.",
            ),
          ],
          { align: "justify", indent: 1 },
        ),
        componentRef("cmp_ttd"),
      ]),
    ],
    [
      "tpl_laporan",
      "Laporan Perjalanan Dinas",
      "Laporan pertanggungjawaban setelah perjalanan dinas selesai.",
      doc([
        componentRef("cmp_kop"),
        spacer(8),
        h(1, [t("LAPORAN PERJALANAN DINAS", { bold: true, fontSize: 16 })]),
        p([t("Nomor: "), ex("surat.nomor")], { align: "center" }),
        spacer(10),
        p([t("Yang bertanda tangan di bawah ini:")], { indent: 1 }),
        ...identityRows(),
        p(
          [
            t(
              "dengan ini menyampaikan laporan pelaksanaan perjalanan dinas dengan rincian sebagai berikut:",
            ),
          ],
          { align: "justify", indent: 1 },
        ),
        table(
          [
            [[t("Uraian", { bold: true })], [t("Keterangan", { bold: true })]],
            [[t("Tempat tujuan")], [ex("surat.tempat")]],
            [[t("Waktu pelaksanaan")], [ex("surat.tanggal_berangkat"), t(" – "), ex("surat.tanggal_kembali")]],
            [[t("Maksud perjalanan")], [ex("surat.maksud")]],
            [[t("Hasil yang dicapai")], [ex("surat.hasil")]],
          ],
          { header: true, widths: [32, 68] },
        ),
        spacer(6),
        p(
          [
            t(
              "Demikian laporan ini disusun sebagai bahan evaluasi dan pertanggungjawaban atas pelaksanaan tugas yang telah diberikan.",
            ),
          ],
          { align: "justify", indent: 1 },
        ),
        componentRef("cmp_ttd"),
      ]),
    ],
    [
      "tpl_berita_acara",
      "Berita Acara",
      "Berita acara serah terima hasil kegiatan.",
      doc([
        componentRef("cmp_kop"),
        spacer(8),
        h(1, [t("BERITA ACARA", { bold: true, fontSize: 16 })]),
        p([t("Nomor: "), ex("surat.nomor")], { align: "center" }),
        spacer(10),
        p(
          [
            t("Pada hari ini, "),
            ex("surat.tanggal"),
            t(", bertempat di "),
            ex("surat.tempat"),
            t(", telah dilaksanakan "),
            ex("surat.maksud"),
            t("."),
          ],
          { align: "justify", indent: 1 },
        ),
        p(
          [
            t(
              "Kegiatan berlangsung dengan tertib, seluruh dokumen dan barang yang diserahkan telah diperiksa dan dinyatakan sesuai dengan ketentuan.",
            ),
          ],
          { align: "justify", indent: 1 },
        ),
        p(
          [
            t(
              "Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
            ),
          ],
          { align: "justify", indent: 1 },
        ),
        componentRef("cmp_ttd"),
      ]),
    ],
    [
      "tpl_surat_tugas",
      "Surat Tugas Massal",
      "Menugaskan beberapa pegawai sekaligus dalam satu dokumen.",
      doc([
        componentRef("cmp_kop"),
        spacer(8),
        h(1, [t("SURAT TUGAS", { bold: true, fontSize: 16 })]),
        p([t("Nomor: "), ex("surat.nomor")], { align: "center" }),
        spacer(8),
        p(
          [t("Kepala Dinas Pendidikan dan Kebudayaan Kota Nusantara menugaskan kepada:")],
          { align: "justify", indent: 1 },
        ),
        componentRef("cmp_tabel_pegawai"),
        spacer(6),
        p(
          [
            t("Untuk melaksanakan "),
            ex("surat.maksud"),
            t(" di "),
            ex("surat.tempat"),
            t(", yang dilaksanakan dengan penuh tanggung jawab."),
          ],
          { align: "justify", indent: 1 },
        ),
        componentRef("cmp_ttd"),
      ]),
    ],
  ];

  templates.forEach(([id, name, description, content]) => {
    insert.run(id, name, description, JSON.stringify(content), JSON.stringify(PAGE), now, now);
    insertVersion.run(
      `tv_${id}_1`,
      id,
      1,
      name,
      JSON.stringify(content),
      JSON.stringify(PAGE),
      "usr_admin",
      now,
    );
  });
}

export function seedAdministrasi(db: Db, now: string): void {
  const insert = db.prepare(
    `INSERT INTO administrasi
      (id, name, description, status, data_source_table_id, filter, number_pattern, fields, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertStep = db.prepare(
    `INSERT INTO administrasi_steps (id, administrasi_id, template_id, name, position)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const sppdFields = [
    { key: "nomor", label: "Nomor Surat", type: "text", scope: "shared", required: true, placeholder: "SP-001/DISPENDIK/IX/2026" },
    { key: "tanggal", label: "Tanggal Surat", type: "date", scope: "shared", required: true },
    { key: "dasar", label: "Dasar Surat", type: "textarea", scope: "shared", required: true },
    { key: "maksud", label: "Maksud Perjalanan", type: "textarea", scope: "shared", required: true },
    { key: "tempat", label: "Tempat Tujuan", type: "text", scope: "shared", required: true },
    { key: "tanggal_berangkat", label: "Tanggal Berangkat", type: "date", scope: "shared", required: true },
    { key: "tanggal_kembali", label: "Tanggal Kembali", type: "date", scope: "shared", required: true },
    { key: "hasil", label: "Hasil yang Dicapai", type: "textarea", scope: "shared", required: false },
  ];

  insert.run(
    "adm_sppd",
    "Surat Perintah Perjalanan Dinas",
    "Paket lengkap SPPD: surat perintah, laporan perjalanan, dan berita acara.",
    "active",
    "tbl_pegawai",
    "[]",
    "SP-{seq}/DISPENDIK/{romanMonth}/{year}",
    JSON.stringify(sppdFields),
    now,
    now,
  );

  insertStep.run("stp_sppd_1", "adm_sppd", "tpl_surat_perintah", "Surat Perintah", 0);
  insertStep.run("stp_sppd_2", "adm_sppd", "tpl_laporan", "Laporan Perjalanan", 1);
  insertStep.run("stp_sppd_3", "adm_sppd", "tpl_berita_acara", "Berita Acara", 2);

  insert.run(
    "adm_surat_tugas",
    "Surat Tugas Massal",
    "Satu surat untuk banyak pegawai, ditampilkan sebagai tabel dinamis.",
    "active",
    "tbl_pegawai",
    "[]",
    "ST-{seq}/DISPENDIK/{romanMonth}/{year}",
    JSON.stringify([
      { key: "nomor", label: "Nomor Surat", type: "text", scope: "shared", required: true },
      { key: "tanggal", label: "Tanggal Surat", type: "date", scope: "shared", required: true },
      { key: "maksud", label: "Maksud Penugasan", type: "textarea", scope: "shared", required: true },
      { key: "tempat", label: "Tempat Pelaksanaan", type: "text", scope: "shared", required: true },
    ]),
    now,
    now,
  );

  insertStep.run("stp_st_1", "adm_surat_tugas", "tpl_surat_tugas", "Surat Tugas", 0);
}

export function seedSurat(db: Db, now: string): void {
  const insert = db.prepare(
    `INSERT INTO surat
      (id, administrasi_id, batch_id, record_id, record_snapshot, number, letter_date, status, data, current_step_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const pegawai = db
    .prepare("SELECT id, data FROM global_records WHERE table_id = 'tbl_pegawai' ORDER BY position")
    .all() as Array<{ id: string; data: string }>;

  const shared = {
    dasar: "Surat Edaran Kepala Dinas Nomor 421/1187/2026 tentang Penugasan Pegawai",
    maksud: "Rapat Koordinasi Implementasi Kurikulum Merdeka",
    tempat: "Hotel Grand Nusantara",
    tanggal_berangkat: "2026-09-24",
    tanggal_kembali: "2026-09-26",
    hasil: "Seluruh agenda rapat terlaksana dan kesepakatan implementasi telah dituangkan dalam notulen.",
    tanggal: "2026-09-20",
  };

  const batchId = "batch_seed_sppd";
  const date = new Date("2026-09-20T08:00:00.000Z");
  const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  pegawai.slice(0, 4).forEach((record, index) => {
    const data = JSON.parse(record.data) as Record<string, string>;
    const number = formatLetterNumber("SP-{seq}/DISPENDIK/{romanMonth}/{year}", {
      sequence: index + 1,
      date,
      record: data,
    });
    const status = index === 0 ? "completed" : "draft";
    const id = `srt_seed_${index + 1}`;

    insert.run(
      id,
      "adm_sppd",
      batchId,
      record.id,
      status === "completed" ? record.data : null,
      number,
      "2026-09-20",
      status,
      JSON.stringify({ ...shared, nomor: number }),
      "stp_sppd_1",
      "usr_operator",
      createdAt,
      createdAt,
    );
  });
}
