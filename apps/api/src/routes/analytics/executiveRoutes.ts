import type { ExecutiveDashboardPayload } from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	configuredClinicalAccessSecret,
	requireResolvedOrganizationId,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { roleHasPermission } from "../../security/permissions.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import { queryExecutiveDepartmentsAndDoctors } from "./executiveDoctorsQuery.js";
import {
	queryExecutiveKpiAndFunnel,
	resolveExecutiveDateRange,
} from "./executiveKpiQuery.js";

/**
 * Проверка прав доступа к аналитике руководителя:
 * Снимает блокировку скрытого adminSecret для авторизованного персонала клиники
 * (Мандаты 8e, 8n: управляющий, старший врач, владелец, соло-врач имеют доступ по своей учетной записи).
 */
async function requireExecutiveAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"executive analytics",
	);
	if (!orgId) return null;

	const identity = getRequestIdentity(request);

	// 1. Проверяем наличие валидного секрета администратора клиники (скрипты/интеграции/dev)
	const providedSecret = request.headers["x-dente-admin-secret"];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	const adminSecret = configuredClinicalAccessSecret();
	if (
		adminSecret &&
		timingSafeSecretEqual(
			typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null,
			adminSecret,
		)
	) {
		return orgId;
	}

	// 2. Авторизованный сотрудник клиники (управляющий, старший врач, владелец, администратор, соло-врач)
	if (identity.userId) {
		const role = (identity.role ?? "").toLowerCase();
		const executiveRoles = new Set([
			"owner",
			"admin",
			"manager",
			"director",
			"chief_doctor",
			"head_doctor",
			"administrator",
			"curator",
			"doctor", // Соло-врач (Мандаты 8e, 8n)
		]);

		if (executiveRoles.has(role) || roleHasPermission(role, "analytics.read")) {
			return orgId;
		}

		reply.code(403).send({
			error: "PermissionDenied",
			message: "Недостаточно прав для просмотра аналитики руководителя клиники.",
		});
		return null;
	}

	// 3. Dev / test bypass
	if (unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_READS")) {
		return orgId;
	}

	reply.code(401).send({
		error: "StaffAuthRequired",
		message: "Требуется вход управляющего, старшего врача или владельца клиники.",
	});
	return null;
}

/**
 * ====================================================================
 *  ФИЧА #29 — РАБОЧИЙ СТОЛ ГЕНЕРАЛЬНОГО ДИРЕКТОРА КЛИНИКИ (ФАСАД)
 * ====================================================================
 */
export async function registerExecutiveRoutes(app: FastifyInstance) {
	const getExecutiveSummary = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		try {
			const { period = "month", from, to } = request.query as {
				period?: string;
				from?: string;
				to?: string;
			};
			const range = resolveExecutiveDateRange(period, from, to);

			const { departments, activeDoctorsCount, topDoctors, topProcedures } =
				await queryExecutiveDepartmentsAndDoctors(orgId, range.startDate);

			const {
				kpis,
				funnelStages,
				totalRevenueKopecks,
				totalAppointments,
				plansPresentedCount,
			} = await queryExecutiveKpiAndFunnel(orgId, range, activeDoctorsCount);

			const payload: ExecutiveDashboardPayload = {
				kpis,
				funnelStages,
				departments,
				topDoctors,
				topProcedures,
				period: range.execPeriod,
				dateRangeStartIso: range.startDate.toISOString(),
				dateRangeEndIso: range.endDate.toISOString(),
				updatedAtIso: range.endDate.toISOString(),
				isEmpty:
					totalRevenueKopecks === 0 &&
					totalAppointments === 0 &&
					plansPresentedCount === 0,
			};

			return {
				success: true,
				data: payload,
			};
		} catch (e) {
			request.log.error(
				{ err: e },
				"Не удалось сформировать дашборд генерального директора",
			);
			return reply.code(503).send({
				success: false,
				error: "ExecutiveDashboardUnavailable",
				message:
					"Не удалось сформировать дашборд генерального директора. Повторите позже.",
			});
		}
	};

	app.get("/api/analytics/executive-summary", getExecutiveSummary);
	app.get("/api/analytics/executive", getExecutiveSummary);
}
