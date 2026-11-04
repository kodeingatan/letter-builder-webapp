import type {
  Block,
  BlockAlign,
  Condition,
  DocumentContent,
  InlineNode,
  RenderContext,
  RenderRecord,
  TextMark,
} from "./types";

/**
 * Deterministic rendering engine.
 *
 * Expressions are plain dotted paths (`{{pegawai.nama}}`), never JavaScript.
 * Loop and conditional blocks are structural nodes, so evaluation is fully
 * data-driven: no `eval`, no `Function`, no template-side code execution.
 */

export interface ResolvedInline {
  text: string;
  marks?: TextMark;
  missing?: boolean;
  path?: string;
}

export type ResolvedBlock =
  | {
      type: "paragraph";
      content: ResolvedInline[];
      align?: BlockAlign;
      indent?: number;
      spacing?: { before?: number; after?: number };
    }
  | {
      type: "heading";
      level: 1 | 2 | 3;
      content: ResolvedInline[];
      align?: "left" | "center" | "right" | "justify";
    }
  | { type: "list"; ordered: boolean; items: ResolvedInline[][] }
  | {
      type: "table";
      header: boolean;
      rows: ResolvedInline[][][];
      widths?: number[];
    }
  | { type: "divider" }
  | { type: "spacer"; height: number }
  | { type: "pageBreak" }
  | { type: "missingComponent"; label: string };

export interface ComponentSource {
  id: string;
  name: string;
  content: DocumentContent;
}

export interface RenderInput {
  content: DocumentContent;
  context: RenderContext;
  components: Map<string, ComponentSource>;
  /** Slug of the administrasi's primary table, for `active` loops. */
  primarySourceId?: string;
}

interface Scope {
  values: RenderRecord;
  alias?: string;
  tableId?: string;
}

const MAX_DEPTH = 6;
const MAX_BLOCKS = 4000;

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDateId(value: string): string {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return value;
  return `${Number(day)} ${monthName} ${year}`;
}

export function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("id-ID") : value.toLocaleString("id-ID");
  }
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "string") return formatDateId(value);
  return String(value);
}

function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value.trim());
}

function compareValues(left: unknown, right: string, operator: Condition["operator"]): boolean {
  const leftText = formatPrimitive(left).toLowerCase();
  const rightText = String(right ?? "").toLowerCase();

  switch (operator) {
    case "eq":
      return leftText === rightText;
    case "neq":
      return leftText !== rightText;
    case "contains":
      return leftText.includes(rightText);
    case "notContains":
      return !leftText.includes(rightText);
    case "empty":
      return leftText.trim() === "";
    case "notEmpty":
      return leftText.trim() !== "";
  }

  const numericLeft = Number(left);
  const numericRight = Number(right);
  if (!Number.isNaN(numericLeft) && !Number.isNaN(numericRight) && right.trim() !== "") {
    if (operator === "gt") return numericLeft > numericRight;
    if (operator === "gte") return numericLeft >= numericRight;
    if (operator === "lt") return numericLeft < numericRight;
    if (operator === "lte") return numericLeft <= numericRight;
  }

  if (isIsoDate(leftText) && isIsoDate(rightText)) {
    if (operator === "gt") return leftText > rightText;
    if (operator === "gte") return leftText >= rightText;
    if (operator === "lt") return leftText < rightText;
    if (operator === "lte") return leftText <= rightText;
  }

  return false;
}

function lookupKey(record: RenderRecord | undefined, key: string): unknown {
  if (!record) return undefined;
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];

  const normalized = key.toLowerCase().replace(/[\s-]+/g, "_");
  const match = Object.keys(record).find(
    (candidate) => candidate.toLowerCase().replace(/[\s-]+/g, "_") === normalized,
  );
  return match ? record[match] : undefined;
}

