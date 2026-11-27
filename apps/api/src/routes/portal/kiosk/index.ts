/**
 * apps/api/src/routes/portal/kiosk/index.ts
 *
 * Точка сборки маршрутов терминала самообслуживания (Kiosk)
 * (Мандаты 8b: Sweet Spot, 8e: автономия, 8n: малая клиника).
 */

import type { FastifyInstance } from "fastify";
import { definePublicRoute } from "../../../core/routeFactories.js";
import { handleKioskCheckinRequest } from "./kioskCheckinHandlers.js";
import type { SelfCheckinBody } from "./kioskPatientLookupHandlers.js";

export {
	kioskIpRequestCounts,
	KIOSK_RATE_LIMIT_WINDOW_MS,
	KIOSK_MAX_ATTEMPTS_PER_IP,
	resetKioskRateLimitsForTesting,
	maskPatientName,
	checkKioskRateLimit,
} from "./kioskRateLimiter.js";

export {
	resolveOrganizationId,
	lookupPatient,
	lookupTodayAppointment,
	createEmergencyAppointment,
	createFirstTimeAppointment,
	getDoctorAndCabinetInfo,
	type SelfCheckinBody,
	type KioskPatientRecord,
	type KioskAppointmentRecord,
} from "./kioskPatientLookupHandlers.js";

export { handleKioskCheckinRequest } from "./kioskCheckinHandlers.js";

export async function registerPortalKioskRoutes(server: FastifyInstance): Promise<void> {
	definePublicRoute(server, {
		method: "POST",
		path: "/self-checkin",
		handler: async ({ request, reply }) =>
			handleKioskCheckinRequest(
				request as Parameters<typeof handleKioskCheckinRequest>[0],
				reply,
				false,
			),
	});

	definePublicRoute(server, {
		method: "POST",
		path: "/kiosk/checkin",
		handler: async ({ request, reply }) =>
			handleKioskCheckinRequest(
				request as Parameters<typeof handleKioskCheckinRequest>[0],
				reply,
				false,
			),
	});

	definePublicRoute(server, {
		method: "POST",
		path: "/kiosk/emergency-checkin",
		handler: async ({ request, reply }) =>
			handleKioskCheckinRequest(
				request as Parameters<typeof handleKioskCheckinRequest>[0],
				reply,
				true,
			),
	});
}
