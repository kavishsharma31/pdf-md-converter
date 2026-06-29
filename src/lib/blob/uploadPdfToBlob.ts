import { upload } from "@vercel/blob/client";

import {
  BLOB_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_BLOB_UPLOAD_BYTES,
} from "@/lib/pdf/uploadLimits";

export type BlobUploadResult = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: number;
};

const INVALID_PDF_MESSAGE = "Please upload a valid PDF file.";
const EMPTY_FILE_MESSAGE = "This file appears to be empty.";

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function sanitizePdfFilename(filename: string): string {
  const lowercaseName = filename.toLowerCase();
  const baseName = lowercaseName.endsWith(".pdf")
    ? lowercaseName.slice(0, -4)
    : lowercaseName;
  const sanitizedBaseName = baseName
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/\.+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 120);

  return `${sanitizedBaseName || "document"}.pdf`;
}

export async function uploadPdfToBlob(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<BlobUploadResult> {
  if (!(file instanceof File) || !isPdfFile(file)) {
    throw new Error(INVALID_PDF_MESSAGE);
  }

  if (file.size === 0) {
    throw new Error(EMPTY_FILE_MESSAGE);
  }

  if (file.size > MAX_BLOB_UPLOAD_BYTES) {
    throw new Error(BLOB_UPLOAD_TOO_LARGE_MESSAGE);
  }

  const uploadedAt = Date.now();
  const safeFilename = sanitizePdfFilename(file.name);
  const pathname = `uploads/input/${uploadedAt}-${safeFilename}`;
  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/blob/upload",
    onUploadProgress: (event) => {
      onProgress?.(event.percentage);
    },
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
    uploadedAt,
  };
}
