import type { ReactNode } from "react";

export const editorInput = "mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base font-normal text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-500 sm:text-sm";
export const editorPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50";
export const editorSecondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50";

export function EditorSection({ id, title, description, children }: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-24 rounded-2xl border border-neutral-200 bg-white shadow-xs">
      <div className="border-b border-neutral-100 px-4 py-3 sm:px-5">
        <h2 id={`${id}-title`} className="text-base font-semibold text-neutral-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
