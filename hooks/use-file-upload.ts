// hooks/use-file-upload.ts
import { useState, useCallback, useRef } from "react";
import { AttachmentService } from "@/lib/attachment.service";
import { FileUploadService } from "@/lib/file-upload.service";
import {
  PendingAttachment,
  Attachment,
  FILE_CONSTRAINTS,
} from "@/types/attachment";
import { toast } from "sonner";

interface UseFileUploadOptions {
  onSuccess?: (attachments: Attachment[]) => void;
  onError?: (error: Error) => void;
  maxFiles?: number;
  autoUpload?: boolean;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>(
    [],
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    onSuccess,
    onError,
    maxFiles = FILE_CONSTRAINTS.maxFilesPerMessage,
    autoUpload = true,
  } = options;

  /**
   * Add files to pending queue
   */
  const addFiles = useCallback(
    async (files: File[] | FileList) => {
      const fileArray = Array.from(files);

      // Validate total file count
      const totalFiles =
        pendingFiles.length + uploadedAttachments.length + fileArray.length;
      if (totalFiles > maxFiles) {
        const error = new Error(
          `Maximum ${maxFiles} files allowed per message`,
        );
        onError?.(error);
        toast.error(error.message);
        return;
      }

      // Validate files
      const validation = FileUploadService.validateFiles(fileArray);
      if (!validation.isValid) {
        const error = new Error(validation.errors.join("\n"));
        onError?.(error);
        toast.error("File validation failed", {
          description: validation.errors[0],
        });
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        toast.warning("File Upload Warning", {
          description: validation.warnings[0],
        });
      }

      // Create pending attachments
      const newPendingFiles: PendingAttachment[] = [];

      for (const file of fileArray) {
        const id = crypto.randomUUID();
        const preview = FileUploadService.generatePreviewUrl(file);

        // Generate thumbnail for images
        let thumbnail: Blob | undefined;
        if (FileUploadService.supportsThumbnail(file.type)) {
          try {
            thumbnail =
              (await FileUploadService.generateImageThumbnail(file)) ||
              undefined;
          } catch (error) {
            console.warn("Failed to generate thumbnail:", error);
          }
        }

        newPendingFiles.push({
          id,
          file,
          preview: preview || undefined,
          thumbnail,
          progress: 0,
          status: "pending",
        });
      }

      setPendingFiles((prev) => [...prev, ...newPendingFiles]);

      // Auto-upload if enabled
      if (autoUpload) {
        uploadFiles(newPendingFiles.map((pf) => pf.id));
      }
    },
    [
      pendingFiles.length,
      uploadedAttachments.length,
      maxFiles,
      onError,
      autoUpload,
    ],
  );

