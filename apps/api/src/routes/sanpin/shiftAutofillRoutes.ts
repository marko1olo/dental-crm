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

const sanpinAutofillMutationOptions = {
	schema: {
		description:
			"SanPiN autofill mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				"organizationid": { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
};

/**
 * Canonical Facade: Автопилот смены и месяца журналов СанПиН (Журнал автоклавирования и предстерилизационной очистки)
 * Decomposed into modular architecture in ./shiftAutofillModules/
 *
 * Layer 0: shiftAutofillSchemas.ts (Zod Validation)
 * Layer 1/2: shiftAutofillCalculators.ts (Deterministic Calculation Engines)
 * Layer 2/3: shiftAutofillHandlers.ts (ACID Transaction Handlers)
 * Layer 5: shiftAutofillRoutes.ts (Compact Canonical Facade <= 250 lines)
 */
export function registerSanpinShiftAutofillRoutes(app: FastifyInstance) {
	// 7. Автопилот смены журналов СанПиН
	app.post(
		"/api/registers/autofill-shift",
		sanpinAutofillMutationOptions,
		handleAutofillShift,
	);
	app.post(
		"/api/sanpin/shift-autofill",
		sanpinAutofillMutationOptions,
		handleAutofillShift,
	);

	// 8. Автопилот месяца журналов СанПиН
	app.post(
		"/api/registers/autofill-month",
		sanpinAutofillMutationOptions,
		handleAutofillMonth,
	);
	app.post(
		"/api/sanpin/month-autofill",
		sanpinAutofillMutationOptions,
		handleAutofillMonth,
	);
}
