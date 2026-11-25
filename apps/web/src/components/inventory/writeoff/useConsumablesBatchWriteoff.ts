/**
 * apps/web/src/components/inventory/writeoff/useConsumablesBatchWriteoff.ts
 *
 * Канонический хук логики выборки смены, подсчета дефицита, расчета овердрафта
 * и пакетного списания расходных материалов по закрытым визитам (Мандаты 8e, 8n).
 */

import { useEffect, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
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

	const hasOverdraft = Boolean(stockBatches?.some((b) => {
		const item = b as { quantityAvailable?: number } | undefined;
		return typeof item?.quantityAvailable === "number" && item.quantityAvailable <= 0;
	})) || data.consumablesSummary.some((c) => c.isOverdraft);

	const handleConfirmWriteoff = async () => {
		setIsSubmitting(true);
		setStatusMessage(null);
		try {
			if (inventoryStore?.deductStock && data.consumablesSummary?.length) {
				const deductions = data.consumablesSummary.map((item) => ({
					inventoryItemId: item.itemId,
					itemName: item.itemName,
					quantity: item.qtyToDeduct,
				}));
				await inventoryStore.deductStock(organizationId || "default", deductions, { skipNetworkSync: true });
			}

			const idempotencyKey = generateUuidV7();
			const headers: Record<string, string> = {
				...(getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }),
				"Idempotency-Key": idempotencyKey,
			};
			const orgParam = organizationId ? `/${organizationId}` : "";
			const payload = {
				date: data.date,
				notes: `Пакетное списание расходников за смену (${data.shiftStats.completedVisitsCount} приёмов)`,
				items: data.consumablesSummary.map((c) => ({ itemId: c.itemId, qty: c.qtyToDeduct, name: c.itemName })),
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
		const rowsHtml = data.consumablesSummary.map((c, i) => `
			<tr>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${i + 1}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:left;">${c.itemName}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.unit}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;">${c.qtyToDeduct}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.currentStock}</td>
				<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:${c.isOverdraft ? '#b45309' : '#0f172a'};">${c.projectedStock}${c.isOverdraft ? ' (овердрафт)' : ''}</td>
			</tr>`).join("");
		printWin.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Акт списания материалов — ${data.date}</title>
			<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}th{background:#f8fafc;border:1px solid #cbd5e1;padding:8px}.footer{margin-top:32px;display:flex;justify-content:space-between;font-size:13px}</style>
			</head><body><h2>Акт списания материалов смены (${data.date})</h2><p style="font-size:13px;color:#64748b">Завершено приёмов: <strong>${data.shiftStats.completedVisitsCount}</strong></p><table><thead><tr><th>№</th><th>Материал</th><th>Ед.</th><th>Списано</th><th>Было</th><th>Остаток</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="footer"><div>Отпустил со склада: _________</div><div>Принял в кабинете: _________</div></div><script>window.onload=function(){window.print();};</script></body></html>`);
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
		handleConfirmWriteoff,
		handlePrintAct,
		handleQuickCarpules,
		handleQuickAnesthesiaPackage,
		handleQuickTherapy,
		handleQuickSurgery,
		handleQuickHygiene,
	};
}
