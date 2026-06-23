const steps = [
  {
    title: "Extract",
    description: "Pull text from the PDF\u2019s text layer.",
  },
  {
    title: "Clean",
    description: "Remove junk characters, ligatures, and messy spacing.",
  },
  {
    title: "Structure",
    description: "Turn readable sections into Markdown headings and paragraphs.",
  },
  {
    title: "Save",
    description: "Copy or download a Claude-friendly .md file.",
  },
];

export function HowItWorks() {
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            How it works
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">
            From PDF bulk to Markdown signal
          </h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-lg border border-white/10 bg-card/80 p-5"
          >
            <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-accent/12 font-mono text-sm font-bold text-accent">
              {String(index + 1).padStart(2, "0")}
            </div>
            <h3 className="font-display text-lg font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
