"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  ariaLabel?: string;
}

const CONTENT_CLASS = [
  "min-h-[3em] max-h-[40vh] overflow-y-auto px-3 py-2 text-[13px] leading-relaxed outline-none",
  "[&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
].join(" ");

const TOOLS: Array<{
  key: "bold" | "italic" | "underline" | "bulletList" | "orderedList";
  icon: string;
  label: string;
  iconClass?: string;
  run: (editor: Editor) => void;
}> = [
  {
    key: "bold",
    icon: "B",
    label: "Tebal",
    iconClass: "font-bold",
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    key: "italic",
    icon: "I",
    label: "Miring",
    iconClass: "italic",
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    key: "underline",
    icon: "U",
    label: "Garis bawah",
    iconClass: "underline",
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    key: "bulletList",
    icon: "•",
    label: "List tak berurut",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    key: "orderedList",
    icon: "1.",
    label: "List berurut",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

/**
 * Rich text editor built on Tiptap. Stores HTML content and keeps it in sync
 * with the `value` prop, so it can be used both for new records and editing.
 */
export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder,
  readOnly,
  ariaLabel,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: CONTENT_CLASS,
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.isEmpty ? "" : current.getHTML());
    },
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Keep external value changes (e.g. reopening the edit dialog) in sync
  // without clobbering the content while the user is typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current === value) return;
    if (editor.isEmpty && (value === "" || value === "<p></p>")) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-[6px] border border-line bg-canvas transition-[border-color,box-shadow] duration-100 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15",
        readOnly && "cursor-default bg-warm",
        className,
      )}
    >
      {!readOnly ? (
        <div className="flex flex-wrap gap-0.5 border-b border-line p-1.5">
          {TOOLS.map((tool) => {
            const isActive = Boolean(active?.[tool.key]);
            return (
              <button
                key={tool.key}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                aria-pressed={isActive}
                disabled={!editor}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor && tool.run(editor)}
                className={cn(
                  "min-w-6 rounded-[3px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-faint hover:bg-warm hover:text-ink",
                )}
              >
                {tool.icon}
              </button>
            );
          })}
        </div>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}
