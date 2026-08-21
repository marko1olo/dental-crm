import { z } from "zod";
import {
	type DentalRadiologyStudyType,
	dentalRadiologyStudyLabels,
	dentalRadiologyStudyTypeSchema,
} from "./radiationDoseSheet.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * НАПРАВЛЕНИЕ НА РЕНТГЕНОЛОГИЧЕСКОЕ ИССЛЕДОВАНИЕ (КЛКТ / ОПТГ / ТРГ / ВИЗИО)
 * Стандарты лучевой диагностики в стоматологии и ЧЛО
 * СанПиН 2.6.1.1192-03 / Приказ Минздрава РФ № 560н
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Клиническая цель рентгенологического исследования */
export const radiologyReferralGoalSchema = z.enum([
	"endodontics", // Эндодонтическое лечение / поиск скрытых каналов / анатомия корней
	"implantology", // Планирование дентальной имплантации (оценка высоты/ширины кости, синус-лифтинг)
	"orthodontics", // Ортодонтическая диагностика / ТРГ цефалометрия / положение зачатков
	"surgery_extraction", // Удаление ретинированных / дистопированных третьих моляров (зубов мудрости)
	"periodontology", // Пародонтологическое обследование / резорбция альвеолярного гребня
	"periapical_cyst", // Оценка деструкции кости / подозрение на кисту / радикулярную гранулему
	"tmj_dysfunction", // Диагностика ВНЧС (суставные головки, щель, привычная окклюзия / открытый рот)
	"trauma", // Травма челюстно-лицевой области / перелом челюсти / вывих зуба
	"pediatric_development", // Оценка смены прикуса и минерализации зачатков у детей
	"general_screening", // Первичный панорамный скрининг зубочелюстной системы
]);
export type RadiologyReferralGoal = z.infer<typeof radiologyReferralGoalSchema>;

export const radiologyReferralGoalLabels: Record<RadiologyReferralGoal, string> = {
	endodontics: "Эндодонтическое лечение (контроль анатомии, каналов, апикального периодонтита)",
	implantology: "3D-планирование дентальной имплантации и костной пластики",
	orthodontics: "Ортодонтическое обследование (ТРГ, расчет телерентгенограммы)",
	surgery_extraction: "Хирургическая экстракция ретинированных / дистопированных зубов",
	periodontology: "Оценка состояния тканей пародонта и маргинальной костной резорбции",
	periapical_cyst: "Дифференциальная диагностика кистогранулем / одонтогенных кист / новообразований",
	tmj_dysfunction: "Комплексное исследование височно-нижнечелюстных суставов (ВНЧС)",
	trauma: "Травма ЧЛО, подозрение на перелом челюсти или фрактуру корня зуба",
	pediatric_development: "Контроль формирования зачатков постоянных зубов и сроков прорезывания",
	general_screening: "Первичный скрининг и комплексная диагностика полости рта",
};

/** Структурированный Payload направления на рентген-диагностику */
export const radiologyReferralPayloadSchema = z.object({
	formType: z.literal("radiology_referral").default("radiology_referral"),
	// Номер и дата направления
	referralNumber: z.string().trim().min(1).max(64),
	referralDate: z.string().trim().min(10).max(32),
	// Направляющая медицинская организация
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	// Пациент
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientPhone: z.string().trim().max(64).nullable().optional(),
	medicalCardNumber: z.string().trim().min(1).max(64),
	// Направивший врач
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	// Диагноз по МКБ-10
	diagnosisIcd10Code: z.string().trim().min(1).max(32),
	diagnosisDetailed: z.string().trim().min(1).max(500),
	// Вид рентгенологического исследования
	studyType: dentalRadiologyStudyTypeSchema.default("cbct_jaw_8x8"),
	// Цель исследования
	studyGoal: radiologyReferralGoalSchema.default("endodontics"),
	// Локализация / Целевые зубы по FDI (например "16, 36")
	targetTeethFdi: z.string().trim().max(64).default(""),
	// Область исследования словесно (например "Верхняя и нижняя челюсти", "Зуб 4.8", "ВНЧС")
	anatomicalArea: z.string().trim().min(1).max(160).default("Челюстно-лицевая область"),
	// Клиническое обоснование
	clinicalJustification: z.string().trim().max(1000).default(""),
	// Особые отметки
	hasMetallicArtifacts: z.boolean().default(false), // Наличие металлоконструкций / брекетов
	isPregnancyExcluded: z.boolean().default(true), // Беременность исключена
	specialInstructions: z.string().trim().max(500).nullable().optional(),
});
export type RadiologyReferralPayload = z.infer<typeof radiologyReferralPayloadSchema>;

