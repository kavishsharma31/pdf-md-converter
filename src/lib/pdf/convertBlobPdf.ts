export type ConvertOptions = {
  preserveHeadings: boolean;
  stripWhitespace: boolean;
  addPageMarkers: boolean;
  includeMetadata: boolean;
};

export type BlobConvertInput = {
  blobUrl: string;
  blobPathname: string;
  originalFilename: string;
  pdfSizeBytes: number;
  options: ConvertOptions;
};

export type ConvertResponse = {
  markdown: string;
  pages: number;
  pdfSizeKB: number;
  mdSizeKB: number;
};

export type ConvertErrorResponse = {
  error: string;
};

export async function convertBlobPdf(
  input: BlobConvertInput,
): Promise<ConvertResponse> {
  const response = await fetch("/api/convert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputMode: "blob",
      blobUrl: input.blobUrl,
      blobPathname: input.blobPathname,
      originalFilename: input.originalFilename,
      pdfSizeBytes: input.pdfSizeBytes,
      preserveHeadings: input.options.preserveHeadings,
      stripWhitespace: input.options.stripWhitespace,
      addPageMarkers: input.options.addPageMarkers,
      includeMetadata: input.options.includeMetadata,
    }),
  });
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    await response.text();
    throw new Error(
      "Conversion endpoint returned an HTML error page instead of JSON. Check Vercel function logs for /api/convert.",
    );
  }

  const data = (await response.json()) as
    | ConvertResponse
    | ConvertErrorResponse;

  if (!response.ok) {
    const message = "error" in data ? data.error : "Conversion failed.";
    throw new Error(message);
  }

  if (!("markdown" in data)) {
    throw new Error("Conversion failed.");
  }

  return data;
}
