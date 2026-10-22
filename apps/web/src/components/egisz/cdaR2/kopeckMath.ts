/**
 * kopeckMath.ts — Exact Financial Math (Integer Kopecks) and XML Canonicalizer
 */

import { canonicalizeCdaXml as sharedCanonicalizeCdaXml } from "@dental/shared/cda";

export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.max(0, Math.round(Number(kopecks) || 0));
	const rubles = Math.floor(safeKopecks / 100);
	const kops = safeKopecks % 100;
	return `${rubles}.${kops.toString().padStart(2, "0")}`;
}

export function parseRublesToKopecks(rublesInput: string | number): number {
	if (typeof rublesInput === "number") {
		return Math.max(0, Math.round(rublesInput * 100));
	}
	const clean = String(rublesInput || "").trim().replace(",", ".");
	const parsed = Number.parseFloat(clean);
	if (Number.isNaN(parsed) || parsed < 0) return 0;
	return Math.round(parsed * 100);
}

export function canonicalizeCdaXml(xml: string): string {
	if (!xml || typeof xml !== "string") return "";
	return sharedCanonicalizeCdaXml(xml, { disallowEnvelopedSignature: true });
}
