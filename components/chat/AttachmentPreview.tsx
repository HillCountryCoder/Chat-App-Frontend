/* eslint-disable @next/next/no-img-element */
"use client";

import { PendingAttachment, Attachment } from "@/types/attachment";
import { FileUploadService } from "@/lib/file-upload.service";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileIcon,
  ImageIcon,
  VideoIcon,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AttachmentPreviewProps {
  pendingFiles: PendingAttachment[];
  uploadedAttachments: Attachment[];
  onRemoveFile: (fileId: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onRetryFailed?: () => void;
  onRetrySpecificFile?: (fileId: string) => void;
  onRemoveFailedFiles?: () => void;
  compact?: boolean;
  className?: string;
}

export default function AttachmentPreview({
  pendingFiles,
  uploadedAttachments,
  onRemoveFile,
  onRemoveAttachment,
  onRetryFailed,
  onRetrySpecificFile,
  onRemoveFailedFiles,
  compact = false,
  className,
}: AttachmentPreviewProps) {
  const allFiles = [
    ...pendingFiles,
    ...uploadedAttachments.map((a) => ({
      id: a._id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      file: null as any,
      preview: a.url,
      status: a.status,
      progress: 100,
      attachment: a,
    })),
  ];

  if (allFiles.length === 0) {
    return null;
  }

  const hasFailedUploads = pendingFiles.some((f) => f.status === "failed");
  const failedCount = pendingFiles.filter((f) => f.status === "failed").length;
  const successfulCount =
    uploadedAttachments.length +
    pendingFiles.filter((f) => f.status === "completed").length;
  const uploadingCount = pendingFiles.filter(
    (f) => f.status === "uploading",
  ).length;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-2 bg-muted/30 rounded-md",
          className,
        )}
      >
        <div className="flex items-center gap-1">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {allFiles.length} file{allFiles.length !== 1 ? "s" : ""}
          </span>
          {hasFailedUploads && (
            <Badge variant="destructive" className="text-xs">
              {failedCount} failed
            </Badge>
          )}
        </div>

        {hasFailedUploads && (
          <div className="flex gap-1">
            {onRemoveFailedFiles && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRemoveFailedFiles}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove Failed
              </Button>
            )}
            {onRetryFailed && (
              <Button size="sm" variant="outline" onClick={onRetryFailed}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">
            Attachments ({allFiles.length})
          </h4>
          <div className="flex gap-1">
            {successfulCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 text-xs"
              >
                {successfulCount} ready
              </Badge>
            )}
            {uploadingCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 text-xs"
              >
                {uploadingCount} uploading
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {failedCount} failed
              </Badge>
            )}
          </div>
        </div>

        {hasFailedUploads && (
          <div className="flex gap-1">
            {onRemoveFailedFiles && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRemoveFailedFiles}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove Failed
              </Button>
            )}
            {onRetryFailed && (
              <Button size="sm" variant="outline" onClick={onRetryFailed}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Failed Files Warning */}
      {hasFailedUploads && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {failedCount} file{failedCount > 1 ? "s" : ""} failed to upload. You
            can remove failed files or retry uploading them.
            {successfulCount > 0 && (
              <span className="block mt-1 text-sm">
                {successfulCount} file{successfulCount > 1 ? "s are" : " is"}{" "}
                ready to send.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pendingFiles.map((file) => (
          <PendingFilePreview
            key={file.id}
            file={file}
            onRemove={() => onRemoveFile(file.id)}
            onRetry={
              onRetrySpecificFile
                ? () => onRetrySpecificFile(file.id)
                : undefined
            }
          />
        ))}

        {uploadedAttachments.map((attachment) => (
          <UploadedAttachmentPreview
            key={attachment._id}
            attachment={attachment}
            onRemove={() => onRemoveAttachment(attachment._id)}
          />
        ))}
      </div>
    </div>
  );
}

function PendingFilePreview({
  file,
  onRemove,
  onRetry,
}: {
  file: PendingAttachment;
  onRemove: () => void;
  onRetry?: () => void;
}) {
  const getFileIcon = () => {
    if (file.file.type.startsWith("image/")) return ImageIcon;
    if (file.file.type.startsWith("video/")) return VideoIcon;
    return FileIcon;
  };

  const IconComponent = getFileIcon();
  const canRemove = file.status !== "uploading";

  return (
    <div
      className={cn(
        "relative border rounded-lg overflow-hidden transition-all",
        // 🔥 IMPROVED: Better background colors with higher contrast
        file.status === "failed" && "border-red-300 bg-red-50 shadow-sm",
        file.status === "completed" && "border-green-300 bg-green-50 shadow-sm",
        file.status === "uploading" && "border-blue-300 bg-blue-50 shadow-sm",
        file.status === "pending" && "border-gray-300 bg-gray-50 shadow-sm",
      )}
    >
      {/* 🔥 IMPROVED: Action buttons with better positioning and visibility */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {file.status === "failed" && onRetry && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0"
            onClick={onRetry}
            title="Retry upload"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {canRemove && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700 text-white shadow-sm border-0"
            onClick={onRemove}
            title={
              file.status === "uploading"
                ? "Cannot remove while uploading"
                : "Remove file"
            }
            disabled={file.status === "uploading"}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* File preview */}
      <div className="p-3">
        <div className="mb-3">
          {file.preview ? (
            <div className="relative h-20 bg-muted rounded overflow-hidden">
              {file.file.type.startsWith("image/") ? (
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="w-full h-full object-cover"
                  decoding="async"
                  loading="lazy"
                  fetchPriority="low"
                />
              ) : file.file.type.startsWith("video/") ? (
                <video
                  src={file.preview}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : null}
              {/* 🔥 IMPROVED: Overlay for better button visibility on images */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
          ) : (
            <div className="h-20 bg-muted rounded flex items-center justify-center">
              <IconComponent className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* File info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p
              className="text-sm font-medium truncate flex-1 text-gray-900"
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <StatusBadge status={file.status} />
          </div>

          <p className="text-xs text-gray-600 font-medium">
            {FileUploadService.formatFileSize(file.file.size)}
          </p>

          {/* Progress bar */}
          {file.status === "uploading" && (
            <div className="space-y-1">
              <Progress value={file.progress} className="h-2" />
              <p className="text-xs text-gray-600 text-center font-medium">
                {Math.round(file.progress)}%
              </p>
            </div>
          )}

          {/* 🔥 IMPROVED: Error message with better contrast */}
          {file.status === "failed" && file.error && (
            <div className="flex items-start gap-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-red-600" />
              <p className="leading-tight font-medium">{file.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadedAttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const getFileIcon = () => {
    if (attachment.type.startsWith("image/")) return ImageIcon;
    if (attachment.type.startsWith("video/")) return VideoIcon;
    return FileIcon;
  };

  const IconComponent = getFileIcon();

  return (
    <div className="relative border border-green-300 bg-green-50 rounded-lg overflow-hidden shadow-sm">
      {/* 🔥 IMPROVED: Remove button with better positioning and visibility */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700 text-white shadow-sm border-0"
          onClick={onRemove}
          title="Remove attachment"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* File preview */}
      <div className="p-3">
        <div className="mb-3">
          {attachment.metadata?.thumbnail?.url ? (
            <div className="relative h-20 bg-muted rounded overflow-hidden">
              <img
                src={attachment.metadata.thumbnail.url}
                alt={attachment.name}
                className="w-full h-full object-cover"
                decoding="async"
                loading="lazy"
                fetchPriority="low"
              />
              {/* Overlay for better button visibility */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
          ) : attachment.type.startsWith("image/") ? (
            <div className="relative h-20 bg-muted rounded overflow-hidden">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-full object-cover"
                decoding="async"
                loading="lazy"
                fetchPriority="low"
              />
              {/* Overlay for better button visibility */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
          ) : (
            <div className="h-20 bg-muted rounded flex items-center justify-center">
              <IconComponent className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* File info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p
              className="text-sm font-medium truncate flex-1 text-gray-900"
              title={attachment.name}
            >
              {attachment.name}
            </p>
            <StatusBadge status={attachment.status} />
          </div>

          <p className="text-xs text-gray-600 font-medium">
            {FileUploadService.formatFileSize(attachment.size)}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PendingAttachment["status"] | Attachment["status"];
}) {
  // 🔥 IMPROVED: Better contrast and visibility for status badges
  const config = {
    pending: {
      icon: null,
      color: "bg-gray-200 text-gray-800 border border-gray-300",
      label: "Pending",
    },
    uploading: {
      icon: Loader2,
      color: "bg-blue-200 text-blue-900 border border-blue-300",
      label: "Uploading",
    },
    completed: {
      icon: CheckCircle,
      color: "bg-green-200 text-green-900 border border-green-300",
      label: "Ready",
    },
    ready: {
      icon: CheckCircle,
      color: "bg-green-200 text-green-900 border border-green-300",
      label: "Ready",
    },
    failed: {
      icon: AlertCircle,
      color: "bg-red-200 text-red-900 border border-red-300",
      label: "Failed",
    },
  };

  const { icon: Icon, color, label } = config[status] || config.pending;

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs px-2 py-1 font-semibold", color)}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-2.5 w-2.5 mr-1",
            status === "uploading" ? "animate-spin" : "",
          )}
        />
      )}
      {label}
    </Badge>
  );
}
