"use client";

import { logout } from "@/lib/api";
import type { User } from "@/lib/types";
import { DocIcon, GridIcon } from "./icons";

const LEGEND = [
  { color: "bg-match-fg", label: "Matched", text: "file name found on the sheet" },
  { color: "bg-unmatch-fg", label: "Unmatched", text: "no drawing number match" },
  { color: "bg-dup-fg", label: "Duplicate", text: "number seen on 2+ sheets" },
];

/** Initials for the avatar bubble, from the display name or the username as a fallback. */
function initials(user: User): string {
  const source = (user.name || user.username).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar({ user }: { user: User }) {
  async function signOut() {
    try {
      await logout();
    } finally {
      // Reload rather than clearing state by hand: it re-runs the /api/auth/me check, so the
      // login screen is shown because the server says so, not because we assumed it.
      window.location.reload();
    }
  }

  return (
    <aside
      className="z-10 flex flex-row flex-wrap items-center gap-x-[18px] gap-y-2 bg-[linear-gradient(170deg,#1b1e3a_0%,#241a44_55%,#2b1840_100%)]
        px-5 py-3.5 text-[#cdd4e2]
        md:fixed md:inset-y-0 md:left-0 md:w-[252px] md:flex-col md:flex-nowrap md:items-stretch md:px-[18px] md:py-[22px]"
    >
      <div className="flex items-center gap-[11px] text-[17px] font-bold text-white md:px-1.5 md:pt-1 md:pb-6">
        <span className="grad grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white shadow-[0_6px_16px_rgba(99,60,220,.45)]">
          <DocIcon className="h-[17px] w-[17px]" />
        </span>
        Support Automation
      </div>

      <nav className="flex flex-row gap-[3px] md:flex-col">
        <span className="grad flex cursor-pointer items-center gap-[11px] rounded-lg px-3 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(99,60,220,.4)]">
          <GridIcon className="h-[17px] w-[17px] shrink-0" />
          Workspace
        </span>
      </nav>

      <div className="hidden px-1.5 md:mt-[26px] md:block">
        <div className="mb-3 text-[11px] uppercase tracking-[.11em] text-[#7c869c]">Status key</div>
        {LEGEND.map((l) => (
          <div key={l.label} className="mb-[11px] flex items-center gap-2.5 text-[12.5px] leading-[1.35]">
            <span className={`mt-px h-[11px] w-[11px] shrink-0 rounded-[3px] ${l.color}`} />
            <span>
              <b className="font-semibold text-white">{l.label}</b> — {l.text}
            </span>
          </div>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2.5 md:ml-0 md:mt-auto md:w-full">
        <span className="grad grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-[14px] font-bold text-white">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data: URL from users.json, not a routed asset
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(user)
          )}
        </span>
        <span className="hidden min-w-0 flex-col leading-[1.25] md:flex">
          <span className="truncate text-[13.5px] font-semibold text-white">{user.name || user.username}</span>
          <span className="text-[11.5px] text-[#7c869c]">{user.role}</span>
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          title="Sign out"
          className="ml-auto rounded-lg px-2.5 py-1.5 text-[12px] text-[#7c869c] transition hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </div>

      <div className="hidden border-t border-[#202b46] px-1.5 pt-3.5 pb-0.5 text-[11.5px] leading-[1.5] text-[#7c869c] md:mt-3.5 md:block">
        PDF, Excel and Word work runs
        <br />
        server-side in the C# app.
      </div>
    </aside>
  );
}
