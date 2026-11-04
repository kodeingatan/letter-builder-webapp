import { z } from "zod";

export const conditionSchema = z.object({
  field: z.string().trim().min(1, "Field kondisi wajib diisi.").max(120),
  operator: z.enum(["eq", "neq", "contains", "notContains", "gt", "gte", "lt", "lte", "empty", "notEmpty"]),
  value: z.string().max(300).default(""),
});

export const letterFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, "Gunakan huruf kecil dan garis bawah, contoh: tanggal_berangkat."),
  label: z.string().trim().min(2).max(60),
  type: z.enum(["text", "textarea", "date", "number"]),
  scope: z.enum(["shared", "record"]).default("shared"),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(120).optional(),
});

export const administrasiStepSchema = z.object({
  id: z.string().trim().max(64).optional(),
  name: z.string().trim().min(2, "Nama step minimal 2 karakter.").max(80),
  templateId: z.string().trim().min(1, "Pilih template untuk setiap step."),
});

export const administrasiInputSchema = z.object({
  name: z.string().trim().min(2, "Nama administrasi minimal 2 karakter.").max(100),
  description: z.string().trim().max(240).default(""),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  dataSourceTableId: z.string().trim().max(64).nullable().default(null),
  filter: z.array(conditionSchema).max(10).default([]),
  numberPattern: z.string().trim().min(3, "Pola nomor minimal 3 karakter.").max(80),
  fields: z.array(letterFieldSchema).max(20).default([]),
  steps: z.array(administrasiStepSchema).min(1, "Minimal satu step diperlukan.").max(20),
});
