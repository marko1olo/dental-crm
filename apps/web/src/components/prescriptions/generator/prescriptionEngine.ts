/**
 * DENTE Dental CRM — Statutory Prescription & Latin Rx Engine (Order 1094n)
 */

import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	calculatePrescriptionExpiration,
} from "@dental/shared";
export { calculatePrescriptionExpiration };
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
	patientName?: string;
	patientFullName?: string;
	doctorName?: string;
	doctorFullName?: string;
	prescriptionDate?: string | undefined;
	medications: readonly (DentalMedicationPreset | {
		id: string;
		nameRu?: string;
		tradeNameRu?: string;
		activeSubstanceRu?: string;
		formRu?: string;
		signaRu: string;
	})[];
}

export function formatPatientPrescriptionMemo(
	params: PatientPrescriptionMemoParams,
): string {
	const {
		clinicName,
		clinicPhone,
		prescriptionDate,
		medications,
	} = params;

	const patient = params.patientName || params.patientFullName || "";
	const doctor = params.doctorName || params.doctorFullName || "";
	const dateStr = prescriptionDate || new Date().toLocaleDateString("ru-RU");

	const medsList = medications.map((med, idx) => {
		const tradeName = med.tradeNameRu || (med as any).nameRu || med.id;
		const details = med.activeSubstanceRu
			? ` (${med.activeSubstanceRu}${med.formRu ? `, ${med.formRu}` : ""})`
			: "";
		const cleanSigna = med.signaRu
			.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
			.trim();
		return `${idx + 1}. ${tradeName}${details}:\n   Способ применения: ${cleanSigna}`;
	});

	const lines = [
		`Схема приёма лекарственных препаратов (клиника «${clinicName}»):`,
		`Пациент: ${patient}`,
		`Лечащий врач: ${doctor}`,
		`Дата назначения: ${dateStr}`,
		"Назначенные препараты:",
		...medsList,
		`Памятка: строго соблюдайте назначенную дозировку и график приёма. Не прекращайте курс антибиотиков раньше указанного срока. При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
		"Приказ Минздрава 1094н: официальный регламент назначения и отпуска лекарственных препаратов.",
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
	readonly isContraindicated?: boolean | undefined;
	readonly contraindicationReason?: string | undefined;
	readonly singleDoseMg?: number | undefined;
	readonly maxDailyDoseMg?: number | undefined;
	readonly maxCarpules?: number | undefined;
}

/**
 * DENTE Dental CRM — Clinical Outpatient Dosage Calculation Engine (Order 1094n / Mandate 8k)
 * Auto-calculates safe pediatric and adult medication dosage based on patient age and weight.
 */
export function calculateMedicationDosage(
	paramsOrDrugId: DosageCalculationParams | string,
	patientWeightKgArg?: number,
	patientAgeYearsArg?: number,
): DosageCalculationResult | null {
	const params: DosageCalculationParams =
		typeof paramsOrDrugId === "string"
			? {
					drugId: paramsOrDrugId,
					patientWeightKg: patientWeightKgArg,
					patientAgeYears: patientAgeYearsArg,
				}
			: paramsOrDrugId;

	const { drugId, patientAgeYears, patientWeightKg } = params;
	const normId = normalizeDrugId(drugId || "");

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
				isContraindicated: true,
				contraindicationReason:
					"Кеторолак противопоказан лицам до 16 лет из-за риска ульцерогенного действия и тяжелых желудочно-кишечных осложнений.",
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

	if (
		drugId.includes("articaine") ||
		drugId.includes("ultracain") ||
		drugId.includes("septanest") ||
		drugId.includes("ubistesin")
	) {
		if (patientAgeYears !== undefined && patientAgeYears < 4) {
			return {
				drugNameRu: "Артикаин + Эпинефрин 4%",
				recommendedDosageRu: "ПРОТИВОПОКАЗАН детям до 4 лет (ГРЛС Минздрава РФ)",
				standardFrequencyRu: "Не применять у детей младше 4 лет",
				maxDailyDoseRu: "0 мг (применяйте общую седацию или разрешенные возрастные препараты)",
				isPediatric: true,
				isContraindicated: true,
				contraindicationReason:
					"Артикаин противопоказан детям в возрасте до 4 лет ввиду отсутствия достаточного клинического опыта (ГРЛС Минздрава РФ).",
				maxCarpules: 0,
				singleDoseMg: 0,
				maxDailyDoseMg: 0,
				warningRu:
					"Артикаин противопоказан детям в возрасте до 4 лет ввиду отсутствия достаточного клинического опыта.",
			};
		}

		if (isChild) {
			const maxMg = Math.round(weight * 5);
			const carpules = Math.max(1, Math.floor(maxMg / 68));
			return {
				drugNameRu: "Артикаин 4% с эпинефрином (детская дозировка)",
				recommendedDosageRu: `Инфильтрация/проводниковая: 0.5–1 карпула (макс. доза ${maxMg} мг, ~${(maxMg / 68).toFixed(1)} карп. по 1.7 мл при массе ${weight} кг)`,
				standardFrequencyRu: "Однократно местно при стоматологическом вмешательстве",
				maxDailyDoseRu: `${maxMg} мг (макс. 5 мг/кг)`,
				isPediatric: true,
				isContraindicated: false,
				singleDoseMg: 68,
				maxDailyDoseMg: maxMg,
				maxCarpules: carpules,
				warningRu:
					"Рекомендуется использовать раствор с пониженной концентрацией вазоконстриктора 1:200 000 (Ультракаин Д-С). Обязательна аспирационная проба.",
			};
		}

		const maxAdultMg = Math.min(500, Math.round(weight * 7));
		const adultCarpules = Math.min(7, Math.max(1, Math.floor(maxAdultMg / 68)));
		return {
			drugNameRu: "Артикаин 4% с эпинефрином (взрослая дозировка)",
			recommendedDosageRu: "1–2 карпулы (1.7–3.4 мл) на рутинное вмешательство",
			standardFrequencyRu: "Однократно местно (инфильтрационная/проводниковая анестезия)",
			maxDailyDoseRu: `${maxAdultMg} мг (макс. 7 мг/кг, не более ~${(maxAdultMg / 68).toFixed(1)} карпул по 1.7 мл)`,
			isPediatric: false,
			isContraindicated: false,
			singleDoseMg: 68,
			maxDailyDoseMg: maxAdultMg,
			maxCarpules: adultCarpules,
		};
	}

	return null;
}

export interface DentalMnnDefinition {
	readonly id: string;
	readonly key?: string;
	readonly mnnRu: string;
	readonly mnnLatin: string;
	readonly aliasesRu: readonly string[];
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "anesthetic" | "antihistamine" | "dental_gel" | "other";
	readonly categoryLabelRu: string;
	readonly standardDosages: readonly string[];
	readonly maxSingleDoseRu: string;
	readonly maxDailyDoseRu: string;
	readonly pediatricNotesRu?: string | undefined;
	readonly standardSignaLatinPrefix: string;
	readonly standardSignaRussianTemplate: string;
}

const DENTAL_STATUTORY_MNN_ARRAY: readonly DentalMnnDefinition[] = [
	{
		id: "amoxicillin",
		mnnRu: "Амоксициллин",
		mnnLatin: "Amoxicillinum",
		aliasesRu: ["амоксициллин", "флемоксин", "amoxicillin", "flemoxin"],
		category: "antibiotic",
		categoryLabelRu: "Антибиотик пенициллинового ряда",
		standardDosages: ["250 мг", "500 мг", "875 мг", "1000 мг"],
		maxSingleDoseRu: "1000 мг",
		maxDailyDoseRu: "1500–2000 мг (до 3000 мг при тяжелых инфекциях)",
		pediatricNotesRu: "Детям: 25–45 мг/кг/сут в 2–3 приёма.",
		standardSignaLatinPrefix: "Rp.: Amoxicillini",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (500 мг) 3 раза в день через 8 ч, курс 5–7 дней.",
	},
	{
		id: "amoxicillin_clavulanate",
		mnnRu: "Амоксициллин + Клавулановая кислота",
		mnnLatin: "Amoxicillinum et Acidum clavulanicum",
		aliasesRu: ["амоксиклав", "аугментин", "панклав", "amoxicillin clavulanate", "клавуланат"],
		category: "antibiotic",
		categoryLabelRu: "Антибиотик пенициллиновый защищенный",
		standardDosages: ["500/125 мг", "875/125 мг"],
		maxSingleDoseRu: "875/125 мг (1 таблетка)",
		maxDailyDoseRu: "1750/250 мг (2 таблетки в сутки)",
		pediatricNotesRu: "Детям суспензия: 25–45 мг/кг/сут по амоксициллину в 2 приёма.",
		standardSignaLatinPrefix: "Rp.: Tab. Amoxicillini et Acidi clavulanici",
		standardSignaRussianTemplate: "Внутрь по 1 таб. (875/125 мг) 2 раза в день во время еды, курс 7 дней.",
	},
	{
		id: "ibuprofen",
		mnnRu: "Ибупрофен",
		mnnLatin: "Ibuprofenum",
		aliasesRu: ["ибупрофен", "нурофен", "миг", "фаспик", "ibuprofen", "nurofen"],
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик-антипиретик",
		standardDosages: ["200 мг", "400 мг"],
		maxSingleDoseRu: "400 мг (до 800 мг при выраженной боли)",
		maxDailyDoseRu: "1200 мг (максимально до 2400 мг под контролем врача)",
		pediatricNotesRu: "Детям: 10 мг/кг разовая доза, не более 30 мг/кг/сут.",
		standardSignaLatinPrefix: "Rp.: Ibuprofeni",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (400 мг) 2–3 раза в день после еды, при болях (3–5 дней).",
	},
	{
		id: "chlorhexidine",
		mnnRu: "Хлоргексидин",
		mnnLatin: "Chlorhexidinum",
		aliasesRu: ["хлоргексидин", "хлоргексидина биглюконат", "chlorhexidine"],
		category: "antiseptic",
		categoryLabelRu: "Антисептик катионный местный",
		standardDosages: ["0.05%", "0.12%", "0.2%"],
		maxSingleDoseRu: "10–15 мл (1 столовая ложка)",
		maxDailyDoseRu: "Местно, до 3–4 раз в день (курс не более 10–14 дней)",
		pediatricNotesRu: "Детям старше 6 лет под присмотром взрослых (не глотать).",
		standardSignaLatinPrefix: "Rp.: Sol. Chlorhexidini bigluconatis 0.05%",
		standardSignaRussianTemplate: "Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
	},
	{
		id: "articaine",
		mnnRu: "Артикаин + Эпинефрин",
		mnnLatin: "Articainum et Epinephrinum",
		aliasesRu: ["артикаин", "ультракаин", "септонест", "септанест", "убистезин", "брилокаин", "articaine", "ultracain"],
		category: "anesthetic",
		categoryLabelRu: "Местный анестетик амидного ряда с вазоконстриктором",
		standardDosages: ["4% + 1:100 000", "4% + 1:200 000"],
		maxSingleDoseRu: "7 мг/кг массы тела (у взрослых до 500 мг / ~7 карпул по 1.7 мл)",
		maxDailyDoseRu: "7 мг/кг (взрослые), 5 мг/кг (дети от 4 лет)",
		pediatricNotesRu: "Противопоказан детям до 4 лет. Детям от 4 лет (от 20 кг) макс. 5 мг/кг.",
		standardSignaLatinPrefix: "Rp.: Sol. Articaini 4% cum Epinephrino",
		standardSignaRussianTemplate: "Для инфильтрационной или проводниковой анестезии в стоматологии (1.7–3.4 мл).",
	},
	{
		id: "nimesulide",
		mnnRu: "Нимесулид",
		mnnLatin: "Nimesulidum",
		aliasesRu: ["нимесулид", "нимесил", "найз", "nimesulide", "nimesil"],
		category: "nsaid",
		categoryLabelRu: "НПВП (селективный ингибитор ЦОГ-2)",
		standardDosages: ["100 мг"],
		maxSingleDoseRu: "100 мг (1 пакетик/таблетка)",
		maxDailyDoseRu: "200 мг (2 пакетика в сутки)",
		pediatricNotesRu: "Противопоказан детям до 12 лет (риск гепатотоксичности).",
		standardSignaLatinPrefix: "Rp.: Nimesulidi 100 mg",
		standardSignaRussianTemplate: "Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, курс до 5 дней.",
	},
	{
		id: "ketorolac",
		mnnRu: "Кеторолак",
		mnnLatin: "Ketorolacum",
		aliasesRu: ["кеторолак", "кетанов", "кеторол", "ketorolac", "ketanov"],
		category: "nsaid",
		categoryLabelRu: "НПВП с выраженным анальгетическим действием",
		standardDosages: ["10 мг"],
		maxSingleDoseRu: "10 мг (1 таблетка)",
		maxDailyDoseRu: "40 мг (4 таблетки в сутки)",
		pediatricNotesRu: "Противопоказан детям и подросткам до 16 лет.",
		standardSignaLatinPrefix: "Rp.: Tab. Ketorolaci 10 mg",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (10 мг) при острой боли с интервалом не менее 4–6 часов (курс до 5 дней).",
	},
	{
		id: "chloropyramine",
		mnnRu: "Хлоропирамин",
		mnnLatin: "Chloropyraminum",
		aliasesRu: ["хлоропирамин", "супрастин", "suprastin", "chloropyramine"],
		category: "antihistamine",
		categoryLabelRu: "Антигистаминное средство 1-го поколения",
		standardDosages: ["25 мг"],
		maxSingleDoseRu: "25 мг (1 таблетка)",
		maxDailyDoseRu: "75–100 мг (3–4 таблетки в сутки)",
		pediatricNotesRu: "Детям: от 1 до 6 лет по 1/4 таб. 2-3 р/д; от 6 до 14 лет по 1/2 таб. 2-3 р/д.",
		standardSignaLatinPrefix: "Rp.: Tab. Chloropyramini 25 mg",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (25 мг) 2–3 раза в день во время еды, курс 3–5 дней.",
	},
];

export const DENTAL_STATUTORY_MNN_CATALOG: readonly DentalMnnDefinition[] & Record<string, DentalMnnDefinition> = Object.assign(
	DENTAL_STATUTORY_MNN_ARRAY.map((item) => ({ ...item, key: item.id })),
	Object.fromEntries(DENTAL_STATUTORY_MNN_ARRAY.map((item) => [item.id, { ...item, key: item.id }])),
);

export interface DentalMnnValidationResult {
	readonly isValid: boolean;
	readonly matchedMnn?: DentalMnnDefinition | undefined;
	readonly normalizedQuery: string;
	readonly messageRu: string;
	readonly isTradeName?: boolean | undefined;
	readonly warning?: string | undefined;
}

/**
 * Валидация Международного Непатентованного Наименования (МНН) препарата
 * согласно требованиям Приказа Минздрава России № 1094н и ГРЛС РФ.
 */
export function validateDentalMnn(query: string): DentalMnnValidationResult {
	const cleaned = query.trim().toLowerCase();
	if (!cleaned) {
		return {
			isValid: false,
			normalizedQuery: "",
			messageRu: "Наименование МНН препарата не может быть пустым.",
			warning: "Наименование МНН препарата не может быть пустым.",
		};
	}

	const found = DENTAL_STATUTORY_MNN_CATALOG.find((item) => {
		if (item.mnnRu.toLowerCase() === cleaned) return true;
		if (item.mnnLatin.toLowerCase() === cleaned) return true;
		if (item.aliasesRu.some((a) => cleaned.includes(a.toLowerCase()) || a.toLowerCase().includes(cleaned))) return true;
		return false;
	});

	if (found) {
		const isDirectMnn =
			found.mnnRu.toLowerCase() === cleaned ||
			found.mnnLatin.toLowerCase() === cleaned;
		const isTradeName = !isDirectMnn;

		return {
			isValid: true,
			matchedMnn: { ...found, key: found.id },
			normalizedQuery: cleaned,
			isTradeName,
			messageRu: `Препарат верифицирован по МНН Минздрава РФ: ${found.mnnRu} (${found.mnnLatin}). Группа: ${found.categoryLabelRu}.`,
			warning: isTradeName
				? `Внимание (Приказ 1094н): указано торговое наименование «${query}». В официальном рецептурном бланке препарат будет выписан по МНН: «${found.mnnRu}».`
				: undefined,
		};
	}

	return {
		isValid: false,
		normalizedQuery: cleaned,
		messageRu: `Препарат «${query}» не найден в каноническом стоматологическом справочнике МНН (Приказ 1094н). Рекомендуется сверить с Государственным реестром лекарственных средств (ГРЛС).`,
		warning: `По Приказу Минздрава РФ № 1094н выписка рецептов осуществляется строго по МНН. Торговое или незарегистрированное название «${query}» требует уточнения МНН.`,
	};
}

export interface LatinRxSignaValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly parsedComponents: {
		readonly hasRpPrefix: boolean;
		readonly hasDispenseDtd: boolean;
		readonly hasSignaPrefix: boolean;
		readonly cleanedSignaRu: string;
	};
}

/**
 * Валидация способа применения и латинской прописи по Приказу 1094н (Rp, Dtd, Signa).
 */
export function validateLatinRxSigna(params: {
	latinRp?: string;
	latinName?: string;
	dispenseLatin?: string;
	dispenseFormula?: string;
	signaRu?: string;
}): LatinRxSignaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const rp = (params.latinRp || params.latinName || "").trim();
	const dtd = (params.dispenseLatin || params.dispenseFormula || "").trim();
	const signa = (params.signaRu || "").trim();

	const hasRpPrefix = /^Rp\s*[.:]/i.test(rp);
	if (!hasRpPrefix) {
		errors.push("Латинская часть прописи обязана начинаться с 'Rp.:' (Recipe — Возьми).");
	}

	const hasDispenseDtd = /^D\.?\s*t\.?\s*d\.?/i.test(dtd);
	if (!hasDispenseDtd) {
		errors.push("Указание отпуска препарата обязано содержать формулу 'D.t.d.' (Da tales doses — Выдай такие дозы).");
	}

	const hasSignaPrefix = /^(?:D\.?\s*)?S[.:]?\s*/i.test(signa);
	const cleanedSignaRu = signa.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "").trim();

	if (!cleanedSignaRu) {
		errors.push("Сигнатура (способ применения) не может быть пустой (Приказ Минздрава РФ № 1094н).");
	}

	if (
		/^(?:известно|внутреннее|наружное|по указанию|по назначению|как обычно|по схеме|по назначению врача|употреблять по указанию|внутрь как обычно)$/i.test(cleanedSignaRu) ||
		/по назначению врача/i.test(cleanedSignaRu) ||
		/употреблять по указанию/i.test(cleanedSignaRu) ||
		/по схеме/i.test(cleanedSignaRu) ||
		/^известно$/i.test(cleanedSignaRu) ||
		/^внутреннее$/i.test(cleanedSignaRu) ||
		/^наружное$/i.test(cleanedSignaRu)
	) {
		errors.push("По Приказу № 1094н запрещается ограничиваться неопределенными общими указаниями: «Внутреннее», «Известно», «По схеме», «По назначению врача». Укажите точную дозу, кратность и курс.");
	}

	const hasFrequency = /(?:раз[а-я]*\s+в\s+(?:день|сутки)|каждые|утром|вечером|после еды|до еды|во время еды|при болях|ванночки|полоска|анестези)/i.test(cleanedSignaRu);
	if (!hasFrequency && cleanedSignaRu.length > 0) {
		warnings.push("В сигнатуре рекомендуется указать кратность приёма или взаимосвязь с приёмом пищи/манипуляцией.");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		parsedComponents: {
			hasRpPrefix,
			hasDispenseDtd,
			hasSignaPrefix,
			cleanedSignaRu,
		},
	};
}

export interface DosageValidationParams {
	readonly drugIdOrMnn?: string;
	readonly medicationKey?: string;
	readonly dosageText?: string | undefined;
	readonly singleDoseMg?: number | undefined;
	readonly prescribedDoseMg?: number | undefined;
	readonly dailyDoseMg?: number | undefined;
	readonly carpulesCount?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
}

export interface DosageValidationResult {
	readonly isValid: boolean;
	readonly isPediatric: boolean;
	readonly status: "normal" | "warning" | "contraindicated";
	readonly messageRu: string;
	readonly calculatedMaxDoseRu?: string | undefined;
	readonly errors: readonly string[];
}

/**
 * Валидация дозировки препарата с контролем педиатрических ограничений и токсических максимумов.
 */
export function validatePrescriptionDosage(
	params: DosageValidationParams,
): DosageValidationResult {
	const errors: string[] = [];
	const drugId = params.medicationKey || params.drugIdOrMnn || "";
	const prescribedMg = params.prescribedDoseMg ?? params.singleDoseMg;

	const calc = calculateMedicationDosage({
		drugId,
		patientAgeYears: params.patientAgeYears,
		patientWeightKg: params.patientWeightKg,
	});

	if (!calc) {
		return {
			isValid: true,
			isPediatric: params.patientAgeYears !== undefined && params.patientAgeYears < 18,
			status: "normal",
			messageRu: "Дозировка в пределах стандартной клинической практики стоматологии.",
			errors: [],
		};
	}

	if (calc.isContraindicated || (calc.warningRu && /противопоказан/i.test(calc.warningRu))) {
		const reason =
			calc.contraindicationReason ||
			calc.warningRu ||
			"Препарат противопоказан для данной возрастной группы пациента.";
		errors.push(reason);
		return {
			isValid: false,
			isPediatric: calc.isPediatric,
			status: "contraindicated",
			messageRu: reason,
			calculatedMaxDoseRu: calc.maxDailyDoseRu,
			errors,
		};
	}

	if (prescribedMg !== undefined) {
		if (calc.maxDailyDoseMg !== undefined && prescribedMg > calc.maxDailyDoseMg) {
			errors.push(
				`Назначенная доза ${prescribedMg} мг превышает максимально допустимую (${calc.maxDailyDoseMg} мг).`,
			);
		}
		if (drugId.includes("amoxicillin") && prescribedMg > 1000) {
			errors.push(
				`Назначенная доза ${prescribedMg} мг превышает максимально допустимую разовую дозу амоксициллина (1000 мг).`,
			);
		}
	}

	if (params.dailyDoseMg !== undefined) {
		if (drugId.includes("ibuprofen") && params.dailyDoseMg > 1200) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Суточная доза ибупрофена ${params.dailyDoseMg} мг превышает стандартный амбулаторный максимум (1200 мг/сут). Требуется строгий гастропротективный контроль.`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
		if (drugId.includes("nimesulide") && params.dailyDoseMg > 200) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Суточная доза нимесулида ${params.dailyDoseMg} мг превышает допустимый максимум 200 мг/сут (2 пакетика). Риск гепатотоксичности.`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
		if (drugId.includes("ketorolac") && params.dailyDoseMg > 40) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Суточная доза кеторолака ${params.dailyDoseMg} мг превышает максимальную (40 мг/сут). Высокий риск желудочно-кишечных кровотечений.`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
	}

	if (params.carpulesCount !== undefined && (drugId.includes("articaine") || drugId.includes("ultracain"))) {
		const weight = params.patientWeightKg && params.patientWeightKg > 0 ? params.patientWeightKg : 70;
		const maxMg = params.patientAgeYears !== undefined && params.patientAgeYears < 12 ? weight * 5 : Math.min(500, weight * 7);
		const maxCarp = maxMg / 68;
		if (params.carpulesCount > maxCarp) {
			return {
				isValid: errors.length === 0,
				isPediatric: calc.isPediatric,
				status: "warning",
				messageRu: `Количество карпул артикаина (${params.carpulesCount}) превышает расчетную безопасную дозу (~${maxCarp.toFixed(1)} карп. для массы ${weight} кг).`,
				calculatedMaxDoseRu: calc.maxDailyDoseRu,
				errors,
			};
		}
	}

	return {
		isValid: errors.length === 0,
		isPediatric: calc.isPediatric,
		status: errors.length > 0 ? "contraindicated" : "normal",
		messageRu: errors.length > 0 ? errors.join("; ") : "Дозировка подтверждена.",
		calculatedMaxDoseRu: calc.maxDailyDoseRu,
		errors,
	};
}


