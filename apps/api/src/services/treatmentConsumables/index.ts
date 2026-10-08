/**
 * index.ts — Layer 5: Master Coordinator and Barrel Export for Treatment Consumables Service.
 * Aggregates all specialized domain submodules into the canonical TreatmentConsumablesService class.
 */

export * from "./types.js";
export * from "./recipeService.js";
export * from "./stockAvailability.js";
export * from "./inventoryReports.js";
export * from "./stockDeduction.js";
export * from "./quickWriteoffService.js";
export * from "./bundleWriteoffService.js";
export * from "./manualDeduction.js";

import {
	createLink,
	deleteLink,
	getLink,
	getLinkOptions,
	getRecipeForService,
	listLinks,
	updateLink,
} from "./recipeService.js";
import { checkStockSufficiency } from "./stockAvailability.js";
import { getInventoryAlerts } from "./inventoryReports.js";
import {
	deductForToothTreatment,
	deductForVisit,
} from "./stockDeduction.js";
import {
	quickWriteoffCarpules,
	quickWriteoffStandardKit,
} from "./quickWriteoffService.js";
import {
	quickWriteoffShiftBundle,
	quickWriteoffVisitBundle,
} from "./bundleWriteoffService.js";
import { deductManualItems } from "./manualDeduction.js";

export class TreatmentConsumablesService {
	static listLinks = listLinks;
	static getLink = getLink;
	static createLink = createLink;
	static updateLink = updateLink;
	static deleteLink = deleteLink;
	static getRecipeForService = getRecipeForService;
	static getLinkOptions = getLinkOptions;

	static deductForVisit = deductForVisit;
	static deductForToothTreatment = deductForToothTreatment;
	static deductManualItems = deductManualItems;

	static checkStockSufficiency = checkStockSufficiency;
	static getInventoryAlerts = getInventoryAlerts;

	static quickWriteoffStandardKit = quickWriteoffStandardKit;
	static quickWriteoffCarpules = quickWriteoffCarpules;
	static quickWriteoffShiftBundle = quickWriteoffShiftBundle;
	static quickWriteoffVisitBundle = quickWriteoffVisitBundle;
}

export const treatmentConsumablesService = TreatmentConsumablesService;
