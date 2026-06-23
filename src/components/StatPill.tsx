type StatPillProps = {
  label: string;
  value: string;
  tone?: "default" | "success";
};

export function StatPill({ label, value, tone = "default" }: StatPillProps) {
  const valueClass = tone === "success" ? "text-success" : "text-white";

  return (
    <div className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className={`mt-3 font-mono text-2xl font-semibold ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
