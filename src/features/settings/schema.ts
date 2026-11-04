import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Nama organisasi minimal 2 karakter.").max(160),
  subtitle: z.string().trim().max(160).default(""),
  address: z.string().trim().max(400).default(""),
  city: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(60).default(""),
  email: z.string().trim().max(160).default(""),
  website: z.string().trim().max(160).default(""),
  signerName: z.string().trim().max(160).default(""),
  signerRole: z.string().trim().max(160).default(""),
  signerNip: z.string().trim().max(60).default(""),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  email: z.string().trim().toLowerCase().email("Format surel tidak valid.").max(160),
  role: z.enum(["admin", "operator"]),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .max(72)
    .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
    .regex(/[0-9]/, "Kata sandi harus memuat angka."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
  newPassword: z
    .string()
    .min(8, "Kata sandi baru minimal 8 karakter.")
    .max(72)
    .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
    .regex(/[0-9]/, "Kata sandi harus memuat angka."),
});
