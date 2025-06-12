import {
  FileValidationResult,
  FileConstraints,
  FILE_CONSTRAINTS,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  THUMBNAIL_CONFIG,
} from "@/types/attachment";

export class FileUploadService {
  /**
   * Validate a single file against constraints
   */
  static validateFile(
    file: File,
    constraints: FileConstraints = FILE_CONSTRAINTS,
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (file.size > constraints.maxFileSize) {
      errors.push(
        `File "${
          file.name
        }" is too large. Maximum size is ${this.formatFileSize(
          constraints.maxFileSize,
        )}`,
      );
    }

    if (!constraints.allowedTypes.includes(file.type)) {
      errors.push(`File type "${file.type}" is not allowed for "${file.name}"`);
    }

    const extension = this.getFileExtension(file.name);
    if (!constraints.allowedExtensions.includes(extension.toLowerCase())) {
      errors.push(
        `File extension "${extension}" is not allowed for "${file.name}"`,
      );
    }

    if (file.size > constraints.maxFileSize * 0.8) {
      warnings.push(
        `File "${file.name}" is quite large and may take time to upload`,
      );
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate multiple files for a message
   */

  static validateFiles(
    files: File[],
    constraints: FileConstraints = FILE_CONSTRAINTS,
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file count
    if (files.length > constraints.maxFilesPerMessage) {
      errors.push(
        `Too many files. Maximum ${constraints.maxFilesPerMessage} files per message`,
      );
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > constraints.maxTotalSize) {
      errors.push(
        `Total file size too large. Maximum ${this.formatFileSize(
          constraints.maxTotalSize,
        )} per message`,
      );
    }

    // Validate each file
    files.forEach((file) => {
      const result = this.validateFile(file, constraints);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });

    return {
      isValid: errors.length === 0,
      errors: [...new Set(errors)], // Remove duplicates
      warnings: [...new Set(warnings)],
    };
  }

  /**
   * Generate thumbnail for image files
   */

  static async generateImageThumbnail(file: File): Promise<Blob | null> {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return null;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        const { width, height } = this.calculateThumbnailDimensions(
          img.width,
          img.height,
          THUMBNAIL_CONFIG.maxWidth,
          THUMBNAIL_CONFIG.maxHeight,
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob),
          THUMBNAIL_CONFIG.format,
          THUMBNAIL_CONFIG.quality,
        );
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate preview URL for files
   */
  static generatePreviewUrl(file: File): string | null {
    if (
      SUPPORTED_IMAGE_TYPES.includes(file.type) ||
      SUPPORTED_VIDEO_TYPES.includes(file.type)
    ) {
      return URL.createObjectURL(file);
    }
    return null;
  }
  /**
   * Generate preview URL for files
   */
  static async compressImage(
    file: File,
    quality: number = 0.85,
  ): Promise<Blob> {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return file;
    }
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Maintain original dimensions for compression
        canvas.width = img.width;
        canvas.height = img.height;

        ctx?.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => resolve(blob || file),
          "image/webp", // Use WebP for better compression
          quality,
        );
      };

      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   */

  private static calculateThumbnailDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = maxWidth;
    let height = maxWidth / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Get file extension
   */
  private static getFileExtension(filename: string): string {
    return filename.slice(filename.lastIndexOf("."));
  }

  /**
   * Get file icon based on type
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
      return "📊";
    if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦";
    return "📁";
  }

  /**
   * Check if file type supports thumbnail generation
   */
  static supportsThumbnail(mimeType: string): boolean {
    return (
      SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
      SUPPORTED_VIDEO_TYPES.includes(mimeType)
    );
  }

  /**
   * Check if file can be previewed inline
   */
  static supportsInlinePreview(mimeType: string): boolean {
    return (
      SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
      SUPPORTED_VIDEO_TYPES.includes(mimeType) ||
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/")
    );
  }
}
