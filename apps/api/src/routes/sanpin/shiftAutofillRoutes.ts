import type { FastifyInstance } from "fastify";
import {
	autofillMonthSchema,
	autofillShiftSchema,
	type AutofillMonthInput,
	type AutofillShiftInput,
} from "./shiftAutofillModules/shiftAutofillSchemas.js";
import {
	handleAutofillMonth,
	handleAutofillShift,
} from "./shiftAutofillModules/shiftAutofillHandlers.js";

export {
	autofillMonthSchema,
	autofillShiftSchema,
	type AutofillMonthInput,
	type AutofillShiftInput,
};

export {
	handleAutofillShift,
	handleAutofillMonth,
	executeShiftAutofillTransaction,
	executeMonthAutofillTransaction,
	type DatabaseTransaction,
	type ShiftAutofillParams,
	type MonthAutofillParams,
} from "./shiftAutofillModules/shiftAutofillHandlers.js";

export {
	getShiftPsoBatches,
	getShiftSterilizationRecords,
	normalizePackagingType,
	getDefaultBactericidalEquipments,
	getDefaultTemperatureHumidityEquipments,
	calculateMonthWorkingDates,
	generateMonthBatchRows,
} from "./shiftAutofillModules/shiftAutofillCalculators.js";

/**
 * Canonical Facade: 1-Click SanPiN Shift & Month Autofill Routes (СанПиН 3.3686-21, Форма 257/у, 366/у)
 * Decomposed into modular architecture in ./shiftAutofillModules/
 *
 * Layer 0: shiftAutofillSchemas.ts (Zod Validation)
 * Layer 1/2: shiftAutofillCalculators.ts (Deterministic Calculation Engines)
 * Layer 2/3: shiftAutofillHandlers.ts (ACID Transaction Handlers)
 * Layer 5: shiftAutofillRoutes.ts (Compact Canonical Facade <= 250 lines)
 */
export function registerSanpinShiftAutofillRoutes(app: FastifyInstance) {
	// 7. 1-КЛИК АВТОПИЛОТ СМЕНЫ САНПИН (Форма 257/у, 366/у)
	app.post("/api/registers/autofill-shift", handleAutofillShift);
	app.post("/api/sanpin/shift-autofill", handleAutofillShift);

	// 8. 1-КЛИК АВТОПИЛОТ МЕСЯЦА САНПИН (Форма 257/у, 366/у)
	app.post("/api/registers/autofill-month", handleAutofillMonth);
	app.post("/api/sanpin/month-autofill", handleAutofillMonth);
}
