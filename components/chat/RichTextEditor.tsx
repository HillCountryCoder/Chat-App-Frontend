"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";

import { cn } from "@/lib/utils";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { EditorKit } from "../editor/editor-kit";
import { initialEditorValue } from "@/utils/rich-text";

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
  submitOnEnter?: boolean;
}

export function RichTextEditor({
  value = initialEditorValue,
  onChange,
  onSubmit,
  placeholder = "Type a message...",
  disabled = false,
  loading = false,
  className,
  minHeight = 60,
  maxHeight = 200,
  autoFocus = false,
  submitOnEnter = true,
}: RichTextEditorProps) {
  const [editorValue, setEditorValue] = useState<Value>(value);
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = useCallback(() => {
    if (onSubmit && !disabled && !loading) {
      onSubmit(editorValue);
    }
  }, [onSubmit, editorValue, disabled, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Ctrl+Enter or Cmd+Enter for submit
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Handle Enter based on submitOnEnter prop
      if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Allow all other keys to be handled by PlateJS naturally
      // This includes normal Enter for new lines when submitOnEnter is false
    },
    [handleSubmit, submitOnEnter],
  );

  // Sync external value changes with editor properly
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(editorValue)) {
      setEditorValue(value);
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        editor.tf.setValue(value);
      });
    }
  }, [value, editorValue, editor]);

  // Expose handleSubmit method to parent component
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).handleSubmit = handleSubmit;
    }
  }, [handleSubmit]);

  return (
    <div className={cn("relative", className)} ref={editorRef}>
      <Plate editor={editor} onChange={handleValueChange}>
        <div
          className={cn(
            "border rounded-lg bg-background transition-colors",
            isFocused && "ring-2 ring-ring ring-offset-2",
            disabled && "opacity-50",
          )}
        >
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
                // Ensure text selection works properly
                "select-text [&_*]:select-text",
              )}
            />
          </EditorContainer>
        </div>
      </Plate>
    </div>
  );
}

export default RichTextEditor;
