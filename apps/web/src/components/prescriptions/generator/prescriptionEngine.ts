/**
 * DENTE Dental CRM — Statutory Prescription & Latin Rx Engine (Order 1094n)
 */

import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	calculatePrescriptionExpiration,
} from "@dental/shared";
import { DENTAL_MEDICATIONS_CATALOG, type DentalMedicationPreset } from "./prescriptionPresets";

export interface Form107PrescriptionInput {
	readonly prescriptionSeriesNumber: string;
	readonly dateIso: string;
	readonly validityDays: 15 | 30 | 60 | 365;
	readonly clinicName: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicInn?: string;
	readonly medicalLicenseNumber?: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientMedicalCardNumber: string;
	readonly patientAddress?: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly doctorSnils?: string;
	readonly selectedMedicationIds: readonly string[];
	readonly isChronicSpecialCare?: boolean;
	readonly chronicPeriodicity?: string;
	readonly ukepSignature?: {
		certificateSerialNumber?: string;
		certificateIssuer?: string;
		signedAt?: string;
		cryptoSignaturePkcs7?: string;
	} | null;
}

export interface Form107RenderedItem {
	readonly itemNumber: number;
	readonly latinRp: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly tradeNameRu: string;
}

export interface Form107PrescriptionDocument {
	readonly header: {
		readonly seriesNumber: string;
		readonly dateLabelRu: string;
		readonly validityPeriodLabelRu: string;
		readonly expiresAtIso: string;
		readonly clinicName: string;
		readonly clinicOgrn: string;
		readonly clinicAddress: string;
		readonly clinicInn?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly cardNum: string;
		readonly address?: string | undefined;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty: string;
		readonly snils?: string | undefined;
	};
	readonly items: readonly Form107RenderedItem[];
	readonly ukepSignature?: {
		certificateSerialNumber?: string | undefined;
		certificateIssuer?: string | undefined;
		signedAt?: string | undefined;
		cryptoSignaturePkcs7?: string | undefined;
	} | null | undefined;
	readonly isChronicSpecialCare?: boolean | undefined;
	readonly chronicPeriodicity?: string | undefined;
}

export function generateForm107Prescription(input: Form107PrescriptionInput): Form107PrescriptionDocument {
	const items: Form107RenderedItem[] = [];

	let count = 1;
	for (const id of input.selectedMedicationIds) {
		const med =
			DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === id) ||
			DENTAL_PRESCRIPTION_DRUG_CATALOG.find((m) => m.id === id);
		if (med) {
			items.push({
				itemNumber: count++,
				latinRp: med.latinRp,
				dispenseLatin: med.dispenseLatin,
				signaRu: med.signaRu,
				tradeNameRu: med.tradeNameRu,
			});
		}
	}

	const validityLabel =
		input.validityDays === 15
			? "15 дней (Срочный / ПКУ)"
			: input.validityDays === 30
				? "30 дней (Льготный)"
				: input.validityDays === 365
					? "1 год (Хронические / По спец. назначению)"
					: "60 дней (Стандарт)";

	const expiresAtIso = calculatePrescriptionExpiration(input.dateIso, input.validityDays);

	return {
		header: {
			seriesNumber: input.prescriptionSeriesNumber,
			dateLabelRu: input.dateIso,
			validityPeriodLabelRu: validityLabel,
			expiresAtIso,
			clinicName: input.clinicName,
			clinicOgrn: input.clinicOgrn,
			clinicAddress: input.clinicAddress,
			...(input.clinicInn ? { clinicInn: input.clinicInn } : {}),
			...(input.medicalLicenseNumber ? { medicalLicenseNumber: input.medicalLicenseNumber } : {}),
		},
		patient: {
			fullName: input.patientFullName,
			birthDate: input.patientBirthDate,
			cardNum: input.patientMedicalCardNumber,
			...(input.patientAddress ? { address: input.patientAddress } : {}),
		},
		doctor: {
			fullName: input.doctorFullName,
			specialty: input.doctorSpecialty,
			...(input.doctorSnils ? { snils: input.doctorSnils } : {}),
		},
		items,
		ukepSignature: input.ukepSignature || null,
		isChronicSpecialCare: input.isChronicSpecialCare || false,
		...(input.chronicPeriodicity ? { chronicPeriodicity: input.chronicPeriodicity } : {}),
	};
}

