/**
 * apps/web/src/components/inventory/writeoff/useConsumablesBatchWriteoff.ts
 *
 * Канонический хук логики выборки смены, подсчета дефицита, расчета овердрафта
 * и пакетного списания расходных материалов по закрытым визитам (Мандаты 8e, 8n).
 */

import { useEffect, useMemo, useState } from "react";
import {
	generateUuidV7,
	processClinicalMaterialWriteoff,
	formatClinicalMaterialWriteoffAct,
	rublesToKopecks,
	type ClinicalConsumableNorm,
	type ClinicalMaterialWriteoffResult,
	type MaterialWriteoffTier,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";

export interface ShiftConsumableItem {
	itemId: string;
	itemName: string;
	category?: string | undefined;
	unit: string;
	qtyToDeduct: number;
	currentStock: number;
	projectedStock: number;
	isOverdraft: boolean;
	deficit: number;
	defaultCostRub?: string | number | undefined;
	tier?: MaterialWriteoffTier | undefined;
	canOmit?: boolean | undefined;
	canAdjustQuantity?: boolean | undefined;
	isOmitted?: boolean | undefined;
	actualQuantity?: number | undefined;
	baseQtyToDeduct?: number | undefined;
}

const OVERHEAD_NAME_RE = /перчат|салфет|бахил|маск|нагрудн|слюноотсос|пылесос|стакан|валик/i;

export function resolveShiftItemTier(item: Pick<ShiftConsumableItem, "tier" | "itemName" | "category">): MaterialWriteoffTier {
	if (item.tier === "cheap_overhead" || item.tier === "expensive_clinical") {
		return item.tier;
	}
	const probe = `${item.itemName} ${item.category ?? ""}`;
	return OVERHEAD_NAME_RE.test(probe) ? "cheap_overhead" : "expensive_clinical";
}

function normalizeShiftItemWithClinicalFlags(item: ShiftConsumableItem): ShiftConsumableItem {
	const tier = resolveShiftItemTier(item);
	const canOmit = item.canOmit ?? tier === "expensive_clinical";
	const canAdjustQuantity = item.canAdjustQuantity ?? tier === "expensive_clinical";
	const baseQtyToDeduct = item.baseQtyToDeduct ?? item.qtyToDeduct;
	const isOmitted = Boolean(canOmit && item.isOmitted);
	const effectiveQty = isOmitted
		? 0
		: canAdjustQuantity && item.actualQuantity !== undefined && item.actualQuantity > 0
			? item.actualQuantity
			: item.qtyToDeduct;
	const projectedStock = Number((item.currentStock - effectiveQty).toFixed(2));
	const isOverdraft = projectedStock < 0;
	const deficit = isOverdraft ? Math.abs(projectedStock) : 0;

	return {
		...item,
		tier,
		canOmit,
		canAdjustQuantity,
		isOmitted,
		baseQtyToDeduct,
		qtyToDeduct: effectiveQty,
		projectedStock,
		isOverdraft,
		deficit,
	};
}

export interface ShiftBatchWriteoffData {
	date: string;
	shiftStats: {
		completedVisitsCount: number;
		totalProceduresCount: number;
		breakdown: Array<{ name: string; count: number; code?: string | undefined }>;
	};
	consumablesSummary: ShiftConsumableItem[];
	totalItemsCount: number;
	overdraftItemsCount: number;
	isAlreadyDeducted: boolean;
}

export const DEFAULT_SHIFT_DATA: ShiftBatchWriteoffData = {
	date: new Date().toISOString().slice(0, 10),
	shiftStats: {
		completedVisitsCount: 0,
		totalProceduresCount: 0,
		breakdown: [],
	},
	consumablesSummary: [],
	totalItemsCount: 0,
	overdraftItemsCount: 0,
	isAlreadyDeducted: false,
};

export interface UseConsumablesBatchWriteoffOptions {
	isOpen: boolean;
	organizationId?: string | undefined;
	initialShiftData?: ShiftBatchWriteoffData | undefined;
	getHeaders?: ((extra?: Record<string, string> | undefined) => Record<string, string>) | undefined;
	stockBatches?: readonly unknown[] | undefined;
	warehouseItems?: readonly unknown[] | undefined;
	onWriteoffCompleted?: (() => void | Promise<void>) | undefined;
	onDeductionComplete?: (() => void | Promise<void>) | undefined;
	onConfirmWriteoff?: ((doc?: ShiftBatchWriteoffData) => void | Promise<void>) | undefined;
	onClose: () => void;
}

export function useConsumablesBatchWriteoff({
	isOpen,
	organizationId = "",
	initialShiftData,
	getHeaders,
	stockBatches,
	warehouseItems,
	onWriteoffCompleted,
	onDeductionComplete,
	onConfirmWriteoff,
	onClose,
}: UseConsumablesBatchWriteoffOptions) {
	const [data, setData] = useState<ShiftBatchWriteoffData>(initialShiftData || DEFAULT_SHIFT_DATA);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	const inventoryStore = useInventoryStore();

	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;
		const loadSummary = async () => {
			setIsLoading(true);
			try {
				const headers = getHeaders ? getHeaders() : {};
				const orgParam = organizationId ? `/${organizationId}` : "";
				const res = await fetch(`/api/inventory${orgParam}/shift-summary`, { headers });
				if (res.ok) {
					const resJson = await res.json();
					const payload =
						resJson && typeof resJson === "object" && "data" in resJson
							? (resJson as { data?: ShiftBatchWriteoffData }).data
							: (resJson as ShiftBatchWriteoffData);
					if (isMounted && payload) setData(payload);
				}
			} catch {
				// В офлайн-режиме дефолтные техкарты смены
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};
		loadSummary();
		return () => { isMounted = false; };
	}, [isOpen, organizationId, getHeaders]);

	const hasOverdraft =
		Boolean(stockBatches?.some((b) => {
			const item = b as { quantityAvailable?: number } | undefined;
			return typeof item?.quantityAvailable === "number" && item.quantityAvailable <= 0;
		})) ||
		Boolean(warehouseItems?.some((w) => {
			const rec = w as { stockQuantity?: number; quantity?: number } | null | undefined;
			const qty = typeof rec?.stockQuantity === "number" ? rec.stockQuantity : rec?.quantity;
			return typeof qty === "number" && qty <= 0;
		})) ||
		data.consumablesSummary.some((c) => c.isOverdraft);

	const twoLevelWriteoff: ClinicalMaterialWriteoffResult = useMemo(() => {
		const norms: ClinicalConsumableNorm[] = data.consumablesSummary.map((raw) => {
			const item = normalizeShiftItemWithClinicalFlags(raw);
			const unitCostRub = Number(item.defaultCostRub ?? 0) || 0;
			return {
				inventoryItemId: item.itemId,
				itemName: item.itemName,
				tier: item.tier ?? "expensive_clinical",
				defaultQuantity: item.baseQtyToDeduct ?? Math.max(0.01, item.qtyToDeduct || 1),
				unit: item.unit || "шт.",
				costPriceKopecks: rublesToKopecks(unitCostRub),
				canOmit: Boolean(item.canOmit),
				canAdjustQuantity: Boolean(item.canAdjustQuantity),
				isOmitted: Boolean(item.isOmitted),
				...(item.actualQuantity !== undefined && item.actualQuantity > 0
					? { actualQuantity: item.actualQuantity }
					: {}),
			};
		});
		const currentStocks: Record<string, number> = {};
		for (const item of data.consumablesSummary) {
			currentStocks[item.itemId] = item.currentStock;
		}
		return processClinicalMaterialWriteoff({
			visitId: `shift-${data.date}`,
			treatmentServiceId: "shift-batch-bom",
			treatmentServiceTitle: `Пакетное списание за смену (${data.shiftStats.completedVisitsCount} приёмов)`,
			norms,
			currentStocks,
			allowOverdraft: true,
		});
	}, [data]);

	const handleToggleOmit = (itemId: string) => {
		setData((prev) => ({
			...prev,
			consumablesSummary: prev.consumablesSummary.map((raw) => {
				if (raw.itemId !== itemId) return raw;
				const normalized = normalizeShiftItemWithClinicalFlags(raw);
				if (!normalized.canOmit) return normalized;
				return normalizeShiftItemWithClinicalFlags({
					...normalized,
					isOmitted: !normalized.isOmitted,
				});
			}),
		}));
	};

	const handleAdjustQuantity = (itemId: string, nextQty: number) => {
		const clampedQty = Number(Math.max(0.1, nextQty).toFixed(2));
		setData((prev) => ({
			...prev,
			consumablesSummary: prev.consumablesSummary.map((raw) => {
				if (raw.itemId !== itemId) return raw;
				const normalized = normalizeShiftItemWithClinicalFlags(raw);
				if (!normalized.canAdjustQuantity) return normalized;
				return normalizeShiftItemWithClinicalFlags({
					...normalized,
					isOmitted: false,
					actualQuantity: clampedQty,
					qtyToDeduct: clampedQty,
				});
			}),
		}));
	};

	const handleConfirmWriteoff = async () => {
		setIsSubmitting(true);
		setStatusMessage(null);
		try {
			const activeItems = data.consumablesSummary.filter((c) => !c.isOmitted && c.qtyToDeduct > 0);
			const omittedCount = data.consumablesSummary.filter((c) => c.isOmitted).length;

			if (inventoryStore?.deductStock && activeItems.length > 0) {
				const deductions = activeItems.map((item) => ({
					inventoryItemId: item.itemId,
					itemName: item.itemName,
					quantity: item.qtyToDeduct,
				}));
				await inventoryStore.deductStock(organizationId || "default", deductions, { skipNetworkSync: true });
			}

			if (activeItems.length === 0 && omittedCount > 0) {
				const omitMsg = `Все вариативные позиции (${omittedCount}) отмечены как неиспользованные (ВН). Списание не требуется.`;
				setStatusMessage(omitMsg);
				showToast(omitMsg, "info");
				if (onConfirmWriteoff) await onConfirmWriteoff(data);
				setTimeout(() => onClose(), 300);
				return;
			}

			const idempotencyKey = generateUuidV7();
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": idempotencyKey,
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			const payload = {
				date: data.date,
				notes: `Пакетное списание расходников за смену (${data.shiftStats.completedVisitsCount} приёмов${omittedCount > 0 ? `, исключено ВН: ${omittedCount}` : ""})`,
				items: activeItems.map((c) => ({ itemId: c.itemId, qty: c.qtyToDeduct, name: c.itemName })),
			};

			// Реальный вызов Fastify API: /shift-batch-deduct с фоллбэком на /shift-deduct
			let res = await fetch(`/api/inventory${orgParam}/shift-batch-deduct`, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				res = await fetch(`/api/inventory${orgParam}/shift-deduct`, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				});
			}

			if (res.ok) {
				const resData = await res.json();
				const successMsg = resData.message || "Расходники смены успешно списаны";
				setStatusMessage(successMsg);
				showToast(successMsg, "success");
				if (onWriteoffCompleted) await onWriteoffCompleted();
				if (onDeductionComplete) await onDeductionComplete();
				if (onConfirmWriteoff) await onConfirmWriteoff(data);
				setTimeout(() => onClose(), 400);
			} else {
				const resData = await res.json().catch(() => null);
				const errMsg = (resData as { message?: string; error?: string } | null)?.message || (resData as { message?: string; error?: string } | null)?.error || "Не удалось списать материалы: сбой сервера";
				setStatusMessage(errMsg);
				showToast(errMsg, "error");
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Не удалось списать материалы: сбой сети";
			setStatusMessage(errMsg);
			showToast(errMsg, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePrintAct = () => {
		const printWin = window.open("", "_blank");
		if (!printWin) return;
		const actText = formatClinicalMaterialWriteoffAct(twoLevelWriteoff);
		const rowsHtml = data.consumablesSummary.map((c, i) => `
			<tr>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${i + 1}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:left;">${c.itemName}${c.isOmitted ? " (ВН: не использован)" : ""}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.unit}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;">${c.isOmitted ? 0 : c.qtyToDeduct}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.currentStock}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:${c.isOverdraft ? "#b45309" : "#0f172a"};">${c.projectedStock}${c.isOverdraft ? " (овердрафт)" : ""}</td>
			</tr>`).join("");
		printWin.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Акт списания материалов — ${data.date}</title>
			<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}th{background:#f8fafc;border:1px solid #cbd5e1;padding:8px}pre{background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;font-size:11px;white-space:pre-wrap}.footer{margin-top:32px;display:flex;justify-content:space-between;font-size:13px}</style>
			</head><body><h2>Акт 2-уровневого списания материалов смены (${data.date})</h2><p style="font-size:13px;color:#64748b">Завершено приёмов: <strong>${data.shiftStats.completedVisitsCount}</strong></p><table><thead><tr><th>№</th><th>Материал</th><th>Ед.</th><th>Списано</th><th>Было</th><th>Остаток</th></tr></thead><tbody>${rowsHtml}</tbody></table><pre>${actText}</pre><div class="footer"><div>Отпустил со склада: _________</div><div>Принял в кабинете: _________</div></div><script>window.onload=function(){window.print();};</script></body></html>`);
		printWin.document.close();
	};

	const handleQuickCarpules = async () => {
		try {
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": generateUuidV7(),
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			const res = await fetch(`/api/inventory${orgParam}/quick-writeoff-carpules`, {
				method: "POST",
				headers,
				body: JSON.stringify({ carpulesCount: 1, drugName: "Анестетик артикаинового ряда (карпулы)" }),
			});
			if (res.ok) {
				const d = await res.json();
				showToast(d.message || "Пакет анестезии списан по техкарте (мягкий овердрафт активен)", "success");
			} else {
				const d = await res.json().catch(() => null);
				const msg = (d as { message?: string; error?: string } | null)?.message || (d as { message?: string; error?: string } | null)?.error || "Не удалось списать анестезию: сбой сервера";
				showToast(msg, "error");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось списать материалы: сбой сервера";
			showToast(msg, "error");
		}
	};

	const handleQuickAnesthesiaPackage = async () => {
		try {
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": generateUuidV7(),
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			const res = await fetch(`/api/inventory${orgParam}/quick-writeoff-package`, {
				method: "POST",
				headers,
				body: JSON.stringify({ packageId: "anesthesia" }),
			});
			if (res.ok) {
				const d = await res.json();
				showToast(d.message || "Полный пакет анестезии списан по техкарте", "success");
			} else {
				const d = await res.json().catch(() => null);
				const msg = (d as { message?: string; error?: string } | null)?.message || (d as { message?: string; error?: string } | null)?.error || "Не удалось списать пакет анестезии: сбой сервера";
				showToast(msg, "error");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось списать материалы: сбой сервера";
			showToast(msg, "error");
		}
	};

	const handleQuickTherapy = async () => {
		try {
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": generateUuidV7(),
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			const res = await fetch(`/api/inventory${orgParam}/quick-writeoff-visit-bundle`, {
				method: "POST",
				headers,
				body: JSON.stringify({ visitType: "therapy" }),
			});
			if (res.ok) {
				const d = await res.json();
				showToast(d.message || "Расходники терапии списаны по техкарте", "success");
			} else {
				const d = await res.json().catch(() => null);
				const msg = (d as { message?: string; error?: string } | null)?.message || (d as { message?: string; error?: string } | null)?.error || "Не удалось списать расходники терапии: сбой сервера";
				showToast(msg, "error");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось списать материалы: сбой сервера";
			showToast(msg, "error");
		}
	};

	const handleQuickSurgery = async () => {
		try {
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": generateUuidV7(),
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			const res = await fetch(`/api/inventory${orgParam}/quick-writeoff-surgery`, {
				method: "POST",
				headers,
				body: JSON.stringify({}),
			});
			if (res.ok) {
				const d = await res.json();
				showToast(d.message || "Расходники хирургии списаны по техкарте", "success");
			} else {
				const d = await res.json().catch(() => null);
				const msg = (d as { message?: string; error?: string } | null)?.message || (d as { message?: string; error?: string } | null)?.error || "Не удалось списать расходники хирургии: сбой сервера";
				showToast(msg, "error");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось списать материалы: сбой сервера";
			showToast(msg, "error");
		}
	};

	const handleQuickHygiene = async () => {
		try {
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": generateUuidV7(),
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			let res = await fetch(`/api/inventory${orgParam}/quick-writeoff-hygiene`, {
				method: "POST",
				headers,
				body: JSON.stringify({}),
			});
			if (!res.ok) {
				res = await fetch(`/api/inventory${orgParam}/quick-writeoff-visit-bundle`, {
					method: "POST",
					headers,
					body: JSON.stringify({ visitType: "hygiene" }),
				});
			}
			if (res.ok) {
				const d = await res.json();
				showToast(d.message || "Расходники профгигиены списаны по техкарте", "success");
			} else {
				const d = await res.json().catch(() => null);
				const msg = (d as { message?: string; error?: string } | null)?.message || (d as { message?: string; error?: string } | null)?.error || "Не удалось списать расходники профгигиены: сбой сервера";
				showToast(msg, "error");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось списать материалы: сбой сервера";
			showToast(msg, "error");
		}
	};

	return {
		data,
		setData,
		isLoading,
		isSubmitting,
		statusMessage,
		hasOverdraft,
		twoLevelWriteoff,
		handleToggleOmit,
		handleAdjustQuantity,
		handleConfirmWriteoff,
		handlePrintAct,
		handleQuickCarpules,
		handleQuickAnesthesiaPackage,
		handleQuickTherapy,
		handleQuickSurgery,
		handleQuickHygiene,
	};
}
