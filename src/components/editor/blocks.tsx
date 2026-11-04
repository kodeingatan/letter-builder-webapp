"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  Link2,
  Minus,
  Plus,
  Settings2,
  Trash2,
  Type,
} from "lucide-react";
import type {
  Block,
  ConditionalBlock,
  InlineNode,
  LoopBlock,
  TableBlock,
} from "@/lib/documents/types";
import { inlineToHtml } from "@/lib/documents/inline-dom";
import { cn } from "@/lib/utils";
import { DropdownMenu, type MenuItem } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EditableInline } from "./editable";
import { ConditionEditor } from "./condition-editor";
import type { ComponentOption, TableOption, VariableOption } from "./types";

export interface EditorActions {
  updateBlock: (id: string, updater: (block: Block) => Block) => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, direction: -1 | 1) => void;
  insertAfter: (id: string, blocks: Block[]) => void;
  insertInside: (id: string, blocks: Block[], branch?: "then" | "else") => void;
}

interface BlockListProps {
  blocks: Block[];
  actions: EditorActions;
  components: ComponentOption[];
  variables: VariableOption[];
  tables: TableOption[];
  activeTableId?: string | null;
  readOnly?: boolean;
  onRequestVariable: (editable: HTMLElement | null) => void;
}

const ALIGN_STYLE = {
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
} as const;

