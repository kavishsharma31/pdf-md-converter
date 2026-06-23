type ToastProps = {
  message: string;
  type: "success" | "error";
};

export function Toast({ message, type }: ToastProps) {
  const accentClass =
    type === "success"
      ? "border-success/35 text-green-100 shadow-[0_16px_50px_rgba(61,214,140,0.12)]"
      : "border-red-400/35 text-red-100 shadow-[0_16px_50px_rgba(248,113,113,0.12)]";
  const dotClass = type === "success" ? "bg-success" : "bg-red-400";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border bg-card/95 px-4 py-3 text-sm backdrop-blur md:left-auto md:right-6 md:mx-0 ${accentClass}`}
    >
      <span className={`size-2.5 rounded-full ${dotClass}`} />
      <span>{message}</span>
    </div>
  );
}
