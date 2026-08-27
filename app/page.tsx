"use client";

import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { ConsListView } from "@/components/ConsListView";
import { PlaceholderView } from "@/components/PlaceholderView";
import { QcView } from "@/components/QcView";
import { TagReportView } from "@/components/TagReportView";
import { SearchIcon, TableIcon } from "@/components/icons";
import { Sidebar } from "@/components/Sidebar";
import { Toolbar } from "@/components/Toolbar";
import { TOOLS, type ClientName, type User, type ViewId } from "@/lib/types";

export default function Page() {
  return <AuthGate>{(user) => <Workspace user={user} />}</AuthGate>;
}

function Workspace({ user }: { user: User }) {
  const [client, setClient] = useState<ClientName>("S2NERGY");
  const [view, setView] = useState<ViewId>("qc");

  // Picking a client keeps the current tool if that client offers it, else falls back
  // to its first tool — or the empty state when it has none.
  function selectClient(next: ClientName) {
    const tools = TOOLS[next];
    setClient(next);
    setView(tools.length === 0 ? "empty" : tools.some((t) => t.id === view) ? view : tools[0].id);
  }

  // QC stays mounted and is toggled with `hidden` so its results survive a tab switch,
  // exactly as the original single-page UI behaved. The other views hold no unsaved input
  // — ConsList's state lives on the server — so they are mounted only while active.
  const show = (id: ViewId) => (view === id ? "" : "hidden");

  return (
    <>
      <Sidebar user={user} />
      <main className="px-5 pb-12 pt-6 md:ml-[252px] md:px-10 md:pb-[60px] md:pt-[30px]">
        <Toolbar client={client} view={view} onClient={selectClient} onView={setView} />

        <div className={show("qc")}>
          <QcView client={client} />
        </div>

        {view === "conslist" && <ConsListView client={client} />}
        {view === "tagreport" && <TagReportView client={client} />}

        <div className={show("mto")}>
          <PlaceholderView
            title="MTO Check"
            client={client}
            sub="Material Take-Off verification."
            heading="MTO Check is set up"
            body="This tool is wired into the S2NERGY workspace and ready for its logic. Tell me what an MTO Check should do — the inputs it takes and the output you expect — and I'll build it out."
            icon={<TableIcon className="h-[30px] w-[30px]" />}
          />
        </div>

        <div className={show("empty")}>
          <PlaceholderView
            title="No tools yet"
            client={client}
            sub="Tools for this client haven't been added."
            heading="Nothing here — yet"
            body="This client is set up but has no tools configured. Tell me which tools it should have and I'll add them, just like S2NERGY."
            icon={<SearchIcon className="h-[30px] w-[30px]" />}
          />
        </div>
      </main>
    </>
  );
}
