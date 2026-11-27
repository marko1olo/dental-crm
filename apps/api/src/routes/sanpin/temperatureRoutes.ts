/**
 * apps/api/src/routes/sanpin/temperatureRoutes.ts
 * Тонкий фасад роутов контроля температуры и влажности.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handlePostTemperatureShiftAutopilot } from "./temperatureModules/temperatureAutopilotHandler.js";
import {
	handleGetTemperatureEquipments,
	handlePostTemperatureEquipment,
} from "./temperatureModules/temperatureEquipmentHandlers.js";
import {
	handleGetTemperatureLogs,
	handlePostTemperatureLog,
} from "./temperatureModules/temperatureLogHandlers.js";

const sanpinMutationSchema = {
	description:
		"SanPiN temperature & humidity mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerSanpinTemperatureRoutes(app: FastifyInstance) {
	// 1. Оборудование контроля (холодильники, помещения, гигрометры)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/temperature-humidity/equipments",
		permission: "public",
		handler: async ({ request, reply }) => handleGetTemperatureEquipments(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/temperature-humidity/equipments",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostTemperatureEquipment(request, reply),
	});

	// 2. Журнал замеров
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/temperature-humidity/logs",
		permission: "public",
		handler: async ({ request, reply }) => handleGetTemperatureLogs(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/temperature-humidity/logs",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostTemperatureLog(request, reply),
	});

	// 3. Пакетное заполнение нормы смены
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/temperature-humidity/shift-autopilot",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostTemperatureShiftAutopilot(request, reply),
	});
}
