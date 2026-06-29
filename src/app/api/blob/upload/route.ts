import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  BLOB_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_BLOB_UPLOAD_BYTES,
} from "@/lib/pdf/uploadLimits";

const MAX_PATHNAME_LENGTH = 512;
const INVALID_PDF_MESSAGE = "Please upload a valid PDF file.";

function isValidPdfPathname(pathname: unknown): pathname is string {
  return (
    typeof pathname === "string" &&
    pathname.trim().length > 0 &&
    pathname.length <= MAX_PATHNAME_LENGTH &&
    pathname.toLowerCase().endsWith(".pdf") &&
    !pathname.includes("..") &&
    !pathname.includes("\\") &&
    !pathname.includes("\0")
  );
}

function isOversizedUploadError(message: string): boolean {
  return /too large|maximum size|size limit|exceeds?.*size/i.test(message);
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidPdfPathname(pathname)) {
          throw new Error(INVALID_PDF_MESSAGE);
        }

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_BLOB_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({
            pathname,
            uploadedAt: Date.now(),
            purpose: "pdf-to-md-input",
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("PDF uploaded to Blob:", {
          url: blob.url,
          pathname: blob.pathname,
          tokenPayload,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Blob upload failed.";
    const message = isOversizedUploadError(rawMessage)
      ? BLOB_UPLOAD_TOO_LARGE_MESSAGE
      : rawMessage;

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
