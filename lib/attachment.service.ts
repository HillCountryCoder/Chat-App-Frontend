// lib/attachment.service.ts
import { api } from "./api";
import { UploadUrlResponse, Attachment } from "@/types/attachment";
import { FileUploadService } from "./file-upload.service";

export class AttachmentService {
  /**
   * Request upload URL from backend
   */
  static async requestUploadUrl(
    fileName: string,
    fileType: string,
    fileSize: number,
    hasClientThumbnail: boolean = false,
  ): Promise<UploadUrlResponse> {
    const { data } = await api.post("/attachments/upload-url", {
      fileName,
      fileType,
      fileSize,
      hasClientThumbnail,
    });
    return data;
  }

  /**
   * Upload file to S3 using presigned URL
   */
  static async uploadToS3(
    presignedUrl: string,
    file: File | Blob,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          // Extract ETag from response headers
          const eTag = xhr.getResponseHeader("ETag")?.replace(/"/g, "");
          resolve(eTag || "");
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Upload failed"));
      };

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.send(file);
    });
  }

  /**
   * Complete upload notification to backend
   */
  static async completeUpload(
    fileName: string,
    fileType: string,
    fileSize: number,
    cdnUrl: string,
    s3Bucket: string,
    s3Key: string,
    eTag?: string,
  ): Promise<Attachment> {
    const { data } = await api.post("/attachments/complete", {
      fileName,
      fileType,
      fileSize,
      cdnUrl,
      s3Bucket,
      s3Key,
      eTag,
    });
    return data;
  }

  /**
   * Full upload process: request URL → upload → complete
   */
  static async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<Attachment> {
    try {
      // 1. Validate file
      const validation = FileUploadService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      // 2. Generate thumbnail if supported
      let thumbnail: Blob | null = null;
      let hasClientThumbnail = false;

      if (FileUploadService.supportsThumbnail(file.type)) {
        thumbnail = await FileUploadService.generateImageThumbnail(file);
        hasClientThumbnail = !!thumbnail;
      }

      // 3. Compress image if applicable
      let fileToUpload: File | Blob = file;
      if (file.type.startsWith("image/")) {
        fileToUpload = await FileUploadService.compressImage(file);
      }

      // 4. Request upload URLs
      const uploadResponse = await this.requestUploadUrl(
        file.name,
        file.type,
        file.size,
        hasClientThumbnail,
      );

      // 5. Upload main file
      const eTag = await this.uploadToS3(
        uploadResponse.presignedUrl,
        fileToUpload,
        (progress) => {
          // Reserve 10% for thumbnail and completion
          const mainFileProgress = progress * 0.9;
          onProgress?.(mainFileProgress);
        },
      );

      // 6. Upload thumbnail if generated
      if (thumbnail && uploadResponse.thumbnailUpload) {
        await this.uploadToS3(
          uploadResponse.thumbnailUpload.presignedUrl,
          thumbnail,
        );
        onProgress?.(95);
      }

      // 7. Complete upload
      const attachment = await this.completeUpload(
        file.name,
        file.type,
        file.size,
        uploadResponse.cdnUrl,
        uploadResponse.metadata.bucket,
        uploadResponse.metadata.key,
        eTag,
      );

      onProgress?.(100);
      return attachment;
    } catch (error) {
      console.error("File upload failed:", error);
      throw error;
    }
  }

  /**
   * Upload multiple files with progress tracking
   */
  static async uploadFiles(
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void,
    onFileComplete?: (fileIndex: number, attachment: Attachment) => void,
  ): Promise<Attachment[]> {
    // Validate all files first
    const validation = FileUploadService.validateFiles(files);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const attachments: Attachment[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const attachment = await this.uploadFile(file, (progress) => {
          onProgress?.(i, progress);
        });

        attachments.push(attachment);
        onFileComplete?.(i, attachment);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        throw error;
      }
    }

    return attachments;
  }

  /**
   * Get download URL for an attachment
   */
  static async getDownloadUrl(attachmentId: string): Promise<string> {
    const { data } = await api.get(`/attachments/${attachmentId}/download`);
    return data.downloadUrl;
  }

  /**
   * Delete an attachment
   */
  static async deleteAttachment(attachmentId: string): Promise<void> {
    await api.delete(`/attachments/${attachmentId}`);
  }

  /**
   * Get user's attachments
   */
  static async getUserAttachments(): Promise<{
    attachments: Attachment[];
    totalCount: number;
    totalSize: number;
  }> {
    const { data } = await api.get("/attachments/user/attachments");
    return data;
  }

  /**
   * Download attachment as file
   */
  static async downloadAttachment(attachment: Attachment): Promise<void> {
    try {
      const downloadUrl = await this.getDownloadUrl(attachment._id);

      // Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = attachment.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      throw error;
    }
  }

  /**
   * Get file type category for display purposes
   */
  static getFileCategory(
    mimeType: string,
  ): "image" | "video" | "document" | "other" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("word") ||
      mimeType.includes("text")
    ) {
      return "document";
    }
    return "other";
  }

  /**
   * Check if attachment can be previewed inline
   */
  static canPreview(attachment: Attachment): boolean {
    return FileUploadService.supportsInlinePreview(attachment.type);
  }
}
