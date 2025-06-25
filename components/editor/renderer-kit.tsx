// components/editor/renderer-kit.tsx
"use client";

import { TrailingBlockPlugin } from "platejs";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { CodeBlockKit } from "./plugins/code-block-kit";

// Editor kit for rendering messages - WITHOUT toolbar plugins
export const RendererKit = [
  ...CodeBlockKit, // For code blocks
  ...BasicBlocksKit, // For H1, H2, H3, blockquote, paragraphs
  ...BasicMarksKit, // For bold, italic, underline, strikethrough, code
  // NO FixedToolbarKit or FloatingToolbarKit here!
  TrailingBlockPlugin,
];
