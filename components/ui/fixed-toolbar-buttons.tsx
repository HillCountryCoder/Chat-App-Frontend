/* eslint-disable @typescript-eslint/no-explicit-any */
// components/ui/fixed-toolbar-buttons.tsx
"use client";

import React from "react";
import { useEditorReadOnly, useEditorValue } from "platejs/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Subscript,
  Superscript,
  Keyboard,
  Pilcrow, // For paragraph icon
} from "lucide-react";
import { KEYS } from "platejs";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarButton } from "@/components/ui/toolbar";
import { ToolbarGroup } from "@/components/ui/toolbar";
import { initialEditorValue } from "@/utils/rich-text";
import { useEditor } from "../editor/editor-kit";

interface FixedToolbarButtonsProps {
  disabled?: boolean;
  loading?: boolean;
}

export function FixedToolbarButtons({
  disabled = false,
  loading = false,
}: FixedToolbarButtonsProps) {
  const editor = useEditor();
  const readOnly = useEditorReadOnly();
  const editorValue = useEditorValue();

  const clearContent = () => {
    editor.tf.setValue(initialEditorValue);
    setTimeout(() => {
      editor.tf.focus();
    }, 0);
  };

  const hasContent = React.useMemo(() => {
    if (!editorValue) return false;
    return (
      Array.isArray(editorValue) &&
      editorValue.some((node: any) =>
        node.children?.some(
          (child: any) =>
            typeof child === "object" &&
            "text" in child &&
            typeof child.text === "string" &&
            child.text.trim().length > 0,
        ),
      )
    );
  }, [editorValue]);

  return (
    <div className="flex w-full">
      {!readOnly && (
        <>
          {/* Block formatting buttons */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.tf.toggleBlock("paragraph")}
              disabled={disabled}
              tooltip="Paragraph"
            >
              <Pilcrow className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.h1.toggle()}
              disabled={disabled}
              tooltip="Heading 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.h2.toggle()}
              disabled={disabled}
              tooltip="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.h3.toggle()}
              disabled={disabled}
              tooltip="Heading 3"
            >
              H3
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.blockquote.toggle()}
              disabled={disabled}
              tooltip="Blockquote"
            >
              Quote
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.code_block.toggle()}
              disabled={disabled}
              tooltip="Code Block"
            >
              Code
            </ToolbarButton>
          </ToolbarGroup>

          {/* Basic text formatting */}
          <ToolbarGroup>
            <MarkToolbarButton
              nodeType={KEYS.bold}
              tooltip="Bold (⌘+B)"
              disabled={disabled}
            >
              <Bold className="h-4 w-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.italic}
              tooltip="Italic (⌘+I)"
              disabled={disabled}
            >
              <Italic className="h-4 w-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.underline}
              tooltip="Underline (⌘+U)"
              disabled={disabled}
            >
              <Underline className="h-4 w-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.strikethrough}
              tooltip="Strikethrough (⌘+Shift+X)"
              disabled={disabled}
            >
              <Strikethrough className="h-4 w-4" />
            </MarkToolbarButton>
          </ToolbarGroup>

          {/* Code and special formatting */}
          <ToolbarGroup>
            <MarkToolbarButton
              nodeType={KEYS.code}
              tooltip="Inline Code (⌘+E)"
              disabled={disabled}
            >
              <Code className="h-4 w-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.highlight}
              tooltip="Highlight (⌘+Shift+H)"
              disabled={disabled}
            >
              <Highlighter className="h-4 w-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.kbd}
              tooltip="Keyboard (Kbd)"
              disabled={disabled}
            >
              <Keyboard className="h-4 w-4" />
            </MarkToolbarButton>
          </ToolbarGroup>

          {/* Subscript and Superscript */}
          <ToolbarGroup>
            <MarkToolbarButton
              nodeType={KEYS.sub}
              tooltip="Subscript (⌘+,)"
              disabled={disabled}
            >
              <Subscript className="h-4 w-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.sup}
              tooltip="Superscript (⌘+.)"
              disabled={disabled}
            >
              <Superscript className="h-4 w-4" />
            </MarkToolbarButton>
          </ToolbarGroup>
        </>
      )}

      <div className="grow" />

      {/* Action buttons */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={clearContent}
          disabled={disabled || loading || !hasContent}
          tooltip="Clear Content"
        >
          Clear
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
}
