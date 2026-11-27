/**
 * apps/api/src/routes/outpatient.ts
 * Фасад амбулаторной карты, одонтограммы, каталогов 043/у и экспертного аудита.
 * Декомпозирован по Mandate 8b (Layer 5 Facade, <= 80 строк).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../core/routeFactories.js";
import {
	getTeethCatalogHandler,
	getToothDefectsHandler,
	getToothDefectsTreeHandler,
} from "./outpatient/outpatientCatalogsHandlers.js";
import { checkLockStatusHandler } from "./outpatient/outpatientLockStatusHandler.js";
import { getMkbCategoriesTreeHandler } from "./outpatient/outpatientMkbHandlers.js";
import { handleGetOutpatientTemplates } from "./outpatient/outpatientTemplatesHandlers.js";
import { getVerifyQueueHandler } from "./outpatient/outpatientVerifyQueueHandler.js";
import { updateVerificationStatusHandler } from "./outpatient/outpatientVerifyStatusHandler.js";

export async function registerOutpatientRoutes(app: FastifyInstance): Promise<void> {
	// 1. Каталоги зубной системы (55 сущностей) и дефектов (91 дефект)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/catalogs/teeth",
		permission: "public",
		handler: async ({ request, reply }) => getTeethCatalogHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/catalogs/tooth-defects",
		permission: "public",
		handler: async ({ request, reply }) => getToothDefectsHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/catalogs/tooth-defects/tree",
		permission: "public",
		handler: async ({ request, reply }) => getToothDefectsTreeHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/catalogs/mkb/categories/tree",
		permission: "public",
		handler: async ({ request, reply }) => getMkbCategoriesTreeHandler(request, reply),
	});

	// 2. Шаблоны амбулаторной карты (Медицинская карта приёма)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/outpatient/templates",
		permission: "public",
		handler: async ({ request, reply }) => handleGetOutpatientTemplates(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/outpatient-templates",
		permission: "public",
		handler: async ({ request, reply }) => handleGetOutpatientTemplates(request, reply),
	});

	// 3. Клинический аудит качества и экспертиза ЭМК главным врачом (Мандат 8e)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/outpatient/verify",
		permission: "public",
		handler: async ({ request, reply }) => getVerifyQueueHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/outpatient/verify/:id/status",
		permission: "public",
		handler: async ({ request, reply }) => updateVerificationStatusHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/outpatient/verify/visit/:visitId/lock-status",
		permission: "public",
		handler: async ({ request, reply }) => checkLockStatusHandler(request, reply),
	});
}

export default registerOutpatientRoutes;
