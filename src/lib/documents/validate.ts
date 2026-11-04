import { ApiError } from "@/lib/http";
import type {
  Block,
  BlockAlign,
  Condition,
  ConditionOperator,
  DocumentContent,
  InlineNode,
  PageConfig,
  TextMark,
} from "./types";
import { DEFAULT_PAGE } from "./types";

const ALIGNMENTS: BlockAlign[] = ["left", "center", "right", "justify"];
const OPERATORS: ConditionOperator[] = [
  "eq",
  "neq",
  "contains",
  "notContains",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "notEmpty",
];
const PAPER_SIZES = ["A4", "F4", "Letter"];
const MAX_DEPTH = 5;
const MAX_BLOCKS = 600;
const PATH_PATTERN = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;

function fail(message: string): never {
  throw new ApiError(422, `Konten dokumen tidak valid: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function inline(value: unknown): InlineNode[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 400) fail("terlalu banyak elemen inline dalam satu blok");

  return value.slice(0, 400).flatMap<InlineNode>((node) => {
    if (!isRecord(node)) return [];
    if (node.type === "expression") {
      const path = str(node.path, 160);
      if (!PATH_PATTERN.test(path)) fail(`path ekspresi tidak dikenal (${path || "kosong"})`);
      return [{ type: "expression", path }];
    }
    if (node.type === "text") {
      const text = str(node.text);
      if (!text) return [];
      const marks = isRecord(node.marks) ? parseMarks(node.marks) : undefined;
      return [{ type: "text", text, ...(marks && Object.keys(marks).length ? { marks } : {}) }];
    }
    return [];
  });
}

function parseMarks(input: Record<string, unknown>): TextMark {
  const marks: TextMark = {};
  if (input.bold === true) marks.bold = true;
  if (input.italic === true) marks.italic = true;
  if (input.underline === true) marks.underline = true;
  if (typeof input.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(input.color)) {
    marks.color = input.color;
  }
  if (typeof input.fontSize === "number" && input.fontSize >= 6 && input.fontSize <= 72) {
    marks.fontSize = input.fontSize;
  }
  if (typeof input.fontFamily === "string" && input.fontFamily.length <= 60) {
    marks.fontFamily = input.fontFamily;
  }
  return marks;
}

function conditions(value: unknown): Condition[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap<Condition>((entry) => {
    if (!isRecord(entry)) return [];
    const field = str(entry.field, 160);
    const operator = str(entry.operator, 20) as ConditionOperator;
    if (!field || !PATH_PATTERN.test(field)) fail("kondisi membutuhkan field yang valid");
    if (!OPERATORS.includes(operator)) fail(`operator kondisi tidak dikenal (${operator})`);
    return [{ field, operator, value: str(entry.value, 500) }];
  });
}

function blocks(value: unknown, depth = 0): Block[] {
  if (!Array.isArray(value)) return [];
  if (depth > MAX_DEPTH) fail("blok bersarang terlalu dalam");
  if (value.length > MAX_BLOCKS) fail("jumlah blok melebihi batas");

  return value.flatMap<Block>((entry) => {
    if (!isRecord(entry)) return [];
    const id = str(entry.id, 64) || `blk_${Math.random().toString(36).slice(2, 12)}`;
    const type = str(entry.type, 24);
    const spacing = isRecord(entry.spacing)
      ? {
          ...(typeof entry.spacing.before === "number" ? { before: Math.min(200, Math.max(0, entry.spacing.before)) } : {}),
          ...(typeof entry.spacing.after === "number" ? { after: Math.min(200, Math.max(0, entry.spacing.after)) } : {}),
        }
      : undefined;
    const base = { id, ...(spacing ? { spacing } : {}) };
    const align = ALIGNMENTS.includes(entry.align as BlockAlign)
      ? (entry.align as BlockAlign)
      : undefined;

    switch (type) {
      case "paragraph":
        return [{ ...base, type, content: inline(entry.content), ...(align ? { align } : {}), ...(typeof entry.indent === "number" ? { indent: Math.max(0, Math.min(8, entry.indent)) } : {}) }];
      case "heading": {
        const level = entry.level === 1 || entry.level === 3 ? entry.level : 2;
        return [{ ...base, type, level, content: inline(entry.content), ...(align ? { align } : {}) }];
      }
      case "list":
        return [{
          ...base,
          type,
          ordered: entry.ordered === true,
          items: Array.isArray(entry.items) ? entry.items.slice(0, 100).map((item) => inline(item)) : [],
        }];
      case "table": {
        const rows = Array.isArray(entry.rows)
          ? entry.rows.slice(0, 200).map((row) => (Array.isArray(row) ? row.slice(0, 12).map((cell) => inline(cell)) : []))
          : [];
        const widths = Array.isArray(entry.widths)
          ? entry.widths.slice(0, 12).map((width) => Math.max(2, Math.min(100, Number(width) || 10)))
          : undefined;
        const repeat = isRecord(entry.repeat) && typeof entry.repeat.source === "string"
          ? {
              source: entry.repeat.source === "active" ? ("active" as const) : str(entry.repeat.source, 64),
              filter: conditions(entry.repeat.filter),
            }
          : undefined;
        return [{ ...base, type, header: entry.header !== false, rows, ...(widths ? { widths } : {}), ...(align ? { align } : {}), ...(repeat ? { repeat } : {}) }];
      }
      case "componentRef": {
        const componentId = str(entry.componentId, 64);
        if (!componentId) fail("referensi component tanpa id");
        return [{ ...base, type, componentId, note: str(entry.note, 160) || undefined }];
      }
      case "loop": {
        const source = str(entry.source, 64) || "active";
        return [{
          ...base,
          type,
          source: source === "active" ? "active" : source,
          filter: conditions(entry.filter),
          label: str(entry.label, 120) || undefined,
          emptyText: str(entry.emptyText, 240) || undefined,
          blocks: blocks(entry.blocks, depth + 1),
        }];
      }
      case "conditional":
        return [{
          ...base,
          type,
          match: entry.match === "any" ? "any" : "all",
          conditions: conditions(entry.conditions),
          label: str(entry.label, 120) || undefined,
          blocks: blocks(entry.blocks, depth + 1),
          elseBlocks: blocks(entry.elseBlocks, depth + 1),
        }];
      case "divider":
        return [{ ...base, type }];
      case "spacer":
        return [{ ...base, type, height: Math.max(0, Math.min(400, Number(entry.height) || 12)) }];
      case "pageBreak":
        return [{ ...base, type }];
      default:
        return [];
    }
  });
}

export function validateDocument(value: unknown): DocumentContent {
  if (!isRecord(value)) fail("format dokumen tidak dikenali");
  return { version: 1, blocks: blocks(value.blocks) };
}

export function validatePage(value: unknown): PageConfig {
  if (!isRecord(value)) return DEFAULT_PAGE;
  const margins = isRecord(value.margins) ? value.margins : {};
  const margin = (key: string, fallback: number) => {
    const raw = Number(margins[key]);
    return Number.isFinite(raw) ? Math.min(60, Math.max(5, raw)) : fallback;
  };

  return {
    paper: PAPER_SIZES.includes(String(value.paper)) ? (value.paper as PageConfig["paper"]) : "A4",
    orientation: value.orientation === "landscape" ? "landscape" : "portrait",
    margins: {
      top: margin("top", DEFAULT_PAGE.margins.top),
      right: margin("right", DEFAULT_PAGE.margins.right),
      bottom: margin("bottom", DEFAULT_PAGE.margins.bottom),
      left: margin("left", DEFAULT_PAGE.margins.left),
    },
    fontFamily:
      typeof value.fontFamily === "string" && value.fontFamily.length <= 60
        ? value.fontFamily
        : DEFAULT_PAGE.fontFamily,
    fontSize:
      typeof value.fontSize === "number" && value.fontSize >= 7 && value.fontSize <= 24
        ? value.fontSize
        : DEFAULT_PAGE.fontSize,
    lineHeight:
      typeof value.lineHeight === "number" && value.lineHeight >= 1 && value.lineHeight <= 3
        ? value.lineHeight
        : DEFAULT_PAGE.lineHeight,
  };
}
