export type ParsedPdf = {
  text: string;
  pages: Array<{ num: number; text: string }>;
  total: number;
  info?: Record<string, unknown>;
  creationDate?: Date | null;
};

type PdfParserModules = {
  CanvasFactory: typeof import("pdf-parse/worker").CanvasFactory;
  PDFParse: typeof import("pdf-parse").PDFParse;
};

let parserModulesPromise: Promise<PdfParserModules> | undefined;

function loadParserModules(): Promise<PdfParserModules> {
  parserModulesPromise ??= (async () => {
    const workerModule = await import("pdf-parse/worker");
    const parserModule = await import("pdf-parse");

    parserModule.PDFParse.setWorker(workerModule.getPath());

    return {
      CanvasFactory: workerModule.CanvasFactory,
      PDFParse: parserModule.PDFParse,
    };
  })();

  return parserModulesPromise;
}

export async function parsePdf(
  buffer: Buffer,
  includeMetadata: boolean,
): Promise<ParsedPdf> {
  const { CanvasFactory, PDFParse } = await loadParserModules();
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    CanvasFactory,
  });

  try {
    const textResult = await parser.getText({ pageJoiner: "" });

    if (!includeMetadata) {
      return textResult;
    }

    const infoResult = await parser.getInfo();

    return {
      ...textResult,
      info: infoResult.info as Record<string, unknown> | undefined,
      creationDate: infoResult.getDateNode().CreationDate,
    };
  } finally {
    await parser.destroy();
  }
}
