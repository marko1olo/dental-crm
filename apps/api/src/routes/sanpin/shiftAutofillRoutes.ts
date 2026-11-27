import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
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

const sanpinAutofillMutationSchema = {
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
} as const;

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
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/autofill-shift",
		permission: "public",
		schema: sanpinAutofillMutationSchema,
		handler: async ({ request, reply }) => handleAutofillShift(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/shift-autofill",
		permission: "public",
		schema: sanpinAutofillMutationSchema,
		handler: async ({ request, reply }) => handleAutofillShift(request, reply),
	});

	// 8. Автопилот месяца журналов СанПиН
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/autofill-month",
		permission: "public",
		schema: sanpinAutofillMutationSchema,
		handler: async ({ request, reply }) => handleAutofillMonth(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/month-autofill",
		permission: "public",
		schema: sanpinAutofillMutationSchema,
		handler: async ({ request, reply }) => handleAutofillMonth(request, reply),
	});
}
