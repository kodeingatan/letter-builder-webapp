import { z } from "zod";

export const FIELD_TYPES = ["text", "number", "date", "select", "boolean", "email"] as const;

export const tableInputSchema = z.object({
  name: z.string().trim().min(2, "Nama tabel minimal 2 karakter.").max(60, "Nama tabel maksimal 60 karakter."),
  description: z.string().trim().max(240, "Deskripsi maksimal 240 karakter.").default(""),
  icon: z.string().trim().max(24).default("table"),
});

export const fieldInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama field minimal 2 karakter.")
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, "Gunakan huruf kecil, angka, dan garis bawah (contoh: unit_kerja)."),
  label: z.string().trim().min(2, "Label minimal 2 karakter.").max(60),
  type: z.enum(FIELD_TYPES),
  options: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  required: z.boolean().default(false),
});

export const fieldUpdateSchema = fieldInputSchema.partial().extend({
  position: z.number().int().min(0).max(200).optional(),
});

export const recordInputSchema = z.object({
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
