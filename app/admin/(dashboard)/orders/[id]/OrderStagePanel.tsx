"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Undo2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  moveStageAction,
  undoStageAction,
} from "@/app/admin/(dashboard)/orders/actions";
import type {
  AdminOrderEvent,
  OrderActionResult,
} from "@/lib/admin/order-types";
import {
  STAGES,
  STAGE_LABELS,
  type Stage,
} from "@/lib/tracking/types";

const initial: OrderActionResult = {};

export default function OrderStagePanel({
  orderId,
  currentStage,
  nextStage,
  events,
}: {
  orderId: string;
  currentStage: Stage;
  nextStage: Stage | null;
  events: AdminOrderEvent[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

  const [, moveAction, moving] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await moveStageAction(previous, formData);
      if (result.ok) {
        setToast({
          kind: "success",
          message: `Moved to ${result.stage ? STAGE_LABELS[result.stage] : "the next stage"}.`,
        });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Unable to move stage." });
      }
      return result;
    },
    initial
  );

  const [, undoAction, undoing] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await undoStageAction(previous, formData);
      if (result.ok) {
        setToast({
          kind: "success",
          message: `Undone. Current stage: ${
            result.stage ? STAGE_LABELS[result.stage] : "Pipe Cut"
          }.`,
        });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Unable to undo." });
      }
      return result;
    },
    initial
  );

  const canUndo = events.some((event) => event.stage !== "PIPE_CUT");

  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-[#111111]">Stage Progression</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          Forward one step at a time. Every move and undo is audit-logged.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {STAGES.map((stage, index) => {
            const currentIndex = STAGES.indexOf(currentStage);
            const done = index < currentIndex;
            const current = stage === currentStage;
            return (
              <div key={stage} className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                    current
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : done
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-neutral-100 text-neutral-400 border-neutral-200"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
                {index < STAGES.length - 1 && (
                  <span className="text-neutral-300 text-xs">→</span>
                )}
              </div>
            );
          })}
        </div>

        {nextStage ? (
          <form action={moveAction} className="space-y-3">
            <input type="hidden" name="order_id" value={orderId} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Next stage
                </span>
                <select
                  name="next_stage"
                  defaultValue={nextStage}
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold"
                >
                  {STAGES.map((stage) => (
                    <option
                      key={stage}
                      value={stage}
                      disabled={stage !== nextStage}
                    >
                      {STAGE_LABELS[stage]}
                      {stage === currentStage ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Stage note (optional)
                </span>
                <input
                  name="note"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs"
                />
              </label>

              {nextStage === "READY" && (
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Delivered on
                  </span>
                  <input
                    name="delivered_on"
                    type="date"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs"
                  />
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={moving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:bg-neutral-400"
              >
                {moving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Move to {STAGE_LABELS[nextStage]}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
            Order is ready. Warranty certificate is available to the customer.
          </div>
        )}

        <form
          action={undoAction}
          onSubmit={(event) => {
            if (!window.confirm("Undo the last stage? This is audit-logged.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="order_id" value={orderId} />
          <button
            type="submit"
            disabled={undoing || !canUndo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
          >
            {undoing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Undo2 className="w-3 h-3" />
            )}
            Undo last stage
          </button>
        </form>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Stage timeline
          </p>
          {events.length === 0 ? (
            <p className="text-[11px] text-neutral-500">No stage events yet.</p>
          ) : (
            <ol className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-neutral-50 border border-neutral-200"
                >
                  <div>
                    <p className="text-[11px] font-bold text-neutral-900">
                      {STAGE_LABELS[event.stage] ?? event.stage}
                    </p>
                    {event.note && (
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {event.note}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                    {new Date(event.at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {toast && (
        <AdminToast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
