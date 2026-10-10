import {
	localBridgeUsePlansResponseSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { buildLocalBridgeReadiness } from "./systemHealthHandlers.js";
import {
	buildVisitDictationPlan,
	buildDocumentOcrPlan,
	buildPricePhotoPlan,
	buildCbctMprPlan,
	buildImagingImportPlan,
} from "./localBridgePlans.js";

export * from "./localBridgePlans.js";

export async function buildLocalBridgeUsePlans() {
	const readiness = await buildLocalBridgeReadiness();
	const plans = [
		buildVisitDictationPlan(readiness),
		buildDocumentOcrPlan(readiness),
		buildPricePhotoPlan(readiness),
		buildCbctMprPlan(readiness),
		buildImagingImportPlan(readiness),
	];
	const warningPlans = plans.filter((plan) => plan.warnings.length > 0);
	return localBridgeUsePlansResponseSchema.parse({
		generatedAt: new Date().toISOString(),
		readiness,
		plans,
		warnings: [
			...readiness.warnings,
			...warningPlans.map((plan) => `${plan.title}: ${plan.warnings[0]}`),
		].slice(0, 12),
		nextAction: plans.some((plan) => plan.primaryPath === "local_bridge")
			? "Локальное ускорение рабочей станции доступно для отдельных админских и тяжелых задач; рабочие процессы врача остаются очередью без блокировки."
			: "Готового локального модуля нет; рабочий путь сейчас: браузер, сервер или ручная проверка с детерминированными парсерами.",
	});
}

export function registerSystemConfigRoutes(app: FastifyInstance) {
	app.get("/api/system/local-bridges/use-plans", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"local bridge use plans",
			))
		)
			return;
		return buildLocalBridgeUsePlans();
	});
}
