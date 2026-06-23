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
