import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import type { PipelineResponse } from "../../../../pages/coordinator/pipeline/types";
import { logger } from "../../../../utils/logger";
import type { LivePatientPlanInfo } from "./presenterLauncherTypes";

export async function fetchTargetPatientPlan(
	patientId: string,
	planId: string,
): Promise<LivePatientPlanInfo | null> {
	try {
		const [patRes, planRes] = await Promise.all([
			fetch(`/api/patients/${encodeURIComponent(patientId)}`, {
				headers: getDenteAuthHeaders(),
			}),
			fetch(`/api/treatment-plans/${encodeURIComponent(planId)}`, {
				headers: getDenteAuthHeaders(),
			}),
		]);
		if (patRes.ok && planRes.ok) {
			const pat = await patRes.json();
			const planData = await planRes.json();
			return {
				patientName: pat.fullName || pat.name || "Пациент DENTE",
				patientId,
				patientPhone: pat.phone || "",
				patientBirthDate: pat.birthDate,
				doctorFullName: planData.doctorFullName || "Лечащий врач",
				doctorSpecialty: "Врач-стоматолог",
				planId,
				planCreatedAtIso: planData.createdAtIso || new Date().toISOString(),
				teeth: planData.teeth,
			};
		}
	} catch (err) {
		logger.warn("Ошибка загрузки целевого плана:", err);
	}
	return null;
}

export async function fetchPipelineFirstPlan(): Promise<LivePatientPlanInfo | null> {
	try {
		const pipelineRes = await fetch("/api/v1/treatment-plans/pipeline", {
			headers: getDenteAuthHeaders(),
		});
		if (!pipelineRes.ok) return null;
		const data: PipelineResponse = await pipelineRes.json();
		const allCards = Object.values(data.pipeline || {}).flat();
		const firstCard = allCards.find((c) => Boolean(c?.patientId && c.id));
		if (!firstCard) return null;

		let patientPhone = firstCard.patientPhone || "";
		let patientBirthDate: string | undefined;
		try {
			const pRes = await fetch(
				`/api/patients/${encodeURIComponent(firstCard.patientId)}`,
				{
					headers: getDenteAuthHeaders(),
				},
			);
			if (pRes.ok) {
				const pData = await pRes.json();
				patientPhone = pData.phone || patientPhone;
				patientBirthDate = pData.birthDate;
			}
		} catch {
			// fallback
		}

		return {
			patientName: firstCard.patientName || "Пациент",
			patientId: firstCard.patientId,
			patientPhone,
			patientBirthDate,
			doctorFullName: firstCard.doctorName || "Лечащий врач",
			doctorSpecialty: "Врач-стоматолог",
			planId: firstCard.id,
			planCreatedAtIso: firstCard.createdAt,
		};
	} catch (err) {
		logger.error("Ошибка загрузки воронки планов:", err);
		return null;
	}
}
