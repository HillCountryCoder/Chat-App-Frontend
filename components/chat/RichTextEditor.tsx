"use client";

import React, { useCallback, useEffect, useState } from "react";
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
}: RichTextEditorProps) {
  const [editorValue, setEditorValue] = useState<Value>(value);
  const [isFocused, setIsFocused] = useState(false);

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: editorValue,
  });

  const handleValueChange = useCallback(
    ({ value: newValue }: { value: Value }) => {
      // Normalize the value to ensure all IDs are strings
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

  // FIXED: Sync external value changes with editor properly
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(editorValue)) {
      setEditorValue(value);
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
          {/* Toolbar is now handled by FixedToolbarKit plugin */}

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
