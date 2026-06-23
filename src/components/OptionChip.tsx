type OptionChipProps = {
  label: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export function OptionChip({
  label,
  active,
  disabled = false,
  onToggle,
}: OptionChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55 ${
        active
          ? "border-accent/65 bg-accent/18 text-white shadow-[0_0_22px_rgba(124,92,252,0.16)]"
          : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/45 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
