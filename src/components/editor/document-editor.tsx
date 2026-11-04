"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Blocks,
  Bold,
  Braces,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  Minus,
  Plus,
  Redo2,
  Repeat,
  Rows3,
  Settings2,
  SplitSquareVertical,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import type {
  Block,
  DocumentContent,
  PageConfig,
  ParagraphBlock,
} from "@/lib/documents/types";
import {
  duplicateBlock as duplicateBlockTree,
  insertAfter as insertAfterTree,
  insertInside as insertInsideTree,
  moveBlock as moveBlockTree,
  removeBlock as removeBlockTree,
  updateBlock as updateBlockTree,
} from "./tree";
import {
  insertInlineNodeAtSelection,
} from "@/lib/documents/inline-dom";
import { paperDimensions } from "@/components/document/document-view";
import { FloatingMenu, type MenuItem } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BlockList, createBlockId, emptyParagraph, type EditorActions } from "./blocks";
import {
  ConditionalDialog,
  ComponentDialog,
  LoopDialog,
  PageSettingsDialog,
  VariableDialog,
} from "./dialogs";
import { buildVariableOptions, type ComponentOption, type LetterFieldOption, type TableOption } from "./types";

const FONT_FAMILIES = ["Times New Roman", "Arial", "Georgia", "Calibri", "Cambria", "Verdana"];
const FONT_SIZES = [
  { label: "8", value: "1", pt: 8 },
  { label: "9", value: "2", pt: 9 },
  { label: "10", value: "3", pt: 10 },
  { label: "12", value: "4", pt: 12 },
  { label: "14", value: "5", pt: 14 },
  { label: "18", value: "6", pt: 18 },
  { label: "24", value: "7", pt: 24 },
];
const COLORS = ["#111111", "#c0342b", "#b45309", "#1a8f3c", "#0075de", "#6b4fa8"];

interface DocumentEditorProps {
  initialValue: DocumentContent;
  onChange: (value: DocumentContent) => void;
  page: PageConfig;
  onPageChange: (page: PageConfig) => void;
  components: ComponentOption[];
  tables: TableOption[];
  letterFields: LetterFieldOption[];
  activeTableId?: string | null;
  readOnly?: boolean;
  allowPageSettings?: boolean;
  className?: string;
}

interface SelectionState {
  visible: boolean;
  top: number;
  left: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  blockId: string | null;
}

const initialSelection: SelectionState = {
  visible: false,
  top: 0,
  left: 0,
  bold: false,
  italic: false,
  underline: false,
  blockId: null,
};

