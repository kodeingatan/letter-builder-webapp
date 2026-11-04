import type { CSSProperties, ReactNode } from "react";
import type { PageConfig, TextMark } from "@/lib/documents/types";
import type { ResolvedBlock, ResolvedInline } from "@/lib/documents/engine";
import { PAPER_MM } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

export function paperDimensions(page: PageConfig): { width: number; height: number } {
  const base = PAPER_MM[page.paper];
  return page.orientation === "landscape"
    ? { width: base.height, height: base.width }
    : { width: base.width, height: base.height };
}

export function markStyle(marks?: TextMark): CSSProperties {
  if (!marks) return {};
  const style: CSSProperties = {};
  if (marks.bold) style.fontWeight = 700;
  if (marks.italic) style.fontStyle = "italic";
  if (marks.underline) style.textDecoration = "underline";
  if (marks.color) style.color = marks.color;
  if (marks.fontSize) style.fontSize = `${marks.fontSize}pt`;
  if (marks.fontFamily) style.fontFamily = marks.fontFamily;
  return style;
}

function InlineContent({ nodes }: { nodes: ResolvedInline[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.missing) {
          return (
            <span
              key={`${node.path}-${index}`}
              className="doc-expression"
              data-missing="true"
              title={`Variabel "${node.path}" tidak ditemukan pada data`}
              style={markStyle(node.marks)}
            >
              {node.text}
            </span>
          );
        }
        if (node.path) {
          return (
            <span key={`${node.path}-${index}`} className="doc-expression" style={markStyle(node.marks)}>
              {node.text}
            </span>
          );
        }
        return <InlineText key={index} node={node} />;
      })}
    </>
  );
}

function InlineText({ node }: { node: ResolvedInline }) {
  const style = markStyle(node.marks);
  if (!style || Object.keys(style).length === 0) {
    return <Multiline text={node.text} />;
  }
  return (
    <span style={style}>
      <Multiline text={node.text} />
    </span>
  );
}

function Multiline({ text }: { text: string }) {
  if (!text.includes("\n")) return <>{text}</>;
  const parts = text.split("\n");
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <br /> : null}
          {part}
        </span>
      ))}
    </>
  );
}

const ALIGN: Record<string, CSSProperties["textAlign"]> = {
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
};

function BlockContent({ block }: { block: ResolvedBlock }): ReactNode {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          className="doc-paragraph"
          style={{
            textAlign: block.align ? ALIGN[block.align] : undefined,
            marginLeft: block.indent ? `${block.indent * 2}em` : undefined,
            marginTop: block.spacing?.before ? `${block.spacing.before}px` : undefined,
            marginBottom: block.spacing?.after ? `${block.spacing.after}px` : undefined,
          }}
        >
          {block.content.length > 0 ? <InlineContent nodes={block.content} /> : <span>&nbsp;</span>}
        </p>
      );
    case "heading":
      return (
        <p
          className={`doc-heading-${block.level}`}
          style={{ textAlign: block.align ? ALIGN[block.align] : undefined }}
        >
          <InlineContent nodes={block.content} />
        </p>
      );
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className="doc-list">
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineContent nodes={item} />
            </li>
          ))}
        </ListTag>
      );
    }
    case "table":
      return (
        <table className="doc-table">
          {block.widths && block.widths.length > 0 ? (
            <colgroup>
              {block.widths.map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
          ) : null}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) =>
                  block.header && rowIndex === 0 ? (
                    <th key={cellIndex}>
                      <InlineContent nodes={cell} />
                    </th>
                  ) : (
                    <td key={cellIndex}>
                      <InlineContent nodes={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "divider":
      return <hr className="my-1.5 border-0 border-t border-[#333]" />;
    case "spacer":
      return <div style={{ height: block.height }} aria-hidden />;
    case "pageBreak":
      return (
        <div className="doc-page-break my-3 border-t border-dashed border-[#999]" data-page-break="true">
          <span className="no-print float-right -mt-2 bg-white px-1 text-[8px] uppercase tracking-wider text-neutral-400">
            pemisah halaman
          </span>
        </div>
      );
    case "missingComponent":
      return <div className="doc-component-missing">Component tidak ditemukan: {block.label}</div>;
    default:
      return null;
  }
}

export interface DocumentViewProps {
  blocks: ResolvedBlock[];
  page: PageConfig;
  className?: string;
  /** Show the paper frame and shadow (preview). Print views disable chrome. */
  chrome?: boolean;
  style?: CSSProperties;
}

export function DocumentView({ blocks, page, className, chrome = true, style }: DocumentViewProps) {
  const { width, height } = paperDimensions(page);

  return (
    <div
      className={cn("doc-sheet doc-body mx-auto", className)}
      style={
        {
          width: `${width}mm`,
          minHeight: chrome ? `${height}mm` : undefined,
          paddingTop: `${page.margins.top}mm`,
          paddingRight: `${page.margins.right}mm`,
          paddingBottom: `${page.margins.bottom}mm`,
          paddingLeft: `${page.margins.left}mm`,
          "--doc-font": page.fontFamily,
          "--doc-font-size": page.fontSize,
          "--doc-line-height": page.lineHeight,
          ...style,
        } as CSSProperties
      }
    >
      <div lang="id">
        {blocks.map((block, index) => (
          <BlockContent key={index} block={block} />
        ))}
        {blocks.length === 0 ? (
          <p className="text-center text-[11px] text-neutral-400">Dokumen masih kosong.</p>
        ) : null}
      </div>
    </div>
  );
}

export function DocumentPageBreak({ children }: { children: ReactNode }) {
  return <div className="print-break">{children}</div>;
}
