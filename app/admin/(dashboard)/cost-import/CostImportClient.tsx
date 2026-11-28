"use client";

import { useActionState } from "react";
import { Download, Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  applyCostImportAction,
  stageCostImportAction,
  type CostImportActionState,
} from "./actions";

interface BatchHistoryItem {
  id: string;
  filename: string;
  row_count: number;
  status: string;
  created_by: string;
  created_at: string;
  applied_at: string | null;
}

const initialState: CostImportActionState = {};

export default function CostImportClient({
  batches,
}: {
  batches: BatchHistoryItem[];
}) {
  const [stageState, stageAction, staging] = useActionState(
    stageCostImportAction,
    initialState
  );
  const [applyState, applyAction, applying] = useActionState(
    applyCostImportAction,
    initialState
  );

  const preview = stageState.preview;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">
              Step 1 — Download Simplified CSV Template
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Export final manufacturing costs from your Excel costing sheet as CSV
              (File → Save As → CSV UTF-8 / Comma delimited). Never upload the full cutting-list workbook.
            </p>
          </div>
          <a
            href="/api/admin/cost-import/template"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-800 hover:bg-neutral-50 shrink-0"
          >
            <Download className="w-4 h-4" />
            Download CSV Template
          </a>
        </div>

        <form action={stageAction} className="pt-3 border-t border-neutral-100 space-y-3">
          <label className="block text-xs font-bold text-neutral-700">
            Step 2 — Upload Cost CSV for Preview & Validation
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-neutral-300 file:text-xs file:font-bold file:bg-neutral-50 file:text-neutral-800 hover:file:bg-neutral-100"
            />
            <button
              type="submit"
              disabled={staging}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 shrink-0"
            >
              {staging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Preview & Validate
            </button>
          </div>
        </form>

        {stageState.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {stageState.error}
          </div>
        )}
        {applyState.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {applyState.error}
          </div>
        )}
        {applyState.ok && applyState.appliedCount != null && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Applied {applyState.appliedCount} manufacturing cost updates atomically. Price history recorded and caches invalidated. Draft variants remain unpublished until reviewed.
            </span>
          </div>
        )}
      </div>

      {preview && !applyState.ok && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#111111]">
                Step 3 — Import Preview: {preview.filename}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {preview.valid_rows} valid · {preview.invalid_rows} invalid · {preview.total_rows} total rows
              </p>
            </div>
            {preview.valid_rows > 0 && (
              <form action={applyAction} className="flex items-center gap-2">
                <input type="hidden" name="batch_id" value={preview.batch_id} />
                <input
                  type="date"
                  name="effective_from"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs"
                />
                <button
                  type="submit"
                  disabled={applying}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm & Apply {preview.valid_rows} Updates
                </button>
              </form>
            )}
          </div>

          {preview.duplicateBatchWarning && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Warning: An identical file checksum was already applied previously. Confirm only if you intend to re-apply these costs.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px]">
                  <th className="py-2 pr-3">Row</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Variant</th>
                  <th className="py-2 pr-3">Old Cost</th>
                  <th className="py-2 pr-3">New Cost</th>
                  <th className="py-2 pr-3">Delta</th>
                  <th className="py-2 pr-3">Selling Impact</th>
                  <th className="py-2">Status / Error</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  const impact = row.variant_code
                    ? preview.priceImpacts[row.variant_code]
                    : undefined;
                  return (
                    <tr key={row.row_number} className="border-b border-neutral-100">
                      <td className="py-2 pr-3 font-mono">{row.row_number}</td>
                      <td className="py-2 pr-3 font-bold">{row.sku}</td>
                      <td className="py-2 pr-3 font-mono text-[11px]">
                        {row.variant_code || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {row.existing_cost != null ? `₹${row.existing_cost}` : "—"}
                      </td>
                      <td className="py-2 pr-3 font-semibold">
                        {row.new_cost != null ? `₹${row.new_cost}` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {row.delta != null
                          ? `${row.delta >= 0 ? "+" : ""}₹${row.delta}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {impact
                          ? `${impact.oldSellingPrice != null ? `₹${impact.oldSellingPrice}` : "Quote"} → ${impact.newSellingPrice != null ? `₹${impact.newSellingPrice}` : "Quote"}`
                          : "—"}
                      </td>
                      <td className="py-2">
                        {row.validation_error ? (
                          <span className="text-red-600 font-medium">
                            {row.validation_error}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Valid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#111111]">Recent Import Batches</h2>
        {batches.length === 0 ? (
          <p className="text-xs text-neutral-500">No cost import batches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px]">
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Rows</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">By</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 font-medium">{b.filename}</td>
                    <td className="py-2 pr-3">{b.row_count}</td>
                    <td className="py-2 pr-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-bold">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-neutral-600">{b.created_by}</td>
                    <td className="py-2 text-neutral-500">
                      {new Date(b.applied_at ?? b.created_at).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