export function DocumentEditor({
  initialValue,
  onChange,
  page,
  onPageChange,
  components,
  tables,
  letterFields,
  activeTableId,
  readOnly,
  allowPageSettings = true,
  className,
}: DocumentEditorProps) {
  const [doc, setDoc] = useState<DocumentContent>(initialValue);
  const docRef = useRef(initialValue);
  const [epoch, setEpoch] = useState(0);
  const [selection, setSelection] = useState<SelectionState>(initialSelection);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    blockId: string | null;
    editable: HTMLElement | null;
  }>({ open: false, x: 0, y: 0, blockId: null, editable: null });
  const savedRange = useRef<Range | null>(null);
  const activeEditable = useRef<HTMLElement | null>(null);
  const activeBlockId = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [variableDialog, setVariableDialog] = useState(false);
  const [componentDialog, setComponentDialog] = useState(false);
  const [loopDialog, setLoopDialog] = useState(false);
  const [conditionDialog, setConditionDialog] = useState(false);
  const [pageDialog, setPageDialog] = useState(false);

  const history = useRef<{ past: DocumentContent[]; future: DocumentContent[] }>({
    past: [],
    future: [],
  });
  const lastSnapshot = useRef(0);
  const [, setHistoryTick] = useState(0);

  const variables = useMemo(
    () => buildVariableOptions(tables, letterFields, activeTableId),
    [tables, letterFields, activeTableId],
  );

  const pushHistory = useCallback((force: boolean) => {
    const now = Date.now();
    if (!force && now - lastSnapshot.current < 900) return;
    history.current.past.push(structuredClone(docRef.current));
    if (history.current.past.length > 60) history.current.past.shift();
    history.current.future = [];
    lastSnapshot.current = now;
    setHistoryTick((tick) => tick + 1);
  }, []);

  const commit = useCallback(
    (next: DocumentContent) => {
      docRef.current = next;
      setDoc(next);
      onChange(next);
    },
    [onChange],
  );

  const actions: EditorActions = useMemo(
    () => ({
      updateBlock(id, updater) {
        pushHistory(false);
        commit({
          ...docRef.current,
          blocks: updateBlockTree(docRef.current.blocks, id, updater),
        });
      },
      deleteBlock(id) {
        pushHistory(true);
        commit({ ...docRef.current, blocks: removeBlockTree(docRef.current.blocks, id) });
      },
      duplicateBlock(id) {
        pushHistory(true);
        commit({ ...docRef.current, blocks: duplicateBlockTree(docRef.current.blocks, id) });
      },
      moveBlock(id, direction) {
        pushHistory(true);
        commit({ ...docRef.current, blocks: moveBlockTree(docRef.current.blocks, id, direction) });
      },
      insertAfter(id, blocks) {
        pushHistory(true);
        commit({ ...docRef.current, blocks: insertAfterTree(docRef.current.blocks, id, blocks) });
      },
      insertInside(id, blocks, branch = "then") {
        pushHistory(true);
        commit({
          ...docRef.current,
          blocks: insertInsideTree(docRef.current.blocks, id, blocks, branch),
        });
      },
    }),
    [commit, pushHistory],
  );

  const undo = useCallback(() => {
    const previous = history.current.past.pop();
    if (!previous) return;
    history.current.future.push(structuredClone(docRef.current));
    docRef.current = previous;
    setDoc(previous);
    setEpoch((value) => value + 1);
    onChange(previous);
    setHistoryTick((tick) => tick + 1);
  }, [onChange]);

  const redo = useCallback(() => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(structuredClone(docRef.current));
    docRef.current = next;
    setDoc(next);
    setEpoch((value) => value + 1);
    onChange(next);
    setHistoryTick((tick) => tick + 1);
  }, [onChange]);

  /* ------------------------------------------------------------ selection */

  const updateSelection = useCallback(() => {
    if (readOnly) return;
    const active = document.activeElement as HTMLElement | null;
    const editable =
      active?.isContentEditable || active?.closest("[contenteditable='true']")
        ? (active?.isContentEditable ? active : active?.closest("[contenteditable='true']")) as HTMLElement | null
        : null;

    if (editable && canvasRef.current?.contains(editable)) {
      activeEditable.current = editable;
      activeBlockId.current = editable.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null;
    }

    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection((current) =>
        current.visible ? { ...current, visible: false } : current,
      );
      return;
    }

    const range = sel.getRangeAt(0);
    if (!canvasRef.current?.contains(range.commonAncestorContainer)) {
      setSelection((current) => (current.visible ? { ...current, visible: false } : current));
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelection({
      visible: true,
      top: Math.max(8, rect.top - 44),
      left: Math.max(8, rect.left + rect.width / 2 - 220),
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      blockId: editable?.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null,
    });
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const handler = () => window.requestAnimationFrame(updateSelection);
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [readOnly, updateSelection]);

  useEffect(() => {
    if (readOnly) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const inEditable = (document.activeElement as HTMLElement | null)?.isContentEditable;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !inEditable) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (key === "y" && !inEditable) {
        event.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [readOnly, undo, redo]);

  /* --------------------------------------------------------------- format */

  const exec = (command: string, value?: string) => {
    if (readOnly) return;
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    activeEditable.current?.dispatchEvent(new Event("input", { bubbles: true }));
    window.requestAnimationFrame(updateSelection);
  };

  const applyAlignment = (align: "left" | "center" | "right" | "justify") => {
    const blockId = selection.blockId ?? activeBlockId.current;
    if (!blockId) return;
    actions.updateBlock(blockId, (block) => {
      if (block.type === "paragraph" || block.type === "heading") {
        return { ...block, align };
      }
      return block;
    });
  };

  const changeIndent = (delta: number) => {
    const blockId = selection.blockId ?? activeBlockId.current;
    if (!blockId) return;
    actions.updateBlock(blockId, (block) => {
      if (block.type !== "paragraph") return block;
      return { ...block, indent: Math.max(0, Math.min(8, (block.indent ?? 0) + delta)) } as ParagraphBlock;
    });
  };

  /* ------------------------------------------------------------- insertion */

  const insertBlockAfterActive = (blocks: Block[]) => {
    const blockId = contextBlockId() ?? docRef.current.blocks.at(-1)?.id;
    if (blockId) actions.insertAfter(blockId, blocks);
    else commit({ ...docRef.current, blocks: [...docRef.current.blocks, ...blocks] });
  };

  const contextBlockId = (): string | null =>
    contextMenu.blockId ?? selection.blockId ?? activeBlockId.current;

  const insertVariable = (path: string) => {
    const editable = contextMenu.editable ?? activeEditable.current;
    const range = savedRange.current ?? document.getSelection()?.getRangeAt(0) ?? null;
    if (editable && insertInlineNodeAtSelection(editable, path, range)) {
      editable.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    insertBlockAfterActive([
      {
        id: createBlockId(),
        type: "paragraph",
        content: [{ type: "expression", path }],
      },
    ]);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (readOnly) return;
    const target = event.target as HTMLElement;
    const editable = target.closest("[contenteditable='true']") as HTMLElement | null;
    const blockId = target.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null;

    if (editable && canvasRef.current?.contains(editable)) {
      const sel = document.getSelection();
      savedRange.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    } else {
      savedRange.current = null;
    }

    event.preventDefault();
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      blockId,
      editable: editable && canvasRef.current?.contains(editable) ? editable : null,
    });
  };

  const contextItems: MenuItem[] = [
    { label: "Sisipkan variabel…", icon: Braces, onSelect: () => setVariableDialog(true) },
    { label: "Sisipkan component…", icon: Blocks, onSelect: () => setComponentDialog(true) },
    { label: "Sisipkan loop…", icon: Repeat, onSelect: () => setLoopDialog(true) },
    {
      label: "Sisipkan kondisi…",
      icon: SplitSquareVertical,
      onSelect: () => setConditionDialog(true),
    },
    {
      label: "Tambah paragraf",
      icon: Plus,
      separatorBefore: true,
      onSelect: () => insertBlockAfterActive([emptyParagraph()]),
    },
    {
      label: "Tambah tabel 3 × 3",
      icon: Table2,
      onSelect: () =>
        insertBlockAfterActive([
          {
            id: createBlockId(),
            type: "table",
            header: true,
            rows: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => [])),
            widths: [34, 33, 33],
          },
        ]),
    },
  ];

  const { width, height } = paperDimensions(page);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-warm/70", className)}>
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-canvas px-2 py-1.5">
          <ToolbarButton icon={Braces} label="Variabel" onClick={() => setVariableDialog(true)} />
          <ToolbarButton icon={Blocks} label="Component" onClick={() => setComponentDialog(true)} />
          <ToolbarButton icon={Repeat} label="Loop" onClick={() => setLoopDialog(true)} />
          <ToolbarButton
            icon={SplitSquareVertical}
            label="Kondisi"
            onClick={() => setConditionDialog(true)}
          />
          <span className="mx-1 h-4 w-px bg-line" />
          <ToolbarButton
            icon={Table2}
            label="Tabel"
            onClick={() =>
              insertBlockAfterActive([
                {
                  id: createBlockId(),
                  type: "table",
                  header: true,
                  rows: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => [])),
                  widths: [34, 33, 33],
                },
              ])
            }
          />
          <ToolbarButton
            icon={List}
            label="Daftar"
            onClick={() =>
              insertBlockAfterActive([
                { id: createBlockId(), type: "list", ordered: false, items: [[], []] },
              ])
            }
          />
          <ToolbarButton icon={Minus} label="Garis" onClick={() => insertBlockAfterActive([{ id: createBlockId(), type: "divider" }])} />
          <ToolbarButton
            icon={Rows3}
            label="Halaman"
            onClick={() => insertBlockAfterActive([{ id: createBlockId(), type: "pageBreak" }])}
          />
          {allowPageSettings ? (
            <>
              <span className="mx-1 h-4 w-px bg-line" />
              <ToolbarButton
                icon={Settings2}
                label="Halaman dokumen"
                onClick={() => setPageDialog(true)}
              />
            </>
          ) : null}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={history.current.past.length === 0}
              className="rounded-[4px] p-1.5 text-muted transition-colors hover:bg-warm hover:text-ink disabled:opacity-30"
              aria-label="Urungkan perubahan struktur"
              title="Urungkan perubahan struktur"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={history.current.future.length === 0}
              className="rounded-[4px] p-1.5 text-muted transition-colors hover:bg-warm hover:text-ink disabled:opacity-30"
              aria-label="Ulangi perubahan"
              title="Ulangi perubahan"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
            <span className="ml-1 hidden rounded-full border border-line bg-warm px-2 py-0.5 text-[10px] text-muted sm:block">
              Klik kanan untuk variabel, loop, dan kondisi
            </span>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5" ref={canvasRef} onContextMenu={handleContextMenu}>
        <div
          className="doc-sheet doc-body relative mx-auto"
          style={
            {
              width: `${width}mm`,
              minHeight: `${height}mm`,
              paddingTop: `${page.margins.top}mm`,
              paddingRight: `${page.margins.right}mm`,
              paddingBottom: `${page.margins.bottom}mm`,
              paddingLeft: `${page.margins.left}mm`,
              "--doc-font": page.fontFamily,
              "--doc-font-size": page.fontSize,
              "--doc-line-height": page.lineHeight,
            } as CSSProperties
          }
        >
          <BlockList
            key={epoch}
            blocks={doc.blocks}
            actions={actions}
            components={components}
            variables={variables}
            tables={tables}
            activeTableId={activeTableId}
            readOnly={readOnly}
            onRequestVariable={() => undefined}
          />
          {doc.blocks.length === 0 && !readOnly ? (
            <button
              type="button"
              onClick={() => commit({ ...docRef.current, blocks: [emptyParagraph()] })}
              className="mt-4 w-full rounded-[6px] border border-dashed border-line py-8 text-[12px] text-faint hover:bg-warm/50 hover:text-muted"
            >
              Klik untuk mulai menulis dokumen
            </button>
          ) : null}
        </div>
      </div>

      {selection.visible && !readOnly ? (
        <div
          className="fixed z-40 flex max-w-[calc(100vw-16px)] flex-wrap items-center gap-0.5 rounded-[7px] border border-line bg-canvas p-1 shadow-[var(--shadow-float)] animate-fade"
          style={{ top: selection.top, left: selection.left }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <FormatButton icon={Bold} label="Tebal" active={selection.bold} onClick={() => exec("bold")} />
          <FormatButton icon={Italic} label="Miring" active={selection.italic} onClick={() => exec("italic")} />
          <FormatButton icon={Underline} label="Garis bawah" active={selection.underline} onClick={() => exec("underline")} />
          <span className="mx-0.5 h-4 w-px bg-line" />
          <Select
            defaultValue=""
            onChange={(event) => event.target.value && exec("fontName", event.target.value)}
            className="h-6 w-[92px] rounded-[3px] px-1 text-[10.5px]"
            aria-label="Jenis font"
          >
            <option value="">Font</option>
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </Select>
          <Select
            defaultValue=""
            onChange={(event) => event.target.value && exec("fontSize", event.target.value)}
            className="h-6 w-[54px] rounded-[3px] px-1 text-[10.5px]"
            aria-label="Ukuran font"
          >
            <option value="">Size</option>
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-0.5 px-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => exec("foreColor", color)}
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
                aria-label={`Warna ${color}`}
                title={`Warna ${color}`}
              />
            ))}
          </div>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <FormatButton icon={AlignLeft} label="Kiri" onClick={() => applyAlignment("left")} />
          <FormatButton icon={AlignCenter} label="Tengah" onClick={() => applyAlignment("center")} />
          <FormatButton icon={AlignRight} label="Kanan" onClick={() => applyAlignment("right")} />
          <FormatButton icon={AlignJustify} label="Rata kanan-kiri" onClick={() => applyAlignment("justify")} />
          <span className="mx-0.5 h-4 w-px bg-line" />
          <FormatButton icon={IndentIncrease} label="Tambah indent" onClick={() => changeIndent(1)} />
          <FormatButton icon={IndentDecrease} label="Kurangi indent" onClick={() => changeIndent(-1)} />
        </div>
      ) : null}

      <FloatingMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextItems}
        onClose={() => setContextMenu((current) => ({ ...current, open: false }))}
        header="Sisipkan"
      />

      <VariableDialog
        open={variableDialog}
        onClose={() => setVariableDialog(false)}
        variables={variables}
        onPick={insertVariable}
      />
      <ComponentDialog
        open={componentDialog}
        onClose={() => setComponentDialog(false)}
        components={components}
        onPick={(componentId) =>
          insertBlockAfterActive([
            { id: createBlockId(), type: "componentRef", componentId },
          ])
        }
      />
      <LoopDialog
        open={loopDialog}
        onClose={() => setLoopDialog(false)}
        tables={tables}
        onCreate={({ source, label, emptyText }) =>
          insertBlockAfterActive([
            {
              id: createBlockId(),
              type: "loop",
              source,
              label: label || undefined,
              emptyText: emptyText || undefined,
              blocks: [emptyParagraph()],
            },
          ])
        }
      />
      <ConditionalDialog
        open={conditionDialog}
        onClose={() => setConditionDialog(false)}
        variables={variables}
        onCreate={({ conditions, match, withElse }) =>
          insertBlockAfterActive([
            {
              id: createBlockId(),
              type: "conditional",
              conditions,
              match,
              blocks: [emptyParagraph()],
              elseBlocks: withElse ? [emptyParagraph()] : [],
            },
          ])
        }
      />
      {allowPageSettings ? (
        <PageSettingsDialog
          open={pageDialog}
          onClose={() => setPageDialog(false)}
          page={page}
          onApply={onPageChange}
        />
      ) : null}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Braces;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-warm hover:text-ink"
      title={label}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function FormatButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-[3px] p-1 text-muted transition-colors hover:bg-warm hover:text-ink",
        active && "bg-brand-soft text-brand",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
    </button>
  );
}

