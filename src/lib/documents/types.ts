/**
 * Document model — the single source of truth for template, component and
 * generated letter content. Stored as JSON in SQLite, never as raw HTML.
 *
 * Every editor surface (template editor, component editor, live preview,
 * print view and DOCX export) consumes this same model.
 */

export type BlockAlign = "left" | "center" | "right" | "justify";

export type PaperSize = "A4" | "F4" | "Letter";

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageConfig {
  paper: PaperSize;
  orientation: "portrait" | "landscape";
  margins: PageMargins;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export interface TextMark {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
}

export type InlineNode =
  | { type: "text"; text: string; marks?: TextMark }
  | { type: "expression"; path: string };

export type ConditionOperator =
  | "eq"
  | "neq"
  | "contains"
  | "notContains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "empty"
  | "notEmpty";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface BlockSpacing {
  before?: number;
  after?: number;
}

interface BlockBase {
  id: string;
  spacing?: BlockSpacing;
}

export interface ParagraphBlock extends BlockBase {
  type: "paragraph";
  content: InlineNode[];
  align?: BlockAlign;
  indent?: number;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  level: 1 | 2 | 3;
  content: InlineNode[];
  align?: BlockAlign;
}

export interface ListBlock extends BlockBase {
  type: "list";
  ordered: boolean;
  items: InlineNode[][];
}

export interface TableBlock extends BlockBase {
  type: "table";
  header: boolean;
  /**
   * Literal rows. With `repeat` set, index 0 (or 1 when `header`) is the row
   * template and is rendered once per source record.
   */
  rows: InlineNode[][][];
  repeat?: {
    source: "active" | string;
    filter?: Condition[];
  };
  widths?: number[];
  align?: BlockAlign;
}

export interface ComponentRefBlock extends BlockBase {
  type: "componentRef";
  componentId: string;
  /** Cached during authoring so a missing component is still explainable. */
  note?: string;
}

export interface LoopBlock extends BlockBase {
  type: "loop";
  /** "active" iterates the letter's active record source, or a table id. */
  source: "active" | string;
  filter?: Condition[];
  label?: string;
  emptyText?: string;
  blocks: Block[];
}

export interface ConditionalBlock extends BlockBase {
  type: "conditional";
  match: "all" | "any";
  conditions: Condition[];
  label?: string;
  blocks: Block[];
  elseBlocks: Block[];
}

export interface DividerBlock extends BlockBase {
  type: "divider";
}

export interface SpacerBlock extends BlockBase {
  type: "spacer";
  height: number;
}

export interface PageBreakBlock extends BlockBase {
  type: "pageBreak";
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | TableBlock
  | ComponentRefBlock
  | LoopBlock
  | ConditionalBlock
  | DividerBlock
  | SpacerBlock
  | PageBreakBlock;

export interface DocumentContent {
  version: 1;
  blocks: Block[];
}

export const DEFAULT_PAGE: PageConfig = {
  paper: "A4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 20, left: 25 },
  fontFamily: "Times New Roman",
  fontSize: 12,
  lineHeight: 1.5,
};

export const PAPER_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215, height: 330 },
  Letter: { width: 215.9, height: 279.4 },
};

/** A letter source record, flattened for the rendering engine. */
export type RenderRecord = Record<string, string | number | boolean | null>;

export interface RenderContext {
  /** Values typed by the operator in the letter wizard. */
  letter: RenderRecord;
  /** Fields of the active global record (mailing-list row). */
  record: RenderRecord;
  /** Alias -> record, e.g. `pegawai` -> active Pegawai row. */
  aliases: Record<string, RenderRecord>;
  /** Table id -> rows, used by loop blocks. */
  sources: Record<string, RenderRecord[]>;
  /** Table id -> slug, e.g. `tbl_pegawai` -> `pegawai`. */
  sourceAliases: Record<string, string>;
}

export interface MissingField {
  path: string;
  fallback?: string;
}
