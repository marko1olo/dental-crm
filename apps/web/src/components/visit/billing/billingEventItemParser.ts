/**
 * apps/web/src/components/visit/billing/billingEventItemParser.ts
 * Parser utilities for external billing and copilot custom events.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { kopecksToRubles } from "@dental/shared";
import type { VisitBillingServiceItem } from "../visitBillingTypes.js";

export interface RawBillingEventItem {
	id?: string | undefined;
	code?: string | undefined;
	code804n?: string | undefined;
	priceId?: string | undefined;
	title?: string | undefined;
	name?: string | undefined;
	nameRu?: string | undefined;
	price?: number | string | undefined;
	priceRub?: number | string | undefined;
	basePriceRub?: number | string | undefined;
	unitPriceRub?: number | string | undefined;
	priceKopecks?: number | undefined;
	quantity?: number | string | undefined;
	toothCode?: string | number | undefined;
	toothNumber?: string | number | undefined;
	discountPercent?: number | string | undefined;
	discountRub?: number | string | undefined;
	discount?: number | string | undefined;
	isWarranty?: boolean | undefined;
	labCostRub?: number | string | undefined;
	labOrderId?: string | undefined;
	labOrderNumber?: string | undefined;
	technicianName?: string | undefined;
	materialName?: string | undefined;
	material?: string | undefined;
	warrantyPassport?: string | undefined;
	fittingConfirmed?: boolean | undefined;
	[key: string]: unknown;
}

export interface RawBillingEventDetail {
	toothCode?: string | number | undefined;
	toothNumber?: string | number | undefined;
	labOrderId?: string | undefined;
	labOrderNumber?: string | undefined;
	technicianName?: string | undefined;
	material?: string | undefined;
	warrantyPassport?: string | undefined;
	[key: string]: unknown;
}

export function parseBillingServicesList(
	rawList: readonly RawBillingEventItem[],
	detail?: RawBillingEventDetail | null | undefined,
): VisitBillingServiceItem[] {
	return rawList.map((s, idx) => {
		const idSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().slice(0, 8) : `${Date.now()}-${idx}`;
		const priceRub = Number(s.unitPriceRub ?? s.priceRub ?? s.price ?? (typeof s.priceKopecks === "number" ? kopecksToRubles(s.priceKopecks) : 0));
		let tooth = s.toothCode ?? s.toothNumber ?? detail?.toothCode ?? detail?.toothNumber;
		if (!tooth) {
			const match = (s.title || s.name || s.nameRu || "").match(/(?:\(?зуб(?:ы)?\s+([A-Za-z0-9,\s]+)\)?|^зуб(?:ы)?\s+([A-Za-z0-9,\s]+):)/i);
			if (match) tooth = (match[1] || match[2] || "").trim();
		}
		return {
			id: s.id || `inv-svc-${Date.now()}-${idSuffix}`,
			code804n: s.code804n || s.code || "A16.07.001",
			title: s.title || s.name || s.nameRu || "Стоматологическая услуга",
			toothCode: tooth ? String(tooth) : undefined,
			quantity: Number(s.quantity) > 0 ? Number(s.quantity) : 1,
			unitPriceRub: Math.max(0, priceRub),
			discountPercent: Number(s.discountPercent) || 0,
			discountRub: Number(s.discountRub) || 0,
			isWarranty: Boolean(s.isWarranty),
			labCostRub: Number(s.labCostRub) > 0 ? Number(s.labCostRub) : undefined,
			labOrderId: s.labOrderId || detail?.labOrderId,
			labOrderNumber: s.labOrderNumber || detail?.labOrderNumber,
			technicianName: s.technicianName || detail?.technicianName,
			materialName: s.materialName || s.material || detail?.material,
			warrantyPassport: s.warrantyPassport || detail?.warrantyPassport,
			fittingConfirmed: Boolean(s.fittingConfirmed),
		};
	});
}

export function parseSingleBillingItem(item: RawBillingEventItem): VisitBillingServiceItem {
	const idSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
	let tooth = item.toothNumber !== undefined && item.toothNumber !== null && item.toothNumber !== ""
		? String(item.toothNumber)
		: item.toothCode;
	if (!tooth) {
		const match = (item.title || item.name || "").match(/(?:\(?зуб(?:ы)?\s+([A-Za-z0-9,\s]+)\)?|^зуб(?:ы)?\s+([A-Za-z0-9,\s]+):)/i);
		if (match) tooth = (match[1] || match[2] || "").trim();
	}
	const price = Number(
		item.unitPriceRub ??
		item.priceRub ??
		item.price ??
		item.basePriceRub ??
		(typeof item.priceKopecks === "number" ? kopecksToRubles(item.priceKopecks) : 0)
	);
	const discountRub = Number(item.discountRub ?? item.discount ?? 0);
	const discountPercent = Number(
		item.discountPercent ??
		(price > 0 && discountRub > 0 ? Math.round((discountRub / price) * 100) : 0)
	);

	return {
		id: item.id || `copilot-serv-${Date.now()}-${idSuffix}`,
		code804n: item.code804n || item.code || item.priceId || "A16.07.001",
		title: item.title || item.name || "Услуга",
		toothCode: tooth ? String(tooth) : undefined,
		quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
		unitPriceRub: Math.max(0, price),
		discountPercent,
		discountRub,
		isWarranty: Boolean(item.isWarranty),
		labCostRub: Number(item.labCostRub) > 0 ? Number(item.labCostRub) : undefined,
		labOrderId: item.labOrderId,
		labOrderNumber: item.labOrderNumber,
		technicianName: item.technicianName,
		materialName: item.materialName || item.material,
		warrantyPassport: item.warrantyPassport,
		fittingConfirmed: Boolean(item.fittingConfirmed),
	};
}
