"use client";

import { useCallback, useState, DragEvent } from "react";
import { Upload, FileIcon, ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileUploadService } from "@/lib/file-upload.service";
import { FILE_CONSTRAINTS } from "@/types/attachment";

interface FileUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  currentFileCount?: number;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export default function FileUploadDropzone({
  onFilesSelected,
  maxFiles = FILE_CONSTRAINTS.maxFilesPerMessage,
  currentFileCount = 0,
  disabled = false,
  className,
  compact = false,
}: FileUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragCounter(0);

      if (disabled) return;

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [onFilesSelected],
  );

  const openFileDialog = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = FILE_CONSTRAINTS.allowedTypes.join(",");
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    };
    input.click();
  }, [disabled, onFilesSelected]);

  const remainingFiles = Math.max(0, maxFiles - currentFileCount);
  const canAddFiles = remainingFiles > 0 && !disabled;

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openFileDialog}
        disabled={!canAddFiles}
        className={cn("h-8 w-8", className)}
        title={canAddFiles ? "Attach files" : "Maximum files reached"}
      >
        <Upload className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg transition-all duration-200",
        isDragOver && canAddFiles
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-border/60",
        !canAddFiles && "opacity-50 cursor-not-allowed",
        canAddFiles && "cursor-pointer hover:bg-accent/50",
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={canAddFiles ? openFileDialog : undefined}
    >
      <div className="p-8 text-center">
        <div className="mx-auto mb-4">
          {isDragOver && canAddFiles ? (
            <Upload className="h-12 w-12 text-primary animate-bounce" />
          ) : (
            <div className="flex justify-center space-x-2">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          {canAddFiles ? (
            <>
              <p className="text-sm font-medium">
                {isDragOver
                  ? "Drop files here"
                  : "Drag files here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {remainingFiles} more file
                {remainingFiles !== 1 ? "s" : ""} • Max{" "}
                {FileUploadService.formatFileSize(FILE_CONSTRAINTS.maxFileSize)}{" "}
                each
              </p>
              <p className="text-xs text-muted-foreground">
                Supports images, videos, documents
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Maximum {maxFiles} files per message</p>
            </div>
          )}
        </div>

        {/* File constraints info */}
        <div className="mt-4 text-xs text-muted-foreground">
          <div className="flex justify-center gap-4">
            <span>Max {FILE_CONSTRAINTS.maxFilesPerMessage} files</span>
            <span>•</span>
            <span>
              Max{" "}
              {FileUploadService.formatFileSize(FILE_CONSTRAINTS.maxTotalSize)}{" "}
              total
            </span>
          </div>
        </div>
      </div>

      {/* Hidden file input for click upload */}
      <input
        type="file"
        multiple
        accept={FILE_CONSTRAINTS.allowedTypes.join(",")}
        className="hidden"
        onChange={handleFileSelect}
        disabled={!canAddFiles}
      />
    </div>
  );
}
