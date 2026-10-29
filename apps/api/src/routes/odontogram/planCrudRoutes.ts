import type { FastifyInstance } from "fastify";
import {
	handleGetTreatmentPlanById,
	handleListPatientTreatmentPlans,
	handleUpsertPatientTreatmentPlan,
} from "../treatmentPlan/patientTreatmentPlanHandlers.js";

export {
	handleGetTreatmentPlanById,
	handleListPatientTreatmentPlans,
	handleUpsertPatientTreatmentPlan,
};

/**
 * registerPlanCrudRoutes — фасад маршрутов планов лечения одонтограммы.
 *
 * Все канонические обработчики планов лечения консолидированы в едином источнике истины (SSOT):
 * @see apps/api/src/routes/treatmentPlan/patientTreatmentPlanHandlers.ts
 *
 * Мандаты 8b, 8e (Автономия врача: ноль 409 блокировок), 8n, 8x (живой клинический язык).
 */
export function registerPlanCrudRoutes(app: FastifyInstance) {
	// Безопасная регистрация маршрутов (не регистрируем повторно, если плагин treatmentPlanRoutes уже смонтирован)
	const hasGetId = typeof (app as any).hasRoute === "function"
		? (app as any).hasRoute({ method: "GET", url: "/api/treatment-plans/:id" })
		: false;

	if (!hasGetId) {
		app.get("/api/treatment-plans/:id", handleGetTreatmentPlanById);
		app.get("/api/treatment-plan/:id", handleGetTreatmentPlanById);
		app.get("/api/v1/treatment-plans/:id", handleGetTreatmentPlanById);
		app.get("/api/v1/treatment-plan/:id", handleGetTreatmentPlanById);
	}

	const hasGetPatientPlans = typeof (app as any).hasRoute === "function"
		? (app as any).hasRoute({ method: "GET", url: "/api/patients/:patientId/treatment-plans" })
		: false;

	if (!hasGetPatientPlans) {
		app.get("/api/patients/:patientId/treatment-plans", handleListPatientTreatmentPlans);
	}

	const hasPostPatientPlans = typeof (app as any).hasRoute === "function"
		? (app as any).hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans" })
		: false;

	if (!hasPostPatientPlans) {
		app.post("/api/patients/:patientId/treatment-plans", handleUpsertPatientTreatmentPlan);
	}
}

export default registerPlanCrudRoutes;
