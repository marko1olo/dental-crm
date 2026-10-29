/**
 * dmsInsuranceEngine.ts — Canonical re-export facade from insuranceData SSOT.
 */

import {
	calculateDmsCoPaymentSplit,
	exportRegistryToCsv,
	formatCurrencyKopecks,
	formatCurrencyRub,
	generateBilateralAcceptanceActHtml,
	kopecksToRub,
	rubToKopecks,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type DmsSplitCalculationResult,
} from "./insuranceData.js";

export * from "./insuranceData.js";

export type DmsBillItemInput = DmsBillableItem;
export type DmsSplitInvoiceSummary = DmsSplitCalculationResult;
export type DmsRegistryVisitServiceItem = any;
export type DmsStatutoryRegistry = any;
export type ClinicLegalInfo = { name: string; inn: string; kpp?: string; ogrn?: string; address: string; chiefDoctor: string };

export function formatKopecks(kopecks: number): string {
	return formatCurrencyKopecks(kopecks);
}

export function calculateDmsSplitInvoice(
	items: readonly DmsBillableItem[],
	options: { letter?: DmsGuaranteeLetter; franchisePercent?: number } = {},
): DmsSplitCalculationResult {
	return calculateDmsCoPaymentSplit(items, {
		guaranteeLetter: options.letter,
		franchisePercent: options.franchisePercent,
	});
}

export function generateDmsPreAuthRequest(letter: DmsGuaranteeLetter, items: readonly DmsBillableItem[]): any {
	return {
		requestId: `REQ-${Date.now()}`,
		letterId: letter.id,
		letterNumber: letter.letterNumber,
		status: "approved",
		itemsCount: items.length,
	};
}

export function generateDmsStatutoryRegistry(records: readonly any[], clinic: ClinicLegalInfo, insurer: string): any {
	return {
		registryId: `REG-${Date.now()}`,
		clinic,
		insurer,
		records,
		totalAmountRub: records.reduce((acc, r) => acc + (r.totalPriceRub || 0), 0),
	};
}

export function verifyServiceForDms(serviceCode: string, letter?: DmsGuaranteeLetter): boolean {
	if (!letter) return true;
	if (letter.programExclusions?.includes(serviceCode)) return false;
	return true;
}
