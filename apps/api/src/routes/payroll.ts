/**
 * payroll.ts — Fastify API-маршруты расчета и закрытия зарплатной ведомости врачей (SSOT).
 * Декомпозирован в payrollModules/ в рамках Мандата 8b (ROT-009).
 */

import type { FastifyInstance } from "fastify";
import { isValidUuid } from "@dental/shared";
import { requirePayoutAccess } from "./billingRoutes/payoutAccessService.js";
import { handleGetDoctorMyEarnings } from "./doctorMyEarningsHandler.js";
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
	app.get("/api/v1/doctors", handleGetDoctorsList);

	app.get("/api/v1/payroll/calculations", getPayrollCalculationsHandler);
	app.get("/api/payroll/calculations", getPayrollCalculationsHandler);

	app.post("/api/v1/payroll/close-settlement", closeSettlementHandler);
	app.post("/api/payroll/close-settlement", closeSettlementHandler);
	app.post("/api/doctor/close-settlement-period", closeSettlementHandler);

	const reopenPaths = [
		"/api/v1/payroll/reopen-settlement",
		"/api/payroll/reopen-settlement",
		"/api/doctor/settlement-period/reopen",
	];
	for (const routePath of reopenPaths) {
		// door-validation: none — валидация тела запроса делегирована в канонический reopenSettlementHandler (reopenSettlementSchema.safeParse)
		app.post(routePath, async (request, reply) => {
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
		});
	}

	// Мобильный кошелек начислений врача (SSOT)
	app.get("/api/doctor/my-earnings", handleGetDoctorMyEarnings);
	app.get("/api/v1/doctor/my-earnings", handleGetDoctorMyEarnings);
	app.get("/api/my-earnings", handleGetDoctorMyEarnings);
}

export default registerPayrollRoutes;
