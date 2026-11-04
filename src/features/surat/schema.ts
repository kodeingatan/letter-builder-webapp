import { z } from "zod";

export const createSuratSchema = z.object({
  administrasiId: z.string().trim().min(1),
  recordIds: z.array(z.string().trim().min(1)).min(1, "Pilih minimal satu baris data.").max(100),
  data: z.record(z.string(), z.string().max(4000)).default({}),
});

export const saveSuratSchema = z.object({
  data: z.record(z.string(), z.string().max(4000)).default({}),
  currentStepId: z.string().trim().max(64).optional(),
  stepId: z.string().trim().max(64).optional(),
  overrideContent: z.unknown().optional(),
  createVersion: z.boolean().optional(),
});

export const restoreSuratVersionSchema = z.object({
  version: z.number().int().min(1),
});
