import { z } from "zod";

export const componentInputSchema = z.object({
  name: z.string().trim().min(2, "Nama component minimal 2 karakter.").max(80),
  category: z.string().trim().min(1).max(40).default("Umum"),
  description: z.string().trim().max(240).default(""),
  tableId: z.string().trim().max(64).nullable().default(null),
  content: z.unknown(),
});
