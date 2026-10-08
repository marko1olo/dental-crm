/**
 * @file apps/web/src/helpers/sanpinHelpers.ts
 * @description SanPiN hygiene, disinfection & sterilization registry helpers.
 * Compliant with SanPiN 3.3686-21 and Form 257/u registries.
 */

import { formatShortDate } from "../utils/dateTimeUtils";

export interface SanpinSterilizationRecord {
	batchNumber: string;
	sterilizerType: "autoclave" | "dry_heat" | "plasma";
	temperatureCelsius: number;
	exposureMinutes: number;
	chemicalIndicatorPassed: boolean;
	packageType: "kraft_bag" | "crepe_paper" | "bix";
	sterilizedAt: string;
	operatorName: string;
}

export interface SanpinSterilityShelfLife {
	packageType: string;
	shelfLifeDays: number;
	expirationDate: string;
	isExpired: boolean;
}

export function calculateSanpinSterilityExpiration(
	sterilizedAt: string | Date,
	packageType: "kraft_bag" | "crepe_paper" | "bix",
	isHeatSealed = true,
): SanpinSterilityShelfLife {
	const baseDate = typeof sterilizedAt === "string" ? new Date(sterilizedAt) : sterilizedAt;
	let shelfLifeDays = 20;

	if (packageType === "kraft_bag") {
		shelfLifeDays = isHeatSealed ? 50 : 20;
	} else if (packageType === "crepe_paper") {
		shelfLifeDays = 21;
	} else if (packageType === "bix") {
		shelfLifeDays = isHeatSealed ? 20 : 3;
	}

	const expDate = new Date(baseDate.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
	const now = new Date();

	return {
		packageType,
		shelfLifeDays,
		expirationDate: expDate.toISOString(),
		isExpired: now > expDate,
	};
}

export function formatSanpinSterilizationBatchLabel(record: SanpinSterilizationRecord): string {
	return `Партия №${record.batchNumber} (${formatShortDate(record.sterilizedAt)}) — ${record.packageType}`;
}
