// utils/rich-text.ts
import type { Value } from "platejs";

// Initial empty value for the editor
export const initialEditorValue: Value = [
  {
    id: "1",
    type: "p",
    children: [{ text: "" }],
  },
];

// Convert Plate Value to plain text
export function valueToText(value: Value): string {
  return value
    .map((node) =>
      node.children
        ?.map((child) =>
          typeof child === "object" && "text" in child ? child.text : "",
        )
        .join(""),
    )
    .join("\n")
    .trim();
}

// Convert plain text to Plate Value
export function textToValue(text: string): Value {
  if (!text.trim()) {
    return initialEditorValue;
  }

  // Split by newlines and create paragraph nodes
  const lines = text.split("\n");
  return lines.map((line, index) => ({
    id: `${Date.now()}-${index}`,
    type: "p",
    children: [{ text: line }],
  }));
}

// Check if Value has content
export function hasContent(value: Value): boolean {
  return value.some((node) =>
    node.children?.some(
      (child) =>
        typeof child === "object" &&
        "text" in child &&
        typeof child.text === "string" &&
        child.text.trim(),
    ),
  );
}

// Check if content is rich text format
export function isRichTextContent(content: Value | string): content is Value {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    typeof content[0] === "object" &&
    "children" in content[0]
  );
}

// Extract plain text from rich content for search/indexing
export function extractPlainText(content: Value | string): string {
  if (isRichTextContent(content)) {
    return valueToText(content);
  }
  return content as string;
}

// Clear editor content
export function clearValue(): Value {
  return initialEditorValue;
}

// Serialize rich content for storage
export function serializeValue(value: Value): string {
  return JSON.stringify(value);
}

// Deserialize rich content from storage
export function deserializeValue(serialized: string): Value {
  try {
    const parsed = JSON.parse(serialized);
    if (isRichTextContent(parsed)) {
      return parsed;
    }
    return textToValue(serialized);
  } catch {
    return textToValue(serialized);
  }
}

// Truncate rich content for previews
export function truncateRichText(
  content: Value,
  maxLength: number = 100,
): string {
  const plainText = valueToText(content);
  return plainText.length > maxLength
    ? plainText.slice(0, maxLength) + "..."
    : plainText;
}

// Check if two values are equal (for comparison)
export function isValueEqual(a: Value, b: Value): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Validate rich text content
export function validateRichContent(content: unknown): content is Value {
  if (!Array.isArray(content)) return false;

  return content.every(
    (node) =>
      typeof node === "object" &&
      node !== null &&
      "children" in node &&
      Array.isArray(node.children),
  );
}
