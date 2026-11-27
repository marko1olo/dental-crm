/**
 * apps/api/src/routes/insuranceRoutes/guaranteeLetterHandlers.ts
 *
 * Canonical SSOT Facade for DMS Guarantee Letters API routes.
 * Decomposed into focused modules under guaranteeLetterModules/ per Mandate 8b (< 300 lines):
 * - guaranteeLetterQueryHandlers: GET /api/insurance/guarantee-letters & by :letterId
 * - guaranteeLetterMutationHandlers: POST create, PUT update, DELETE cancel
 * - guaranteeLetterUsageHandlers: POST /record-usage with mandatory Idempotency-Key
 * - guaranteeLetterFormatters: UUID validation, ISO dates, response formatting
 */

import type { FastifyInstance } from "fastify";
import { registerGuaranteeLetterQueryRoutes } from "./guaranteeLetterModules/guaranteeLetterQueryHandlers.js";
import { registerGuaranteeLetterMutationRoutes } from "./guaranteeLetterModules/guaranteeLetterMutationHandlers.js";
import { registerGuaranteeLetterUsageRoutes } from "./guaranteeLetterModules/guaranteeLetterUsageHandlers.js";

export async function registerGuaranteeLetterRoutes(app: FastifyInstance) {
	registerGuaranteeLetterQueryRoutes(app);
	registerGuaranteeLetterMutationRoutes(app);
	registerGuaranteeLetterUsageRoutes(app);
}

export {
	registerGuaranteeLetterQueryRoutes,
} from "./guaranteeLetterModules/guaranteeLetterQueryHandlers.js";

export {
	handleCreateGuaranteeLetter,
	handleUpdateGuaranteeLetter,
	handleDeleteGuaranteeLetter,
} from "./guaranteeLetterModules/guaranteeLetterMutationHandlers.js";

export {
	handleRecordGuaranteeLetterUsage,
} from "./guaranteeLetterModules/guaranteeLetterUsageHandlers.js";

export {
	formatGuaranteeLetterResponse,
	isValidUuid,
	safeToIsoString,
} from "./guaranteeLetterModules/guaranteeLetterFormatters.js";
