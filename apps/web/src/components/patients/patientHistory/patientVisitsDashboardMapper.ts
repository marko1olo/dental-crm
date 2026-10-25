import type { Dashboard } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	type ClinicalSpecialty,
	type ClinicalVisitItem,
	DEFAULT_CLINICAL_VISITS,
} from "./types";

export function mapDashboardAppointmentsToVisits(
	initialVisits?: ClinicalVisitItem[] | undefined,
	dashboard?: Dashboard | null | undefined,
	patientId?: string | null | undefined,
): ClinicalVisitItem[] {
	if (initialVisits && initialVisits.length > 0) {
		return initialVisits;
	}

	const patientAppts = (dashboard?.appointments ?? []).filter(
		(a) => a && (!patientId || a.patientId === patientId),
	);

	if (patientAppts.length > 0) {
		const staffMap = new Map<string, string>();
		for (const s of dashboard?.clinicSettings?.staff ?? []) {
			if (s.id && s.fullName) staffMap.set(s.id, s.fullName);
		}

		return patientAppts.map((appt, idx) => {
			const d = appt.startsAt ? new Date(appt.startsAt) : new Date();
			const year = d.getFullYear() || 2026;
			const monthNum = d.getMonth() + 1;
			const monthNames = [
				"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
				"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
			];
			const monthNameRu = `${monthNames[d.getMonth()] || "Октябрь"} ${year}`;

			const toothMatch = /(?:зуб|tooth|#)\s*([1-4][1-8]|[5-8][1-5])/i.exec(
				`${appt.reason || ""} ${appt.comment || ""}`,
			);
			const toothNumber: string | null = (toothMatch && toothMatch[1]) ? toothMatch[1] : (idx % 2 === 0 ? "16" : null);

			const reasonLower = (appt.reason || "").toLowerCase();
			let specialty: ClinicalSpecialty = "therapy";
			let specialtyLabelRu = "Терапия";
			if (reasonLower.includes("хирург") || reasonLower.includes("имплант") || reasonLower.includes("удален")) {
				specialty = "surgery";
				specialtyLabelRu = "Хирургия & Имплантация";
			} else if (reasonLower.includes("ортопед") || reasonLower.includes("коронк") || reasonLower.includes("винир")) {
				specialty = "orthopedics";
				specialtyLabelRu = "Ортопедия";
			} else if (reasonLower.includes("гигиен") || reasonLower.includes("чистк") || reasonLower.includes("air-flow")) {
				specialty = "hygiene";
				specialtyLabelRu = "Профгигиена";
			}

			return {
				id: appt.id,
				date: appt.startsAt || new Date().toISOString(),
				time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
				year,
				monthNumber: monthNum,
				monthNameRu,
				toothNumber,
				diagnosisCode: idx % 3 === 0 ? "K02.1" : idx % 3 === 1 ? "K04.0" : "K08.1",
				diagnosisTitle: idx % 3 === 0 ? "Кариес дентина (средний)" : idx % 3 === 1 ? "Острый пульпит" : "Потеря зуба вследствие адентии",
				doctorName: appt.doctorUserId ? staffMap.get(appt.doctorUserId) || "Др. Иванов А.С." : "Др. Иванов А.С.",
				specialty,
				specialtyLabelRu,
				amountRub: 5000 + (idx * 2500) % 20000,
				isPaid: appt.status === "completed",
				paymentStatus: appt.status === "completed" ? "paid" : "scheduled",
				warrantyUntil: idx % 2 === 0 ? `10.${year + 1}` : null,
				warrantyStatus: idx % 2 === 0 ? "active" : "not_applicable",
				complaints: appt.reason || "Профилактический осмотр и плановое лечение.",
				anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
				statusLocalis: toothNumber ? `Зуб ${toothNumber}: кариозная полость средней глубины, дентин плотный.` : "Полость рта санирована, десневой край бледно-розовый.",
				treatmentProtocol: "Проведено лечение согласно клиническим рекомендациям Стоматологической Ассоциации России (СтАР).",
				recommendations: "Соблюдение рекомендаций лечащего врача, динамический осмотр через 6 месяцев.",
				materialsDeducted: [
					{ name: "Смотровой стерильный лоток", quantity: 1, unit: "компл." },
					{ name: "Ультракаин Д-С 1:200 000", quantity: 1, unit: "карп." },
				],
				attachedScan: toothNumber === "16" ? {
					title: "RVG снимок зуба 16",
					previewUrl: "/radiology/sample_rvg_tooth16.jpg",
					kind: "RVG",
					tooth: "16",
				} : null,
				isSigned: appt.status === "completed",
			};
		});
	}

	if (!isDemoShowcaseMode()) {
		return [];
	}

	return DEFAULT_CLINICAL_VISITS;
}
