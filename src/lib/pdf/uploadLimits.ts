export const MAX_DIRECT_CONVERT_MB = 4;
export const MAX_DIRECT_CONVERT_BYTES = MAX_DIRECT_CONVERT_MB * 1024 * 1024;

export const MAX_BLOB_UPLOAD_MB = 25;
export const MAX_BLOB_UPLOAD_BYTES = MAX_BLOB_UPLOAD_MB * 1024 * 1024;

export const DIRECT_CONVERT_TOO_LARGE_MESSAGE =
  "PDF is too large. Please upload a file under 4MB.";
export const BLOB_UPLOAD_TOO_LARGE_MESSAGE =
  "PDF is too large. Please upload a file under 25MB.";