export function resolvePath(
  path: string,
  context: RenderContext,
  scopes: Scope[],
): unknown {
  const segments = path.split(".").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) return undefined;

  const [head, ...rest] = segments;

  if (head === "surat" || head === "letter") {
    return nestedLookup(context.letter, rest);
  }
  if (head === "record") {
    return nestedLookup(context.record, rest);
  }

  const aliased = context.aliases[head];
  if (aliased) {
    return nestedLookup(aliased, rest);
  }

  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    const scope = scopes[index];
    if (scope.alias && scope.alias === head) {
      return nestedLookup(scope.values, rest);
    }
    if (rest.length === 0) {
      const value = lookupKey(scope.values, head);
      if (value !== undefined) return value;
    } else {
      const nested = lookupKey(scope.values, head);
      if (nested && typeof nested === "object") {
        return nestedLookup(nested as RenderRecord, rest);
      }
    }
  }

  if (rest.length === 0) {
    for (let index = scopes.length - 1; index >= 0; index -= 1) {
      const value = lookupKey(scopes[index].values, head);
      if (value !== undefined) return value;
    }
    const fromRecord = lookupKey(context.record, head);
    if (fromRecord !== undefined) return fromRecord;
    return lookupKey(context.letter, head);
  }

  const nested = lookupKey(context.record, head);
  if (nested && typeof nested === "object") {
    return nestedLookup(nested as RenderRecord, rest);
  }
  return undefined;
}

function nestedLookup(record: RenderRecord, segments: string[]): unknown {
  let current: unknown = record;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = lookupKey(current as RenderRecord, segment);
    if (current === undefined) return undefined;
  }
  return current;
}

export function evaluateCondition(
  condition: Condition,
  context: RenderContext,
  scopes: Scope[],
): boolean {
  const value = resolvePath(condition.field, context, scopes);
  return compareValues(value, condition.value, condition.operator);
}

export function evaluateConditions(
  conditions: Condition[],
  match: "all" | "any",
  context: RenderContext,
  scopes: Scope[],
): boolean {
  if (conditions.length === 0) return true;
  return match === "all"
    ? conditions.every((condition) => evaluateCondition(condition, context, scopes))
    : conditions.some((condition) => evaluateCondition(condition, context, scopes));
}

function resolveInline(
  nodes: InlineNode[],
  context: RenderContext,
  scopes: Scope[],
): ResolvedInline[] {
  const resolved: ResolvedInline[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      resolved.push({ text: node.text, marks: node.marks });
      continue;
    }

    const value = resolvePath(node.path, context, scopes);
    if (value === undefined) {
      resolved.push({ text: "—", missing: true, path: node.path });
    } else {
      const formatted = formatPrimitive(value);
      if (formatted !== "") {
        resolved.push({ text: formatted });
      }
    }
  }

  return resolved;
}

interface RendererState {
  context: RenderContext;
  components: Map<string, ComponentSource>;
  primarySourceId?: string;
  blockCount: number;
}

function renderBlocks(
  blocks: Block[],
  state: RendererState,
  scopes: Scope[],
  depth: number,
  visitedComponents: Set<string>,
): ResolvedBlock[] {
  const output: ResolvedBlock[] = [];

  for (const block of blocks) {
    state.blockCount += 1;
    if (state.blockCount > MAX_BLOCKS || depth > MAX_DEPTH) break;

    switch (block.type) {
      case "paragraph":
        output.push({
          type: "paragraph",
          content: resolveInline(block.content, state.context, scopes),
          align: block.align,
          indent: block.indent,
          spacing: block.spacing,
        });
        break;
      case "heading":
        output.push({
          type: "heading",
          level: block.level,
          content: resolveInline(block.content, state.context, scopes),
          align: block.align,
        });
        break;
      case "list":
        output.push({
          type: "list",
          ordered: block.ordered,
          items: block.items.map((item) => resolveInline(item, state.context, scopes)),
        });
        break;
      case "table": {
        const resolveRow = (row: InlineNode[][], rowScopes: Scope[]) =>
          row.map((cell) => resolveInline(cell, state.context, rowScopes));

        if (!block.repeat) {
          output.push({
            type: "table",
            header: block.header,
            widths: block.widths,
            rows: block.rows.map((row) => resolveRow(row, scopes)),
          });
          break;
        }

        const headerRow = block.header ? block.rows[0] : undefined;
        const templateRow = block.rows[block.header ? 1 : 0] ?? block.rows[0];
        const repeatRows = collectRepeatRows(block.repeat, state, scopes);
        const alias =
          block.repeat.source === "active"
            ? state.primarySourceId
              ? state.context.sourceAliases[state.primarySourceId]
              : undefined
            : state.context.sourceAliases[block.repeat.source];

        const rows = [
          ...(headerRow ? [resolveRow(headerRow, scopes)] : []),
          ...repeatRows.map((record, index) =>
            resolveRow(templateRow ?? [], [
              ...scopes,
              { values: { ...record, _index: index + 1 }, alias },
            ]),
          ),
        ];

        output.push({
          type: "table",
          header: block.header,
          widths: block.widths,
          rows,
        });
        break;
      }
      case "divider":
        output.push({ type: "divider" });
        break;
      case "spacer":
        output.push({ type: "spacer", height: block.height });
        break;
      case "pageBreak":
        output.push({ type: "pageBreak" });
        break;
      case "componentRef": {
        const component = state.components.get(block.componentId);
        if (!component || visitedComponents.has(block.componentId)) {
          output.push({
            type: "missingComponent",
            label: component?.name ?? block.note ?? "Component tidak ditemukan",
          });
          break;
        }
        visitedComponents.add(block.componentId);
        output.push(
          ...renderBlocks(
            component.content.blocks,
            state,
            scopes,
            depth + 1,
            visitedComponents,
          ),
        );
        visitedComponents.delete(block.componentId);
        break;
      }
      case "loop": {
        const rows = collectLoopRows(block, state, scopes);
        if (rows.length === 0) {
          if (block.emptyText) {
            output.push({
              type: "paragraph",
              content: [{ text: block.emptyText }],
            });
          }
          break;
        }

        const alias =
          block.source === "active"
            ? state.primarySourceId
              ? state.context.sourceAliases[state.primarySourceId]
              : undefined
            : state.context.sourceAliases[block.source];
        const tableId = block.source === "active" ? state.primarySourceId : block.source;

        for (const [index, row] of rows.entries()) {
          const nextScopes = [
            ...scopes,
            { values: { ...row, _index: index + 1 }, alias, tableId },
          ];
          output.push(
            ...renderBlocks(block.blocks, state, nextScopes, depth + 1, visitedComponents),
          );
        }
        break;
      }
      case "conditional": {
        const matched = evaluateConditions(
          block.conditions,
          block.match,
          state.context,
          scopes,
        );
        const branch = matched ? block.blocks : block.elseBlocks;
        output.push(
          ...renderBlocks(branch, state, scopes, depth + 1, visitedComponents),
        );
        break;
      }
    }
  }

  return output;
}

