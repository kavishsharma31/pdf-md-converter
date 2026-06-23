type OutputPanelProps = {
  markdown: string;
  onCopy: () => void;
  onDownload: () => void;
  copyDisabled: boolean;
  downloadDisabled: boolean;
  filename?: string;
};

export function OutputPanel({
  markdown,
  onCopy,
  onDownload,
  copyDisabled,
  downloadDisabled,
  filename = "output.md",
}: OutputPanelProps) {
  return (
    <section className="flex min-h-[470px] min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-card shadow-[0_24px_70px_rgba(0,0,0,0.26)] sm:min-h-[560px]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.025] px-3 py-3 sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="min-w-0 flex-1 truncate rounded-full border border-white/10 bg-background/70 px-3 py-1 font-mono text-xs text-muted sm:flex-none">
          {filename}
        </div>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <button
            type="button"
            disabled={copyDisabled}
            onClick={onCopy}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-accent/55 disabled:cursor-not-allowed disabled:text-muted disabled:opacity-45 sm:flex-none sm:py-1.5"
          >
            Copy
          </button>
          <button
            type="button"
            disabled={downloadDisabled}
            onClick={onDownload}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-accent/55 disabled:cursor-not-allowed disabled:text-muted disabled:opacity-45 sm:flex-none sm:py-1.5"
          >
            Download .md
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={markdown}
        aria-label="Converted Markdown output"
        placeholder="Your converted Markdown will appear here after processing."
        className="min-h-[330px] flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm leading-7 text-white outline-none placeholder:text-muted/70 sm:min-h-[500px] sm:p-5"
      />
    </section>
  );
}
