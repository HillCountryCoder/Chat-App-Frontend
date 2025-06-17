"use client";

import { useEffect, useRef, useState } from "react";
import { Attachment } from "@/types/attachment";
import { AttachmentService } from "@/lib/attachment.service";
import { FileUploadService } from "@/lib/file-upload.service";
import { Button } from "@/components/ui/button";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface MediaViewerProps {
  attachment: Attachment | null;
  attachments?: Attachment[];
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function MediaViewer({
  attachment,
  attachments = [],
  isOpen,
  onClose,
  onNext,
  onPrevious,
}: MediaViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && attachment) {
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
    }
  }, [isOpen, attachment]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          onPrevious?.();
          break;
        case "ArrowRight":
          onNext?.();
          break;
        case "+":
        case "=":
          setZoom((prev) => Math.min(prev + 0.25, 3));
          break;
        case "-":
          setZoom((prev) => Math.max(prev - 0.25, 0.25));
          break;
        case "0":
          setZoom(1);
          setRotation(0);
          break;
        case "r":
          setRotation((prev) => (prev + 90) % 360);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, onClose, onNext, onPrevious]);

  const handleDownload = async () => {
    if (!attachment || isDownloading) return;

    setIsDownloading(true);
    try {
      await AttachmentService.downloadAttachment(attachment);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenOriginal = () => {
    if (attachment?.url) {
      window.open(attachment.url, "_blank");
    }
  };

  if (!attachment) return null;

  const isImage = attachment.type.startsWith("image/");
  const isVideo = attachment.type.startsWith("video/");
  const isPdf = attachment.type === "application/pdf";
  const isText = attachment.type.startsWith("text/");

  const currentIndex = attachments.findIndex((a) => a._id === attachment._id);
  const hasMultiple = attachments.length > 1;
  console.log("Current index:", currentIndex, "Has multiple:", attachments);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle>{attachment.name}</DialogTitle>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        <div className="relative w-full h-[95vh] flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{attachment.name}</h3>
                <p className="text-sm text-white/70">
                  {FileUploadService.formatFileSize(attachment.size)}
                  {hasMultiple && (
                    <span className="ml-2">
                      {currentIndex + 1} of {attachments.length}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {/* Image controls */}
                {isImage && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setZoom((prev) => Math.max(prev - 0.25, 0.25))
                      }
                      className="text-white hover:bg-white/20"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setZoom((prev) => Math.min(prev + 0.25, 3))
                      }
                      className="text-white hover:bg-white/20"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="text-white hover:bg-white/20"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenOriginal}
                  className="text-white hover:bg-white/20"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="text-white hover:bg-white/20"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              {onPrevious && currentIndex > 0 && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={onPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {onNext && currentIndex < attachments.length - 1 && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={onNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </>
          )}

          {/* Content */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center p-4 pt-20 overflow-hidden"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}

            {isImage && (
              <img
                src={attachment.url}
                alt={attachment.name}
                className={cn(
                  "max-w-full max-h-full object-contain transition-all duration-200",
                  isLoading && "opacity-0",
                )}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            )}

            {isVideo && (
              <video
                src={attachment.url}
                controls
                className={cn(
                  "max-w-full max-h-full",
                  isLoading && "opacity-0",
                )}
                onLoadedData={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
                autoPlay
              />
            )}

            {isPdf && (
              <iframe
                src={attachment.url}
                className={cn(
                  "w-full h-full border-0",
                  isLoading && "opacity-0",
                )}
                onLoad={() => setIsLoading(false)}
                title={attachment.name}
              />
            )}

            {isText && (
              <div className="max-w-4xl max-h-full bg-white rounded-lg p-6 overflow-auto">
                <TextFileViewer
                  attachment={attachment}
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            )}

            {/* Unsupported file type */}
            {!isImage && !isVideo && !isPdf && !isText && (
              <div className="text-center text-white p-8">
                <p className="text-lg mb-4">Preview not available</p>
                <p className="text-white/70 mb-6">
                  This file type cannot be previewed in the browser
                </p>
                <Button onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-white/50 text-xs">
            <p>ESC: Close • ←→: Navigate • +/-: Zoom • R: Rotate • 0: Reset</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TextFileViewer({
  attachment,
  onLoad,
}: {
  attachment: Attachment;
  onLoad: () => void;
}) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error("Failed to fetch file");

        const text = await response.text();
        setContent(text);
        onLoad();
      } catch (err) {
        setError("Failed to load file content");
        onLoad();
      }
    };

    fetchContent();
  }, [attachment.url, onLoad]);

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return <div className="font-mono text-sm whitespace-pre-wrap">{content}</div>;
}
