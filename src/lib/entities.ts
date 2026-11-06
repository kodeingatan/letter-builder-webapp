import type { DocumentContent, PageConfig, Condition } from "@/lib/documents/types";
import type { UserRole } from "@/lib/auth";
import { parseJson } from "@/lib/db";

export interface GlobalTable {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  fieldCount?: number;
  recordCount?: number;
}

export type GlobalFieldType = "text" | "number" | "date" | "select" | "boolean" | "email" | "rich_text";

export interface GlobalField {
  id: string;
  tableId: string;
  name: string;
  label: string;
  type: GlobalFieldType;
  options: string[];
  required: boolean;
  position: number;
}

export type FieldValue = string | number | boolean | null;

export interface GlobalRecord {
  id: string;
  tableId: string;
  data: Record<string, FieldValue>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  content: DocumentContent;
  tableId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  content: DocumentContent;
  page: PageConfig;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  name: string;
  content: DocumentContent;
  page: PageConfig;
  createdByName: string | null;
  createdAt: string;
}

export type AdministrasiStatus = "draft" | "active" | "archived";

export type LetterFieldType = "text" | "textarea" | "date" | "number";

/** Extra values captured in the letter wizard, shared for the whole batch. */
export interface LetterField {
  key: string;
  label: string;
  type: LetterFieldType;
  scope: "shared" | "record";
  required: boolean;
  placeholder?: string;
}

export interface AdministrasiRecord {
  id: string;
  name: string;
  description: string;
  status: AdministrasiStatus;
  dataSourceTableId: string | null;
  filter: Condition[];
  numberPattern: string;
  fields: LetterField[];
  createdAt: string;
  updatedAt: string;
  stepCount?: number;
  letterCount?: number;
}

export interface AdministrasiStep {
  id: string;
  administrasiId: string;
  templateId: string | null;
  templateName?: string | null;
  name: string;
  position: number;
}

export interface SuratStepData {
  stepId: string;
  overrideContent: DocumentContent | null;
  updatedAt: string;
}

export type SuratStatus = "draft" | "completed";

export interface SuratRecord {
  id: string;
  administrasiId: string;
  batchId: string;
  recordId: string | null;
  recordLabel?: string;
  recordSnapshot: Record<string, FieldValue> | null;
  number: string;
  letterDate: string;
  status: SuratStatus;
  data: Record<string, string>;
  currentStepId: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuratVersion {
  id: string;
  suratId: string;
  version: number;
  summary: string;
  snapshot: unknown;
  createdByName: string | null;
  createdAt: string;
}

export interface OrganizationSettings {
  name: string;
  subtitle: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  signerName: string;
  signerRole: string;
  signerNip: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export function mapTable(row: Record<string, unknown>): GlobalTable {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "table"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    fieldCount: row.field_count === undefined ? undefined : Number(row.field_count),
    recordCount: row.record_count === undefined ? undefined : Number(row.record_count),
  };
}

export function mapField(row: Record<string, unknown>): GlobalField {
  return {
    id: String(row.id),
    tableId: String(row.table_id),
    name: String(row.name),
    label: String(row.label),
    type: String(row.type) as GlobalFieldType,
    options: parseJson<string[]>(row.options as string, []),
    required: Boolean(row.required),
    position: Number(row.position),
  };
}

export function mapGlobalRecord(row: Record<string, unknown>): GlobalRecord {
  return {
    id: String(row.id),
    tableId: String(row.table_id),
    data: parseJson<Record<string, FieldValue>>(row.data as string, {}),
    position: Number(row.position),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapComponent(row: Record<string, unknown>): ComponentRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description ?? ""),
    content: parseJson<DocumentContent>(row.content as string, { version: 1, blocks: [] }),
    tableId: row.table_id ? String(row.table_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapTemplate(row: Record<string, unknown>): TemplateRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    content: parseJson<DocumentContent>(row.content as string, { version: 1, blocks: [] }),
    page: parseJson<PageConfig>(row.page as string, {
      paper: "A4",
      orientation: "portrait",
      margins: { top: 20, right: 20, bottom: 20, left: 25 },
      fontFamily: "Times New Roman",
      fontSize: 12,
      lineHeight: 1.5,
    }),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    usageCount: row.usage_count === undefined ? undefined : Number(row.usage_count),
  };
}

export function mapAdministrasi(row: Record<string, unknown>): AdministrasiRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    status: String(row.status) as AdministrasiStatus,
    dataSourceTableId: row.data_source_table_id ? String(row.data_source_table_id) : null,
    filter: parseJson<Condition[]>(row.filter as string, []),
    numberPattern: String(row.number_pattern),
    fields: parseJson<LetterField[]>(row.fields as string, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    stepCount: row.step_count === undefined ? undefined : Number(row.step_count),
    letterCount: row.letter_count === undefined ? undefined : Number(row.letter_count),
  };
}

export function mapStep(row: Record<string, unknown>): AdministrasiStep {
  return {
    id: String(row.id),
    administrasiId: String(row.administrasi_id),
    templateId: row.template_id ? String(row.template_id) : null,
    templateName: row.template_name ? String(row.template_name) : null,
    name: String(row.name),
    position: Number(row.position),
  };
}

export function mapSurat(row: Record<string, unknown>): SuratRecord {
  return {
    id: String(row.id),
    administrasiId: String(row.administrasi_id),
    batchId: String(row.batch_id),
    recordId: row.record_id ? String(row.record_id) : null,
    recordSnapshot: row.record_snapshot
      ? parseJson<Record<string, FieldValue>>(row.record_snapshot as string, {})
      : null,
    number: String(row.number ?? ""),
    letterDate: String(row.letter_date),
    status: String(row.status) as SuratStatus,
    data: parseJson<Record<string, string>>(row.data as string, {}),
    currentStepId: row.current_step_id ? String(row.current_step_id) : null,
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
