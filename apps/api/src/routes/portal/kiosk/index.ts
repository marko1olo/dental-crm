/**
 * apps/api/src/routes/portal/kiosk/index.ts
 *
 * Точка сборки маршрутов терминала самообслуживания (Kiosk)
 * (Мандаты 8b: Sweet Spot, 8e: автономия, 8n: малая клиника).
 */

import type { FastifyInstance } from "fastify";
import { handleKioskCheckinRequest } from "./kioskCheckinHandlers.js";
import type { SelfCheckinBody } from "./kioskPatientLookupHandlers.js";

export {
	kioskIpRequestCounts,
	KIOSK_RATE_LIMIT_WINDOW_MS,
	KIOSK_MAX_ATTEMPTS_PER_IP,
	resetKioskRateLimitsForTesting,
	maskPatientName,
	maskPatientName152Fz,
	checkKioskRateLimit,
} from "./kioskRateLimiter.js";

export {
	resolveOrganizationId,
	lookupPatient,
	lookupTodayAppointment,
	createEmergencyAppointment,
	getDoctorAndCabinetInfo,
	type SelfCheckinBody,
	type KioskPatientRecord,
	type KioskAppointmentRecord,
} from "./kioskPatientLookupHandlers.js";

export { handleKioskCheckinRequest } from "./kioskCheckinHandlers.js";

export async function registerPortalKioskRoutes(server: FastifyInstance): Promise<void> {
	server.post<{ Body: SelfCheckinBody }>("/self-checkin", async (request, reply) => {
		return handleKioskCheckinRequest(request, reply, false);
	});

	server.post<{ Body: SelfCheckinBody }>("/kiosk/checkin", async (request, reply) => {
		return handleKioskCheckinRequest(request, reply, false);
	});

	server.post<{ Body: SelfCheckinBody }>("/kiosk/emergency-checkin", async (request, reply) => {
		return handleKioskCheckinRequest(request, reply, true);
	});
}
