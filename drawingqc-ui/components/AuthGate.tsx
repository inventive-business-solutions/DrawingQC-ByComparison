"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { login as apiLogin, me } from "@/lib/api";
import type { User } from "@/lib/types";
import { DocIcon, Spinner } from "./icons";
import { Button, ErrorMsg } from "./ui";

/**
 * Decides whether to show the login screen or the app.
 *
 * There is no backend and no server session: lib/api.ts keeps the signed-in user in web storage,
 * and `me()` reports "not signed in" by throwing UnauthorizedError, exactly as the C# backend's
 * 401 used to. Any non-empty username and password are accepted.
 *
 * The old "Backend not reachable" screen is gone with the backend — nothing can be unreachable
 * now, so there is no failure left that should block the UI. Any unexpected error is treated as
 * "not signed in" rather than as a dead end.
 */
export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setUser((await me()).user);
      } catch {
        // No stored session — fall through to the login screen.
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        <Spinner />
      </div>
    );
  }

  if (!user) return <LoginScreen onSignedIn={setUser} />;
  return <>{children(user)}</>;
}

function LoginScreen({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onSignedIn((await apiLogin(loginName, password, remember)).user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-[380px]">
        <div className="mb-7 flex items-center gap-3">
          <span className="grad grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_20px_rgba(99,60,220,.4)]">
            <DocIcon className="h-[21px] w-[21px]" />
          </span>
          <div>
            <div className="text-[19px] font-bold leading-tight text-ink">Support Automation</div>
            <div className="text-[13px] text-muted">Sign in to continue</div>
          </div>
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.07em] text-muted">
          Username or email
        </label>
        <input
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          autoFocus
          autoComplete="username"
          className="mb-4 w-full rounded-[10px] border border-line bg-panel px-3.5 py-[11px] text-[14.5px]
            text-ink outline-none transition placeholder:text-faint focus:border-accent"
        />

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.07em] text-muted">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-[10px] border border-line bg-panel px-3.5 py-[11px] text-[14.5px]
            text-ink outline-none transition placeholder:text-faint focus:border-accent"
        />

        <label className="mb-5 flex cursor-pointer items-center gap-2 text-[13.5px] text-muted">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in
        </label>

        <Button type="submit" disabled={busy || !loginName || !password} className="w-full justify-center">
          {busy ? (
            <>
              <Spinner />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        {error && <ErrorMsg>{error}</ErrorMsg>}
      </form>
    </div>
  );
}
