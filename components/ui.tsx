import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Card surface used by every section of the page. */
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={`rounded-2xl border border-line bg-panel p-6 shadow-[0_6px_22px_rgba(16,24,40,.06)] ${className}`}
    >
      {children}
    </section>
  );
}

type Variant = "primary" | "secondary" | "acad";

const VARIANTS: Record<Variant, string> = {
  primary: "grad shadow-[0_8px_20px_rgba(99,60,220,.32)] enabled:hover:shadow-[0_12px_26px_rgba(99,60,220,.42)]",
  secondary: "bg-ink shadow-[0_6px_16px_rgba(19,26,43,.25)] enabled:hover:shadow-[0_10px_22px_rgba(19,26,43,.32)]",
  acad:
    "bg-[linear-gradient(135deg,#e11d48_0%,#b91c1c_100%)] shadow-[0_8px_20px_rgba(190,24,40,.30)] " +
    "enabled:hover:shadow-[0_12px_26px_rgba(190,24,40,.42)]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center rounded-[10px] px-[26px] py-3 text-[14.5px] font-semibold text-white
        transition enabled:hover:-translate-y-0.5 enabled:hover:brightness-105
        disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#c4cbd8] disabled:text-[#eef1f5] disabled:shadow-none
        ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Red error strip. */
export function ErrorMsg({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[9px] border border-[#e6a3a8] bg-unmatch-bg px-4 py-3 text-sm text-unmatch-fg">
      {children}
    </div>
  );
}

/** Green success strip. */
export function OkMsg({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[9px] border border-[#9fd3ac] bg-match-bg px-4 py-3 text-sm text-match-fg">
      {children}
    </div>
  );
}

/** Page title block with the client pill. */
export function PageHead({ title, client, children }: { title: string; client: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="grad-text w-fit text-[30px] font-extrabold tracking-[-.02em]">{title}</h1>
      <p className="mt-[7px] text-[14.5px] text-muted">
        <span className="mr-2 inline-block rounded-full bg-[#ede9fe] px-[9px] py-[3px] align-[1px] text-[11px] font-bold tracking-[.05em] text-[#6d28d9]">
          {client}
        </span>
        {children}
      </p>
    </div>
  );
}
