"use client";

import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/Header";
import { HowItWorks } from "@/components/HowItWorks";
import { OptionChip } from "@/components/OptionChip";
import { OutputPanel } from "@/components/OutputPanel";
import { ProgressBar } from "@/components/ProgressBar";
import { StatPill } from "@/components/StatPill";
import { Toast } from "@/components/Toast";
import { UploadZone } from "@/components/UploadZone";
import { uploadPdfToBlob } from "@/lib/blob/uploadPdfToBlob";
import {
  convertBlobPdf,
  type ConvertOptions,
} from "@/lib/pdf/convertBlobPdf";
import {
  BLOB_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_BLOB_UPLOAD_BYTES,
} from "@/lib/pdf/uploadLimits";

type Stats = {
  pdfSize: string;
  mdSize: string;
  tokensSaved: string;
  pages: string;
};

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

const defaultOptions: ConvertOptions = {
  preserveHeadings: true,
  stripWhitespace: true,
  addPageMarkers: true,
  includeMetadata: false,
};

const defaultStats: Stats = {
  pdfSize: "\u2014",
  mdSize: "\u2014",
  tokensSaved: "\u2014",
  pages: "\u2014",
};

const validPdfMessage = "Please upload a valid PDF file.";
const emptyFileMessage = "This file appears to be empty.";

const optionLabels: Array<{ key: keyof ConvertOptions; label: string }> = [
  { key: "preserveHeadings", label: "Preserve headings" },
  { key: "stripWhitespace", label: "Strip excess whitespace" },
  { key: "addPageMarkers", label: "Add page markers" },
  { key: "includeMetadata", label: "Include PDF metadata" },
];

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getFileValidationError(
  file: File | null,
  maximumSizeInBytes: number,
  oversizedMessage: string,
): string | null {
  if (!file) {
    return validPdfMessage;
  }

  if (!isPdfFile(file)) {
    return validPdfMessage;
  }

  if (file.size === 0) {
    return emptyFileMessage;
  }

  if (file.size > maximumSizeInBytes) {
    return oversizedMessage;
  }

  return null;
}

function formatPdfSize(kilobytes: number): string {
  if (kilobytes >= 1024) {
    return `${Math.round((kilobytes / 1024) * 10) / 10} MB`;
  }

  return `${kilobytes} KB`;
}

function formatMarkdownSize(kilobytes: number): string {
  return `${kilobytes} KB`;
}

function estimateTokensSaved(pdfSizeKB: number, mdSizeKB: number): string {
  const tokensSaved = Math.max(
    0,
    Math.round(((pdfSizeKB - mdSizeKB) / 4) * 3),
  );

  return tokensSaved.toLocaleString();
}

function getConversionProgressLabel(progress: number): string {
  if (progress < 72) {
    return "Extracting PDF text\u2026";
  }

  return "Cleaning Markdown\u2026";
}

