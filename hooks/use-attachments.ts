// hooks/use-attachments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AttachmentService } from "@/lib/attachment.service";
import { Attachment } from "@/types/attachment";
import { useSocket } from "@/providers/socket-provider";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function useUserAttachments() {
  return useQuery({
    queryKey: ["user-attachments"],
    queryFn: AttachmentService.getUserAttachments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: AttachmentService.downloadAttachment,
    onError: (error) => {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AttachmentService.deleteAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-attachments"] });
      toast.success("Attachment deleted");
    },
    onError: (error) => {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

/**
 * Hook for listening to attachment status updates via Socket.IO
 */
export function useAttachmentStatusUpdates(attachmentIds: string[]) {
  const { socket } = useSocket();
  const [statusUpdates, setStatusUpdates] = useState<
    Record<
      string,
      {
        status: Attachment["status"];
        metadata?: any;
        error?: string;
      }
    >
  >({});

  // Track previously subscribed IDs to avoid unnecessary re-subscriptions
  const previousIdsRef = useRef<string[]>([]);

  // Memoize the attachment IDs to prevent unnecessary re-subscriptions
  const memoizedAttachmentIds = useMemo(() => {
    return [...attachmentIds].sort();
  }, [attachmentIds]);

  useEffect(() => {
    if (!socket || memoizedAttachmentIds.length === 0) {
      return;
    }

    const previousIds = previousIdsRef.current;
    const hasChanged =
      previousIds.length !== memoizedAttachmentIds.length ||
      !previousIds.every((id, index) => id === memoizedAttachmentIds[index]);

    if (!hasChanged) {
      console.log("Attachment IDs unchanged, skipping re-subscription");
      return;
    }

    console.log(
      "Subscribing to attachment updates for IDs:",
      memoizedAttachmentIds,
    );
    previousIdsRef.current = [...memoizedAttachmentIds];

    // Subscribe and request current status for all attachments
    socket.emit("subscribe_attachment_updates", {
      attachmentIds: memoizedAttachmentIds,
      requestCurrentStatus: true, // Add this flag to get current status
    });

    const handleStatusUpdate = (data: {
      attachmentId: string;
      status: Attachment["status"];
      metadata?: any;
      error?: string;
    }) => {
      console.log("Received status update in socket:", data);
      setStatusUpdates((prev) => ({
        ...prev,
        [data.attachmentId]: {
          status: data.status,
          metadata: data.metadata,
          error: data.error,
        },
      }));

      if (data.status === "ready") {
        toast.success("File processed successfully");
      } else if (data.status === "failed") {
        toast.error("File processing failed", {
          description: data.error || "Unknown error",
        });
      }
    };

    // Handle initial status response
    const handleInitialStatus = (data: {
      attachmentStatuses: Array<{
        attachmentId: string;
        status: Attachment["status"];
        metadata?: any;
      }>;
    }) => {
      console.log("Received initial status for attachments:", data);
      const initialUpdates: Record<string, any> = {};

      data.attachmentStatuses.forEach(({ attachmentId, status, metadata }) => {
        initialUpdates[attachmentId] = { status, metadata };
      });

      setStatusUpdates((prev) => ({ ...prev, ...initialUpdates }));
    };

    const handleProcessingComplete = (data: {
      attachmentId: string;
      status: Attachment["status"];
      fileName: string;
    }) => {
      console.log("Processing complete in socket:", data);

      // Update status updates state
      setStatusUpdates((prev) => ({
        ...prev,
        [data.attachmentId]: {
          status: data.status,
          metadata: prev[data.attachmentId]?.metadata,
          error: prev[data.attachmentId]?.error,
        },
      }));

      if (data.status === "ready") {
        toast.success(`${data.fileName} is ready`);
      }
    };

    socket.on("attachment_status_update", handleStatusUpdate);
    socket.on("attachment_initial_status", handleInitialStatus); // New event
    socket.on("attachment_processing_complete", handleProcessingComplete);

    return () => {
      socket.off("attachment_status_update", handleStatusUpdate);
      socket.off("attachment_initial_status", handleInitialStatus);
      socket.off("attachment_processing_complete", handleProcessingComplete);

      socket.emit("unsubscribe_attachment_updates", {
        attachmentIds: memoizedAttachmentIds,
      });
    };
  }, [socket, memoizedAttachmentIds]);

  return {
    statusUpdates,
    getStatus: (attachmentId: string) => statusUpdates[attachmentId]?.status,
    getError: (attachmentId: string) => statusUpdates[attachmentId]?.error,
    getMetadata: (attachmentId: string) =>
      statusUpdates[attachmentId]?.metadata,
  };
}

/**
 * Hook for managing attachment preview/lightbox
 */
export function useAttachmentPreview() {
  const [currentAttachment, setCurrentAttachment] = useState<Attachment | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);

  const openPreview = (attachment: Attachment) => {
    if (AttachmentService.canPreview(attachment)) {
      setCurrentAttachment(attachment);
      setIsOpen(true);
    } else {
      // For non-previewable files, trigger download
      AttachmentService.downloadAttachment(attachment).catch((error) => {
        toast.error("Download failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      });
    }
  };

  const closePreview = () => {
    setIsOpen(false);
    setCurrentAttachment(null);
  };

  const canPreview = (attachment: Attachment) => {
    return AttachmentService.canPreview(attachment);
  };

  return {
    currentAttachment,
    isOpen,
    openPreview,
    closePreview,
    canPreview,
  };
}

/**
 * Hook for managing multiple attachment selection (gallery mode)
 */
export function useAttachmentGallery(attachments: Attachment[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openGallery = (startIndex: number = 0) => {
    setCurrentIndex(startIndex);
    setIsOpen(true);
  };

  const closeGallery = () => {
    setIsOpen(false);
    setCurrentIndex(0);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < attachments.length) {
      setCurrentIndex(index);
    }
  };

  const currentAttachment = attachments[currentIndex] || null;

  return {
    currentAttachment,
    currentIndex,
    isOpen,
    openGallery,
    closeGallery,
    goToNext,
    goToPrevious,
    goToIndex,
    hasNext: currentIndex < attachments.length - 1,
    hasPrevious: currentIndex > 0,
    totalCount: attachments.length,
  };
}
