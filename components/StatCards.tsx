import { CheckIcon, CopyIcon, CrossIcon, PageIcon } from "./icons";
import type { QcSummary } from "@/lib/types";

const CARDS = [
  { key: "total", label: "Total PDFs", chip: "bg-[#e6ebfe] text-accent", num: "text-ink", Icon: PageIcon },
  { key: "matched", label: "Matched", chip: "bg-match-bg text-match-fg", num: "text-match-fg", Icon: CheckIcon },
  { key: "unmatched", label: "Unmatched", chip: "bg-unmatch-bg text-unmatch-fg", num: "text-unmatch-fg", Icon: CrossIcon },
  { key: "duplicate", label: "Duplicate", chip: "bg-dup-bg text-dup-fg", num: "text-dup-fg", Icon: CopyIcon },
] as const;

export function StatCards({ summary }: { summary: QcSummary }) {
  return (
    <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map(({ key, label, chip, num, Icon }) => (
        <div
          key={key}
          className="rounded-2xl border border-line bg-panel px-5 py-[18px] shadow-[0_4px_16px_rgba(16,24,40,.05)]
            transition hover:-translate-y-[3px] hover:shadow-[0_12px_26px_rgba(16,24,40,.10)]"
        >
          <div className={`mb-3 grid h-[34px] w-[34px] place-items-center rounded-[10px] ${chip}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className={`text-[32px] font-extrabold leading-none tracking-[-.02em] ${num}`}>{summary[key]}</div>
          <div className="mt-2 text-[13px] text-muted">{label}</div>
        </div>
      ))}
    </section>
  );
}
