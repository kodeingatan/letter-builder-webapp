import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  PageBreak,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import type { ResolvedBlock, ResolvedInline, ComponentSource } from "@/lib/documents/engine";
import { renderDocument } from "@/lib/documents/engine";
import { PAPER_MM, type PageConfig } from "@/lib/documents/types";
import type { SuratWorkspacePayload } from "./server";

const ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const HEADING = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

function runs(inlines: ResolvedInline[], page: PageConfig): TextRun[] {
  return inlines.map(
    (inline) =>
      new TextRun({
        text: inline.text,
        bold: inline.marks?.bold,
        italics: inline.marks?.italic,
        underline: inline.marks?.underline ? { type: UnderlineType.SINGLE } : undefined,
        color: inline.marks?.color?.replace("#", "") ?? "111111",
        font: inline.marks?.fontFamily ?? page.fontFamily,
        size: Math.round((inline.marks?.fontSize ?? page.fontSize) * 2),
      }),
  );
}

function blockToDocx(block: ResolvedBlock, page: PageConfig): Paragraph | Table {
  switch (block.type) {
    case "paragraph":
      return new Paragraph({
        children: runs(block.content, page),
        alignment: block.align ? ALIGN[block.align] : undefined,
        indent: block.indent ? { left: block.indent * 480 } : undefined,
        spacing: {
          before: block.spacing?.before ? block.spacing.before * 15 : undefined,
          after: block.spacing?.after ? block.spacing.after * 15 : undefined,
          line: Math.round(page.lineHeight * 240),
          lineRule: "auto",
        },
      });
    case "heading":
      return new Paragraph({
        children: runs(block.content, page),
        heading: HEADING[block.level],
        alignment: block.align ? ALIGN[block.align] : undefined,
        spacing: { before: 160, after: 80 },
      });
    case "list":
      return listParagraphs(block, page)[0] ?? new Paragraph({ children: [] });
    case "table":
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "3F3F3F" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "3F3F3F" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "3F3F3F" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "3F3F3F" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "3F3F3F" },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "3F3F3F" },
        },
        rows: block.rows.map((row, rowIndex) => {
          const isHeader = block.header && rowIndex === 0;
          return new TableRow({
            tableHeader: isHeader,
            children: row.map((cell) => {
              const content = isHeader
                ? cell.map((inline) => ({ ...inline, marks: { ...inline.marks, bold: true } }))
                : cell;
              return new TableCell({
                children: [
                  new Paragraph({
                    children: runs(content, page),
                    spacing: { line: Math.round(page.lineHeight * 240), lineRule: "auto" },
                  }),
                ],
                shading: isHeader ? { fill: "F2F2F2" } : undefined,
              });
            }),
          });
        }),
      });
    case "divider":
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AAAAAA" } },
        spacing: { before: 80, after: 160 },
      });
    case "spacer":
      return new Paragraph({
        children: [new TextRun("")],
        spacing: { after: Math.round(block.height * 15) },
      });
    case "pageBreak":
      return new Paragraph({ children: [new PageBreak()] });
    case "missingComponent":
      return new Paragraph({
        children: [
          new TextRun({
            text: `[Component tidak ditemukan: ${block.label}]`,
            italics: true,
            color: "9A3412",
          }),
        ],
      });
    default:
      return new Paragraph({ children: [] });
  }
}

function listParagraphs(block: Extract<ResolvedBlock, { type: "list" }>, page: PageConfig): Paragraph[] {
  return block.items.map((item, index) => {
    const prefix = block.ordered ? `${index + 1}. ` : "";
    const children = runs(item, page);
    return new Paragraph({
      children: prefix
        ? [
            new TextRun({ text: prefix, font: page.fontFamily, size: Math.round(page.fontSize * 2) }),
            ...children,
          ]
        : children,
      indent: { left: block.ordered ? 480 : 360, hanging: block.ordered ? 360 : undefined },
      spacing: { line: Math.round(page.lineHeight * 240), lineRule: "auto" },
    });
  });
}

function sectionPages(page: PageConfig) {
  const base = PAPER_MM[page.paper];
  const landscape = page.orientation === "landscape";
  return {
    page: {
      size: {
        width: convertMillimetersToTwip(landscape ? base.height : base.width),
        height: convertMillimetersToTwip(landscape ? base.width : base.height),
        orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
      },
      margin: {
        top: convertMillimetersToTwip(page.margins.top),
        right: convertMillimetersToTwip(page.margins.right),
        bottom: convertMillimetersToTwip(page.margins.bottom),
        left: convertMillimetersToTwip(page.margins.left),
      },
    },
  };
}

export async function suratToDocx(workspace: SuratWorkspacePayload): Promise<Buffer> {
  const components = new Map<string, ComponentSource>(
    workspace.components.map((component) => [component.id, component]),
  );

  const children: Array<Paragraph | Table> = [];

  workspace.steps.forEach((step, index) => {
    if (index > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    const content = step.overrideContent ?? step.content;
    const blocks = renderDocument({
      content,
      context: workspace.context,
      components,
      primarySourceId: workspace.source.tableId ?? undefined,
    });

    for (const block of blocks) {
      if (block.type === "list") {
        children.push(...listParagraphs(block, step.page));
      } else {
        children.push(blockToDocx(block, step.page));
      }
    }
  });

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun("Dokumen masih kosong.")] }));
  }

  const page = workspace.steps[0]?.page;
  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: page?.fontFamily ?? "Times New Roman",
            size: Math.round((page?.fontSize ?? 12) * 2),
          },
          paragraph: {
            spacing: { line: Math.round((page?.lineHeight ?? 1.5) * 240), lineRule: "auto" },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "surat-ordered",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: page ? [{ properties: sectionPages(page), children }] : [{ children }],
  });

  return Packer.toBuffer(document);
}

export async function suratBulkZip(
  items: Array<{ filename: string; buffer: Buffer }>,
): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const item of items) zip.file(item.filename, item.buffer);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
