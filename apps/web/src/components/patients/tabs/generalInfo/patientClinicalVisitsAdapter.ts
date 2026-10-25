import { type ClinicalVisitItem, DEFAULT_CLINICAL_VISITS } from "../../PatientHistoryTab";
import type { PatientVisitHistoryItem } from "./types";

export function adaptPatientVisitsToClinicalTimeline(
	visitsHistory?: PatientVisitHistoryItem[] | null,
): ClinicalVisitItem[] {
	if (!visitsHistory || visitsHistory.length === 0) {
		return DEFAULT_CLINICAL_VISITS;
	}

	const monthNames = [
		"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
		"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
	];

	return visitsHistory.map((v) => {
		const parts = v.date.split(".");
		const d = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(v.date);
		const year = !Number.isNaN(d.getFullYear()) ? d.getFullYear() : 2026;
		const monthNumber = !Number.isNaN(d.getMonth()) ? d.getMonth() + 1 : 10;
		const monthNameRu = `${monthNames[monthNumber - 1] || "Октябрь"} ${year}`;

		const sLower = (v.services || "").toLowerCase();
		let specialty: "therapy" | "surgery" | "orthopedics" | "hygiene" = "therapy";
		let specialtyLabelRu = "Терапия";
		if (sLower.includes("хирург") || sLower.includes("имплант") || sLower.includes("удален") || (v.specialty || "").toLowerCase().includes("хирург")) {
			specialty = "surgery";
			specialtyLabelRu = "Хирургия & Имплантация";
		} else if (sLower.includes("ортопед") || sLower.includes("коронк") || (v.specialty || "").toLowerCase().includes("ортопед")) {
			specialty = "orthopedics";
			specialtyLabelRu = "Ортопедия";
		} else if (sLower.includes("гигиен") || sLower.includes("air-flow") || (v.specialty || "").toLowerCase().includes("гигиен")) {
			specialty = "hygiene";
			specialtyLabelRu = "Профгигиена";
		}

		let diagnosisCode = "K02.1";
		let diagnosisTitle = "Кариес дентина (средний)";
		if (specialty === "surgery") {
			diagnosisCode = "K08.1";
			diagnosisTitle = "Потеря зуба (адентия)";
		} else if (specialty === "hygiene") {
			diagnosisCode = "K03.6";
			diagnosisTitle = "Зубные отложения";
		} else if (specialty === "orthopedics") {
			diagnosisCode = "K07.2";
			diagnosisTitle = "Дефект твердых тканей";
		}

		return {
			id: v.id,
			date: v.date,
			time: v.time || "12:00",
			year,
			monthNumber,
			monthNameRu,
			toothNumber: v.toothNumber || null,
			diagnosisCode,
			diagnosisTitle,
			doctorName: v.doctorName,
			specialty,
			specialtyLabelRu,
			amountRub: v.amountRub,
			isPaid: v.status === "completed",
			paymentStatus: v.status === "completed" ? "paid" : "scheduled",
			warrantyUntil: specialty === "hygiene" ? null : `10.${year + 1}`,
			warrantyStatus: specialty === "hygiene" ? "not_applicable" : "active",
			complaints: `Плановое лечение: ${v.services}`,
			statusLocalis: v.toothNumber ? `Зуб ${v.toothNumber}: кариозная полость.` : "Полость рта санирована.",
			treatmentProtocol: v.services,
			recommendations: "Контрольный осмотр через 6 месяцев.",
			materialsDeducted: [
				{ name: "Смотровой набор", quantity: 1, unit: "компл." },
				{ name: "Анестетик Ультракаин Д-С", quantity: 1, unit: "карп." },
			],
			attachedScan: v.toothNumber ? {
				title: `RVG снимок зуба ${v.toothNumber}`,
				previewUrl: "/radiology/sample_rvg_tooth16.jpg",
				kind: "RVG",
				tooth: v.toothNumber,
			} : null,
			isSigned: v.status === "completed",
		};
	});
}
