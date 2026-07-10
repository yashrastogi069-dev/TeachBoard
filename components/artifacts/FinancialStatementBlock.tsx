"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sliders, Table } from "@phosphor-icons/react";
import type { FinancialStatementBlock as FinancialStatementBlockT } from "@/lib/blocks";

/*
  financial-statement: a line-item statement (P&L / balance sheet / cash flow)
  rendered as a clean table, plus optional what-if driver sliders.

  Recalculation formula (from the schema doc in lib/blocks.ts): each driver's
  own slider value V stands in for "base", so every affected line item's
  displayed value becomes  V * factor  (e.g. a "units sold" driver at 1,200
  with factor 45 sets a revenue line to 1,200 * 45 = 54,000). Line items not
  named by any driver keep their authored value. When several drivers name the
  same line item, the later driver in the array wins (single-assumption ripple,
  no summing).

  Total rows (isTotal) are recomputed live. The schema has no explicit
  parent/child links, so grouping is inferred from indent by the standard
  financial-statement convention: an isTotal row at indent d sums the
  contiguous preceding rows at indent exactly d+1 (one level deeper), walking
  upward and stopping at the first row with indent <= d. Rows deeper than d+1
  are skipped, since they are assumed already rolled up into a nearer subtotal.
  Totals are evaluated top-to-bottom so subtotals feed the parent totals above.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const STATEMENT_LABEL: Record<FinancialStatementBlockT["statementType"], string> = {
  "income-statement": "Income statement",
  "balance-sheet": "Balance sheet",
  "cash-flow": "Cash flow statement",
};

function formatValue(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function FinancialStatementBlock({
  block,
}: {
  block: FinancialStatementBlockT;
}) {
  const reduce = useReducedMotion();
  const drivers = block.drivers ?? [];

  // Each driver starts at the midpoint of its range (same default as slider-sim).
  const [driverValues, setDriverValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    drivers.forEach((d) => {
      initial[d.id] = (d.min + d.max) / 2;
    });
    return initial;
  });

  const values = useMemo(() => {
    // Step 1: authored values, then override affected line items with V * factor.
    const computed = new Map<string, number>(
      block.lineItems.map((li) => [li.id, li.value])
    );
    drivers.forEach((driver) => {
      const v = driverValues[driver.id] ?? (driver.min + driver.max) / 2;
      driver.affects.forEach((a) => {
        computed.set(a.lineItemId, v * a.factor);
      });
    });

    // Step 2: recompute totals top-to-bottom from indent grouping.
    block.lineItems.forEach((li, i) => {
      if (!li.isTotal) return;
      const d = li.indent;
      let sum = 0;
      for (let j = i - 1; j >= 0; j--) {
        const prev = block.lineItems[j];
        if (prev.indent <= d) break; // reached the boundary of this group
        if (prev.indent === d + 1) sum += computed.get(prev.id) ?? prev.value;
        // rows deeper than d+1 are skipped (already rolled into a subtotal)
      }
      computed.set(li.id, sum);
    });

    return computed;
  }, [block.lineItems, drivers, driverValues]);

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <Table size={14} weight="duotone" className="text-accent" />
        {STATEMENT_LABEL[block.statementType]}
      </p>
      <p className="pb-3 text-base font-medium text-ink">{block.title}</p>

      <div className="overflow-hidden rounded-xl border border-line bg-bg-raised/40">
        <table className="w-full border-collapse text-left">
          <tbody>
            {block.lineItems.map((li, i) => {
              const value = values.get(li.id) ?? li.value;
              return (
                <tr
                  key={li.id}
                  className={
                    li.isTotal
                      ? "border-t border-line-strong"
                      : i > 0
                        ? "border-t border-line/50"
                        : ""
                  }
                >
                  <th
                    scope="row"
                    style={{ paddingLeft: 14 + li.indent * 18 }}
                    className={`py-2 pr-3 text-left align-baseline text-sm font-normal ${
                      li.isTotal
                        ? "font-semibold text-ink"
                        : li.indent === 0
                          ? "text-ink"
                          : "text-ink-muted"
                    }`}
                  >
                    {li.label}
                  </th>
                  <td className="py-2 pl-3 pr-4 text-right align-baseline">
                    <span className="relative inline-flex justify-end">
                      {!reduce && (
                        <motion.span
                          key={value}
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 -inset-x-1.5 rounded bg-accent-soft"
                          initial={{ opacity: 0.55 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: EASE }}
                        />
                      )}
                      <span
                        className={`tabular relative text-sm ${
                          li.isTotal
                            ? "font-display font-semibold text-ink"
                            : "text-ink"
                        }`}
                      >
                        {formatValue(value)}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drivers.length > 0 && (
        <div className="pt-4">
          <p className="flex items-center gap-2 pb-3 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            <Sliders size={14} weight="duotone" className="text-accent" /> What-if drivers
          </p>
          <div className="flex flex-col gap-4">
            {drivers.map((driver) => {
              const value = driverValues[driver.id] ?? (driver.min + driver.max) / 2;
              return (
                <label key={driver.id} className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between gap-3 text-sm text-ink-muted">
                    <span className="min-w-0">{driver.label}</span>
                    <span className="tabular shrink-0 font-semibold text-accent-bright">
                      {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {driver.unit ? ` ${driver.unit}` : ""}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={driver.min}
                    max={driver.max}
                    step={driver.step}
                    value={value}
                    onChange={(e) =>
                      setDriverValues((prev) => ({
                        ...prev,
                        [driver.id]: Number(e.target.value),
                      }))
                    }
                    className="accent-[var(--accent)]"
                    aria-label={driver.label}
                  />
                </label>
              );
            })}
          </div>
          <p className="pt-3 text-[11px] text-ink-faint">
            Move a driver and watch every line it feeds, and the totals above it,
            recompute live.
          </p>
        </div>
      )}
    </div>
  );
}
