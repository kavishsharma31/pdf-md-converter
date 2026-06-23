type ProgressBarProps = {
  label: string;
  progress: number;
};

export function ProgressBar({ label, progress }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="rounded-lg border border-white/10 bg-background/55 p-4">
      <div className="mb-3 flex items-center justify-between gap-4 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-white">{clampedProgress}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-white/8"
      >
        <div
          className="h-full rounded-full bg-accent shadow-[0_0_22px_rgba(124,92,252,0.45)] transition-[width] duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
