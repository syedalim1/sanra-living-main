"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Plus,
  Ruler,
  Trash2,
  X,
} from "lucide-react";
import type { ConfigOption } from "@/lib/configuratorOptions";
import {
  getGroupOptions,
  getTypeGroupRows,
  type OptionGroupRow,
  type ProductType,
} from "@/lib/productTypeConfig";
import {
  ROOM_TABLE_SIZES,
  calculateRoomLayout,
  type RoomTableSize,
} from "@/lib/b2b/roomCalculator";
import {
  BULK_ADDON_CODES,
  describeBulkRow,
  type BulkPriceResponse,
  type BulkRowInput,
} from "@/lib/b2b/bulk";
import type { B2BProduct } from "@/lib/b2b/types";
import { generateQuoteRef } from "@/lib/quoteRef";

interface SheetRow extends BulkRowInput {
  id: string;
}

type BulkAddonCode = (typeof BULK_ADDON_CODES)[number];

interface B2BOrderToolsProps {
  products: B2BProduct[];
  groups: OptionGroupRow[];
  options: ConfigOption[];
  whatsappNumber: string;
}

const ADDON_GROUP = "ADDON";
const QTY_GROUP = "QTY_TIER";

function makeRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function visibleGroupOptions(
  productType: ProductType,
  optionGroup: string,
  options: ConfigOption[],
  allowedTopCategories?: string[]
): ConfigOption[] {
  let groupOptions = getGroupOptions(options, optionGroup);

  if (productType === "CHAIR" && optionGroup === "FRAME_COLOR") {
    groupOptions = groupOptions.filter((option) =>
      ["MATTE_BLACK", "WHITE", "GREY", "GOLD"].includes(option.option_code)
    );
  }

  if (
    productType === "TABLE" &&
    optionGroup === "TOP_TAB" &&
    allowedTopCategories
  ) {
    groupOptions = groupOptions.filter((option) =>
      allowedTopCategories.includes(option.option_code)
    );
  }

  return groupOptions;
}

function defaultSelections(
  product: B2BProduct,
  groups: OptionGroupRow[],
  options: ConfigOption[]
): Record<string, string> {
  const productType = product.product_type;
  const typeGroups = getTypeGroupRows(productType, groups).filter(
    (group) =>
      group.option_group !== QTY_GROUP && group.option_group !== ADDON_GROUP
  );
  const selections: Record<string, string> = {};

  for (const group of typeGroups) {
    const groupOptions = visibleGroupOptions(
      productType,
      group.option_group,
      options,
      product.allowed_top_categories
    );
    const code =
      groupOptions.find((option) => option.option_code === group.default_code)
        ?.option_code ?? groupOptions[0]?.option_code;

    if (code) selections[group.option_group] = code;
  }

  if (productType === "TABLE" && selections.TOP_TAB === "FRAME_ONLY") {
    delete selections.TOP_MATERIAL;
  }

  if (productType === "CHAIR") {
    if (selections.SEAT !== "SEAT_REXINE") {
      delete selections.SEAT_COLOR;
    } else if (!selections.SEAT_COLOR) {
      selections.SEAT_COLOR = "REXINE_BLACK";
    }

    if (selections.METAL_TYPE !== "MS_COATED") {
      delete selections.FRAME_COLOR;
    } else if (!selections.FRAME_COLOR) {
      selections.FRAME_COLOR = "MATTE_BLACK";
    }
  }

  return selections;
}

function visibleGroups(
  productType: ProductType,
  groups: OptionGroupRow[],
  selections: Record<string, string>
): OptionGroupRow[] {
  return getTypeGroupRows(productType, groups).filter((group) => {
    if (group.option_group === QTY_GROUP || group.option_group === ADDON_GROUP) {
      return false;
    }

    if (productType === "TABLE" && group.option_group === "TOP_MATERIAL") {
      return selections.TOP_TAB !== "FRAME_ONLY";
    }

    if (productType === "CHAIR") {
      if (group.option_group === "SEAT_COLOR") {
        return selections.SEAT === "SEAT_REXINE";
      }
      if (group.option_group === "FRAME_COLOR") {
        return selections.METAL_TYPE === "MS_COATED";
      }
    }

    return true;
  });
}

