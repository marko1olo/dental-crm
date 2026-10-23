/**
 * useInboundWaybillTotals.ts — Computes deficit resolution map and waybill totals.
 */

import { useMemo } from "react";
import { money } from "../../../AppHelpers.js";
import type { InboundWaybillLine } from "./inboundWaybillTypes.js";

export function useInboundWaybillTotals(
	inventoryItems: ReadonlyArray<{ id?: string; name: string; stockQuantity?: string | number }>,
	lines: InboundWaybillLine[],
) {
	const deficitMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const it of inventoryItems) {
			const qty = Number(it.stockQuantity) || 0;
			if (qty < 0) {
				map.set(it.name.toLowerCase().trim(), qty);
				if (it.id) map.set(it.id, qty);
			}
		}
		return map;
	}, [inventoryItems]);

	const totals = useMemo(() => {
		let totalQty = 0;
		let totalSumRub = 0;
		let resolvingDeficitCount = 0;
		for (const line of lines) {
			const q = Number(line.quantity) || 0;
			const p = Number(line.unitCostRub) || 0;
			totalQty += q;
			totalSumRub += q * p;
			if (deficitMap.has(line.name.toLowerCase().trim())) resolvingDeficitCount++;
		}
		return {
			positionsCount: lines.length,
			totalQty,
			totalSumRub,
			totalSumFormatted: money(Math.round(totalSumRub * 100)),
			resolvingDeficitCount,
		};
	}, [lines, deficitMap]);

	return { deficitMap, totals };
}