/**
 * Автоматическая генерация направления на КЛКТ/ОПТГ из данных SOAP-дневника визита.
 */
export function generateRadiologyReferralPayloadFromSoap(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly phone?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly phone?: string | null;
		readonly medicalCardNumber: string;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
	};
	readonly diagnosisIcd10?: string | null;
	readonly diagnosisTooth?: string | null;
	readonly statusLocalis?: string | null;
	readonly studyType?: DentalRadiologyStudyType;
	readonly studyGoal?: RadiologyReferralGoal;
	readonly customReferralNumber?: string;
}): RadiologyReferralPayload {
	const icd = (options.diagnosisIcd10 || "K04.0").toUpperCase().trim();
	const teeth = (options.diagnosisTooth || "").trim();
	const referralNum =
		options.customReferralNumber ||
		`НАПР-ЛД-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

	// Автоопределение типа исследования и цели по МКБ-10
	let determinedStudy: DentalRadiologyStudyType = options.studyType || "cbct_jaw_8x8";
	let determinedGoal: RadiologyReferralGoal = options.studyGoal || "endodontics";

	if (!options.studyType || !options.studyGoal) {
		if (icd.startsWith("K04.5") || icd.startsWith("K04.8")) {
			determinedStudy = "cbct_segment_5x5";
			determinedGoal = "periapical_cyst";
		} else if (icd.startsWith("K04")) {
			determinedStudy = "cbct_segment_5x5";
			determinedGoal = "endodontics";
		} else if (icd.startsWith("K08.1") || icd.startsWith("Z51.8")) {
			determinedStudy = "cbct_jaw_8x8";
			determinedGoal = "implantology";
		} else if (icd.startsWith("K05.3")) {
			determinedStudy = "optg_digital_panoramic";
			determinedGoal = "periodontology";
		} else if (icd.startsWith("K07")) {
			determinedStudy = "cbct_full_maxillofacial_15x15";
			determinedGoal = "orthodontics";
		} else if (icd.startsWith("Z01.2")) {
			determinedStudy = "optg_digital_panoramic";
			determinedGoal = "general_screening";
		}
	}

	const areaText = teeth
		? `Область зубов: ${teeth}`
		: determinedStudy === "cbct_full_maxillofacial_15x15"
			? "Челюстно-лицевая область и ВНЧС"
			: "Зубные ряды верхней и нижней челюстей";

	const justification = options.statusLocalis
		? `В связи с клинической картиной: ${options.statusLocalis.slice(0, 300)}...`
		: `Уточнение анатомии корневых каналов, периапикального состояния и плотности костной ткани в области ${teeth || "челюстей"}.`;

	return {
		formType: "radiology_referral",
		referralNumber: referralNum,
		referralDate: new Date().toISOString().slice(0, 10),
		clinicLegalName: options.clinic.fullName,
		clinicAddress: options.clinic.address || null,
		clinicPhone: options.clinic.phone || null,
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		patientPhone: options.patient.phone || null,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог",
		diagnosisIcd10Code: icd,
		diagnosisDetailed: `${icd} Стоматологическое обследование ${teeth ? `(зуб ${teeth})` : ""}`.trim(),
		studyType: determinedStudy,
		studyGoal: determinedGoal,
		targetTeethFdi: teeth,
		anatomicalArea: areaText,
		clinicalJustification: justification,
		hasMetallicArtifacts: false,
		isPregnancyExcluded: true,
	};
}
