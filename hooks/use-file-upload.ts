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
   * Update attachment status (for real-time status updates)
   */
  const updateAttachmentStatus = useCallback(
    (attachmentId: string, status: Attachment["status"], metadata?: Record<string, unknown>) => {
      setUploadedAttachments((prev) =>
        prev.map((attachment) =>
          attachment._id === attachmentId
            ? { ...attachment, status, ...(metadata && { metadata: { ...attachment.metadata, ...metadata } }) }
            : attachment,
        ),
      );
    },
    [],
  );

  /**
   * Upload specific files by ID or file objects
   */
  const uploadFiles = useCallback(
    async (fileIds?: string[], filesToUploadDirectly?: PendingAttachment[]) => {
      let filesToUpload: PendingAttachment[];

      if (filesToUploadDirectly) {
        filesToUpload = filesToUploadDirectly.filter(
          (f) => f.status === "pending",
        );
      } else if (fileIds) {
        filesToUpload = pendingFiles.filter(
          (f) => fileIds.includes(f.id) && f.status === "pending",
        );
      } else {
        filesToUpload = pendingFiles.filter((f) => f.status === "pending");
      }

      if (filesToUpload.length === 0) {
        return;
      }

      setIsUploading(true);
      abortControllerRef.current = new AbortController();

      const successfulUploads: Attachment[] = [];
      const failedUploads: string[] = [];

      try {
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

            // Mark as completed
            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pendingFile.id
                  ? { ...f, status: "completed" as const, progress: 100 }
                  : f,
              ),
            );

            successfulUploads.push(attachment);
          } catch (error) {
            console.error(`Failed to upload ${pendingFile.file.name}:`, error);

            // Mark as failed but don't throw - continue with other files
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

            failedUploads.push(pendingFile.id);
          }
        }

        // Add successful uploads to uploaded attachments
        if (successfulUploads.length > 0) {
          setUploadedAttachments((prev) => [...prev, ...successfulUploads]);

          // Remove completed pending files
          const completedIds = successfulUploads
            .map((attachment) => {
              const pendingFile = filesToUpload.find(
                (f) =>
                  f.file.name === attachment.name &&
                  f.file.size === attachment.size,
              );
              return pendingFile?.id;
            })
            .filter(Boolean) as string[];

          setPendingFiles((prev) =>
            prev.filter((f) => !completedIds.includes(f.id)),
          );

          onSuccess?.(successfulUploads);

          // Success message
          toast.success(
            `Successfully uploaded ${successfulUploads.length} file(s)`,
            {
              description: "Files are ready to use",
            },
          );
        }

        // Show error summary if some failed
        if (failedUploads.length > 0) {
          const errorMessage =
            successfulUploads.length > 0
              ? `${failedUploads.length} file(s) failed to upload, ${successfulUploads.length} succeeded`
              : `Failed to upload ${failedUploads.length} file(s)`;

          toast.error("Some uploads failed", {
            description: errorMessage,
          });

          // Don't call onError for partial failures
          if (successfulUploads.length === 0) {
            onError?.(
              new Error(`All ${failedUploads.length} files failed to upload`),
            );
          }
        }
      } catch (error) {
        // This should rarely happen now since we handle individual file errors
        console.error("Upload process failed:", error);
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

      // Update state first
      setPendingFiles((prev) => [...prev, ...newPendingFiles]);

      // Auto-upload if enabled
      if (autoUpload) {
        uploadFiles(undefined, newPendingFiles);
      }
    },
    [
      pendingFiles.length,
      uploadedAttachments.length,
      maxFiles,
      onError,
      autoUpload,
      uploadFiles,
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
   * 🔥 NEW: Remove all failed files
   */
  const removeFailedFiles = useCallback(() => {
    setPendingFiles((prev) => {
      // Clean up preview URLs for failed files
      const failedFiles = prev.filter((f) => f.status === "failed");
      failedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      const remainingFiles = prev.filter((f) => f.status !== "failed");
      toast.info(`Removed ${failedFiles.length} failed file(s)`);
      return remainingFiles;
    });
  }, []);

  /**
   * 🔥 NEW: Retry specific file
   */
  const retrySpecificFile = useCallback(
    async (fileId: string) => {
      const failedFile = pendingFiles.find(
        (f) => f.id === fileId && f.status === "failed",
      );

      if (!failedFile) {
        console.log("❌ Failed file not found");
        return;
      }

      // Check if retryable
      const isValidationError =
        failedFile.error?.includes("suspicious") ||
        failedFile.error?.includes("not allowed");

      if (isValidationError) {
        toast.warning("Cannot retry blocked file");
        return;
      }

      // Set to uploading immediately
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "uploading" as const,
                progress: 0,
                error: undefined,
              }
            : f,
        ),
      );

      try {
        // Call AttachmentService.uploadFile directly
        const attachment = await AttachmentService.uploadFile(
          failedFile.file,
          (progress) => {
            setPendingFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, progress } : f)),
            );
          },
        );

        // Mark as completed and add to uploaded
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: "completed" as const, progress: 100 }
              : f,
          ),
        );

        setUploadedAttachments((prev) => [...prev, attachment]);

        // Remove from pending
        setTimeout(() => {
          setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));
        }, 100);

        toast.success(`Successfully uploaded ${failedFile.file.name}`);
      } catch (error) {
        console.error("Retry failed:", error);

        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "failed" as const,
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f,
          ),
        );

        toast.error(`Retry failed: ${failedFile.file.name}`);
      }
    },
    [pendingFiles, setUploadedAttachments],
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
  const retryFailedUploads = useCallback(async () => {
    const failedFiles = pendingFiles.filter((f) => f.status === "failed");

    console.log("🔄 retryFailedUploads called", {
      failedCount: failedFiles.length,
    });

    if (failedFiles.length === 0) {
      console.log("❌ No failed files to retry");
      return;
    }

    // Filter out validation errors (non-retryable)
    const retryableFiles = failedFiles.filter((f) => {
      const isValidationError =
        f.error?.includes("suspicious") ||
        f.error?.includes("not allowed") ||
        f.error?.includes("validation failed");
      return !isValidationError;
    });

    if (retryableFiles.length === 0) {
      toast.warning("No files can be retried", {
        description: "All failed files were blocked by validation.",
      });
      return;
    }

    console.log(`🚀 Retrying ${retryableFiles.length} files`);

    // Show progress toast
    toast.info(`Retrying ${retryableFiles.length} file(s)...`);

    // Use the working retrySpecificFile function for each file
    for (const file of retryableFiles) {
      try {
        await retrySpecificFile(file.id);
        // Add small delay between retries to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to retry ${file.file.name}:`, error);
      }
    }
  }, [pendingFiles, retrySpecificFile]);

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
   * 🔥 UPDATED: Check if ready to send - allow sending with failed files removed
   */
  const isReadyToSend = useCallback(() => {
    const nonFailedFiles = pendingFiles.filter((f) => f.status !== "failed");
    return (
      nonFailedFiles.every((f) => f.status === "completed") && !isUploading
    );
  }, [pendingFiles, isUploading]);

  /**
   * Get all attachment IDs for message sending
   */
  const getAttachmentIds = useCallback(() => {
    return uploadedAttachments.map((a) => a._id);
  }, [uploadedAttachments]);

  /**
   * 🔥 NEW: Get counts for different file states
   */
  const getFileCounts = useCallback(() => {
    const pending = pendingFiles.filter((f) => f.status === "pending").length;
    const uploading = pendingFiles.filter(
      (f) => f.status === "uploading",
    ).length;
    const completed = pendingFiles.filter(
      (f) => f.status === "completed",
    ).length;
    const failed = pendingFiles.filter((f) => f.status === "failed").length;
    const ready = uploadedAttachments.length;

    return {
      pending,
      uploading,
      completed,
      failed,
      ready,
      total: pending + uploading + completed + failed + ready,
    };
  }, [pendingFiles, uploadedAttachments]);

  return {
    // State
    pendingFiles,
    uploadedAttachments,
    isUploading,

    // Actions
    addFiles,
    removeFile,
    removeAttachment,
    removeFailedFiles, // 🔥 NEW
    uploadFiles,
    cancelUploads,
    clearAll,
    retryFailedUploads,
    retrySpecificFile, // 🔥 NEW
    updateAttachmentStatus,

    // Computed
    getTotalSize,
    getTotalCount,
    isReadyToSend,
    getAttachmentIds,
    getFileCounts, // 🔥 NEW

    // Validation
    canAddMoreFiles: getTotalCount() < maxFiles,
    hasFailedUploads: pendingFiles.some((f) => f.status === "failed"),
    hasCompletedUploads:
      uploadedAttachments.length > 0 ||
      pendingFiles.some((f) => f.status === "completed"),
    hasOnlyFailedFiles:
      pendingFiles.length > 0 &&
      pendingFiles.every((f) => f.status === "failed"), // 🔥 NEW
  };
}
