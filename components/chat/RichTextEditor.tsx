"use client";

import React, { useCallback, useMemo, useState } from "react";
import type { Value } from "platejs";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from "@platejs/basic-nodes/react";
import { BlockquotePlugin } from "@platejs/basic-nodes/react";
import { Plate, usePlateEditor } from "platejs/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  Send,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarButton } from "@/components/ui/toolbar";

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
    id: 1,
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
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin,
      CodePlugin,
      BlockquotePlugin,
    ],
    value: editorValue,
  });

  const handleValueChange = useCallback(
    ({ value: newValue }: { value: Value }) => {
      setEditorValue(newValue);
      onChange?.(newValue);
    },
    [],
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

  const clearContent = useCallback(() => {
    setEditorValue(initialValue);
    onChange?.(initialValue);
  }, [onChange]);

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MarkToolbarButton
                      nodeType="bold"
                      tooltip="Bold (⌘+B)"
                      disabled={disabled}
                    >
                      <Bold className="h-4 w-4" />
                    </MarkToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Bold (⌘+B)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <MarkToolbarButton
                      nodeType="italic"
                      tooltip="Italic (⌘+I)"
                      disabled={disabled}
                    >
                      <Italic className="h-4 w-4" />
                    </MarkToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Italic (⌘+I)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <MarkToolbarButton
                      nodeType="underline"
                      tooltip="Underline (⌘+U)"
                      disabled={disabled}
                    >
                      <Underline className="h-4 w-4" />
                    </MarkToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Underline (⌘+U)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <MarkToolbarButton
                      nodeType="strikethrough"
                      tooltip="Strikethrough"
                      disabled={disabled}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </MarkToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Strikethrough</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <MarkToolbarButton
                      nodeType="code"
                      tooltip="Inline Code"
                      disabled={disabled}
                    >
                      <Code className="h-4 w-4" />
                    </MarkToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Inline Code</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToolbarButton
                      onClick={() => editor.tf.blockquote.toggle()}
                      disabled={disabled}
                    >
                      <Quote className="h-4 w-4" />
                    </ToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Quote</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FixedToolbar>
          )}

          <EditorContainer>
            <div className="relative">
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
                  "p-3 text-sm leading-relaxed",
                  "focus:outline-none",
                  "placeholder:text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              />

              {/* Submit button */}
              <div className="absolute bottom-2 right-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!hasContent || disabled || loading}
                  className="h-8 w-8 p-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </EditorContainer>
        </div>
      </Plate>
    </div>
  );
}

export default RichTextEditor;
