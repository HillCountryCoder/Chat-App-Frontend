"use client";

import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { CodeBlockKit } from "./plugins/code-block-kit";

export const EditorKit = [
  ...CodeBlockKit,
  ...BasicBlocksKit,
  ...BasicMarksKit,
  TrailingBlockPlugin,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
