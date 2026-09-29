/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U CLINICAL MATH, VALIDATION & EXPORT ENGINE
 * Order of the Ministry of Health of Russia № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	MedicalCardForm043uData,
	Form043ValidationResult,
} from "./emr043Types";
import {
	type FdiToothRecord,
	type DmftIndex,
	type CpitnSextantCode,
	calculateDmftFromOdontogram,
} from "@dental/shared";

/** Экранирование специальных символов HTML */
export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/** Расчет возраста пациента в годах с правильным русским склонением */
export function formatPatientAge(birthDateStr: string, referenceDateStr?: string): string {
	if (!birthDateStr) return "Возраст не указан";
	const birthDate = new Date(birthDateStr);
	if (Number.isNaN(birthDate.getTime())) return "Возраст не указан";

	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	let ageYears = refDate.getFullYear() - birthDate.getFullYear();
	const monthDiff = refDate.getMonth() - birthDate.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
		ageYears--;
	}

	if (ageYears < 0) return "0 лет";
	if (ageYears === 0) {
		const months = (refDate.getFullYear() - birthDate.getFullYear()) * 12 + (refDate.getMonth() - birthDate.getMonth());
		if (months <= 1) return "1 месяц";
		if (months >= 2 && months <= 4) return `${months} месяца`;
		return `${Math.max(1, months)} месяцев`;
	}

	const rem10 = ageYears % 10;
	const rem100 = ageYears % 100;
	if (rem100 >= 11 && rem100 <= 19) return `${ageYears} лет`;
	if (rem10 === 1) return `${ageYears} год`;
	if (rem10 >= 2 && rem10 <= 4) return `${ageYears} года`;
	return `${ageYears} лет`;
}

/** Расчет индекса КПУ / DMFT по зубной формуле */
export function calculateDmftIndex(teeth: FdiToothRecord[]): DmftIndex & { dmftTotal: number; intensityLevelLabel: string } {
	return calculateDmftFromOdontogram(teeth);
}

/** Расчет и расшифровка пародонтального индекса CPITN (PSR) */
export function calculateCpitnIndex(sextants: {
	sextant18_14?: CpitnSextantCode;
	sextant13_23?: CpitnSextantCode;
	sextant24_28?: CpitnSextantCode;
	sextant48_44?: CpitnSextantCode;
	sextant43_33?: CpitnSextantCode;
	sextant34_38?: CpitnSextantCode;
}): {
	maxCode: number;
	maxCodeText: string;
	treatmentNeedCategory: "0_none" | "1_hygiene_instructions" | "2_scaling_root_planing" | "3_complex_periodontal";
	treatmentNeedLabel: string;
	treatmentRecommendations: string;
} {
	const values = [
		sextants.sextant18_14 || "0_healthy",
		sextants.sextant13_23 || "0_healthy",
		sextants.sextant24_28 || "0_healthy",
		sextants.sextant48_44 || "0_healthy",
		sextants.sextant43_33 || "0_healthy",
		sextants.sextant34_38 || "0_healthy",
	];

	const codeRank = (code: string): number => {
		if (code.startsWith("4")) return 4;
		if (code.startsWith("3")) return 3;
		if (code.startsWith("2")) return 2;
		if (code.startsWith("1")) return 1;
		return 0;
	};

	let maxCode = 0;
	for (const val of values) {
		const r = codeRank(val);
		if (r > maxCode) maxCode = r;
	}

	switch (maxCode) {
		case 4:
			return {
				maxCode: 4,
				maxCodeText: "Код 4: Пародонтальный карман глубиной 6 мм и более",
				treatmentNeedCategory: "3_complex_periodontal",
				treatmentNeedLabel: "TN-3: Комплексное пародонтологическое лечение",
				treatmentRecommendations: "Глубокий поддесневой скейлинг, кюретаж / лоскутные операции, антимикробная терапия, шинирование при подвижности.",
			};
		case 3:
			return {
				maxCode: 3,
				maxCodeText: "Код 3: Пародонтальный карман глубиной 4-5 мм",
				treatmentNeedCategory: "2_scaling_root_planing",
				treatmentNeedLabel: "TN-2: Скейлинг и снятие поддесневых отложений",
				treatmentRecommendations: "Профессиональная гигиена, закрытый кюретаж, полировка корней (Root Planing), местная противовоспалительная терапия.",
			};
		case 2:
			return {
				maxCode: 2,
				maxCodeText: "Код 2: Над- и поддесневой зубной камень, нависающие края пломб",
				treatmentNeedCategory: "2_scaling_root_planing",
				treatmentNeedLabel: "TN-2: Профессиональная гигиена полости рта",
				treatmentRecommendations: "Ультразвуковой скейлинг, воздушно-абразивная обработка Air-Flow, устранение ретенционных факторов (коррекция пломб), полировка.",
			};
		case 1:
			return {
				maxCode: 1,
				maxCodeText: "Код 1: Кровоточивость при зондировании без карманов и камня",
				treatmentNeedCategory: "1_hygiene_instructions",
				treatmentNeedLabel: "TN-1: Индивидуальный инструктаж по гигиене",
				treatmentRecommendations: "Обучение контролируемой чистке зубов, подбор межзубных ершиков, флоссов, антисептические ополаскиватели.",
			};
		default:
			return {
				maxCode: 0,
				maxCodeText: "Код 0: Ткани пародонта здоровы, патологических карманов нет",
				treatmentNeedCategory: "0_none",
				treatmentNeedLabel: "TN-0: Лечение не требуется",
				treatmentRecommendations: "Поддерживающая индивидуальная гигиена полости рта, профилактический осмотр через 6 месяцев.",
			};
	}
}

