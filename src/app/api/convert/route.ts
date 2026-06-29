import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { PDFParse } from "pdf-parse";

import { deleteBlob } from "@/lib/blob/deleteBlob";
import { fetchPrivateBlobAsBuffer } from "@/lib/blob/fetchPrivateBlob";
import { cleanPdfText } from "@/lib/pdf/cleanText";
import {
  addYamlFrontmatter,
  structureAsMarkdown,
} from "@/lib/pdf/markdown";
import type {
  BlobConvertRequest,
  ConvertOptions,
  ConvertResult,
} from "@/lib/pdf/types";
import {
  BLOB_UPLOAD_TOO_LARGE_MESSAGE,
  DIRECT_CONVERT_TOO_LARGE_MESSAGE,
  MAX_BLOB_UPLOAD_BYTES,
  MAX_DIRECT_CONVERT_BYTES,
} from "@/lib/pdf/uploadLimits";

export const runtime = "nodejs";

PDFParse.setWorker(
  pathToFileURL(
    join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs",
    ),
  ).href,
);

const scannedPdfMessage =
  "This PDF appears to be scanned. Only text-based PDFs are supported.";
const invalidPdfMessage = "Please upload a valid PDF file.";
const emptyFileMessage = "This file appears to be empty.";

type PdfInfo = {
  Title?: unknown;
  Author?: unknown;
  Subject?: unknown;
  Creator?: unknown;
  Producer?: unknown;
  CreationDate?: unknown;
};

class ConvertRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ConvertRequestError";
  }
}