export interface PatientPrescriptionMemoParams {
	clinicName: string;
	clinicPhone: string;
	patientName: string;
	doctorName: string;
	prescriptionDate?: string | undefined;
	medications: readonly DentalMedicationPreset[];
}

export function formatPatientPrescriptionMemo(
	params: PatientPrescriptionMemoParams,
): string {
	const {
		clinicName,
		clinicPhone,
		patientName,
		doctorName,
		prescriptionDate,
		medications,
	} = params;

	const dateStr = prescriptionDate || new Date().toLocaleDateString("ru-RU");

	const medsList = medications.map((med, idx) => {
		const cleanSigna = med.signaRu
			.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
			.trim();
		return `${idx + 1}. ${med.tradeNameRu} (${med.activeSubstanceRu}, ${med.formRu}):\n   Способ применения: ${cleanSigna}`;
	});

	const lines = [
		`Схема приёма лекарственных препаратов (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата назначения: ${dateStr}`,
		"Назначенные препараты:",
		...medsList,
		`Памятка: строго соблюдайте назначенную дозировку и график приёма. Не прекращайте курс антибиотиков раньше указанного срока. При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
	];

	return lines.join("\n");
}

export const normalizeDrugId = (id: string): string => {
	if (id === "amoxiclav_875_125") return "amoxiclav_875";
	if (id === "nimesulide_100") return "nimesil_100";
	if (id === "cholisal_gel") return "holisal_gel";
	return id;
};

export interface DosageCalculationParams {
	readonly drugId: string;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
}

export interface DosageCalculationResult {
	readonly drugNameRu: string;
	readonly recommendedDosageRu: string;
	readonly standardFrequencyRu: string;
	readonly maxDailyDoseRu: string;
	readonly isPediatric: boolean;
	readonly warningRu?: string | undefined;
}

/**
 * DENTE Dental CRM — Clinical Outpatient Dosage Calculation Engine (Order 1094n / Mandate 8k)
 * Auto-calculates safe pediatric and adult medication dosage based on patient age and weight.
 */
export function calculateMedicationDosage(
	params: DosageCalculationParams,
): DosageCalculationResult | null {
	const { drugId, patientAgeYears, patientWeightKg } = params;
	const normId = normalizeDrugId(drugId);

	const isChild = patientAgeYears !== undefined && patientAgeYears < 12;
	const isAdolescent =
		patientAgeYears !== undefined && patientAgeYears >= 12 && patientAgeYears < 16;
	const weight = patientWeightKg && patientWeightKg > 0 ? patientWeightKg : isChild ? 25 : 70;

	if (
		normId === "amoxiclav_875" ||
		normId === "amoxicillin_500" ||
		drugId.includes("amoxiclav") ||
		drugId.includes("amoxicillin")
	) {
		if (isChild) {
			const dailyMg = Math.round(weight * 30);
			const singleMg = Math.round(dailyMg / 2);
			return {
				drugNameRu: "Амоксиклав (Амоксициллин + Клавуланат)",
				recommendedDosageRu: `Детская дозировка: ~${singleMg} мг 2 раза в сутки (из расчёта 25–45 мг/кг/сут в 2 приёма при массе ${weight} кг)`,
				standardFrequencyRu: "2 раза в сутки во время еды, курс 5–7 дней",
				maxDailyDoseRu: `${dailyMg} мг/сутки (макс 45 мг/кг/сут)`,
				isPediatric: true,
			};
		}
		return {
			drugNameRu: "Амоксиклав 875+125 мг",
			recommendedDosageRu: "1 таблетка (875/125 мг) 2 раза в сутки во время еды",
			standardFrequencyRu: "Каждые 12 часов во время еды, курс 5–7 дней",
			maxDailyDoseRu: "1750/250 мг в сутки (2 таблетки)",
			isPediatric: false,
		};
	}

	if (
		normId === "nimesil_100" ||
		drugId.includes("nimesulide") ||
		drugId.includes("nimesil")
	) {
		if (isChild) {
			return {
				drugNameRu: "Нимесил (Нимесулид)",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 12 лет (ГРЛС Минздрава РФ)",
				standardFrequencyRu: "Не назначать детям < 12 лет",
				maxDailyDoseRu: "0 мг (применяйте Ибупрофен или Парацетамол)",
				isPediatric: true,
				warningRu:
					"Нимесулид ПРОТИВОПОКАЗАН детям до 12 лет из-за риска острой гепатотоксичности. Рекомендуется заменить на Ибупрофен (10 мг/кг) или Парацетамол (15 мг/кг).",
			};
		}
		return {
			drugNameRu: "Нимесил (Нимесулид 100 мг)",
			recommendedDosageRu: "1 пакетик (100 мг) 2 раза в сутки после еды",
			standardFrequencyRu: "Каждые 12 часов после еды, растворив в 100 мл воды (курс 3–5 дней)",
			maxDailyDoseRu: "200 мг в сутки (2 пакетика)",
			isPediatric: false,
		};
	}

	if (drugId.includes("ibuprofen")) {
		if (isChild) {
			const singleMg = Math.round(weight * 10);
			const maxDailyMg = Math.round(weight * 30);
			return {
				drugNameRu: "Ибупрофен (суспензия/таблетки)",
				recommendedDosageRu: `Детская дозировка: ~${singleMg} мг на разовый приём (10 мг/кг, при массе ${weight} кг)`,
				standardFrequencyRu: "3 раза в сутки после еды с интервалом не менее 6–8 часов",
				maxDailyDoseRu: `${maxDailyMg} мг в сутки (макс 30 мг/кг/сут)`,
				isPediatric: true,
			};
		}
		return {
			drugNameRu: "Ибупрофен 400 мг",
			recommendedDosageRu: "1 таблетка (400 мг) 2–3 раза в сутки после еды",
			standardFrequencyRu: "2–3 раза в сутки после еды при болях (3–5 дней)",
			maxDailyDoseRu: "1200 мг в сутки (3 таблетки)",
			isPediatric: false,
		};
	}

	if (drugId.includes("ketorolac") || drugId.includes("ketanov")) {
		if (isChild || isAdolescent) {
			return {
				drugNameRu: "Кеторолак (Кетанов 10 мг)",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям и подросткам до 16 лет",
				standardFrequencyRu: "Не назначать лицам до 16 лет",
				maxDailyDoseRu: "0 мг (применяйте Ибупрофен или Парацетамол)",
				isPediatric: true,
				warningRu:
					"Кеторолак противопоказан лицам до 16 лет из-за риска ульцерогенного действия и тяжелых желудочно-кишечных осложнений.",
			};
		}
		return {
			drugNameRu: "Кеторолак (Кетанов 10 мг)",
			recommendedDosageRu: "1 таблетка (10 мг) при острой боли",
			standardFrequencyRu:
				"При выраженном болевом синдроме с интервалом не менее 4–6 часов (курс до 3–5 дней)",
			maxDailyDoseRu: "40 мг в сутки (4 таблетки)",
			isPediatric: false,
		};
	}

	if (drugId.includes("suprastin") || drugId.includes("chloropyramine")) {
		if (isChild) {
			const doseLabel =
				patientAgeYears && patientAgeYears < 6
					? "1/4 таблетки (6.25 мг) 2–3 раза в день во время еды"
					: "1/2 таблетки (12.5 мг) 2–3 раза в день во время еды";
			const maxDose =
				patientAgeYears && patientAgeYears < 6 ? "18.75 мг/сутки" : "37.5 мг/сутки";
			return {
				drugNameRu: "Супрастин (Хлоропирамин 25 мг)",
				recommendedDosageRu: doseLabel,
				standardFrequencyRu: "2–3 раза в сутки во время еды, курс 3–5 дней",
				maxDailyDoseRu: maxDose,
				isPediatric: true,
			};
		}
		return {
			drugNameRu: "Супрастин 25 мг",
			recommendedDosageRu: "1 таблетка (25 мг) 2–3 раза в сутки во время еды",
			standardFrequencyRu: "2–3 раза в сутки во время еды, курс 3–5 дней",
			maxDailyDoseRu: "75–100 мг в сутки",
			isPediatric: false,
		};
	}

	if (drugId.includes("chlorhexidine")) {
		return {
			drugNameRu: "Хлоргексидин 0.05%",
			recommendedDosageRu: "Ротовые ванночки 10–15 мл (1 столовая ложка)",
			standardFrequencyRu:
				"3 раза в день по 1 минуте после еды (не полоскать активно, не глотать!)",
			maxDailyDoseRu: "Местно, курс 7 дней",
			isPediatric: false,
		};
	}

	return null;
}