  /**
   * Remove pending file
   */
  const removeFile = useCallback((fileId: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      // Clean up preview URL
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  /**
   * Remove uploaded attachment
   */
  const removeAttachment = useCallback((attachmentId: string) => {
    setUploadedAttachments((prev) =>
      prev.filter((a) => a._id !== attachmentId),
    );
  }, []);

  /**
   * Upload specific files by ID
   */
  const uploadFiles = useCallback(
    async (fileIds?: string[]) => {
      const filesToUpload = fileIds
        ? pendingFiles.filter(
            (f) => fileIds.includes(f.id) && f.status === "pending",
          )
        : pendingFiles.filter((f) => f.status === "pending");

      if (filesToUpload.length === 0) return;

      setIsUploading(true);
      abortControllerRef.current = new AbortController();

      try {
        const attachments: Attachment[] = [];

        // Upload files sequentially
        for (let i = 0; i < filesToUpload.length; i++) {
          const pendingFile = filesToUpload[i];

          // Update status to uploading
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === pendingFile.id
                ? { ...f, status: "uploading" as const }
                : f,
            ),
          );

          try {
            const attachment = await AttachmentService.uploadFile(
              pendingFile.file,
              (progress) => {
                setPendingFiles((prev) =>
                  prev.map((f) =>
                    f.id === pendingFile.id ? { ...f, progress } : f,
                  ),
                );
              },
            );

            // Update status to completed
            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pendingFile.id
                  ? { ...f, status: "completed" as const, progress: 100 }
                  : f,
              ),
            );

            attachments.push(attachment);
          } catch (error) {
            // Update status to failed
            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pendingFile.id
                  ? {
                      ...f,
                      status: "failed" as const,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Upload failed",
                    }
                  : f,
              ),
            );

            throw error;
          }
        }

        // Add to uploaded attachments
        setUploadedAttachments((prev) => [...prev, ...attachments]);

        // Remove completed pending files
        const completedIds = filesToUpload.map((f) => f.id);
        setPendingFiles((prev) =>
          prev.filter((f) => !completedIds.includes(f.id)),
        );

        onSuccess?.(attachments);

        toast.success(`Successfully uploaded ${attachments.length} file(s)`);
      } catch (error) {
        console.error("Upload failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        onError?.(error instanceof Error ? error : new Error(errorMessage));
        toast.error("Upload failed", {
          description: errorMessage,
        });
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [pendingFiles, onSuccess, onError],
  );

  /**
   * Cancel all uploads
   */
  const cancelUploads = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset uploading files to pending
    setPendingFiles((prev) =>
      prev.map((f) =>
        f.status === "uploading"
          ? { ...f, status: "pending" as const, progress: 0 }
          : f,
      ),
    );

    setIsUploading(false);
    toast.info("Upload cancelled");
  }, []);

  /**
   * Clear all files and attachments
   */
  const clearAll = useCallback(() => {
    // Clean up preview URLs
    pendingFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });

    setPendingFiles([]);
    setUploadedAttachments([]);
    cancelUploads();
  }, [pendingFiles, cancelUploads]);

  /**
   * Retry failed uploads
   */
  const retryFailedUploads = useCallback(() => {
    const failedIds = pendingFiles
      .filter((f) => f.status === "failed")
      .map((f) => f.id);

    if (failedIds.length > 0) {
      // Reset failed files to pending
      setPendingFiles((prev) =>
        prev.map((f) =>
          failedIds.includes(f.id)
            ? {
                ...f,
                status: "pending" as const,
                progress: 0,
                error: undefined,
              }
            : f,
        ),
      );

      uploadFiles(failedIds);
    }
  }, [pendingFiles, uploadFiles]);

  /**
   * Get total file size
   */
  const getTotalSize = useCallback(() => {
    const pendingSize = pendingFiles.reduce((sum, f) => sum + f.file.size, 0);
    const uploadedSize = uploadedAttachments.reduce(
      (sum, a) => sum + a.size,
      0,
    );
    return pendingSize + uploadedSize;
  }, [pendingFiles, uploadedAttachments]);

  /**
   * Get total file count
   */
  const getTotalCount = useCallback(() => {
    return pendingFiles.length + uploadedAttachments.length;
  }, [pendingFiles.length, uploadedAttachments.length]);

  /**
   * Check if ready to send (all files uploaded)
   */
  const isReadyToSend = useCallback(() => {
    return (
      pendingFiles.every(
        (f) => f.status === "completed" || f.status === "failed",
      ) && !isUploading
    );
  }, [pendingFiles, isUploading]);

  /**
   * Get all attachment IDs for message sending
   */
  const getAttachmentIds = useCallback(() => {
    return uploadedAttachments.map((a) => a._id);
  }, [uploadedAttachments]);

  return {
    // State
    pendingFiles,
    uploadedAttachments,
    isUploading,

    // Actions
    addFiles,
    removeFile,
    removeAttachment,
    uploadFiles,
    cancelUploads,
    clearAll,
    retryFailedUploads,

    // Computed
    getTotalSize,
    getTotalCount,
    isReadyToSend,
    getAttachmentIds,

    // Validation
    canAddMoreFiles: getTotalCount() < maxFiles,
    hasFailedUploads: pendingFiles.some((f) => f.status === "failed"),
    hasCompletedUploads:
      uploadedAttachments.length > 0 ||
      pendingFiles.some((f) => f.status === "completed"),
  };
}
