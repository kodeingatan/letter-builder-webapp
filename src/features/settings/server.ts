import "server-only";
import { z } from "zod";
import { createId, getDb, nowIso, parseJson } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { OrganizationSettings } from "@/lib/entities";
import { ApiError } from "@/lib/http";
import type { createUserSchema } from "./schema";

export const DEFAULT_SETTINGS: OrganizationSettings = {
  name: "Nama Instansi",
  subtitle: "Unit Kerja",
  address: "",
  city: "",
  phone: "",
  email: "",
  website: "",
  signerName: "",
  signerRole: "",
  signerNip: "",
};

const settingsSchema = z.object({
  name: z.string().default(DEFAULT_SETTINGS.name),
  subtitle: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  website: z.string().default(""),
  signerName: z.string().default(""),
  signerRole: z.string().default(""),
  signerNip: z.string().default(""),
});

export function getSettings(): OrganizationSettings {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'organization'").get() as
    | { value: string }
    | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  const parsed = settingsSchema.safeParse(parseJson<unknown>(row.value, {}));
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
}

export function saveSettings(input: OrganizationSettings): OrganizationSettings {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('organization', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(JSON.stringify(input), nowIso());
  return input;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator";
  createdAt: string;
}

export function listUsers(): UserRow[] {
  const rows = getDb()
    .prepare("SELECT id, name, email, role, created_at FROM users ORDER BY name COLLATE NOCASE")
    .all() as Array<{ id: string; name: string; email: string; role: string; created_at: string }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === "admin" ? "admin" : "operator",
    createdAt: row.created_at,
  }));
}

export function createUser(input: z.infer<typeof createUserSchema>): UserRow {
  const existing = getDb()
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(input.email) as { id: string } | undefined;
  if (existing) throw new ApiError(409, "Surel sudah terdaftar.");

  const id = createId("usr");
  const createdAt = nowIso();
  getDb()
    .prepare(
      "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, input.name, input.email, input.role, hashPassword(input.password), createdAt);

  return { id, name: input.name, email: input.email, role: input.role, createdAt };
}

export function deleteUser(id: string, actorId: string): void {
  if (id === actorId) throw new ApiError(422, "Anda tidak dapat menghapus akun sendiri.");
  const target = getDb().prepare("SELECT role FROM users WHERE id = ?").get(id) as
    | { role: string }
    | undefined;
  if (!target) throw new ApiError(404, "Pengguna tidak ditemukan.");

  if (target.role === "admin") {
    const admins = getDb().prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'").get() as {
      total: number;
    };
    if (admins.total <= 1) throw new ApiError(422, "Minimal satu admin harus tetap ada.");
  }

  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): void {
  const row = getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as
    | { password_hash: string }
    | undefined;
  if (!row) throw new ApiError(404, "Pengguna tidak ditemukan.");
  if (!verifyPassword(currentPassword, row.password_hash)) {
    throw new ApiError(422, "Kata sandi saat ini tidak sesuai.");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(422, "Kata sandi baru harus berbeda dari yang lama.");
  }
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(newPassword), userId);
}
