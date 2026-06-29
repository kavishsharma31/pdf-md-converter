"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from "react";

import {
  BLOB_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_BLOB_UPLOAD_BYTES,
} from "@/lib/pdf/uploadLimits";

type UploadZoneProps = {
  file: File | null;
  isProcessing?: boolean;
  onFileSelect: (file: File) => void;
  onInvalidFile?: (message?: string) => void;
};

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getFileValidationError(file: File): string | null {
  if (!isPdf(file)) {
    return "Please upload a valid PDF file.";
  }

  if (file.size === 0) {
    return "This file appears to be empty.";
  }

  if (file.size > MAX_BLOB_UPLOAD_BYTES) {
    return BLOB_UPLOAD_TOO_LARGE_MESSAGE;
  }

  return null;
}

export function UploadZone({
  file,
  isProcessing = false,
  onFileSelect,
  onInvalidFile,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const zoneStateClass = isProcessing
    ? "cursor-wait border-accent/45 bg-accent/5 shadow-[0_0_34px_rgba(124,92,252,0.16)]"
    : isDragging
      ? "cursor-pointer border-accent bg-accent/10 shadow-[0_0_42px_rgba(124,92,252,0.28)]"
      : "cursor-pointer border-white/18 bg-white/[0.025] hover:border-accent/70 hover:bg-accent/5";

  function handleFile(candidate: File | undefined) {
    if (isProcessing) {
      return;
    }

    if (!candidate) {
      return;
    }

    const validationError = getFileValidationError(candidate);

    if (validationError) {
      onInvalidFile?.(validationError);
      return;
    }

    onFileSelect(candidate);
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>,
  ) {
    handleFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (isProcessing) {
      return;
    }

    handleFile(event.dataTransfer.files[0]);
  }

  function openFilePicker() {
    if (isProcessing) {
      return;
    }

    inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group flex min-h-60 flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition duration-200 sm:min-h-72 sm:p-8 ${zoneStateClass}`}
      aria-label="Upload a PDF file"
      aria-disabled={isProcessing}
      aria-busy={isProcessing}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onInput={handleInputChange}
        onChange={handleInputChange}
      />
      <div className="mb-5 flex size-14 items-center justify-center rounded-lg border border-accent/35 bg-accent/10 font-mono text-sm font-bold text-accent shadow-[0_0_32px_rgba(124,92,252,0.18)] transition group-hover:scale-[1.03] sm:size-16">
        PDF
      </div>
      <div className="font-display text-xl font-semibold text-white sm:text-2xl">
        Drop your PDF here
      </div>
      <div className="mt-2 text-sm text-muted">or click to browse files</div>
      {file ? (
        <div className="mt-5 max-w-full rounded-full border border-white/10 bg-background/70 px-4 py-2 font-mono text-xs text-white">
          Selected: <span className="break-all text-success">{file.name}</span>
        </div>
      ) : null}
      {isProcessing ? (
        <div className="mt-3 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent">
          Processing selected PDF
        </div>
      ) : null}
    </div>
  );
}
