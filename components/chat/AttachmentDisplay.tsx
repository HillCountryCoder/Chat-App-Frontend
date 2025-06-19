"use client";

import { Attachment } from "@/types/attachment";
import { AttachmentService } from "@/lib/attachment.service";
import { FileUploadService } from "@/lib/file-upload.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  FileIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  AlertCircle,
  Loader2,
  PlayIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAttachmentPreview } from "@/hooks/use-attachments";

interface AttachmentDisplayProps {
  attachments: Attachment[];
  isInMessage?: boolean;
  className?: string;
  onPreview?: (attachment: Attachment) => void;
}

export default function AttachmentDisplay({
  attachments,
  isInMessage = true,
  className,
  onPreview,
}: AttachmentDisplayProps) {
  if (attachments.length === 0) return null;

  const { openPreview, canPreview } = useAttachmentPreview();
  const handlePreview = (attachment: Attachment) => {
    if (onPreview) {
      onPreview(attachment);
    } else {
      openPreview(attachment);
    }
  };

  const images = attachments.filter((a) => a.type.startsWith("image/"));
  const videos = attachments.filter((a) => a.type.startsWith("video/"));
  const documents = attachments.filter(
    (a) => !a.type.startsWith("image/") && !a.type.startsWith("video/"),
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Combined media grid (images and videos together) */}
      {(images.length > 0 || videos.length > 0) && (
        <MediaGrid
          media={[...images, ...videos]}
          onPreview={handlePreview}
          isInMessage={isInMessage}
        />
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentAttachment
              key={doc._id}
              attachment={doc}
              onPreview={handlePreview}
              isInMessage={isInMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaGrid({
  media,
  onPreview,
  isInMessage,
}: {
  media: Attachment[];
  onPreview: (attachment: Attachment) => void;
  isInMessage: boolean;
}) {
  const getGridClass = () => {
    switch (media.length) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-2";
      case 4:
        return "grid-cols-2";
      default:
        return "grid-cols-3";
    }
  };

  const getItemSize = (index: number) => {
    if (media.length === 3 && index === 0) {
      return "col-span-2 row-span-2";
    }
    return "";
  };

  const getAspectRatio = (index: number) => {
    if (media.length === 1) {
      // Single media item gets video aspect ratio for better display
      return "aspect-video max-h-80";
    }
    if (media.length === 3 && index === 0) {
      return "aspect-square";
    }
    return "aspect-square";
  };

  return (
    <div
      className={cn(
        "grid gap-0.5 overflow-hidden",
        getGridClass(),
        // Remove border radius from container as it's handled per item
        isInMessage ? "max-w-md" : "max-w-lg",
      )}
    >
      {media.slice(0, 9).map((item, index) => (
        <MediaItem
          key={item._id}
          attachment={item}
          index={index}
          totalCount={media.length}
          onPreview={onPreview}
          className={cn(getItemSize(index), getAspectRatio(index))}
        />
      ))}

      {/* Show remaining count for 9+ items */}
      {media.length > 9 && (
        <div className="aspect-square bg-black/70 flex items-center justify-center">
          <span className="text-white font-medium text-lg">
            +{media.length - 9}
          </span>
        </div>
      )}
    </div>
  );
}

function MediaItem({
  attachment,
  index,
  totalCount,
  onPreview,
  className,
}: {
  attachment: Attachment;
  index: number;
  totalCount: number;
  onPreview: (attachment: Attachment) => void;
  className?: string;
}) {
  const isVideo = attachment.type.startsWith("video/");
  const isImage = attachment.type.startsWith("image/");

  return (
    <div
      className={cn(
        "relative cursor-pointer group bg-muted overflow-hidden",
        className,
      )}
      onClick={() => onPreview(attachment)}
    >
      {/* Media content */}
      {isImage && (
        <img
          src={attachment.metadata.thumbnail?.url || attachment.url}
          alt={attachment.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      )}

      {isVideo && (
        <>
          {attachment.metadata.thumbnail?.url ? (
            <img
              src={attachment.metadata.thumbnail.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <VideoIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Video play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="bg-black/50 rounded-full p-2 group-hover:scale-110 transition-transform">
              <PlayIcon className="h-4 w-4 text-white fill-white ml-0.5" />
            </div>
          </div>

          {/* Video duration */}
          {attachment.metadata.duration && totalCount === 1 && (
            <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5 text-white text-xs">
              {formatDuration(attachment.metadata.duration)}
            </div>
          )}
        </>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

      {/* Status indicator */}
      {attachment.status !== "ready" && (
        <div className="absolute top-2 left-2">
          <AttachmentStatusBadge status={attachment.status} />
        </div>
      )}

      {/* Show remaining count overlay for the last visible item */}
      {index === 8 && totalCount > 9 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white font-medium text-lg">
            +{totalCount - 9}
          </span>
        </div>
      )}
    </div>
  );
}

function DocumentAttachment({
  attachment,
  onPreview,
  isInMessage,
}: {
  attachment: Attachment;
  onPreview: (attachment: Attachment) => void;
  isInMessage: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      await AttachmentService.downloadAttachment(attachment);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getFileIcon = () => {
    if (attachment.type.includes("pdf")) return FileTextIcon;
    if (attachment.type.includes("word")) return FileTextIcon;
    if (attachment.type.includes("text")) return FileTextIcon;
    return FileIcon;
  };

  const FileIconComponent = getFileIcon();
  const canPreviewFile = AttachmentService.canPreview(attachment);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-accent/50 transition-colors",
        canPreviewFile && "cursor-pointer",
        isInMessage ? "max-w-md" : "max-w-lg",
      )}
      onClick={canPreviewFile ? () => onPreview(attachment) : undefined}
    >
      {/* File icon */}
      <div className="p-2 bg-muted rounded">
        <FileIconComponent className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" title={attachment.name}>
          {attachment.name}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{FileUploadService.formatFileSize(attachment.size)}</span>
          {attachment.status !== "ready" && (
            <>
              <span>•</span>
              <AttachmentStatusBadge status={attachment.status} />
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {canPreviewFile && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(attachment);
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownload}
          disabled={isDownloading || attachment.status !== "ready"}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function AttachmentStatusBadge({ status }: { status: Attachment["status"] }) {
  const config = {
    uploading: { icon: Loader2, color: "bg-blue-500", label: "Uploading" },
    processing: { icon: Loader2, color: "bg-yellow-500", label: "Processing" },
    ready: { icon: null, color: "bg-green-500", label: "Ready" },
    failed: { icon: AlertCircle, color: "bg-red-500", label: "Failed" },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <Badge
      variant="secondary"
      className={cn("text-white text-xs", color)}
      title={label}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-3 w-3",
            status.includes("ing") ? "animate-spin" : "",
          )}
        />
      )}
    </Badge>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
