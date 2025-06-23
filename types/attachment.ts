import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_FILE_SIZE,
  MAX_TOTAL_MESSAGE_SIZE,
} from "@/utils/constants/file";

export interface S3Metadata {
  bucket: string;
  key: string;
  region?: string;
  contentType: string;
  eTag?: string;
  encrypted: boolean;
}

export interface ThumbnailMetadata {
  s3Key: string;
  url: string; // CDN URL
  width: number;
  height: number;
}

export interface CompressionMetadata {
  algorithm: "webp" | "h264" | "none";
  quality: number;
  compressionRatio: number;
}

export interface AttachmentMetadata {
  width?: number;
  height?: number;
  duration?: number;
  s3: S3Metadata;
  thumbnail?: ThumbnailMetadata;
  compression?: CompressionMetadata;
}

export interface Attachment {
  _id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  compressedSize?: number;
  uploadedBy: string;
  uploadedAt: string;
  status: "uploading" | "ready" | "failed";
  metadata: AttachmentMetadata;
}

export interface UploadUrlResponse {
  uploadId: string;
  presignedUrl: string;
  cdnUrl: string;
  thumbnailUpload?: {
    presignedUrl: string;
    key: string;
    bucket: string;
    cdnUrl: string;
  };
  metadata: {
    bucket: string;
    key: string;
    maxFileSize: number;
  };
}

export interface FileUploadProgress {
  uploadId: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
}

export interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
  thumbnail?: Blob;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
  uploadId?: string;
  cdnUrl?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileConstraints {
  maxFileSize: number; // 25MB
  maxFilesPerMessage: number; // 10
  maxTotalSize: number; // 100MB
  allowedTypes: string[];
  allowedExtensions: string[];
}

export interface AttachmentDisplayProps {
  attachment: Attachment;
  isInMessage?: boolean;
  showMetadata?: boolean;
  onDownload?: (attachment: Attachment) => void;
  onPreview?: (attachment: Attachment) => void;
}

export interface MediaViewerProps {
  attachment: Attachment;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const FILE_CONSTRAINTS: FileConstraints = {
  maxFileSize: MAX_FILE_SIZE,
  maxFilesPerMessage: MAX_ATTACHMENTS_PER_MESSAGE,
  maxTotalSize: MAX_TOTAL_MESSAGE_SIZE,
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  allowedExtensions: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".mp4",
    ".webm",
    ".pdf",
    ".txt",
    ".doc",
    ".docx",
  ],
};

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

export const THUMBNAIL_CONFIG = {
  maxWidth: 320,
  maxHeight: 240,
  quality: 0.85,
  format: "image/jpeg" as const,
};
