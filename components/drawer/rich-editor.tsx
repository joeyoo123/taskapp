"use client";
import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";

export function RichEditor({
  value,
  onChange,
  placeholder = "Add a description…",
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2] } })],
    content: value || "",
    editorProps: {
      attributes: {
        "data-placeholder": placeholder,
        class: cn("prose-tip max-w-none min-h-[120px] text-sm focus:outline-none", className),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    immediatelyRender: false,
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <EditorContent editor={editor} />;
}
