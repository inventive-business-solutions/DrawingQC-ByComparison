/** Line icons lifted from the original markup. All inherit currentColor. */

type Props = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DocIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4z" />
      <path d="M14 4v6h6" />
      <path d="M8 14h8M8 17h5" />
    </svg>
  );
}

export function GridIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
    </svg>
  );
}

export function PageIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 4h10l6 6v10H4z" />
      <path d="M14 4v6h6" />
    </svg>
  );
}

export function CheckIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.4}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function CrossIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.4}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CopyIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function UploadIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function TableIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.7}>
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

export function SearchIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.7}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** Inline busy indicator for buttons mid-request. */
export function Spinner() {
  return (
    <span
      className="mr-2 inline-block h-[15px] w-[15px] rounded-full border-2 border-white/50 border-t-white align-[-2px]"
      style={{ animation: "dqc-spin .7s linear infinite" }}
    />
  );
}
