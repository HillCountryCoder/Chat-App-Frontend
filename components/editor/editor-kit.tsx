"use client";

import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { CodeBlockKit } from "./plugins/code-block-kit";
import { FixedToolbarKit } from "./plugins/fixed-toolbar-kit";

export const EditorKit = [
  ...CodeBlockKit, // For code blocks
  ...BasicBlocksKit, // For H1, H2, H3, blockquote, paragraphs
  ...BasicMarksKit, // For bold, italic, underline, strikethrough, code
  ...FixedToolbarKit, // For the toolbar
  TrailingBlockPlugin,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
