/**
 * payroll.ts — Fastify API-маршруты расчета и закрытия зарплатной ведомости врачей (SSOT).
 * Декомпозирован в payrollModules/ в рамках Мандата 8b (ROT-009).
 */

import type { FastifyInstance } from "fastify";
import { isValidUuid } from "@dental/shared";
import { defineStreamRoute } from "../core/routeFactories.js";
import { requirePayoutAccess } from "./billingRoutes/payoutAccessService.js";
import { handleGetDoctorMyEarnings } from "./doctorMyEarningsHandler.js";
import { handleGetDoctorTodaySummary } from "./doctorPortal/todaySummaryHandler.js";
import {
	getPayrollCalculationsHandler,
	handleGetDoctorsList,
} from "./payrollModules/payrollCalculationsHandler.js";
import {
	payrollCalculationsQuerySchema,
	type PayrollCalculationsQuery,
} from "./payrollModules/payrollSchemas.js";
import {
	closeSettlementHandler,
	reopenSettlementHandler,
} from "./payrollModules/payrollSettlementHandlers.js";

export { payrollCalculationsQuerySchema, type PayrollCalculationsQuery };

export async function registerPayrollRoutes(app: FastifyInstance): Promise<void> {
	defineStreamRoute(app, { method: "GET", path: "/api/v1/doctors", permission: "public", handler: ({ request, reply }) => handleGetDoctorsList(request, reply) });

	defineStreamRoute(app, { method: "GET", path: "/api/v1/payroll/calculations", permission: "public", handler: ({ request, reply }) => getPayrollCalculationsHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/payroll/calculations", permission: "public", handler: ({ request, reply }) => getPayrollCalculationsHandler(request, reply) });

	defineStreamRoute(app, { method: "POST", path: "/api/v1/payroll/close-settlement", permission: "public", handler: ({ request, reply }) => closeSettlementHandler(request, reply) });
	defineStreamRoute(app, { method: "POST", path: "/api/payroll/close-settlement", permission: "public", handler: ({ request, reply }) => closeSettlementHandler(request, reply) });
	defineStreamRoute(app, { method: "POST", path: "/api/doctor/close-settlement-period", permission: "public", handler: ({ request, reply }) => closeSettlementHandler(request, reply) });

	const reopenPaths = [
		"/api/v1/payroll/reopen-settlement",
		"/api/payroll/reopen-settlement",
		"/api/doctor/settlement-period/reopen",
	];
	for (const routePath of reopenPaths) {
		// door-validation: none — валидация тела запроса делегирована в канонический reopenSettlementHandler (reopenSettlementSchema.safeParse)
		defineStreamRoute(app, {
			method: "POST",
			path: routePath,
			permission: "public",
			handler: async ({ request, reply }) => {
				const rawKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"];
				const idempotencyKey = typeof rawKey === "string" ? rawKey.trim() : null;
				if (idempotencyKey && !isValidUuid(idempotencyKey)) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
					});
				}
				const payoutAccess = await requirePayoutAccess(request, reply);
				if (!payoutAccess) return;
				const organizationId = payoutAccess.organizationId;
				if (!organizationId) {
					return reply.code(403).send({ error: "TenantContextRequired", message: "Требуется контекст организации" });
				}
				return reopenSettlementHandler(request, reply, payoutAccess, idempotencyKey);
			},
		});
	}

	// Мобильный кошелек начислений врача (SSOT)
	defineStreamRoute(app, { method: "GET", path: "/api/doctor/my-earnings", permission: "public", handler: ({ request, reply }) => handleGetDoctorMyEarnings(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/v1/doctor/my-earnings", permission: "public", handler: ({ request, reply }) => handleGetDoctorMyEarnings(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/my-earnings", permission: "public", handler: ({ request, reply }) => handleGetDoctorMyEarnings(request, reply) });

	// Живой счётчик заработка врача за смену (Doctor Today Earnings Hook)
	defineStreamRoute(app, { method: "GET", path: "/api/doctor-portal/today-summary", permission: "public", handler: ({ request, reply }) => handleGetDoctorTodaySummary(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/v1/doctor-portal/today-summary", permission: "public", handler: ({ request, reply }) => handleGetDoctorTodaySummary(request, reply) });
}

export default registerPayrollRoutes;
