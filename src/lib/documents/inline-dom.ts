import type { InlineNode, TextMark } from "./types";

const FONT_SIZES = [8, 9, 10, 12, 14, 18, 24];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function marksToStyle(marks: TextMark): string {
  const styles: string[] = [];
  if (marks.color) styles.push(`color:${marks.color}`);
  if (marks.fontSize) styles.push(`font-size:${marks.fontSize}pt`);
  if (marks.fontFamily) styles.push(`font-family:'${marks.fontFamily.replace(/'/g, "")}'`);
  return styles.join(";");
}

/** Serializes the model to initial `innerHTML` for a contentEditable host. */
export function inlineToHtml(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "expression") {
        return `<span class="doc-expression" data-path="${escapeHtml(node.path)}" contenteditable="false">{{${escapeHtml(node.path)}}}</span>`;
      }

      const body = escapeHtml(node.text).replace(/\n/g, "<br>");
      const marks = node.marks ?? {};
      let html = body;
      if (marks.underline) html = `<u>${html}</u>`;
      if (marks.italic) html = `<i>${html}</i>`;
      if (marks.bold) html = `<b>${html}</b>`;
      const style = marksToStyle(marks);
      if (style) html = `<span style="${style}">${html}</span>`;
      return html;
    })
    .join("");
}

function rgbToHex(value: string): string | null {
  const match = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!match) {
    if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) return value.trim();
    return null;
  }
  const [, r, g, b] = match;
  return `#${[r, g, b].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function styleMarks(element: HTMLElement, marks: TextMark): TextMark {
  const next: TextMark = { ...marks };
  const tag = element.tagName;

  if (tag === "B" || tag === "STRONG") next.bold = true;
  if (tag === "I" || tag === "EM") next.italic = true;
  if (tag === "U") next.underline = true;

  if (tag === "FONT") {
    const color = element.getAttribute("color");
    const face = element.getAttribute("face");
    const size = element.getAttribute("size");
    if (color) {
      const hex = rgbToHex(color);
      if (hex) next.color = hex;
    }
    if (face) next.fontFamily = face;
    if (size) {
      const index = Number(size);
      if (index >= 1 && index <= 7) next.fontSize = FONT_SIZES[index - 1];
    }
  }

  const style = element.style;
  if (style.color) {
    const hex = rgbToHex(style.color);
    if (hex) next.color = hex;
  }
  if (style.fontFamily) {
    next.fontFamily = style.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
  }
  if (style.fontSize) {
    const numeric = Number.parseFloat(style.fontSize);
    if (!Number.isNaN(numeric)) {
      next.fontSize = style.fontSize.includes("px")
        ? Math.round((numeric * 72) / 96)
        : Math.round(numeric);
    }
  }

  return next;
}

/** Parses editor DOM back into the JSON inline model. */
export function parseInlineHtml(root: HTMLElement): InlineNode[] {
  const nodes: InlineNode[] = [];

  const pushText = (text: string, marks: TextMark) => {
    if (!text) return;
    const hasMarks = Object.keys(marks).length > 0;
    nodes.push({ type: "text", text, ...(hasMarks ? { marks: { ...marks } } : {}) });
  };

  const walk = (node: Node, marks: TextMark) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.nodeValue ?? "", marks);
      return;
    }
    if (!(node instanceof HTMLElement)) return;

    if (node.dataset?.path) {
      nodes.push({ type: "expression", path: node.dataset.path });
      return;
    }
    if (node.tagName === "BR") {
      pushText("\n", marks);
      return;
    }

    const nextMarks = styleMarks(node, marks);
    node.childNodes.forEach((child) => walk(child, nextMarks));
  };

  root.childNodes.forEach((child) => walk(child, {}));

  // Normalize: merge adjacent text nodes with identical marks.
  const normalized: InlineNode[] = [];
  for (const node of nodes) {
    const previous = normalized[normalized.length - 1];
    if (
      node.type === "text" &&
      previous?.type === "text" &&
      JSON.stringify(previous.marks ?? {}) === JSON.stringify(node.marks ?? {})
    ) {
      previous.text += node.text;
    } else if (node.type === "text" && node.text === "\n" && previous?.type === "text") {
      previous.text += "\n";
    } else {
      normalized.push({ ...node });
    }
  }

  return normalized;
}

export function selectionInside(container: HTMLElement): boolean {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return container.contains(range.commonAncestorContainer);
}

export function insertInlineNodeAtSelection(
  container: HTMLElement,
  path: string,
  savedRange: Range | null,
): boolean {
  const selection = document.getSelection();
  const range = savedRange ?? (selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
  if (!range || !container.contains(range.commonAncestorContainer)) return false;

  const chip = document.createElement("span");
  chip.className = "doc-expression";
  chip.dataset.path = path;
  chip.contentEditable = "false";
  chip.textContent = `{{${path}}}`;

  const space = document.createTextNode("\u00A0");
  range.deleteContents();
  range.insertNode(chip);
  chip.after(space);

  const nextRange = document.createRange();
  nextRange.setStartAfter(space);
  nextRange.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(nextRange);
  container.focus();

  return true;
}

export function focusEnd(element: HTMLElement): void {
  element.focus();
  const selection = document.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