function deriveMarkdownFilename(file: File | null): string {
  if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
    return "output.md";
  }

  const baseName = file.name.slice(0, -4).trim();

  return baseName.length > 0 ? `${baseName}.md` : "output.md";
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ConvertOptions>(defaultOptions);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Waiting for upload\u2026");
  const [toast, setToast] = useState<ToastState>(null);
  const progressTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const isBusy = isProcessing;
  const outputFilename = deriveMarkdownFilename(selectedFile);
  const outputActionsDisabled = isBusy || markdown.trim().length === 0;

  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
      }

      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showToast(nextToast: NonNullable<ToastState>) {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }

    setToast(nextToast);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2000);
  }

  function toggleOption(key: keyof ConvertOptions) {
    if (isBusy) {
      return;
    }

    setOptions((currentOptions) => ({
      ...currentOptions,
      [key]: !currentOptions[key],
    }));
  }

  function handleFileSelect(file: File) {
    const validationError = getFileValidationError(
      file,
      MAX_BLOB_UPLOAD_BYTES,
      BLOB_UPLOAD_TOO_LARGE_MESSAGE,
    );

    if (validationError) {
      handleInvalidFile(validationError);
      return;
    }

    setError("");
    setMarkdown("");
    setStats(defaultStats);
    setSelectedFile(file);
  }

  function handleInvalidFile(message = validPdfMessage) {
    setSelectedFile(null);
    setMarkdown("");
    setStats(defaultStats);
    setError(message);
  }

  function startConversionProgress() {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
    }

    let currentProgress = 50;
    setProgress(currentProgress);
    setProgressLabel("Extracting PDF text\u2026");

    progressTimer.current = window.setInterval(() => {
      currentProgress = Math.min(currentProgress + 3, 90);
      setProgress(currentProgress);
      setProgressLabel(getConversionProgressLabel(currentProgress));

      if (currentProgress >= 90 && progressTimer.current) {
        window.clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    }, 420);
  }

  function stopProgressTimer() {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  async function handleConvertClick() {
    if (isBusy) {
      return;
    }

    const file = selectedFile;
    const validationError = getFileValidationError(
      file,
      MAX_BLOB_UPLOAD_BYTES,
      BLOB_UPLOAD_TOO_LARGE_MESSAGE,
    );

    if (validationError || !file) {
      setMarkdown("");
      setStats(defaultStats);
      setError(validationError ?? validPdfMessage);
      return;
    }

    setError("");
    setMarkdown("");
    setStats(defaultStats);
    setIsProcessing(true);
    setProgress(5);
    setProgressLabel("Preparing upload\u2026");

    try {
      const blob = await uploadPdfToBlob(file, (uploadProgress) => {
        const mappedProgress = Math.round(
          5 + (Math.min(Math.max(uploadProgress, 0), 100) / 100) * 40,
        );

        setProgress(mappedProgress);
        setProgressLabel("Uploading PDF to Blob\u2026");
      });
      setProgress(45);
      setProgressLabel("Upload complete.");

      await new Promise((resolve) => window.setTimeout(resolve, 200));
      startConversionProgress();

      const data = await convertBlobPdf({
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        originalFilename: file.name,
        pdfSizeBytes: file.size,
        options,
      });

      setMarkdown(data.markdown);
      setStats({
        pdfSize: formatPdfSize(data.pdfSizeKB),
        mdSize: formatMarkdownSize(data.mdSizeKB),
        tokensSaved: estimateTokensSaved(data.pdfSizeKB, data.mdSizeKB),
        pages: String(data.pages),
      });
      stopProgressTimer();
      setProgress(100);
      setProgressLabel("Conversion complete.");

      window.setTimeout(() => {
        setIsProcessing(false);
      }, 550);
    } catch (conversionError) {
      stopProgressTimer();
      setMarkdown("");
      setStats(defaultStats);
      setProgress(0);
      setProgressLabel("Conversion failed.");
      setIsProcessing(false);
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Conversion failed.",
      );
    }
  }

  async function handleCopy() {
    if (outputActionsDisabled) {
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      showToast({
        message: "Copied to clipboard \u2713",
        type: "success",
      });
    } catch {
      showToast({
        message: "Could not copy to clipboard.",
        type: "error",
      });
    }
  }

  function handleDownload() {
    if (outputActionsDisabled) {
      return;
    }

    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = outputFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast({
      message: `Download ready: ${outputFilename}`,
      type: "success",
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(124,92,252,0.18),transparent_32rem),var(--bg)]">
      <Header />
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <section className="max-w-4xl">
          <p className="mb-4 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            PDF to Markdown converter
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Stop burning your context window on bloated PDFs.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Upload a text-based PDF and convert it into clean, Claude-friendly
            Markdown with fewer wasted tokens.
          </p>
        </section>

        <section
          aria-label="Conversion stats"
          className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatPill label="PDF Size" value={stats.pdfSize} />
          <StatPill label="MD Size" value={stats.mdSize} />
          <StatPill
            label="Est. Tokens Saved"
            value={stats.tokensSaved}
            tone="success"
          />
          <StatPill label="Pages Processed" value={stats.pages} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-white/10 bg-card/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-6">
            <UploadZone
              file={selectedFile}
              isProcessing={isBusy}
              onFileSelect={handleFileSelect}
              onInvalidFile={handleInvalidFile}
            />

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
              >
                <span className="font-semibold text-red-50">
                  Upload or conversion issue:{" "}
                </span>
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold text-white">
                Conversion options
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {optionLabels.map((option) => (
                  <OptionChip
                    key={option.key}
                    label={option.label}
                    active={options[option.key]}
                    disabled={isBusy}
                    onToggle={() => toggleOption(option.key)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {isBusy ? (
                <ProgressBar label={progressLabel} progress={progress} />
              ) : null}
              <button
                type="button"
                disabled={!selectedFile || isBusy}
                onClick={handleConvertClick}
                className="w-full rounded-lg bg-accent px-5 py-4 font-display text-base font-bold text-white shadow-[0_18px_45px_rgba(124,92,252,0.3)] transition hover:-translate-y-0.5 hover:bg-[#8A6DFF] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/10 disabled:text-muted disabled:shadow-none"
              >
                {isProcessing ? "Converting\u2026" : "Convert to Markdown"}
              </button>
            </div>
          </div>

          <OutputPanel
            markdown={markdown}
            filename={outputFilename}
            onCopy={handleCopy}
            onDownload={handleDownload}
            copyDisabled={outputActionsDisabled}
            downloadDisabled={outputActionsDisabled}
          />
        </section>

        <HowItWorks />
      </div>
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </main>
  );
}
