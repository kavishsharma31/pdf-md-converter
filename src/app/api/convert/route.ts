import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { PDFParse } from "pdf-parse";

import { cleanPdfText } from "@/lib/pdf/cleanText";
import {
  addYamlFrontmatter,
  structureAsMarkdown,
} from "@/lib/pdf/markdown";
import type { ConvertOptions, ConvertResult } from "@/lib/pdf/types";

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
const maxPdfSizeBytes = 4 * 1024 * 1024;

type PdfInfo = {
  Title?: unknown;
  Author?: unknown;
  Subject?: unknown;
  Creator?: unknown;
  Producer?: unknown;
  CreationDate?: unknown;
};

function parseBooleanField(formData: FormData, key: keyof ConvertOptions): boolean {
  return formData.get(key) === "true";
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return Response.json({ error: "No PDF file was uploaded." }, { status: 400 });
    }

    if (!isPdfFile(uploadedFile)) {
      return Response.json(
        { error: "The uploaded file must be a PDF." },
        { status: 400 },
      );
    }

    if (uploadedFile.size === 0) {
      return Response.json(
        { error: "This file appears to be empty." },
        { status: 400 },
      );
    }

    if (uploadedFile.size > maxPdfSizeBytes) {
      return Response.json(
        { error: "PDF is too large. Please upload a file under 4MB." },
        { status: 413 },
      );
    }

    const options: ConvertOptions = {
      preserveHeadings: parseBooleanField(formData, "preserveHeadings"),
      stripWhitespace: parseBooleanField(formData, "stripWhitespace"),
      addPageMarkers: parseBooleanField(formData, "addPageMarkers"),
      includeMetadata: parseBooleanField(formData, "includeMetadata"),
    };

    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parser = new PDFParse({ data: buffer });

    try {
      const textResult = await parser.getText({ pageJoiner: "" });
      const extractedText =
        textResult.text || textResult.pages.map((page) => page.text).join("\n\n");
      const nonWhitespaceCharacterCount = extractedText.replace(/\s/g, "").length;

      if (nonWhitespaceCharacterCount < 30) {
        return Response.json({ error: scannedPdfMessage }, { status: 422 });
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

      const pdfSizeKB = Math.round((buffer.byteLength / 1024) * 10) / 10;
      const mdSizeKB =
        Math.round((Buffer.byteLength(markdown, "utf8") / 1024) * 10) / 10;
      const result: ConvertResult = {
        markdown,
        pages,
        pdfSizeKB,
        mdSizeKB,
      };

      return Response.json(result);
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.error("PDF conversion failed:", error);

    return Response.json(
      { error: "Unexpected error while converting the PDF." },
      { status: 500 },
    );
  }
}
