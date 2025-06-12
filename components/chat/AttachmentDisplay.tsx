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
      {/* Image grid */}
      {images.length > 0 && (
        <ImageGrid 
          images={images} 
          onPreview={handlePreview}
          isInMessage={isInMessage}
        />
      )}

      {/* Video list */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map(video => (
            <VideoAttachment
              key={video._id}
              attachment={video}
              onPreview={handlePreview}
              isInMessage={isInMessage}
            />
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
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
function ImageGrid({ 
  images, 
  onPreview, 
  isInMessage 
}: { 
  images: Attachment[]; 
  onPreview: (attachment: Attachment) => void;
  isInMessage: boolean;
}) {
  const getGridClass = () => {
    switch (images.length) {
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

  const getImageSize = (index: number) => {
    if (images.length === 3 && index === 0) {
      return "col-span-2 row-span-2";
    }
    return "";
  };

  return (
    <div className={cn(
      "grid gap-1 rounded-lg overflow-hidden",
      getGridClass(),
      isInMessage ? "max-w-md" : "max-w-lg"
    )}>
      {images.slice(0, 9).map((image, index) => (
        <div
          key={image._id}
          className={cn(
            "relative cursor-pointer group bg-muted",
            getImageSize(index),
            images.length === 1 ? "aspect-video max-h-64" : "aspect-square"
          )}
          onClick={() => onPreview(image)}
        >
          <img
            src={image.metadata.thumbnail?.url || image.url}
            alt={image.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          
          {/* Status indicator */}
          {image.status !== "ready" && (
            <div className="absolute top-2 left-2">
              <AttachmentStatusBadge status={image.status} />
            </div>
          )}

          {/* Show remaining count for 9+ images */}
          {index === 8 && images.length > 9 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                +{images.length - 9}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VideoAttachment({ 
  attachment, 
  onPreview, 
  isInMessage 
}: { 
  attachment: Attachment; 
  onPreview: (attachment: Attachment) => void;
  isInMessage: boolean;
}) {
  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden bg-muted cursor-pointer group",
        isInMessage ? "max-w-md aspect-video" : "max-w-lg aspect-video"
      )}
      onClick={() => onPreview(attachment)}
    >
      {/* Video thumbnail */}
      {attachment.metadata.thumbnail?.url ? (
        <img
          src={attachment.metadata.thumbnail.url}
          alt={attachment.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <VideoIcon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
        <div className="bg-white rounded-full p-3 group-hover:scale-110 transition-transform">
          <PlayIcon className="h-6 w-6 text-black fill-black ml-0.5" />
        </div>
      </div>

      {/* Video info */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="bg-black/70 rounded px-2 py-1 text-white text-xs">
          <p className="truncate">{attachment.name}</p>
          {attachment.metadata.duration && (
            <p className="text-white/70">
              {formatDuration(attachment.metadata.duration)}
            </p>
          )}
        </div>
      </div>

      {/* Status indicator */}
      {attachment.status !== "ready" && (
        <div className="absolute top-2 right-2">
          <AttachmentStatusBadge status={attachment.status} />
        </div>
      )}
    </div>
  );
}

function DocumentAttachment({ 
  attachment, 
  onPreview, 
  isInMessage 
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
    if (attachment.type.includes('pdf')) return FileTextIcon;
    if (attachment.type.includes('word')) return FileTextIcon;
    if (attachment.type.includes('text')) return FileTextIcon;
    return FileIcon;
  };

  const FileIconComponent = getFileIcon();
  const canPreviewFile = AttachmentService.canPreview(attachment);

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-accent/50 transition-colors",
        canPreviewFile && "cursor-pointer",
        isInMessage ? "max-w-md" : "max-w-lg"
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

function AttachmentStatusBadge({ status }: { status: Attachment['status'] }) {
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
      {Icon && <Icon className={cn("h-3 w-3", status.includes('ing') ? "animate-spin" : "")} />}
    </Badge>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