function makeRow(
  product: B2BProduct | undefined,
  groups: OptionGroupRow[],
  options: ConfigOption[]
): SheetRow {
  return {
    id: makeRowId(),
    sku: product?.sku ?? "",
    quantity: 1,
    selections: product
                ? defaultSelections(product, groups, options)
      : {},
    addons: [],
  };
}

export default function B2BOrderTools({
  products,
  groups,
  options,
  whatsappNumber,
}: B2BOrderToolsProps) {
  const [roomLength, setRoomLength] = useState("20");
  const [roomWidth, setRoomWidth] = useState("15");
  const [roomTableSize, setRoomTableSize] = useState<RoomTableSize>("4x2");
  const [seatsPerTable, setSeatsPerTable] = useState("4");
  const [clearance, setClearance] = useState("2");
  const [aisle, setAisle] = useState("25");

  const [rows, setRows] = useState<SheetRow[]>(() => [
    makeRow(products[0], groups, options),
  ]);
  const [prices, setPrices] = useState<BulkPriceResponse | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [callout, setCallout] = useState<string | null>(null);
  const [quoteRef, setQuoteRef] = useState("");

  const [pdfOpen, setPdfOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.sku, product])),
    [products]
  );
  const addonOptions = useMemo(
    () => getGroupOptions(options, ADDON_GROUP),
    [options]
  );
  const optionLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) {
      map.set(`${option.option_group}:${option.option_code}`, option.label_en);
    }
    return map;
  }, [options]);
  const addonLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of addonOptions) {
      map.set(option.option_code, option.label_en);
    }
    return map;
  }, [addonOptions]);

  const layout = useMemo(() => {
    return calculateRoomLayout({
      roomLengthFt: Math.max(1, Math.min(200, Number(roomLength) || 1)),
      roomWidthFt: Math.max(1, Math.min(200, Number(roomWidth) || 1)),
      tableSize: roomTableSize,
      seatsPerTable: Math.max(1, Math.min(8, Number(seatsPerTable) || 1)),
      clearanceFt: Math.max(1.5, Math.min(3, Number(clearance) || 2)),
      aislePct: Math.max(15, Math.min(40, Number(aisle) || 25)),
    });
  }, [roomLength, roomWidth, roomTableSize, seatsPerTable, clearance, aisle]);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setPriceLoading(true);
      setPriceError(null);

      try {
        const res = await fetch("/api/bulk-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: rows.map((row) => ({
              sku: row.sku,
              quantity: row.quantity,
              selections: row.selections,
              addons: row.addons,
            })),
          }),
        });

        const body = (await res.json().catch(() => null)) as
          | (BulkPriceResponse & { error?: string })
          | null;

        if (!res.ok || !body) {
          if (!cancelled) {
            setPriceError(body?.error || "Unable to price the sheet right now.");
          }
          return;
        }

        if (!cancelled) setPrices(body);
      } catch {
        if (!cancelled) setPriceError("Unable to price the sheet right now.");
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rows]);

  const updateProduct = (rowId: string, sku: string) => {
    const product = productMap.get(sku);
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              sku,
              selections: product
      ? defaultSelections(product, groups, options)
                : {},
              addons: [],
            }
          : row
      )
    );
  };

  const updateSelection = (rowId: string, group: string, code: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const product = productMap.get(row.sku);
        if (!product) return row;

        const next = { ...row.selections, [group]: code };

        if (product.product_type === "TABLE" && group === "TOP_TAB") {
          if (code === "FRAME_ONLY") {
            delete next.TOP_MATERIAL;
          } else if (!next.TOP_MATERIAL) {
            const materialOptions = visibleGroupOptions(
              product.product_type,
              "TOP_MATERIAL",
              options
            );
            const defaultMaterial =
              getTypeGroupRows(product.product_type, groups).find(
                (entry) => entry.option_group === "TOP_MATERIAL"
              )?.default_code ?? materialOptions[0]?.option_code;
            if (defaultMaterial) next.TOP_MATERIAL = defaultMaterial;
          }
        }

        if (product.product_type === "CHAIR") {
          if (group === "METAL_TYPE") {
            if (code === "MS_COATED") {
              if (!next.FRAME_COLOR) next.FRAME_COLOR = "MATTE_BLACK";
            } else {
              delete next.FRAME_COLOR;
            }
          }

          if (group === "SEAT") {
            if (code === "SEAT_REXINE") {
              if (!next.SEAT_COLOR) next.SEAT_COLOR = "REXINE_BLACK";
            } else {
              delete next.SEAT_COLOR;
            }
          }
        }

        return { ...row, selections: next };
      })
    );
  };

  const updateQuantity = (rowId: string, quantity: number) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, quantity: Math.max(1, Math.min(500, quantity)) }
          : row
      )
    );
  };

  const toggleAddon = (rowId: string, code: BulkAddonCode) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const has = row.addons.includes(code);
        return {
          ...row,
          addons: has
            ? row.addons.filter((addon) => addon !== code)
            : [...row.addons, code],
        };
      })
    );
  };

  const addRow = () => {
    if (rows.length >= 25) {
      setCallout("A maximum of 25 rows can be priced at a time.");
      return;
    }
    setRows((current) => [
      ...current,
      makeRow(products[0], groups, options),
    ]);
  };

  const duplicateRow = (row: SheetRow) => {
    if (rows.length >= 25) {
      setCallout("A maximum of 25 rows can be priced at a time.");
      return;
    }
    setRows((current) => [
      ...current,
      {
        ...row,
        id: makeRowId(),
        selections: { ...row.selections },
        addons: [...row.addons],
      },
    ]);
  };

  const deleteRow = (rowId: string) => {
    setRows((current) =>
      current.length === 1
        ? current
        : current.filter((row) => row.id !== rowId)
    );
  };

  const handlePrefill = () => {
    const firstTable = products.find(
      (product) => product.product_type === "TABLE"
    );

    if (!firstTable) {
      setCallout("No table product is active for this estimate.");
      return;
    }

    const selections = defaultSelections(firstTable, groups, options);
    selections.SIZE = roomTableSize;
    const quantity = Math.max(1, Math.min(500, layout.tableCount));

    const newRow: SheetRow = {
      id: makeRowId(),
      sku: firstTable.sku,
      quantity,
      selections,
      addons: [],
    };

    setRows((current) =>
      current.length === 1
        ? [newRow]
        : current.length >= 25
        ? current
        : [...current, newRow]
    );

    document.getElementById("bulk")?.scrollIntoView({ behavior: "smooth" });
  };

  const ensureQuoteRef = (): string => {
    if (quoteRef) return quoteRef;
    const next = generateQuoteRef();
    setQuoteRef(next);
    return next;
  };

  const buildMessage = (reference: string): string => {
    const priceRows = prices?.rows ?? [];
    const limit = 10;
    const buildLines = (count: number) =>
      rows.slice(0, count).map((row, index) => {
        const product = productMap.get(row.sku);
        const price = priceRows[index];
        const config = describeBulkRow(row, optionLabels, addonLabels);
        const amount = price?.requires_quote
          ? "Quote on WhatsApp"
          : price?.total_price != null
          ? `₹${price.total_price.toLocaleString("en-IN")}`
          : "—";
        return `${index + 1}. ${product?.name ?? row.sku} — ${config} — Qty ${
          row.quantity
        } — ${amount}`;
      });

    const build = (count: number) => {
      const lines = buildLines(count);
      return [
        `Hi SANRA LIVING, here is my bulk order list (Ref: ${reference}):`,
        ...lines,
        rows.length > count ? "Full list in PDF." : "",
        `Estimated total: ₹${(prices?.grand_total ?? 0).toLocaleString("en-IN")}`,
        priceRows.some((price) => price.requires_quote)
          ? "Some custom-size rows are quoted separately."
          : "",
        "Please confirm availability and delivery.",
      ]
        .filter(Boolean)
        .join("\n");
    };

    let message = build(rows.length);
    if (encodeURIComponent(message).length > 1800) {
      message = build(limit);
    }
    return message;
  };

  const sendWhatsApp = () => {
    const reference = ensureQuoteRef();
    const base = whatsappNumber
      ? `https://wa.me/${whatsappNumber}`
      : "https://wa.me/";
    window.open(
      `${base}?text=${encodeURIComponent(buildMessage(reference))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openPdfDialog = () => {
    if (rows.length === 0) return;
    ensureQuoteRef();
    setPdfOpen(true);
    setPdfError(null);
  };

  const downloadPdf = async (event: React.FormEvent) => {
    event.preventDefault();
    setPdfError(null);

    if (!leadName.trim() || leadPhone.replace(/\D/g, "").length !== 10) {
      setPdfError("Enter your name and a valid 10-digit phone number.");
      return;
    }

    setPdfLoading(true);
    const reference = ensureQuoteRef();

    try {
      const res = await fetch("/api/bulk-quote-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            sku: row.sku,
            quantity: row.quantity,
            selections: row.selections,
            addons: row.addons,
          })),
          lead: {
            name: leadName.trim(),
            phone: leadPhone.replace(/\D/g, ""),
          },
          reference,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setPdfError(body?.error || "Unable to generate the bulk quote.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || `SANRA-BulkQuote-${reference}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPdfOpen(false);
    } catch {
      setPdfError("Unable to generate the bulk quote.");
    } finally {
      setPdfLoading(false);
    }
  };

  const roomWidthPx = 340;
  const roomHeightPx = 220;
  const scale = Math.min(
    roomWidthPx / Math.max(1, Number(roomLength) || 1),
    roomHeightPx / Math.max(1, Number(roomWidth) || 1)
  );
  const drawRoomW = Math.max(1, Number(roomLength) || 1) * scale;
  const drawRoomH = Math.max(1, Number(roomWidth) || 1) * scale;
  const gridCols = Math.max(1, layout.columns);
  const gridRows = Math.max(1, layout.rows);
  const drawCount = Math.min(layout.tableCount, gridCols * gridRows, 60);
  const cellW = drawRoomW / gridCols;
  const cellH = drawRoomH / gridRows;

  return (
    <>
      <section id="calculator" className="scroll-mt-24 bg-white rounded-xl border border-neutral-200 p-5 sm:p-7 space-y-5">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-neutral-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-black text-[#111111] tracking-tight">
              Room Size Calculator
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Estimate how many tables fit before requesting a bulk quote.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Room length (ft)
            </span>
            <input
              type="number"
              min={1}
              max={200}
              step={0.1}
              value={roomLength}
              onChange={(event) => setRoomLength(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Room width (ft)
            </span>
            <input
              type="number"
              min={1}
              max={200}
              step={0.1}
              value={roomWidth}
              onChange={(event) => setRoomWidth(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Table size
            </span>
            <select
              value={roomTableSize}
              onChange={(event) =>
                setRoomTableSize(event.target.value as RoomTableSize)
              }
              className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            >
              {Object.keys(ROOM_TABLE_SIZES).map((size) => (
                <option key={size} value={size}>
                  {size.replace("x", " x ")} ft
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Seats per table
            </span>
            <input
              type="number"
              min={1}
              max={8}
              step={1}
              value={seatsPerTable}
              onChange={(event) => setSeatsPerTable(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Clearance per side (ft)
            </span>
            <input
              type="number"
              min={1.5}
              max={3}
              step={0.1}
              value={clearance}
              onChange={(event) => setClearance(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Walking aisle share
            </span>
            <select
              value={aisle}
              onChange={(event) => setAisle(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            >
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
              <option value="30">30%</option>
              <option value="35">35%</option>
              <option value="40">40%</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="p-4 rounded-lg bg-[#F5F5F7] border border-neutral-200 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Estimated layout
            </p>
            <p className="text-2xl font-black text-[#111111]">
              {layout.tableCount} tables
            </p>
            <p className="text-xs text-neutral-600">
              {layout.totalSeats} seats at {Math.max(1, Math.min(8, Number(seatsPerTable) || 1))}{" "}
              seats per table
            </p>
            <p className="text-[10px] text-neutral-500">
              Estimated layout. Final layout may vary with room shape, pillars and
              doors.
            </p>
            <button
              type="button"
              onClick={handlePrefill}
              disabled={layout.tableCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
            >
              <Ruler className="w-3.5 h-3.5" />
              Get a quote for these tables
            </button>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <svg
              viewBox="0 0 410 270"
              className="w-full h-auto"
              role="img"
              aria-label="Estimated top-down table layout"
            >
              <rect
                x={35}
                y={20}
                width={drawRoomW}
                height={drawRoomH}
                fill="#F5F5F7"
                stroke="#111111"
                strokeWidth="1.5"
              />
              {Array.from({ length: drawCount }).map((_, index) => {
                const col = index % gridCols;
                const row = Math.floor(index / gridCols);
                const x = 35 + col * cellW;
                const y = 20 + row * cellH;
                return (
                  <rect
                    key={index}
                    x={x + cellW * 0.18}
                    y={y + cellH * 0.18}
                    width={Math.max(3, cellW * 0.64)}
                    height={Math.max(3, cellH * 0.64)}
                    fill="#111111"
                    opacity="0.82"
                  />
                );
              })}
              <text x="35" y="260" fontSize="9" fill="#6B7280">
                Room {Number(roomLength) || 1} × {Number(roomWidth) || 1} ft
              </text>
            </svg>
          </div>
        </div>
      </section>

      <section id="bulk" className="scroll-mt-24 bg-white rounded-xl border border-neutral-200 p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111111] tracking-tight">
              Fast Bulk Order Sheet
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Add up to 25 rows. Prices refresh from the factory engine.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= 25}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-100 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> Add row
            </button>
          </div>
        </div>

        {callout && (
          <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5">
            {callout}
          </p>
        )}

        <div className="space-y-4">
          {rows.map((row, index) => {
            const product = productMap.get(row.sku);
            const productType = product?.product_type;
            const rowGroups = productType
              ? visibleGroups(productType, groups, row.selections)
              : [];
            const rowPrice = prices?.rows[index];
            const priceLabel = priceLoading
              ? "Updating..."
              : rowPrice?.requires_quote
              ? "Quote on WhatsApp"
              : rowPrice?.total_price != null
              ? `₹${rowPrice.total_price.toLocaleString("en-IN")}`
              : "—";

            return (
              <div
                key={row.id}
                className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/40 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Row {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => duplicateRow(row)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100"
                    >
                      <Copy className="w-3 h-3" /> Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      disabled={rows.length === 1}
                      aria-label="Delete row"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <label className="sm:col-span-5 space-y-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                      Product
                    </span>
                    <select
                      value={row.sku}
                      onChange={(event) =>
                        updateProduct(row.id, event.target.value)
                      }
                      className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
                    >
                      {products.map((option) => (
                        <option key={option.sku} value={option.sku}>
                          {option.name} ({option.sku})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sm:col-span-2 space-y-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={row.quantity}
                      onChange={(event) =>
                        updateQuantity(row.id, Number(event.target.value) || 1)
                      }
                      className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
                    />
                  </label>

                  <div className="sm:col-span-5 flex items-end">
                    <div className="w-full p-2.5 rounded-md bg-white border border-neutral-200 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                        Row total
                      </span>
                      <span className="text-xs font-black text-neutral-900">
                        {priceLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {productType && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {rowGroups.map((group) => {
                      const groupOptions = visibleGroupOptions(
                        productType,
                        group.option_group,
                        options,
                        product?.allowed_top_categories ?? []
                      );
                      if (groupOptions.length === 0) return null;
                      return (
                        <label key={group.option_group} className="space-y-1">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                            {group.group_title}
                          </span>
                          <select
                            value={row.selections[group.option_group] ?? ""}
                            onChange={(event) =>
                              updateSelection(
                                row.id,
                                group.option_group,
                                event.target.value
                              )
                            }
                            className="w-full px-2 py-1.5 rounded-md border border-neutral-300 bg-white text-[11px]"
                          >
                            {groupOptions.map((option) => (
                              <option
                                key={option.option_code}
                                value={option.option_code}
                              >
                                {option.label_en}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}

                    {productType === "TABLE" && addonOptions.length > 0 && (
                      <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                          Add-ons (optional)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {addonOptions.map((addon) => (
                            <label
                              key={addon.option_code}
                              className="inline-flex items-center gap-1.5 text-[10px] text-neutral-700"
                            >
                              <input
                                type="checkbox"
                                checked={row.addons.includes(
                                  addon.option_code as BulkAddonCode
                                )}
                                onChange={() =>
                                  toggleAddon(
                                    row.id,
                                    addon.option_code as BulkAddonCode
                                  )
                                }
                                className="w-3.5 h-3.5 accent-black"
                              />
                              {addon.label_en}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {priceError && (
          <p className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md p-2.5">
            {priceError}
          </p>
        )}

        <div className="p-4 rounded-lg bg-[#F5F5F7] border border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Grand total
            </p>
            <p className="text-2xl font-black text-[#111111]">
              ₹{(prices?.grand_total ?? 0).toLocaleString("en-IN")}
            </p>
            {prices?.rows.some((price) => price.requires_quote) && (
              <p className="text-[10px] text-neutral-500 mt-1">
                Custom-size rows are quoted on WhatsApp and excluded from this
                total.
              </p>
            )}
            <p className="text-[10px] text-neutral-500 mt-1">
              Quote ref: <span className="font-mono font-bold">{quoteRef || "Generated on download"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openPdfDialog}
              disabled={rows.length === 0 || priceLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
            >
              <Download className="w-3.5 h-3.5" />
              Download Bulk Quote (PDF)
            </button>
            <button
              type="button"
              onClick={sendWhatsApp}
              disabled={priceLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:bg-neutral-400"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send this list on WhatsApp
            </button>
          </div>
        </div>

        <p className="text-[10px] text-neutral-500">
          We use your details only to respond to your request.
        </p>
      </section>

      {pdfOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Download bulk quote
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Quote ref: <span className="font-mono">{quoteRef || "Generated on download"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPdfOpen(false)}
                aria-label="Close bulk quote form"
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={downloadPdf} className="space-y-3">
              <input
                value={leadName}
                onChange={(event) => setLeadName(event.target.value)}
                placeholder="Name"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
              />
              <input
                value={leadPhone}
                onChange={(event) =>
                  setLeadPhone(
                    event.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                placeholder="Phone (10 digits)"
                inputMode="numeric"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
              />

              {pdfError && (
                <p
                  aria-live="polite"
                  className="p-2.5 rounded-md bg-red-50 border border-red-200 text-[10px] font-semibold text-red-800"
                >
                  {pdfError}
                </p>
              )}

              <button
                type="submit"
                disabled={pdfLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
              >
                {pdfLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {pdfLoading ? "Generating..." : "Download PDF"}
              </button>

              <p className="text-[10px] text-neutral-500">
                We use your details only to respond to your request.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
