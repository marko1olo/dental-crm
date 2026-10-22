/**
 * autoBomDeductionEngine.ts — Automatic Background BOM Deduction & 1-Click Class B Disposal Facade.
 */

import {
	type AutoVisitBomDeductionInput,
	type AutoVisitBomDeductionResult,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { resolveFefoStockMap } from "./deductionModules/bomBatchMatcher.js";
import { validateDeductionBalances } from "./deductionModules/bomDeductionValidator.js";
import {
	buildCabinetScopedStockMap,
	executeShiftCloseClassBWasteDisposal,
	formatShiftCloseClassBWasteActHtml,
	generateDeterministicWasteActIdentifiers,
	normalizeRenderedServices804n,
} from "./deductionModules/bomDeductionCalculator.js";
import type {
	PerformAutoVisitBomDeductionOptions,
	ShiftCloseClassBWasteInput,
	ShiftCloseClassBWasteResult,
} from "./deductionModules/bomDeductionTypes.js";
import { syncAutoBomDeduction } from "./deductionModules/bomDeductionNetworkSync.js";

export {
	type ShiftCloseClassBWasteInput,
	type ShiftCloseClassBWasteResult,
	type PerformAutoVisitBomDeductionOptions,
	executeShiftCloseClassBWasteDisposal,
	formatShiftCloseClassBWasteActHtml,
	generateDeterministicWasteActIdentifiers,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
};

export async function performAutoVisitBomDeduction(
	options: PerformAutoVisitBomDeductionOptions,
): Promise<AutoVisitBomDeductionResult> {
	const normalizedServices = normalizeRenderedServices804n(options.renderedServices);

	const stockMap = buildCabinetScopedStockMap(
		options.warehouseItems,
		options.currentStockMap,
		{ chairId: options.chairId, cabinetId: options.cabinetId },
	);

	if (options.batches && options.batches.length > 0) {
		const { validStockMap } = resolveFefoStockMap(options.batches, {
			chairId: options.chairId,
			cabinetId: options.cabinetId,
			visitDate: options.visitDate,
			onExpiredBatchBlocked: options.onExpiredBatchBlocked,
		});
		for (const [itemId, qty] of Object.entries(validStockMap)) {
			stockMap[itemId] = qty;
		}
	}

	const deductionInput: AutoVisitBomDeductionInput = {
		visitId: options.visitId,
		patientId: options.patientId,
		doctorId: options.doctorId,
		patientFullName: options.patientFullName,
		doctorFullName: options.doctorFullName,
		visitDate: options.visitDate,
		renderedServices: normalizedServices as any,
		currentStockMap: stockMap,
		allowOverdraft: options.allowOverdraft !== false,
		includeStandardPpe: options.includeStandardPpe !== false,
		fallbackToDefaults: true,
	};

	const result = executeAutoVisitBomDeduction(deductionInput);

	const validation = validateDeductionBalances(result.items, {
		visitId: options.visitId,
		visitNumber: options.visitNumber,
		totalCostPriceRub: result.totalCostPriceRub,
	});

	if (options.onToast) {
		options.onToast(validation.toastMessage, validation.toastType);
	} else {
		showToast(validation.toastMessage, validation.toastType);
	}

	if (validation.hasOverdraft && options.onOverdraftAlert) {
		options.onOverdraftAlert({
			visitId: options.visitId,
			visitNumber: options.visitNumber,
			message: validation.overdraftNotice,
			chairId: options.chairId,
			cabinetId: options.cabinetId,
			items: validation.overdraftItems,
		});
	}

	syncAutoBomDeduction(options, result, normalizedServices, validation);

	return result;
}
