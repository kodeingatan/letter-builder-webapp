import { z } from "zod";

export const templateInputSchema = z.object({
  name: z.string().trim().min(2, "Nama template minimal 2 karakter.").max(100),
  description: z.string().trim().max(240).default(""),
  content: z.unknown(),
  page: z.unknown().optional(),
  createVersion: z.boolean().optional(),
});

export const templateVersionInputSchema = z.object({
  version: z.number().int().min(1),
});
