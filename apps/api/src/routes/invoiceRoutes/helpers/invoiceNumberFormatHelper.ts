import type { PriceLockResolutionPolicy } from "@dental/shared";
import type { GenerateInvoiceItemInput } from "../types.js";

export function buildEffectiveItemResolutionOverrides(
	items: GenerateInvoiceItemInput[],
): Record<string, PriceLockResolutionPolicy> | undefined {
	const map: Record<string, PriceLockResolutionPolicy> = {};
	let hasAny = false;
	for (const it of items) {
		if (it.resolutionPolicy) {
			map[it.itemId] = it.resolutionPolicy;
			hasAny = true;
		}
	}
	return hasAny ? map : undefined;
}

export function formatInvoiceNumber(
	documentType: string,
	patientId: string,
): string {
	const prefix = documentType === "act" ? "АКТ" : documentType === "work_order" ? "НАР" : "СЧ";
	const rand = Math.floor(1000 + Math.random() * 9000);
	return `${prefix}-${patientId.slice(0, 4).toUpperCase()}-${rand}`;
}
