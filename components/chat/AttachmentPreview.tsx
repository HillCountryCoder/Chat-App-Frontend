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
  onRetrySpecificFile?: (fileId: string) => void; // NEW: Retry specific file
  onRemoveFailedFiles?: () => void; // NEW: Remove all failed files
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
  const canRemove = file.status !== "uploading"; // Allow removal unless actively uploading

  return (
    <div
      className={cn(
        "relative border rounded-lg p-3 bg-background transition-colors",
        file.status === "failed" && "border-red-200 bg-red-50/50",
        file.status === "completed" && "border-green-200 bg-green-50/50",
        file.status === "uploading" && "border-blue-200 bg-blue-50/50",
      )}
    >
      {/* Action buttons */}
      <div className="absolute top-1 right-1 flex gap-1">
        {file.status === "failed" && onRetry && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-blue-500 hover:text-white"
            onClick={onRetry}
            title="Retry upload"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {canRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
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
      <div className="mb-3">
        {file.preview ? (
          <div className="relative h-20 bg-muted rounded overflow-hidden">
            {file.file.type.startsWith("image/") ? (
              <img
                src={file.preview}
                alt={file.file.name}
                className="w-full h-full object-cover"
              />
            ) : file.file.type.startsWith("video/") ? (
              <video
                src={file.preview}
                className="w-full h-full object-cover"
                muted
              />
            ) : null}
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
            className="text-sm font-medium truncate flex-1"
            title={file.file.name}
          >
            {file.file.name}
          </p>
          <StatusBadge status={file.status} />
        </div>

        <p className="text-xs text-muted-foreground">
          {FileUploadService.formatFileSize(file.file.size)}
        </p>

        {/* Progress bar */}
        {file.status === "uploading" && (
          <div className="space-y-1">
            <Progress value={file.progress} className="h-1" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(file.progress)}%
            </p>
          </div>
        )}

        {/* Error message */}
        {file.status === "failed" && file.error && (
          <div className="flex items-start gap-1 p-2 bg-destructive/10 rounded text-xs text-destructive">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p className="leading-tight">{file.error}</p>
          </div>
        )}
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
    <div className="relative border border-green-200 bg-green-50/50 rounded-lg p-3">
      {/* Remove button */}
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
        onClick={onRemove}
        title="Remove attachment"
      >
        <X className="h-3 w-3" />
      </Button>

      {/* File preview */}
      <div className="mb-3">
        {attachment.metadata?.thumbnail?.url ? (
          <div className="relative h-20 bg-muted rounded overflow-hidden">
            <img
              src={attachment.metadata.thumbnail.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : attachment.type.startsWith("image/") ? (
          <div className="relative h-20 bg-muted rounded overflow-hidden">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
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
            className="text-sm font-medium truncate flex-1"
            title={attachment.name}
          >
            {attachment.name}
          </p>
          <StatusBadge status={attachment.status} />
        </div>

        <p className="text-xs text-muted-foreground">
          {FileUploadService.formatFileSize(attachment.size)}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PendingAttachment["status"] | Attachment["status"];
}) {
  const config = {
    pending: {
      icon: null,
      color: "bg-muted text-muted-foreground",
      label: "Pending",
    },
    uploading: {
      icon: Loader2,
      color: "bg-blue-100 text-blue-700",
      label: "Uploading",
    },
    completed: {
      icon: CheckCircle,
      color: "bg-green-100 text-green-700",
      label: "Ready",
    },
    ready: {
      icon: CheckCircle,
      color: "bg-green-100 text-green-700",
      label: "Ready",
    },
    failed: {
      icon: AlertCircle,
      color: "bg-red-100 text-red-700",
      label: "Failed",
    },
  };

  const { icon: Icon, color, label } = config[status] || config.pending;

  return (
    <Badge variant="secondary" className={cn("text-xs px-1.5 py-0.5", color)}>
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
