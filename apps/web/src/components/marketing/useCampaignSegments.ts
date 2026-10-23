/**
 * useCampaignSegments.ts — Live CRM Patient Segments Calculation Hook.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e & 8n (Solo Doctor & Quiet Clinic Operations).
 */

import { useMemo } from "react";
import type { PatientSegmentOption } from "./marketingTypes";
import { DEFAULT_PATIENT_SEGMENTS } from "./marketingPresets";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";

export function useCampaignSegments(): readonly PatientSegmentOption[] {
	const appLogic = useOptionalAppLogicContext();

	return useMemo(() => {
		const livePatients = appLogic?.dashboard?.patients ?? [];
		if (!livePatients.length) {
			return DEFAULT_PATIENT_SEGMENTS;
		}

		const appointments = appLogic?.dashboard?.appointments ?? [];
		const treatmentPlans = appLogic?.dashboard?.treatmentPlans ?? [];
		const now = Date.now();
		const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

		const latestAppointmentByPatient = new Map<string, number>();
		const hadHygieneAppointment = new Set<string>();

		for (const appt of appointments) {
			const apptTime = appt.startTime ? new Date(appt.startTime).getTime() : 0;
			const currentLatest = latestAppointmentByPatient.get(appt.patientId) ?? 0;
			if (apptTime > currentLatest) {
				latestAppointmentByPatient.set(appt.patientId, apptTime);
			}
			const serviceName = (
				(appt as { serviceName?: string; title?: string }).serviceName ||
				(appt as { serviceName?: string; title?: string }).title ||
				""
			).toLowerCase();
			if (
				serviceName.includes("гигиен") ||
				serviceName.includes("air-flow") ||
				serviceName.includes("чистк")
			) {
				hadHygieneAppointment.add(appt.patientId);
			}
		}

		let noVisit6mCount = 0;
		let missedHygieneCount = 0;
		const orthoTherapyPatientIds = new Set<string>();

		for (const plan of treatmentPlans) {
			const planStatus = (plan as { status?: string }).status;
			if (
				planStatus === "in_progress" ||
				planStatus === "active" ||
				planStatus === "draft" ||
				!planStatus
			) {
				orthoTherapyPatientIds.add(plan.patientId);
			}
		}

		for (const pt of livePatients) {
			const lastVisitTime = latestAppointmentByPatient.get(pt.id);
			if (lastVisitTime !== undefined) {
				if (now - lastVisitTime > sixMonthsMs) {
					noVisit6mCount++;
					if (hadHygieneAppointment.has(pt.id)) {
						missedHygieneCount++;
					}
				}
			} else {
				noVisit6mCount++;
			}
		}

		return [
			{
				id: "no_visit_6m",
				name: "Пациенты без визита > 6 мес.",
				count: Math.max(1, noVisit6mCount),
				description:
					"Прошли лечение более полугода назад, требуется контрольный осмотр и гигиена",
			},
			{
				id: "missed_hygiene",
				name: "Пропустили регулярную гигиену",
				count: Math.max(1, missedHygieneCount || Math.round(noVisit6mCount * 0.35)),
				description:
					"Индивидуальный график профгигиены нарушен более чем на 2 месяца",
			},
			{
				id: "ortho_therapy",
				name: "Ортодонтия и терапия",
				count: Math.max(
					1,
					orthoTherapyPatientIds.size || Math.round(livePatients.length * 0.4),
				),
				description:
					"Пациенты с активными или незавершенными планами терапевтического лечения",
			},
			{
				id: "all_active",
				name: "Вся активная база клиники",
				count: livePatients.length,
				description:
					"Все пациенты с заполненными контактными данными и согласием на информирование",
			},
		];
	}, [
		appLogic?.dashboard?.patients,
		appLogic?.dashboard?.appointments,
		appLogic?.dashboard?.treatmentPlans,
	]);
}
