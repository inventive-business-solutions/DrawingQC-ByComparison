import type { ReactNode } from "react";
import { PageHead, Panel } from "./ui";

interface Props {
  title: string;
  client: string;
  sub: ReactNode;
  heading: string;
  body: string;
  icon: ReactNode;
}

/** Shared shell for tools that are wired up but have no logic yet (MTO, empty clients). */
export function PlaceholderView({ title, client, sub, heading, body, icon }: Props) {
  return (
    <>
      <PageHead title={title} client={client}>
        {sub}
      </PageHead>
      <Panel className="px-[30px] py-12 text-center">
        <span className="mb-[18px] inline-grid h-[60px] w-[60px] place-items-center rounded-2xl bg-[#ede9fe] text-accent">
          {icon}
        </span>
        <h2 className="mb-2 text-[19px] font-bold">{heading}</h2>
        <p className="mx-auto max-w-[460px] text-[14.5px] leading-[1.6] text-muted">{body}</p>
      </Panel>
    </>
  );
}