function collectRepeatRows(
  repeat: { source: "active" | string; filter?: Condition[] },
  state: RendererState,
  scopes: Scope[],
): RenderRecord[] {
  let rows: RenderRecord[];
  if (repeat.source === "active") {
    rows =
      state.primarySourceId && state.context.sources[state.primarySourceId]
        ? state.context.sources[state.primarySourceId]
        : Object.keys(state.context.record).length > 0
          ? [state.context.record]
          : [];
  } else {
    rows = state.context.sources[repeat.source] ?? [];
  }

  const filter = repeat.filter ?? [];
  if (filter.length === 0) return rows;
  return rows.filter((row) =>
    evaluateConditions(filter, "all", state.context, [
      ...scopes,
      { values: row, alias: state.context.sourceAliases[repeat.source], tableId: repeat.source },
    ]),
  );
}

function collectLoopRows(
  block: Extract<Block, { type: "loop" }>,
  state: RendererState,
  scopes: Scope[],
): RenderRecord[] {
  let rows: RenderRecord[];
  if (block.source === "active") {
    if (state.primarySourceId && state.context.sources[state.primarySourceId]) {
      rows = state.context.sources[state.primarySourceId];
    } else {
      rows = Object.keys(state.context.record).length > 0 ? [state.context.record] : [];
    }
  } else {
    rows = state.context.sources[block.source] ?? [];
  }

  const filter = block.filter ?? [];
  if (filter.length === 0) return rows;

  return rows.filter((row) =>
    evaluateConditions(filter, "all", state.context, [
      ...scopes,
      { values: row, alias: state.context.sourceAliases[block.source], tableId: block.source },
    ]),
  );
}

export function renderDocument(input: RenderInput): ResolvedBlock[] {
  const state: RendererState = {
    context: input.context,
    components: input.components,
    primarySourceId: input.primarySourceId,
    blockCount: 0,
  };
  return renderBlocks(input.content.blocks, state, [], 0, new Set());
}

/** Flattens rendered blocks to plain text, used for search and previews. */
export function resolvedToText(blocks: ResolvedBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
          return block.content.map((node) => node.text).join("");
        case "list":
          return block.items.map((item) => item.map((n) => n.text).join("")).join("\n");
        case "table":
          return block.rows
            .map((row) => row.map((cell) => cell.map((n) => n.text).join("")).join(" | "))
            .join("\n");
        case "missingComponent":
          return block.label;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}
