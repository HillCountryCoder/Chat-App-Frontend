"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";

import { cn } from "@/lib/utils";
import { Bold, Italic, Underline, Strikethrough, Code } from "lucide-react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarButton } from "@/components/ui/toolbar";
import { EditorKit } from "../editor/editor-kit";

interface RichTextEditorProps {
  value?: Value;
  onChange?: (value: Value) => void;
  onSubmit?: (value: Value) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  showToolbar?: boolean;
  autoFocus?: boolean;
}

const initialValue: Value = [
  {
    id: "1",
    type: "p",
    children: [{ text: "" }],
  },
];

export function RichTextEditor({
  value = initialValue,
  onChange,
  onSubmit,
  placeholder = "Type a message...",
  disabled = false,
  loading = false,
  className,
  minHeight = 60,
  maxHeight = 200,
  showToolbar = true,
  autoFocus = false,
}: RichTextEditorProps) {
  const [editorValue, setEditorValue] = useState<Value>(value);
  const [isFocused, setIsFocused] = useState(false);

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: editorValue,
  });

  const handleValueChange = useCallback(
    ({ value: newValue }: { value: Value }) => {
      setEditorValue(newValue);
      onChange?.(newValue);
    },
    [onChange],
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (onSubmit && !disabled && !loading) {
        onSubmit(editorValue);
      }
    },
    [onSubmit, editorValue, disabled, loading],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const hasContent = useMemo(() => {
    return editorValue.some((node) =>
      node.children?.some(
        (child) =>
          typeof child === "object" &&
          "text" in child &&
          typeof child.text === "string" &&
          child.text.trim(),
      ),
    );
  }, [editorValue]);

  // FIXED: Use editor.tf.setValue() to properly reset the editor
  const clearContent = useCallback(() => {
    // Use Plate's setValue transform to update the editor state
    editor.tf.setValue(initialValue);

    // Also update React state for consistency
    setEditorValue(initialValue);

    // Notify parent component
    onChange?.(initialValue);
    // Focus the editor after clearing
    setTimeout(() => {
      editor.tf.focus();
    }, 0);
  }, [editor, onChange]);

  // Sync external value changes with editor
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(editorValue)) {
      setEditorValue(value);
      // Also update the editor state when value prop changes
      editor.tf.setValue(value);
    }
  }, [value, editorValue, editor]);

  return (
    <div className={cn("relative", className)}>
      <Plate editor={editor} onChange={handleValueChange}>
        <div
          className={cn(
            "border rounded-lg bg-background transition-colors",
            isFocused && "ring-2 ring-ring ring-offset-2",
            disabled && "opacity-50",
          )}
        >
          {showToolbar && (
            <FixedToolbar className="flex justify-start gap-1 p-2 border-b bg-muted/30">
              <ToolbarButton onClick={() => editor.tf.h1.toggle()}>
                H1
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.tf.h2.toggle()}>
                H2
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.tf.h3.toggle()}>
                H3
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.tf.blockquote.toggle()}>
                Quote
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.tf.code_block.toggle()}>
                Code
              </ToolbarButton>
              <ToolbarButton
                onClick={clearContent}
                disabled={disabled || loading || !hasContent}
              >
                Clear
              </ToolbarButton>
              <MarkToolbarButton
                nodeType="bold"
                tooltip="Bold (⌘+B)"
                disabled={disabled}
              >
                <Bold className="h-4 w-4" />
              </MarkToolbarButton>

              <MarkToolbarButton
                nodeType="italic"
                tooltip="Italic (⌘+I)"
                disabled={disabled}
              >
                <Italic className="h-4 w-4" />
              </MarkToolbarButton>

              <MarkToolbarButton
                nodeType="underline"
                tooltip="Underline (⌘+U)"
                disabled={disabled}
              >
                <Underline className="h-4 w-4" />
              </MarkToolbarButton>

              <MarkToolbarButton
                nodeType="strikethrough"
                tooltip="Strikethrough"
                disabled={disabled}
              >
                <Strikethrough className="h-4 w-4" />
              </MarkToolbarButton>

              <MarkToolbarButton
                nodeType="code"
                tooltip="Inline Code"
                disabled={disabled}
              >
                <Code className="h-4 w-4" />
              </MarkToolbarButton>
            </FixedToolbar>
          )}

          <EditorContainer>
            <Editor
              variant={"fullWidth"}
              placeholder={placeholder}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              readOnly={disabled}
              autoFocus={autoFocus}
              style={{
                minHeight: `${minHeight}px`,
                maxHeight: `${maxHeight}px`,
                overflowY: "auto",
              }}
              className={cn(
                "px-3 py-2 text-sm leading-relaxed",
                "focus:outline-none",
                "placeholder:text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            />
          </EditorContainer>
        </div>
      </Plate>
    </div>
  );
}

export default RichTextEditor;