/** Расчет индекса гигиены Грина-Вермиллиона (OHI-S) */
export function calculateOhiSScore(debrisScores: number[], calculusScores: number[]): {
	debrisScore: number;
	calculusScore: number;
	totalScore: number;
	ratingText: string;
	clinicalEvaluation: "good" | "satisfactory" | "unsatisfactory" | "poor";
} {
	const avgDebris = debrisScores.length > 0
		? debrisScores.reduce((a, b) => a + b, 0) / debrisScores.length
		: 0;
	const avgCalculus = calculusScores.length > 0
		? calculusScores.reduce((a, b) => a + b, 0) / calculusScores.length
		: 0;
	const total = Number((avgDebris + avgCalculus).toFixed(2));

	if (total <= 0.6) {
		return {
			debrisScore: Number(avgDebris.toFixed(2)),
			calculusScore: Number(avgCalculus.toFixed(2)),
			totalScore: total,
			ratingText: `OHI-S = ${total} (Хороший уровень гигиены)`,
			clinicalEvaluation: "good",
		};
	}
	if (total <= 1.6) {
		return {
			debrisScore: Number(avgDebris.toFixed(2)),
			calculusScore: Number(avgCalculus.toFixed(2)),
			totalScore: total,
			ratingText: `OHI-S = ${total} (Удовлетворительный уровень гигиены)`,
			clinicalEvaluation: "satisfactory",
		};
	}
	if (total <= 2.5) {
		return {
			debrisScore: Number(avgDebris.toFixed(2)),
			calculusScore: Number(avgCalculus.toFixed(2)),
			totalScore: total,
			ratingText: `OHI-S = ${total} (Неудовлетворительный уровень гигиены)`,
			clinicalEvaluation: "unsatisfactory",
		};
	}
	return {
		debrisScore: Number(avgDebris.toFixed(2)),
		calculusScore: Number(avgCalculus.toFixed(2)),
		totalScore: total,
		ratingText: `OHI-S = ${total} (Плохой уровень гигиены)`,
		clinicalEvaluation: "poor",
	};
}

