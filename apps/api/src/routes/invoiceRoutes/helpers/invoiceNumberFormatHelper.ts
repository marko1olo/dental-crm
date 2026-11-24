import crypto from "node:crypto";
import type { PriceLockResolutionPolicy } from "@dental/shared";
import type { GenerateInvoiceItemInput } from "../types.js";

export function buildEffectiveItemResolutionOverrides(
	items: GenerateInvoiceItemInput[],
): Record<string, PriceLockResolutionPolicy> | undefined {
	const map: Record<string, PriceLockResolutionPolicy> = {};
	let hasAny = false;
	for (const it of items) {
		if (it.resolutionPolicy && typeof it.itemId === "string") {
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
	const rand = crypto.randomInt(1000, 10000);
	return `${prefix}-${patientId.slice(0, 4).toUpperCase()}-${rand}`;
}
