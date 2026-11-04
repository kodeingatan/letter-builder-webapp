import type { Block, Condition, DocumentContent, InlineNode } from "./types";

export function newId(prefix = "blk"): string {
  return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function createEmptyDocument(): DocumentContent {
  return {
    version: 1,
    blocks: [paragraph([], { id: newId("blk") })],
  };
}

export function text(value: string): InlineNode {
  return { type: "text", text: value };
}

export function expression(path: string): InlineNode {
  return { type: "expression", path };
}

export function paragraph(
  content: InlineNode[] | string,
  overrides: Partial<Block> = {},
): Block {
  const nodes = typeof content === "string" ? [text(content)] : content;
  return { id: newId("blk"), type: "paragraph", content: nodes, ...overrides } as Block;
}

export function heading(
  content: InlineNode[] | string,
  level: 1 | 2 | 3 = 2,
): Block {
  const nodes = typeof content === "string" ? [text(content)] : content;
  return { id: newId("blk"), type: "heading", level, content: nodes, align: "center" };
}

export function list(items: (InlineNode[] | string)[], ordered = false): Block {
  return {
    id: newId("blk"),
    type: "list",
    ordered,
    items: items.map((item) => (typeof item === "string" ? [text(item)] : item)),
  };
}

export function table(
  rows: string[][],
  options: { header?: boolean; widths?: number[] } = {},
): Block {
  return {
    id: newId("blk"),
    type: "table",
    header: options.header ?? true,
    widths: options.widths,
    rows: rows.map((row) => row.map((cell) => [text(cell)])),
  };
}

export function divider(): Block {
  return { id: newId("blk"), type: "divider" };
}

export function spacer(height = 12): Block {
  return { id: newId("blk"), type: "spacer", height };
}

export function pageBreak(): Block {
  return { id: newId("blk"), type: "pageBreak" };
}

export function componentRef(componentId: string, note?: string): Block {
  return { id: newId("blk"), type: "componentRef", componentId, note };
}

export function loop(
  source: string,
  blocks: Block[],
  options: { label?: string; filter?: Condition[]; emptyText?: string } = {},
): Block {
  return {
    id: newId("blk"),
    type: "loop",
    source,
    blocks,
    filter: options.filter,
    label: options.label,
    emptyText: options.emptyText,
  };
}

export function conditional(
  conditions: Condition[],
  blocks: Block[],
  elseBlocks: Block[] = [],
  match: "all" | "any" = "all",
): Block {
  return {
    id: newId("blk"),
    type: "conditional",
    match,
    conditions,
    blocks,
    elseBlocks,
  };
}

export function isInlineContent(value: unknown): value is InlineNode[] {
  return (
    Array.isArray(value) &&
    value.every(
      (node) =>
        node &&
        typeof node === "object" &&
        ((node as InlineNode).type === "text" || (node as InlineNode).type === "expression"),
    )
  );
}

/** Plain-text projection, used for search snippets and DOCX fallbacks. */
export function inlineToText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => (node.type === "text" ? node.text : `{{${node.path}}}`))
    .join("");
}

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
          return inlineToText(block.content);
        case "list":
          return block.items.map(inlineToText).join(" ");
        case "table":
          return block.rows.map((row) => row.map(inlineToText).join(" ")).join(" ");
        case "loop":
        case "conditional":
          return blocksToText(block.blocks);
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

export function cloneDocument(document: DocumentContent): DocumentContent {
  return structuredClone(document);
}
