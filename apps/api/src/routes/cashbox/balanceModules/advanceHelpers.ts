/**
 * balanceModules/advanceHelpers.ts — Shared kopecks resolution helpers for advance operations.
 */

import { rublesToKopecks } from "@dental/shared";

export function resolveSafeKopecks(
	kopecksVal: number | bigint | null | undefined,
	rubVal: number | string | null | undefined,
): number {
	const kop = kopecksVal != null ? Number(kopecksVal) : 0;
	const rub = Number(rubVal || 0);
	return kop !== 0 || rub === 0 ? kop : rublesToKopecks(rub);
}
