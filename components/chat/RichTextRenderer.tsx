// components/chat/RichTextRenderer.tsx
"use client";

import React, { useMemo } from "react";
import type { Value } from "platejs";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  BlockquotePlugin,
} from "@platejs/basic-nodes/react";
import { Plate, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { cn } from "@/lib/utils";

interface RichTextRendererProps {
  content: Value | string;
  className?: string;
  compact?: boolean;
}

// Utility function to convert plain text to Plate value
function textToPlateValue(text: string): Value {
  return [
    {
      id: "1",
      type: "p",
      children: [{ text }],
    },
  ];
}

// Utility function to check if content is rich text (Plate format)
function isRichTextContent(content: Value | string): content is Value {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    typeof content[0] === "object" &&
    "children" in content[0]
  );
}

export function RichTextRenderer({
  content,
  className,
  compact = false,
}: RichTextRendererProps) {
  const plateValue = useMemo(() => {
    if (isRichTextContent(content)) {
      return content;
    }
    // Convert plain text to Plate format
    return textToPlateValue(content as string);
  }, [content]);

  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin,
      CodePlugin,
      BlockquotePlugin,
    ],
    value: plateValue,
  });

  // If it's empty or just whitespace, don't render anything
  const hasContent = useMemo(() => {
    if (isRichTextContent(content)) {
      return content.some((node) =>
        node.children?.some(
          (child) =>
            typeof child === "object" &&
            "text" in child &&
            typeof child.text === "string" &&
            child.text.trim(),
        ),
      );
    }
    return (content as string)?.trim().length > 0;
  }, [content]);

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn("rich-text-content", compact && "text-sm", className)}>
      <Plate editor={editor} readOnly>
        <EditorContainer>
          <Editor className="p-0 focus:outline-none" readOnly />
        </EditorContainer>
      </Plate>
    </div>
  );
}

// Helper component for inline rich text (like in conversation previews)
export function InlineRichTextRenderer({
  content,
  className,
  maxLength = 100,
}: RichTextRendererProps & { maxLength?: number }) {
  const textContent = useMemo(() => {
    if (isRichTextContent(content)) {
      // Extract plain text from rich content for previews
      return (
        content
          .map((node) =>
            node.children
              ?.map((child) =>
                typeof child === "object" && "text" in child ? child.text : "",
              )
              .join(""),
          )
          .join(" ")
          .trim()
          .slice(0, maxLength) + (content.length > maxLength ? "..." : "")
      );
    }
    const text = content as string;
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }, [content, maxLength]);

  return (
    <span className={cn("text-muted-foreground", className)}>
      {textContent}
    </span>
  );
}

export default RichTextRenderer;