export function createBlockId(prefix = "blk"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

export function emptyParagraph(): Block {
  return { id: createBlockId(), type: "paragraph", content: [] };
}

const EMPTY_TABLE_ROW = (columns: number): InlineNode[][] =>
  Array.from({ length: Math.max(1, columns) }, () => []);

export function BlockList({
  blocks,
  actions,
  components,
  variables,
  tables,
  activeTableId,
  readOnly,
  onRequestVariable,
}: BlockListProps) {
  return (
    <div className={cn("flex flex-col", readOnly && "pointer-events-none")}>
      {blocks.map((block, index) => (
        <BlockRow
          key={block.id}
          block={block}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
          actions={actions}
          components={components}
          variables={variables}
          tables={tables}
          activeTableId={activeTableId}
          readOnly={readOnly}
          onRequestVariable={onRequestVariable}
        />
      ))}
      {!readOnly ? (
        <div className="group/add -ml-1 mt-1 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/block:opacity-100">
          <button
            type="button"
            onClick={() => {
              const last = blocks[blocks.length - 1];
              const paragraph = emptyParagraph();
              if (last) actions.insertAfter(last.id, [paragraph]);
            }}
            className="flex items-center gap-1 rounded-[3px] px-1 py-0.5 text-[9px] uppercase tracking-wider text-faint hover:bg-warm hover:text-ink"
          >
            <Plus className="h-2.5 w-2.5" /> blok
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BlockRow({
  block,
  isFirst,
  isLast,
  actions,
  components,
  variables,
  tables,
  activeTableId,
  readOnly,
  onRequestVariable,
}: {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  actions: EditorActions;
  components: ComponentOption[];
  variables: VariableOption[];
  tables: TableOption[];
  activeTableId?: string | null;
  readOnly?: boolean;
  onRequestVariable: (editable: HTMLElement | null) => void;
}) {
  const blockMenu: MenuItem[] = [
    {
      label: "Tambah paragraf di bawah",
      icon: Type,
      onSelect: () => actions.insertAfter(block.id, [emptyParagraph()]),
    },
    {
      label: "Duplikat blok",
      icon: Copy,
      onSelect: () => actions.duplicateBlock(block.id),
    },
    {
      label: "Pindah ke atas",
      icon: ArrowUp,
      disabled: isFirst,
      onSelect: () => actions.moveBlock(block.id, -1),
    },
    {
      label: "Pindah ke bawah",
      icon: ArrowDown,
      disabled: isLast,
      onSelect: () => actions.moveBlock(block.id, 1),
    },
    {
      label: "Hapus blok",
      icon: Trash2,
      danger: true,
      separatorBefore: true,
      onSelect: () => actions.deleteBlock(block.id),
    },
  ];

  return (
    <div data-block-id={block.id} className="editor-block group/block relative my-[2px]">
      {!readOnly ? (
        <div className="editor-block-tools absolute -left-[30px] top-0 flex flex-col items-center">
          <DropdownMenu
            trigger={<GripVertical className="h-3.5 w-3.5 text-faint hover:text-muted" />}
            triggerClassName="rounded-[3px] p-0.5 hover:bg-warm"
            items={blockMenu}
            minWidth={200}
          />
        </div>
      ) : null}

      <BlockContent
        block={block}
        actions={actions}
        components={components}
        variables={variables}
        tables={tables}
        activeTableId={activeTableId}
        readOnly={readOnly}
        onRequestVariable={onRequestVariable}
      />
    </div>
  );
}

function BlockContent({
  block,
  actions,
  components,
  variables,
  tables,
  activeTableId,
  readOnly,
  onRequestVariable,
}: {
  block: Block;
  actions: EditorActions;
  components: ComponentOption[];
  variables: VariableOption[];
  tables: TableOption[];
  activeTableId?: string | null;
  readOnly?: boolean;
  onRequestVariable: (editable: HTMLElement | null) => void;
}) {
  const update = (updater: (current: Block) => Block) => actions.updateBlock(block.id, updater);

  switch (block.type) {
    case "paragraph":
      return (
        <EditableInline
          as="p"
          value={block.content}
          onChange={(content) => update((current) => ({ ...current, content } as Block))}
          onFocus={(element) => onRequestVariable(element)}
          placeholder="Ketik teks surat, atau klik kanan untuk menyisipkan variabel…"
          className="doc-paragraph"
          ariaLabel="Paragraf"
          style={{
            textAlign: block.align ? ALIGN_STYLE[block.align] : undefined,
            marginLeft: block.indent ? `${block.indent * 2}em` : undefined,
            marginTop: block.spacing?.before ? `${block.spacing.before}px` : undefined,
            marginBottom: block.spacing?.after ? `${block.spacing.after}px` : undefined,
          }}
          readOnly={readOnly}
        />
      );

    case "heading":
      return (
        <EditableInline
          as="p"
          value={block.content}
          onChange={(content) => update((current) => ({ ...current, content } as Block))}
          onFocus={(element) => onRequestVariable(element)}
          placeholder="Judul"
          className={`doc-heading-${block.level}`}
          ariaLabel="Judul"
          style={{ textAlign: block.align ? ALIGN_STYLE[block.align] : "center" }}
          readOnly={readOnly}
        />
      );

    case "list":
      return (
        <div>
          <ul className={cn("doc-list", block.ordered && "list-decimal")} style={{ listStyleType: block.ordered ? "decimal" : "disc" }}>
            {block.items.map((item, index) => (
              <li key={index} className="group/li relative">
                <EditableInline
                  value={item}
                  onChange={(content) =>
                    update((current) => {
                      if (current.type !== "list") return current;
                      const items = current.items.map((entry, i) => (i === index ? content : entry));
                      return { ...current, items };
                    })
                  }
                  onFocus={(element) => onRequestVariable(element)}
                  readOnly={readOnly}
                  ariaLabel={`Butir ${index + 1}`}
                />
              </li>
            ))}
          </ul>
          {!readOnly ? (
            <div className="mt-0.5 flex gap-1 opacity-0 transition-opacity group-hover/block:opacity-100">
              <button
                type="button"
                className="rounded-[3px] px-1 py-0.5 text-[9px] text-faint hover:bg-warm hover:text-ink"
                onClick={() =>
                  update((current) =>
                    current.type === "list"
                      ? { ...current, items: [...current.items, []] }
                      : current,
                  )
                }
              >
                + butir
              </button>
              {block.items.length > 1 ? (
                <button
                  type="button"
                  className="rounded-[3px] px-1 py-0.5 text-[9px] text-faint hover:bg-warm hover:text-ink"
                  onClick={() =>
                    update((current) =>
                      current.type === "list"
                        ? { ...current, items: current.items.slice(0, -1) }
                        : current,
                    )
                  }
                >
                  − butir
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      );

    case "table":
      return (
        <TableBlockView
          block={block}
          onChange={(next) => update(() => next)}
          readOnly={readOnly}
          tables={tables}
          variables={variables}
        />
      );

    case "componentRef": {
      const component = components.find((item) => item.id === block.componentId);
      return (
        <div className="my-1 flex items-center gap-2 rounded-[5px] border border-dashed border-[#b9d9f5] bg-brand-soft/50 px-2 py-1.5">
          <Link2 className="h-3 w-3 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-ink">
              {component?.name ?? block.note ?? "Component tidak ditemukan"}
            </p>
            <p className="text-[9.5px] text-faint">
              Component referensi — perubahan sumber otomatis berlaku
            </p>
          </div>
          {component ? <Badge tone="blue">{component.category}</Badge> : <Badge tone="red">Hilang</Badge>}
        </div>
      );
    }

    case "loop":
      return (
        <LoopBlockView
          block={block}
          onChange={(next) => update(() => next)}
          actions={actions}
          components={components}
          variables={variables}
          tables={tables}
          activeTableId={activeTableId}
          readOnly={readOnly}
          onRequestVariable={onRequestVariable}
        />
      );

    case "conditional":
      return (
        <ConditionalBlockView
          block={block}
          onChange={(next) => update(() => next)}
          actions={actions}
          components={components}
          variables={variables}
          tables={tables}
          activeTableId={activeTableId}
          readOnly={readOnly}
          onRequestVariable={onRequestVariable}
        />
      );

    case "divider":
      return <hr className="my-1 border-0 border-t border-[#444]" />;

    case "spacer":
      return <div style={{ height: block.height }} className="bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.03)_4px,rgba(0,0,0,0.03)_8px)]" />;

    case "pageBreak":
      return (
        <div className="my-3 flex items-center gap-2">
          <div className="h-px flex-1 border-t border-dashed border-[#c0bbb5]" />
          <span className="rounded-full border border-line bg-warm px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-faint">
            Pemisah halaman
          </span>
          <div className="h-px flex-1 border-t border-dashed border-[#c0bbb5]" />
        </div>
      );

    default:
      return null;
  }
}

function TableBlockView({
  block,
  onChange,
  readOnly,
  tables,
  variables,
}: {
  block: TableBlock;
  onChange: (block: TableBlock) => void;
  readOnly?: boolean;
  tables: TableOption[];
  variables: VariableOption[];
}) {
  const [showConfig, setShowConfig] = useState(false);
  const columns = block.rows[0]?.length ?? 1;
  const templateIndex = block.header ? 1 : 0;

  const setCell = (rowIndex: number, cellIndex: number, content: InlineNode[]) => {
    const rows = block.rows.map((row, r) =>
      r === rowIndex ? row.map((cell, c) => (c === cellIndex ? content : cell)) : row,
    );
    onChange({ ...block, rows });
  };

  return (
    <div className="my-1.5">
      {!readOnly ? (
        <div className="mb-1 flex flex-wrap items-center gap-1 text-[10px] text-faint">
          <button type="button" className="rounded-[3px] px-1 py-0.5 hover:bg-warm hover:text-ink" onClick={() => onChange({ ...block, rows: [...block.rows, EMPTY_TABLE_ROW(columns)] })}>
            + baris
          </button>
          <button type="button" className="rounded-[3px] px-1 py-0.5 hover:bg-warm hover:text-ink" onClick={() => onChange({ ...block, rows: block.rows.map((row) => [...row, []]) })}>
            + kolom
          </button>
          <button type="button" className="rounded-[3px] px-1 py-0.5 hover:bg-warm hover:text-ink" onClick={() => onChange({ ...block, rows: block.rows.map((row) => row.slice(0, -1)) })} disabled={columns <= 1}>
            − kolom
          </button>
          <button type="button" className="rounded-[3px] px-1 py-0.5 hover:bg-warm hover:text-ink" onClick={() => onChange({ ...block, rows: block.rows.slice(0, -1) })} disabled={block.rows.length <= 1}>
            − baris
          </button>
          <button type="button" className="rounded-[3px] px-1 py-0.5 hover:bg-warm hover:text-ink" onClick={() => onChange({ ...block, header: !block.header })}>
            {block.header ? "tanpa header" : "pakai header"}
          </button>
          <button
            type="button"
            className={cn("ml-auto inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 hover:bg-warm hover:text-ink", block.repeat && "text-success")}
            onClick={() => setShowConfig((current) => !current)}
          >
            <Settings2 className="h-2.5 w-2.5" />
            {block.repeat ? "baris dinamis" : "statis"}
          </button>
        </div>
      ) : null}

      {showConfig && !readOnly ? (
        <div className="mb-1.5 rounded-[5px] border border-line bg-warm/60 p-2">
          <label className="text-[10px] font-medium text-muted">Sumber baris</label>
          <Select
            value={block.repeat?.source ?? ""}
            onChange={(event) =>
              onChange({
                ...block,
                repeat: event.target.value
                  ? { source: event.target.value, filter: block.repeat?.filter ?? [] }
                  : undefined,
              })
            }
            className="mt-1 h-7 text-[11px]"
          >
            <option value="">Statis — baris tetap</option>
            <option value="active">Baris aktif administrasi</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Semua baris {table.name}
              </option>
            ))}
          </Select>
          {block.repeat ? (
            <>
              <p className="mt-1 text-[10px] text-faint">
                Baris data (setelah header) diulang untuk setiap record. Gunakan {"{{_index}}"} untuk nomor urut.
              </p>
              <div className="mt-1.5">
                <ConditionEditor
                  conditions={block.repeat.filter ?? []}
                  onChange={(filter) => onChange({ ...block, repeat: { ...block.repeat!, filter } })}
                  match="all"
                  onMatchChange={() => undefined}
                  variables={variables}
                  compact
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <table className="doc-table">
        {block.widths?.length ? (
          <colgroup>
            {block.widths.map((width, index) => (
              <col key={index} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
        ) : null}
        <tbody>
          {block.rows.map((row, rowIndex) => {
            const isHeader = block.header && rowIndex === 0;
            const isTemplate = block.repeat && rowIndex === templateIndex;
            const CellTag = isHeader ? "th" : "td";
            return (
              <tr key={rowIndex} className={isTemplate ? "bg-success-soft/40" : undefined}>
                {row.map((cell, cellIndex) => (
                  <CellTag key={cellIndex}>
                    <EditableInline
                      value={cell}
                      onChange={(content) => setCell(rowIndex, cellIndex, content)}
                      placeholder={isHeader ? "Header" : ""}
                      readOnly={readOnly || Boolean(block.repeat && !isTemplate && !isHeader)}
                      ariaLabel={`Sel ${rowIndex + 1}-${cellIndex + 1}`}
                    />
                  </CellTag>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {block.repeat && !readOnly ? (
        <p className="mt-1 text-[9.5px] text-success">
          Baris kuning adalah template — akan diulang otomatis mengikuti data.
        </p>
      ) : null}
    </div>
  );
}

function LoopBlockView({
  block,
  onChange,
  actions,
  components,
  variables,
  tables,
  activeTableId,
  readOnly,
  onRequestVariable,
}: {
  block: LoopBlock;
  onChange: (block: LoopBlock) => void;
  actions: EditorActions;
  components: ComponentOption[];
  variables: VariableOption[];
  tables: TableOption[];
  activeTableId?: string | null;
  readOnly?: boolean;
  onRequestVariable: (editable: HTMLElement | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sourceLabel =
    block.source === "active"
      ? "baris aktif"
      : tables.find((table) => table.id === block.source)?.name ?? "tabel";

  return (
    <div className="loop-frame my-1.5">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#d9eddf] px-2 py-1">
        <span className="rounded-[3px] bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-success">
          Loop
        </span>
        <span className="text-[10px] text-muted">untuk setiap baris</span>
        <span className="rounded-[3px] bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink ring-1 ring-line">
          {sourceLabel}
        </span>
        {block.filter?.length ? <Badge tone="green">{block.filter.length} filter</Badge> : null}
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="ml-auto inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 text-[10px] text-muted hover:bg-canvas"
          >
            <Settings2 className="h-2.5 w-2.5" /> atur
          </button>
        ) : null}
      </div>

      {expanded && !readOnly ? (
        <div className="space-y-2 border-b border-[#d9eddf] bg-canvas/70 px-2 py-2">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-medium text-muted">Sumber data</label>
              <Select
                value={block.source}
                onChange={(event) => onChange({ ...block, source: event.target.value })}
                className="mt-1 h-7 text-[11px]"
              >
                <option value="active">Baris aktif administrasi</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    Semua baris {table.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted">Label (internal)</label>
              <Input
                value={block.label ?? ""}
                onChange={(event) => onChange({ ...block, label: event.target.value })}
                className="mt-1 h-7 text-[11px]"
                placeholder="mis. Daftar pegawai"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted">Teks jika tidak ada data</label>
            <Input
              value={block.emptyText ?? ""}
              onChange={(event) => onChange({ ...block, emptyText: event.target.value })}
              className="mt-1 h-7 text-[11px]"
              placeholder="Tidak ada data."
            />
          </div>
          <ConditionEditor
            conditions={block.filter ?? []}
            onChange={(filter) => onChange({ ...block, filter })}
            match="all"
            onMatchChange={() => undefined}
            variables={variables.filter(
              (variable) => !activeTableId || variable.group !== "Baris data aktif" || true,
            )}
            compact
          />
        </div>
      ) : null}

      <div className="px-2.5 py-1.5">
        <BlockList
          blocks={block.blocks}
          actions={actions}
          components={components}
          variables={variables}
          tables={tables}
          activeTableId={activeTableId}
          readOnly={readOnly}
          onRequestVariable={onRequestVariable}
        />
        {!readOnly && block.blocks.length === 0 ? (
          <button
            type="button"
            onClick={() => actions.insertInside(block.id, [emptyParagraph()])}
            className="rounded-[3px] px-1 py-0.5 text-[10px] text-success hover:bg-success-soft"
          >
            + tambah blok di dalam loop
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ConditionalBlockView({
  block,
  onChange,
  actions,
  components,
  variables,
  tables,
  activeTableId,
  readOnly,
  onRequestVariable,
}: {
  block: ConditionalBlock;
  onChange: (block: ConditionalBlock) => void;
  actions: EditorActions;
  components: ComponentOption[];
  variables: VariableOption[];
  tables: TableOption[];
  activeTableId?: string | null;
  readOnly?: boolean;
  onRequestVariable: (editable: HTMLElement | null) => void;
}) {
  const [expanded, setExpanded] = useState(block.conditions.length === 0);

  const summary =
    block.conditions.length === 0
      ? "belum ada kondisi"
      : block.conditions
          .map((condition) => `${condition.field} ${condition.operator} ${condition.value}`)
          .join(block.match === "all" ? " & " : " | ");

  return (
    <div className="conditional-frame my-1.5">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#d7e8f7] px-2 py-1">
        <span className="rounded-[3px] bg-brand/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand">
          Jika
        </span>
        <span className="max-w-[60%] truncate text-[10px] text-muted">{summary}</span>
        {block.elseBlocks.length > 0 ? <Badge tone="amber">dengan else</Badge> : null}
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="ml-auto inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 text-[10px] text-muted hover:bg-canvas"
          >
            <Settings2 className="h-2.5 w-2.5" /> atur
          </button>
        ) : null}
      </div>

      {expanded && !readOnly ? (
        <div className="border-b border-[#d7e8f7] bg-canvas/70 px-2 py-2">
          <ConditionEditor
            conditions={block.conditions}
            onChange={(conditions) => onChange({ ...block, conditions })}
            match={block.match}
            onMatchChange={(match) => onChange({ ...block, match })}
            variables={variables}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-muted">
            <label className="inline-flex items-center gap-1.5">
              <Checkbox
                checked={block.elseBlocks.length > 0}
                onChange={(event) =>
                  onChange({
                    ...block,
                    elseBlocks: event.target.checked ? [emptyParagraph()] : [],
                  })
                }
              />
              Tambahkan cabang “selain itu”
            </label>
          </div>
        </div>
      ) : null}

      <div className="px-2.5 py-1.5">
        <BlockList
          blocks={block.blocks}
          actions={actions}
          components={components}
          variables={variables}
          tables={tables}
          activeTableId={activeTableId}
          readOnly={readOnly}
          onRequestVariable={onRequestVariable}
        />
        {!readOnly && block.blocks.length === 0 ? (
          <button
            type="button"
            onClick={() => actions.insertInside(block.id, [emptyParagraph()], "then")}
            className="rounded-[3px] px-1 py-0.5 text-[10px] text-brand hover:bg-brand-soft"
          >
            + tambah blok
          </button>
        ) : null}
      </div>

      {block.elseBlocks.length > 0 ? (
        <div className="border-t border-[#f0e2cf] bg-[#fffdf9]">
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="rounded-[3px] bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-warning">
              Selain itu
            </span>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => onChange({ ...block, elseBlocks: [] })}
                className="ml-auto inline-flex items-center gap-1 rounded-[3px] px-1 text-[10px] text-faint hover:text-danger"
              >
                <Minus className="h-2.5 w-2.5" /> hapus cabang
              </button>
            ) : null}
          </div>
          <div className="px-2.5 pb-1.5">
            <BlockList
              blocks={block.elseBlocks}
              actions={actions}
              components={components}
              variables={variables}
              tables={tables}
              activeTableId={activeTableId}
              readOnly={readOnly}
              onRequestVariable={onRequestVariable}
            />
            {!readOnly && block.elseBlocks.length === 0 ? (
              <button
                type="button"
                onClick={() => actions.insertInside(block.id, [emptyParagraph()], "else")}
                className="rounded-[3px] px-1 py-0.5 text-[10px] text-warning hover:bg-warning-soft"
              >
                + tambah blok else
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!readOnly && block.elseBlocks.length === 0 ? (
        <div className="border-t border-[#f0e2cf] px-2 py-1">
          <button
            type="button"
            onClick={() => onChange({ ...block, elseBlocks: [emptyParagraph()] })}
            className="text-[10px] text-warning/80 hover:text-warning"
          >
            + cabang “selain itu”
          </button>
        </div>
      ) : null}
    </div>
  );
}