/** Валидация полноты медицинской карты 043/у по Приказу Минздрава РФ № 834н */
export function validateForm043uCompleteness(data: MedicalCardForm043uData): Form043ValidationResult {
	const missingFields: Form043ValidationResult["missingFields"] = [];
	const warnings: string[] = [];

	let totalChecks = 0;
	let passedChecks = 0;

	const check = (
		condition: boolean,
		fieldKey: string,
		label: string,
		category: Form043ValidationResult["missingFields"][0]["category"],
		severity: "critical" | "warning" = "critical",
	) => {
		totalChecks++;
		if (condition) {
			passedChecks++;
		} else {
			missingFields.push({ fieldKey, label, category, severity });
		}
	};

	// Паспортная часть (Раздел 1)
	check(Boolean(data.passport?.patientFullName?.trim()), "patientFullName", "ФИО пациента", "passport", "critical");
	check(Boolean(data.passport?.patientBirthDate?.trim()), "patientBirthDate", "Дата рождения пациента", "passport", "critical");
	check(Boolean(data.passport?.patientSex), "patientSex", "Пол пациента", "passport", "critical");
	check(Boolean(data.passport?.patientAddressRegistration?.trim()), "patientAddressRegistration", "Адрес регистрации", "passport", "critical");
	check(Boolean(data.passport?.patientIdentityDocument?.trim()), "patientIdentityDocument", "Паспортные данные / документ", "passport", "critical");
	check(Boolean(data.passport?.medicalCardNumber?.trim()), "medicalCardNumber", "Номер медицинской карты", "passport", "critical");
	check(Boolean(data.passport?.cardOpenedDate?.trim()), "cardOpenedDate", "Дата заведения карты", "passport", "critical");
	check(Boolean(data.passport?.primaryDiagnosisText?.trim()), "primaryDiagnosisText", "Диагноз при первичном обращении", "passport", "critical");
	check(Boolean(data.passport?.primaryDiagnosisIcd10?.trim()), "primaryDiagnosisIcd10", "Код МКБ-10 первичного диагноза", "passport", "critical");
	check(Boolean(data.passport?.attendingDoctorFullName?.trim()), "attendingDoctorFullName", "ФИО лечащего врача", "passport", "critical");

	if (!data.passport?.patientSnils?.trim()) {
		check(false, "patientSnils", "СНИЛС пациента (рекомендуется для ЕГИСЗ)", "passport", "warning");
	} else {
		totalChecks++;
		passedChecks++;
	}

	// Анамнез (Раздел 2)
	check(Boolean(data.anamnesis?.chiefComplaint?.trim()), "chiefComplaint", "Жалобы при обращении", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.historyOfPresentIllness?.trim()), "historyOfPresentIllness", "Анамнез заболевания (Anamnesis morbi)", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.medicalHistoryVitae?.trim()), "medicalHistoryVitae", "Анамнез жизни (Anamnesis vitae)", "anamnesis", "warning");
	check(Boolean(data.anamnesis?.allergologicalHistory?.trim()), "allergologicalHistory", "Аллергологический статус", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.concomitantSomaticDiseases?.trim()), "concomitantSomaticDiseases", "Сопутствующие соматические патологии (норма по умолчанию)", "anamnesis", "warning");

	// Стоматологический статус и зубная формула (Раздел 3)
	check(Boolean(data.dentalStatus?.odontogramTeeth && data.dentalStatus.odontogramTeeth.length > 0), "odontogramTeeth", "Зубная формула FDI (не менее 1 зуба)", "dental_status", "critical");
	check(Boolean(data.dentalStatus?.biteType), "biteType", "Прикус по Энглю (ортогнатический по умолчанию)", "dental_status", "warning");
	check(Boolean(data.dentalStatus?.oralMucosaStatus?.color), "oralMucosaStatus", "Состояние СОПР (слизистой)", "dental_status", "warning");

	// Дневники визитов (Форма 043/у) (Раздел 4)
	check(Boolean(data.visitDiaries && data.visitDiaries.length > 0), "visitDiaries", "Хотя бы 1 запись в дневнике приёма (Форма 043/у)", "diaries", "critical");
	if (data.visitDiaries && data.visitDiaries.length > 0) {
		for (let i = 0; i < data.visitDiaries.length; i++) {
			const d = data.visitDiaries[i];
			if (!d) continue;
			if (!d.assessmentDiagnosisText?.trim()) {
				warnings.push(`Дневник №${i + 1} (${d.entryDate}): отсутствует диагноз`);
			}
			if (!d.procedureProtocol?.trim()) {
				warnings.push(`Дневник №${i + 1} (${d.entryDate}): отсутствует протокол лечения`);
			}
		}
	}

	// Эпикриз (Раздел 5)
	check(Boolean(data.epicrisis?.treatmentSummary?.trim()), "treatmentSummary", "Эпикриз / сводка лечения", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.treatmentOutcome), "treatmentOutcome", "Результат лечения / исход", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.dispensaryGroup), "dispensaryGroup", "Группа контрольного наблюдения", "epicrisis", "warning");

	const score = Math.round((passedChecks / Math.max(1, totalChecks)) * 100);
	const criticalMissing = missingFields.filter((m) => m.severity === "critical");

	return {
		isComplete: criticalMissing.length === 0,
		completenessScore: score,
		missingFields,
		warnings,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// ШТАМПЫ И ВОДЯНЫЕ ЗНАКИ ФОРМЫ 043/У (МАНДАТ 8E: АВТОНОМИЯ ВРАЧА И ПЕЧАТЬ В ЛЮБОЙ МОМЕНТ)
// ═══════════════════════════════════════════════════════════════════════════
export const FORM_043_STAMP_DRAFT = "ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)";
export const FORM_043_STAMP_SIGNED = "ПОДПИСАНО ВРАЧОМ";
export const FORM_043_WATERMARK_DRAFT_HTML = '<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>';
export const FORM_043_WATERMARK_SIGNED_HTML = '<div class="watermark-draft watermark-signed" aria-hidden="true" style="color: rgba(5, 150, 105, 0.06);">ПОДПИСАНО ВРАЧОМ</div>';


// ═══════════════════════════════════════════════════════════════════════════
// ТРАНСПАРЕНТНЫЕ РЕЭКСПОРТЫ ДЕКОМПОЗИРОВАННЫХ МОДУЛЕЙ ПЕЧАТИ И ЭКСПОРТА
// ═══════════════════════════════════════════════════════════════════════════
export * from "./emr043HtmlPrint";
export * from "./emr043ExportEngines";

