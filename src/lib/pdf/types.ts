export type ConvertOptions = {
  preserveHeadings: boolean;
  stripWhitespace: boolean;
  addPageMarkers: boolean;
  includeMetadata: boolean;
};

export type ConvertResult = {
  markdown: string;
  pages: number;
  pdfSizeKB: number;
  mdSizeKB: number;
};

export type BlobConvertRequest = {
  inputMode: "blob";
  blobUrl: string;
  blobPathname: string;
  originalFilename: string;
  pdfSizeBytes: number;
  preserveHeadings: boolean;
  stripWhitespace: boolean;
  addPageMarkers: boolean;
  includeMetadata: boolean;
};
