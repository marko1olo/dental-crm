/**
 * apps/web/src/components/lab/orderHelpers/dentalLabOrderMappers.ts
 *
 * DENTE Dental CRM — Хелперы маппинга и нормализации параметров наряда ЗТЛ (Мандаты 8b, 8e, 8bf).
 */

import { CANONICAL_LAB_MATERIALS, type DentalLabOrderEntry } from "../dentalLabCatalogData.js";
import type { DentalLabOrderData } from "../labMath.js";

export const getLabApiBaseUrl = (): string =>
	typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null" && window.location.origin.startsWith("http")
		? window.location.origin
		: "http://127.0.0.1:5173";

export function parseOrderTeeth(order: DentalLabOrderData | DentalLabOrderEntry | null | undefined): number[] {
	if (!order) return [];
	if (Array.isArray(order.teeth) && order.teeth.length > 0) {
		return order.teeth.map(Number).filter((t) => !Number.isNaN(t) && t > 0);
	}
	const dataOrder = order as DentalLabOrderData;
	if (Array.isArray(dataOrder.selectedTeeth) && dataOrder.selectedTeeth.length > 0) {
		return dataOrder.selectedTeeth.map(Number).filter((t) => !Number.isNaN(t) && t > 0);
	}
	if (typeof dataOrder.toothFdi === "string" && dataOrder.toothFdi.trim()) {
		return dataOrder.toothFdi.split(/[,;\s]+/).map(Number).filter((t) => !Number.isNaN(t) && t > 0);
	}
	if (typeof dataOrder.toothFdi === "number" && dataOrder.toothFdi > 0) {
		return [dataOrder.toothFdi];
	}
	return [];
}

export function resolveOrderMaterialId(order: DentalLabOrderData | DentalLabOrderEntry | null | undefined): string | null {
	if (!order) return null;
	const candidate = order.materialId || (order as DentalLabOrderData).workTypeId || (order as DentalLabOrderData).constructionType || (order as DentalLabOrderData).material;
	if (!candidate) return null;
	const candStr = String(candidate).trim();
	if (CANONICAL_LAB_MATERIALS.some((m) => m.id === candStr)) {
		return candStr;
	}
	const lower = candStr.toLowerCase();
	if (lower.includes("zircon") || lower.includes("циркон")) return "zirconia_multilayer";
	if (lower.includes("emax") || lower.includes("пресс") || lower.includes("дисиликат")) return "emax_press";
	if (lower.includes("metal") || lower.includes("металлокерамика") || lower.includes("cocr") || lower.includes("кобальт")) return "metal_ceramic_cocr";
	if (lower.includes("clasp") || lower.includes("бюгел")) return "clasp_prosthesis";
	if (lower.includes("abutment") || lower.includes("абатмент")) return "zirconia_abutment";
	if (lower.includes("pmma") || lower.includes("врем") || lower.includes("пластмасс")) return "pmma_temp";
	if (lower.includes("aligner") || lower.includes("элайнер") || lower.includes("каппа")) return "aligner_splint";
	return null;
}

export function resolveOrderShade(order: DentalLabOrderData | DentalLabOrderEntry | null | undefined): string | null {
	if (!order) return null;
	const s = (order as DentalLabOrderEntry).shadeCode || (order as DentalLabOrderData).colorVita || (order as DentalLabOrderData).shadeBody;
	if (typeof s === "string" && s.trim()) return s.trim();
	return null;
}

export function resolveOrderLab(order: DentalLabOrderData | DentalLabOrderEntry | null | undefined): string | null {
	if (!order) return null;
	const l = (order as DentalLabOrderEntry).laboratoryName || (order as DentalLabOrderData).labName || (order as DentalLabOrderData).technicianName || (order as DentalLabOrderData).lab_name;
	if (typeof l === "string" && l.trim()) return l.trim();
	return null;
}

export function resolveOrderDueDate(order: DentalLabOrderData | DentalLabOrderEntry | null | undefined): string | null {
	if (!order) return null;
	const d = (order as DentalLabOrderEntry).dueDate || (order as DentalLabOrderData).expectedLabDateIso || (order as DentalLabOrderData).fittingDate || (order as DentalLabOrderData).deliveryDate;
	if (typeof d === "string" && d.trim()) {
		return d.includes("T") ? (d.split("T")[0] ?? d.slice(0, 10)) : d.slice(0, 10);
	}
	return null;
}

export function resolveOrderNotes(order: DentalLabOrderData | DentalLabOrderEntry | null | undefined): string | null {
	if (!order) return null;
	const n = (order as DentalLabOrderEntry).notes || (order as DentalLabOrderData).clinicalNotes || (order as DentalLabOrderData).labComments;
	if (typeof n === "string") return n;
	return null;
}
