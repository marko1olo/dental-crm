/**
 * apps/api/src/routes/sanpin/temperatureRoutes.ts
 * Тонкий фасад роутов контроля температуры и влажности.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { handlePostTemperatureShiftAutopilot } from "./temperatureModules/temperatureAutopilotHandler.js";
import {
	handleGetTemperatureEquipments,
	handlePostTemperatureEquipment,
} from "./temperatureModules/temperatureEquipmentHandlers.js";
import {
	handleGetTemperatureLogs,
	handlePostTemperatureLog,
} from "./temperatureModules/temperatureLogHandlers.js";

const sanpinMutationOptions = {
	schema: {
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
	},
};

export function registerSanpinTemperatureRoutes(app: FastifyInstance) {
	// 1. Оборудование контроля (холодильники, помещения, гигрометры)
	app.get("/api/registers/temperature-humidity/equipments", handleGetTemperatureEquipments);
	app.post("/api/registers/temperature-humidity/equipments", sanpinMutationOptions, handlePostTemperatureEquipment);

	// 2. Журнал замеров
	app.get("/api/registers/temperature-humidity/logs", handleGetTemperatureLogs);
	app.post("/api/registers/temperature-humidity/logs", sanpinMutationOptions, handlePostTemperatureLog);

	// 3. 1-клик автопилот нормы смены
	app.post("/api/registers/temperature-humidity/shift-autopilot", sanpinMutationOptions, handlePostTemperatureShiftAutopilot);
}
