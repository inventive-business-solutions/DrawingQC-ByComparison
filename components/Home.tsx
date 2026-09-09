/** Neutral landing shown before a client is picked — mirrors the original C# app's home screen. */
export function Home() {
  return (
    <div className="flex min-h-[62vh] flex-col items-center justify-center text-center">
      <span className="mb-7 inline-block rounded-[18px] bg-[#1e1b3a] px-8 py-6 shadow-[0_12px_34px_rgba(30,27,58,.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in /public */}
        <img src="/logo.png" alt="Inventive" className="h-[72px] w-auto" />
      </span>
      <h1 className="text-[34px] font-extrabold tracking-tight text-ink">Welcome to Support Automation</h1>
      <p className="mt-3 max-w-[540px] text-[15px] leading-relaxed text-muted">
        Select a client above — S2NERGY, QATAR, UAE or KBR — to open its tools.
      </p>
      <p className="mt-5 text-[13px] font-semibold text-accent">Your workspace is ready.</p>
    </div>
  );
}