function parseBooleanField(
  formData: FormData,
  key: keyof ConvertOptions,
): boolean {
  return formData.get(key) === "true";
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isValidBlobPathname(pathname: string): boolean {
  return (
    pathname.startsWith("uploads/input/") &&
    pathname.toLowerCase().endsWith(".pdf") &&
    pathname.length <= 512 &&
    !pathname.includes("..") &&
    !pathname.includes("\\")
  );
}

function hasBooleanOptions(body: BlobConvertRequest): boolean {
  return (
    typeof body.preserveHeadings === "boolean" &&
    typeof body.stripWhitespace === "boolean" &&
    typeof body.addPageMarkers === "boolean" &&
    typeof body.includeMetadata === "boolean"
  );
}

function getStringMetadata(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function buildMarkdownInput(
  pages: Array<{ num: number; text: string }>,
  fallbackText: string,
  addPageMarkers: boolean,
): string {
  if (pages.length > 0) {
    return pages
      .map((page) =>
        addPageMarkers
          ? `@@PDF_MD_PAGE:${page.num}@@\n\n${page.text}`
          : page.text,
      )
      .join("\n\n");
  }

  // pdf-parse v2 normally returns per-page text. If that is unavailable,
  // the safest fallback is to mark the combined extraction as page 1 only.
  return addPageMarkers
    ? `@@PDF_MD_PAGE:1@@\n\n${fallbackText}`
    : fallbackText;
}

function buildMetadata(
  info: PdfInfo | undefined,
  creationDate: Date | null | undefined,
  pages: number,
): Record<string, unknown> {
  return {
    title: getStringMetadata(info?.Title),
    author: getStringMetadata(info?.Author),
    subject: getStringMetadata(info?.Subject),
    creator: getStringMetadata(info?.Creator),
    producer: getStringMetadata(info?.Producer),
    creationDate: creationDate ?? getStringMetadata(info?.CreationDate),
    pages,
  };
}

async function convertPdfBuffer(
  buffer: Buffer,
  options: ConvertOptions,
): Promise<ConvertResult> {
  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText({ pageJoiner: "" });
    const extractedText =
      textResult.text || textResult.pages.map((page) => page.text).join("\n\n");
    const nonWhitespaceCharacterCount = extractedText.replace(/\s/g, "").length;

    if (nonWhitespaceCharacterCount < 30) {
      throw new ConvertRequestError(scannedPdfMessage, 422);
    }

    const pages = textResult.total || textResult.pages.length || 1;
    const rawMarkdownInput = buildMarkdownInput(
      textResult.pages,
      extractedText,
      options.addPageMarkers,
    );
    const cleanedText = cleanPdfText(rawMarkdownInput, options.stripWhitespace);
    let markdown = structureAsMarkdown(cleanedText, options);

    if (options.includeMetadata) {
      const infoResult = await parser.getInfo();
      const metadata = buildMetadata(
        infoResult.info as PdfInfo | undefined,
        infoResult.getDateNode().CreationDate,
        pages,
      );

      markdown = addYamlFrontmatter(markdown, metadata);
    }

    return {
      markdown,
      pages,
      pdfSizeKB: Math.round((buffer.byteLength / 1024) * 10) / 10,
      mdSizeKB:
        Math.round((Buffer.byteLength(markdown, "utf8") / 1024) * 10) / 10,
    };
  } finally {
    await parser.destroy();
  }
}

async function handleDirectUpload(request: Request): Promise<Response> {
  const formData = await request.formData();
  const uploadedFile = formData.get("file");

  if (!(uploadedFile instanceof File)) {
    throw new ConvertRequestError("No PDF file was uploaded.", 400);
  }

  if (!isPdfFile(uploadedFile)) {
    throw new ConvertRequestError("The uploaded file must be a PDF.", 400);
  }

  if (uploadedFile.size === 0) {
    throw new ConvertRequestError(emptyFileMessage, 400);
  }

  if (uploadedFile.size > MAX_DIRECT_CONVERT_BYTES) {
    throw new ConvertRequestError(DIRECT_CONVERT_TOO_LARGE_MESSAGE, 413);
  }

  const options: ConvertOptions = {
    preserveHeadings: parseBooleanField(formData, "preserveHeadings"),
    stripWhitespace: parseBooleanField(formData, "stripWhitespace"),
    addPageMarkers: parseBooleanField(formData, "addPageMarkers"),
    includeMetadata: parseBooleanField(formData, "includeMetadata"),
  };
  const buffer = Buffer.from(await uploadedFile.arrayBuffer());
  const result = await convertPdfBuffer(buffer, options);

  return Response.json(result);
}

async function handleBlobUpload(request: Request): Promise<Response> {
  let body: BlobConvertRequest;
  let blobPathname: string | null = null;

  try {
    try {
      body = (await request.json()) as BlobConvertRequest;
    } catch {
      throw new ConvertRequestError(invalidPdfMessage, 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      body.inputMode !== "blob" ||
      typeof body.blobPathname !== "string" ||
      !isValidBlobPathname(body.blobPathname)
    ) {
      throw new ConvertRequestError(invalidPdfMessage, 400);
    }

    blobPathname = body.blobPathname;

    if (
      typeof body.blobUrl !== "string" ||
      body.blobUrl.trim().length === 0 ||
      typeof body.originalFilename !== "string" ||
      !body.originalFilename.toLowerCase().endsWith(".pdf") ||
      typeof body.pdfSizeBytes !== "number" ||
      !Number.isFinite(body.pdfSizeBytes) ||
      !hasBooleanOptions(body)
    ) {
      throw new ConvertRequestError(invalidPdfMessage, 400);
    }

    if (body.pdfSizeBytes <= 0) {
      throw new ConvertRequestError(emptyFileMessage, 400);
    }

    if (body.pdfSizeBytes > MAX_BLOB_UPLOAD_BYTES) {
      throw new ConvertRequestError(BLOB_UPLOAD_TOO_LARGE_MESSAGE, 413);
    }

    const buffer = await fetchPrivateBlobAsBuffer(blobPathname);

    if (buffer.byteLength === 0) {
      throw new ConvertRequestError(emptyFileMessage, 400);
    }

    if (buffer.byteLength > MAX_BLOB_UPLOAD_BYTES) {
      throw new ConvertRequestError(BLOB_UPLOAD_TOO_LARGE_MESSAGE, 413);
    }

    const options: ConvertOptions = {
      preserveHeadings: body.preserveHeadings,
      stripWhitespace: body.stripWhitespace,
      addPageMarkers: body.addPageMarkers,
      includeMetadata: body.includeMetadata,
    };
    const result = await convertPdfBuffer(buffer, options);

    return Response.json(result);
  } finally {
    if (blobPathname) {
      try {
        await deleteBlob(blobPathname);
      } catch (deleteError) {
        console.warn("Failed to delete temporary input blob:", deleteError);
      }
    }
  }
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      return await handleDirectUpload(request);
    }

    if (contentType.includes("application/json")) {
      return await handleBlobUpload(request);
    }

    return Response.json(
      { error: "Unsupported request format." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof ConvertRequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("PDF conversion failed:", error);

    return Response.json(
      { error: "Unexpected error while converting the PDF." },
      { status: 500 },
    );
  }
}
