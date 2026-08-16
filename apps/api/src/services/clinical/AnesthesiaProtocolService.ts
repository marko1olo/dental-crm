/**
 * AnesthesiaProtocolService.ts — Сервис протоколирования анестезиологического пособия
 * и мониторинга витальных функций в стоматологической практике.
 *
 * РЕГУЛЯТОРНАЯ ОСНОВА:
 * Приказ Минздрава России от 15.11.2012 № 919н «Об утверждении Порядка оказания
 * медицинской помощи взрослому населению по профилю "анестезиология и реаниматология"».
 *
 * КЛИНИЧЕСКИЕ ИНВАРИАНТЫ И ФУНКЦИОНАЛ:
 * 1. Шкалы предоперационной оценки:
 *    - Физический статус по классификации ASA (ASA I–V, модификатор Emergency 'E').
 *    - Оценка проходимости верхних дыхательных путей по шкале Маллампати (Mallampati I–IV).
 *    - Оценка глубины седации по шкале Рамси (Ramsay Sedation Scale 1–6).
 * 2. Периодический мониторинг витальных функций:
 *    - Сатурация кислорода (SpO2, %).
 *    - Частота сердечных сокращений (ЧСС / Heart Rate, уд/мин).
 *    - Неинвазивное артериальное давление (АД систолическое / диастолическое, мм рт. ст.).
 *    - Капнометрия / капнография (EtCO2, мм рт. ст.).
 *    - Расчет среднего артериального давления (MAP = (АДс + 2*АДд) / 3), пульсового давления и шокового индекса Альговера (ЧСС / АДс).
 * 3. Детекция критических состояний и формирование тревожных маркеров:
 *    - Десатурация: SpO2 < 90% (критическая), SpO2 < 94% (предупреждение).
 *    - Брадикардия: ЧСС < 45 уд/мин (критическая), ЧСС < 50 уд/мин (предупреждение).
 *    - Тахикардия: ЧСС > 140 уд/мин (критическая), ЧСС > 110 уд/мин (предупреждение).
 *    - Артериальная гипотензия: АДс < 85 мм рт. ст. (критическая), АДс < 90 мм рт. ст. (предупреждение).
 *    - Артериальная гипертензия: АДс >= 180 мм рт. ст. или АДд >= 110 мм рт. ст.
 *    - Нарушения вентиляции: EtCO2 > 50 мм рт. ст. (гиперкапния) или EtCO2 < 20 мм рт. ст. (гипокапния).
 * 4. Журнал введения фармакологических средств:
 *    - Название препарата, дозировка, единицы измерения, время введения, путь введения, исполнитель.
 *    - Расчет суммарных введенных доз по препаратам.
 * 5. Оценка восстановления и готовности к выписке по шкале Альдрете (Aldrete Score 0–10).
 * 6. Экспертиза соответствия протокола требованиям Приказа № 919н и генерация официального заключения.
 */

import crypto from "node:crypto";

// ============================================================================
// 1. ШКАЛА ФИЗИЧЕСКОГО СТАТУСА ASA (American Society of Anesthesiologists)
// ============================================================================

export const ASA_SCORES = [
	"ASA_I",
	"ASA_II",
	"ASA_III",
	"ASA_IV",
	"ASA_V",
] as const;

export type AsaScore = (typeof ASA_SCORES)[number];

export function isAsaScore(value: unknown): value is AsaScore {
	return (
		typeof value === "string" &&
		(ASA_SCORES as readonly string[]).includes(value)
	);
}

export interface AsaDescriptor {
	readonly score: AsaScore;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly systemicRisk: "low" | "mild" | "high" | "critical" | "extreme";
	readonly ambulatoryAnesthesiaPermitted: boolean;
}

export const ASA_DEFINITIONS: Readonly<Record<AsaScore, AsaDescriptor>> = {
	ASA_I: {
		score: "ASA_I",
		titleRu: "ASA I — Здоровый пациент",
		descriptionRu:
			"Нормальный здоровый пациент без органических, физиологических или психических нарушений. Некурящий или с минимальным употреблением алкоголя.",
		systemicRisk: "low",
		ambulatoryAnesthesiaPermitted: true,
	},
	ASA_II: {
		score: "ASA_II",
		titleRu: "ASA II — Легкое системное заболевание",
		descriptionRu:
			"Пациент с легким системным заболеванием без существенных функциональных ограничений (контролируемая артериальная гипертензия, легкий сахарный диабет, компенсированная бронхиальная астма, курение).",
		systemicRisk: "mild",
		ambulatoryAnesthesiaPermitted: true,
	},
	ASA_III: {
		score: "ASA_III",
		titleRu: "ASA III — Тяжелое системное заболевание с ограничением активности",
		descriptionRu:
			"Пациент с тяжелым системным заболеванием, приводящим к ограничению физической активности, но не к инвалидности (субкомпенсированная ХСН, ХОБЛ, перенесенный инфаркт миокарда/ОНМК > 3 месяцев назад, декомпенсированный СД).",
		systemicRisk: "high",
		ambulatoryAnesthesiaPermitted: true, // С осторожностью и расширенным мониторингом
	},
	ASA_IV: {
		score: "ASA_IV",
		titleRu: "ASA IV — Тяжелое заболевание с постоянной угрозой жизни",
		descriptionRu:
			"Пациент с тяжелым инвалидизирующим заболеванием, представляющим постоянную угрозу жизни (нестабильная стенокардия, ОИМ/ОНМК < 3 месяцев, тяжелая клапанная дисфункция, терминальная почечная недостаточность без регулярного диализа).",
		systemicRisk: "critical",
		ambulatoryAnesthesiaPermitted: false, // Только в условиях стационара с ОРИТ
	},
	ASA_V: {
		score: "ASA_V",
		titleRu: "ASA V — Морибундный пациент (угроза гибели без операции)",
		descriptionRu:
			"Терминальный пациент, гибель которого ожидается в течение 24 часов как при проведении операции, так и без нее (разрыв аневризмы, массивная политравма, полиорганная недостаточность).",
		systemicRisk: "extreme",
		ambulatoryAnesthesiaPermitted: false,
	},
};

// ============================================================================
// 2. ШКАЛА ОЦЕНКИ ДЫХАТЕЛЬНЫХ ПУТЕЙ МАЛЛАМПАТИ (Mallampati Airway Classification)
// ============================================================================

export const MALLAMPATI_CLASSES = [
	"CLASS_I",
	"CLASS_II",
	"CLASS_III",
	"CLASS_IV",
] as const;

export type MallampatiClass = (typeof MALLAMPATI_CLASSES)[number];

export function isMallampatiClass(value: unknown): value is MallampatiClass {
	return (
		typeof value === "string" &&
		(MALLAMPATI_CLASSES as readonly string[]).includes(value)
	);
}

export interface MallampatiDescriptor {
	readonly classCode: MallampatiClass;
	readonly titleRu: string;
	readonly anatomyRu: string;
	readonly intubationDifficultyRisk: "low" | "moderate" | "high" | "critical";
	readonly airwayManagementNotes: string;
}

export const MALLAMPATI_DEFINITIONS: Readonly<
	Record<MallampatiClass, MallampatiDescriptor>
> = {
	CLASS_I: {
		classCode: "CLASS_I",
		titleRu: "Класс I по Маллампати",
		anatomyRu:
			"Полная визуализация: видны мягкое нёбо, зев, язычок, передние и задние нёбные дужки.",
		intubationDifficultyRisk: "low",
		airwayManagementNotes:
			"Проходимость дыхательных путей оптимальная. Риск трудной интубации минимальный.",
	},
	CLASS_II: {
		classCode: "CLASS_II",
		titleRu: "Класс II по Маллампати",
		anatomyRu:
			"Видны мягкое нёбо, зев и язычок (нёбные дужки частично перекрыты).",
		intubationDifficultyRisk: "low",
		airwayManagementNotes:
			"Хороший доступ к ротоглотке. Стандартные меры обеспечения проходимости ВДП.",
	},
	CLASS_III: {
		classCode: "CLASS_III",
		titleRu: "Класс III по Маллампати",
		anatomyRu:
			"Видны только мягкое нёбо и основание язычка (зев и дужки не визуализируются).",
		intubationDifficultyRisk: "moderate",
		airwayManagementNotes:
			"Повышенный риск трудных дыхательных путей. Рекомендуется наличие видеоларингоскопа / надгортанных воздуховодов.",
	},
	CLASS_IV: {
		classCode: "CLASS_IV",
		titleRu: "Класс IV по Маллампати",
		anatomyRu:
			"Видно только твердое нёбо (мягкое нёбо и язычок полностью не визуализируются).",
		intubationDifficultyRisk: "high",
		airwayManagementNotes:
			"Высокий риск критических трудных дыхательных путей (Difficult Airway). Обязательна готовность набора для трудной интубации и фибробронхоскопии.",
	},
};

// ============================================================================
// 3. ШКАЛА СЕДАЦИИ РАМСИ (Ramsay Sedation Scale)
// ============================================================================

export const RAMSAY_SCORES = [1, 2, 3, 4, 5, 6] as const;

export type RamsayScore = (typeof RAMSAY_SCORES)[number];

export function isRamsayScore(value: unknown): value is RamsayScore {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		(RAMSAY_SCORES as readonly number[]).includes(value)
	);
}

export interface RamsayDescriptor {
	readonly score: RamsayScore;
	readonly titleRu: string;
	readonly clinicalStateRu: string;
	readonly sedationDepth:
		| "agitated"
		| "conscious_cooperative"
		| "light_sedation"
		| "moderate_sedation"
		| "deep_sedation"
		| "general_anesthesia";
	readonly isOptimalForAmbulatoryDentalSedation: boolean;
}

export const RAMSAY_DEFINITIONS: Readonly<Record<RamsayScore, RamsayDescriptor>> =
	{
		1: {
			score: 1,
			titleRu: "Шкала Рамси — 1 балл",
			clinicalStateRu:
				"Пациент бодрствует, тревожен, ажитирован, беспокоен (недостаточный уровень седации).",
			sedationDepth: "agitated",
			isOptimalForAmbulatoryDentalSedation: false,
		},
		2: {
			score: 2,
			titleRu: "Шкала Рамси — 2 балла (Оптимум)",
			clinicalStateRu:
				"Пациент бодрствует, спокоен, ориентирован в месте и времени, контактен, сотрудничает с врачом-стоматологом.",
			sedationDepth: "conscious_cooperative",
			isOptimalForAmbulatoryDentalSedation: true,
		},
		3: {
			score: 3,
			titleRu: "Шкала Рамси — 3 балла (Поверхностная седация)",
			clinicalStateRu:
				"Пациент дремлет, быстро и четко отвечает на словесные команды, глаза открывает сразу.",
			sedationDepth: "light_sedation",
			isOptimalForAmbulatoryDentalSedation: true,
		},
		4: {
			score: 4,
			titleRu: "Шкала Рамси — 4 балла (Умеренная/глубокая седация)",
			clinicalStateRu:
				"Пациент спит, сохранен живой/быстрый двигательный ответ на легкое постукивание по переносью (glabellar tap) или громкий звук.",
			sedationDepth: "moderate_sedation",
			isOptimalForAmbulatoryDentalSedation: false,
		},
		5: {
			score: 5,
			titleRu: "Шкала Рамси — 5 баллов (Глубокая седация)",
			clinicalStateRu:
				"Пациент спит, вялый, заторможенный или замедленный ответ на тактильный/звуковой стимул.",
			sedationDepth: "deep_sedation",
			isOptimalForAmbulatoryDentalSedation: false,
		},
		6: {
			score: 6,
			titleRu: "Шкала Рамси — 6 баллов (Общий наркоз)",
			clinicalStateRu:
				"Пациент не реагирует на тактильные, звуковые и болезненные раздражители (уровень общей анестезии).",
			sedationDepth: "general_anesthesia",
			isOptimalForAmbulatoryDentalSedation: false,
		},
	};

// ============================================================================
// 4. ТРЕВОЖНЫЕ МАРКЕРЫ И КРИТИЧЕСКИЕ ПОРОГИ (Приказ 919н)
// ============================================================================

export const VITAL_THRESHOLDS = {
	SPO2_CRITICAL_MIN: 90, // % — SpO2 < 90% (десатурация)
	SPO2_WARNING_MIN: 94, // % — SpO2 < 94%
	HR_BRADYCARDIA_CRITICAL: 45, // уд/мин — ЧСС < 45 (брадикардия)
	HR_BRADYCARDIA_WARNING: 50, // уд/мин — ЧСС < 50
	HR_TACHYCARDIA_CRITICAL: 140, // уд/мин — ЧСС > 140 (тахикардия)
	HR_TACHYCARDIA_WARNING: 110, // уд/мин — ЧСС > 110
	SBP_HYPOTENSION_CRITICAL: 85, // мм рт. ст. — АДс < 85 (гипотензия)
	SBP_HYPOTENSION_WARNING: 90, // мм рт. ст. — АДс < 90
	SBP_HYPERTENSION_CRITICAL: 180, // мм рт. ст. — АДс >= 180
	DBP_HYPERTENSION_CRITICAL: 110, // мм рт. ст. — АДд >= 110
	ETCO2_HYPERCAPNIA_CRITICAL: 50, // мм рт. ст. — EtCO2 > 50 (гиперкапния/гиповентиляция)
	ETCO2_HYPOCAPNIA_CRITICAL: 20, // мм рт. ст. — EtCO2 < 20 (гипокапния/гипервентиляция/остановка)
} as const;

export type AlarmSeverity = "WARNING" | "CRITICAL" | "EMERGENCY";

export type VitalAlarmCode =
	| "CRITICAL_DESATURATION"
	| "WARNING_DESATURATION"
	| "CRITICAL_BRADYCARDIA"
	| "WARNING_BRADYCARDIA"
	| "CRITICAL_TACHYCARDIA"
	| "WARNING_TACHYCARDIA"
	| "CRITICAL_HYPOTENSION"
	| "WARNING_HYPOTENSION"
	| "CRITICAL_HYPERTENSION"
	| "CRITICAL_HYPERCAPNIA"
	| "CRITICAL_HYPOCAPNIA"
	| "CRITICAL_SHOCK_INDEX";

export interface VitalSignAlarmMarker {
	readonly code: VitalAlarmCode;
	readonly severity: AlarmSeverity;
	readonly metric: "SpO2" | "ЧСС" | "АДс" | "АДд" | "EtCO2" | "ShockIndex";
	readonly value: number;
	readonly threshold: number;
	readonly unit: string;
	readonly message: string;
	readonly timestamp: string;
	readonly recommendedAction: string;
}

export type AnesthesiaStage =
	| "preoperative"
	| "premedication"
	| "induction"
	| "maintenance"
	| "emergence"
	| "recovery";

export interface VitalSignsInput {
	readonly timestamp?: string | Date | undefined;
	readonly stage: AnesthesiaStage;
	readonly spO2: number;
	readonly heartRate: number;
	readonly systolicBp: number;
	readonly diastolicBp: number;
	readonly etCO2?: number | undefined;
	readonly respiratoryRate?: number | undefined;
	readonly temperature?: number | undefined;
	readonly ramsayScore?: RamsayScore | undefined;
	readonly oxygenFlowLpm?: number | undefined;
	readonly notes?: string | undefined;
}

export interface VitalSignsRecord {
	readonly id: string;
	readonly timestamp: string; // ISO 8601
	readonly stage: AnesthesiaStage;
	readonly spO2: number;
	readonly heartRate: number;
	readonly systolicBp: number;
	readonly diastolicBp: number;
	readonly etCO2?: number | undefined;
	readonly respiratoryRate?: number | undefined;
	readonly temperature?: number | undefined;
	readonly ramsayScore?: RamsayScore | undefined;
	readonly oxygenFlowLpm?: number | undefined;
	readonly meanArterialPressure: number; // САД = (АДс + 2*АДд) / 3
	readonly pulsePressure: number; // ПД = АДс - АДд
	readonly shockIndex: number; // Индекс Альговера = ЧСС / АДс
	readonly notes?: string | undefined;
	readonly alarms: readonly VitalSignAlarmMarker[];
	readonly hasCriticalAlarm: boolean;
}

// ============================================================================
// 5. ВВЕДЕНИЕ АНЕСТЕТИКОВ И ФАРМАКОЛОГИЧЕСКИХ ПРЕПАРАТОВ
// ============================================================================

export type MedicationUnit =
	| "mg"
	| "mcg"
	| "g"
	| "ml"
	| "mg_kg"
	| "mcg_kg_min"
	| "vol_percent"
	| "IU"
	| "drops";

export type AdministrationRoute =
	| "iv" // Внутривенно
	| "inhalation" // Ингаляционно
	| "infiltration" // Инфильтрационно
	| "nerve_block" // Проводниково (мандибулярная, торусальная и др.)
	| "im" // Внутримышечно
	| "sublingual" // Сублингвально
	| "oral" // Перорально
	| "intranasal" // Интраназально
	| "submucosal"; // Подслизисто

export type DrugCategory =
	| "general_anesthetic"
	| "inhalation_anesthetic"
	| "local_anesthetic"
	| "sedative_hypnotic"
	| "opioid_analgesic"
	| "nsaid"
	| "muscle_relaxant"
	| "antidote_reversal"
	| "emergency_cardiovascular"
	| "corticosteroid"
	| "antiemetic"
	| "infusion_solution"
	| "other";

export interface MedicationAdministrationInput {
	readonly timestamp?: string | Date | undefined;
	readonly drugName: string;
	readonly dose: number;
	readonly unit: MedicationUnit;
	readonly route: AdministrationRoute;
	readonly category?: DrugCategory | undefined;
	readonly administeredBy: string;
	readonly targetSite?: string | undefined;
	readonly notes?: string | undefined;
}

export interface MedicationAdministrationRecord {
	readonly id: string;
	readonly timestamp: string; // ISO 8601
	readonly drugName: string;
	readonly dose: number;
	readonly unit: MedicationUnit;
	readonly route: AdministrationRoute;
	readonly category: DrugCategory;
	readonly administeredBy: string;
	readonly targetSite?: string | undefined;
	readonly notes?: string | undefined;
}

export interface DrugCumulativeSummary {
	readonly drugName: string;
	readonly totalDose: number;
	readonly unit: MedicationUnit;
	readonly administrationCount: number;
	readonly routes: readonly AdministrationRoute[];
}

// ============================================================================
// 6. ШКАЛА ПОСЛЕОПЕРАЦИОННОГО ВОССТАНОВЛЕНИЯ АЛЬДРЕТЕ (Aldrete Score)
// ============================================================================

export interface AldreteEvaluation {
	/** Двигательная активность: 0 - неподвижен, 1 - движет 2 конечностями, 2 - движет 4 конечностями */
	readonly activity: 0 | 1 | 2;
	/** Дыхание: 0 - апноэ, 1 - поверхностное/затрудненное, 2 - глубокое дыхание/кашель */
	readonly respiration: 0 | 1 | 2;
	/** Гемодинамика (АД от исходного): 0 - отклонение > 50%, 1 - отклонение 20-50%, 2 - отклонение < 20% */
	readonly circulation: 0 | 1 | 2;
	/** Сознание: 0 - без сознания, 1 - пробуждается при оклике, 2 - ясное сознание, ориентирован */
	readonly consciousness: 0 | 1 | 2;
	/** Оксигенация: 0 - SpO2 < 90% при ингаляции O2, 1 - SpO2 > 90% с поддержкой O2, 2 - SpO2 > 92% на комнатном воздухе */
	readonly oxygenSaturation: 0 | 1 | 2;
	readonly notes?: string | undefined;
}

export interface AldreteScoreResult {
	readonly totalScore: number; // 0..10
	readonly isSafeForDischarge: boolean; // >= 9 баллов (Приказ 919н)
	readonly breakdown: AldreteEvaluation;
	readonly evaluatedAt: string;
	readonly clinicalVerdict: string;
}

// ============================================================================
// 7. СТРУКТУРА ПРЕДОПЕРАЦИОННОГО ОСМОТРА И ПОЛНОГО ПРОТОКОЛА
// ============================================================================

export type AnesthesiaType =
	| "sedation_conscious" // Седация с сохраненным сознанием (в/в пропофол / мидазолам / дексдор)
	| "sedation_deep" // Глубокая седация
	| "general_inhalation" // Общая ингаляционная анестезия (севофлуран + ларингеальная маска/интубация)
	| "general_tiva" // Тотальная внутривенная анестезия (ТВА)
	| "combined_local_sedation" // Комбинированная (местная анестезия + седация)
	| "local_potentiated"; // Потенциированная местная анестезия

export interface FastingIntervalStatus {
	readonly solidFoodHours: number; // Норма >= 6 часов
	readonly clearLiquidsHours: number; // Норма >= 2 часов
	readonly isFastingAdequate: boolean;
	readonly notes?: string | undefined;
}

export interface PreoperativeAssessment {
	readonly evaluatedAt: string;
	readonly anesthesiologistName: string;
	readonly asaScore: AsaScore;
	readonly isEmergency: boolean;
	readonly mallampatiClass: MallampatiClass;
	readonly targetRamsayScore: RamsayScore;
	readonly fastingStatus: FastingIntervalStatus;
	readonly allergies: readonly string[];
	readonly chronicDiseases: readonly string[];
	readonly airwayNotes?: string | undefined;
	readonly premedication?: string | undefined;
	readonly baselineVitals: {
		readonly spO2: number;
		readonly heartRate: number;
		readonly systolicBp: number;
		readonly diastolicBp: number;
		readonly respiratoryRate?: number | undefined;
	};
}

export interface AdverseEventRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly eventType: string;
	readonly description: string;
	readonly intervention: string;
	readonly resolved: boolean;
	readonly outcomeNotes?: string | undefined;
}

export interface AnesthesiaProtocol {
	readonly id: string;
	readonly protocolNumber: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly visitId: string;
	readonly createdAt: string;
	readonly startedAt: string;
	readonly endedAt?: string | undefined;
	readonly durationMinutes?: number | undefined;
	readonly status: "draft" | "in_progress" | "completed" | "interrupted";
	readonly anesthesiologistId: string;
	readonly anesthesiologistName: string;
	readonly nurseAnesthetistName?: string | undefined;
	readonly attendingDentistName: string;
	readonly plannedProcedure: string;
	readonly anesthesiaType: AnesthesiaType;
	readonly preoperativeAssessment: PreoperativeAssessment;
	readonly vitalSignsTimeline: readonly VitalSignsRecord[];
	readonly medicationLog: readonly MedicationAdministrationRecord[];
	readonly adverseEvents: readonly AdverseEventRecord[];
	readonly aldreteRecovery?: AldreteScoreResult | undefined;
	readonly postOpTransferDestination?:
		| "recovery_room"
		| "day_hospital"
		| "discharged_home"
		| "hospitalized_icu"
		| undefined;
	readonly finalNotes?: string | undefined;
	readonly signedAt?: string | undefined;
	readonly signatureDigest?: string | undefined;
}

// ============================================================================
// 8. ОШИБКИ И РЕЗУЛЬТАТЫ ВАЛИДАЦИИ
// ============================================================================

export type AnesthesiaErrorCode =
	| "ValidationError"
	| "InvalidAsaScore"
	| "InvalidMallampatiClass"
	| "InvalidRamsayScore"
	| "InvalidVitalSigns"
	| "InvalidMedication"
	| "ProtocolNotFound"
	| "ProtocolAlreadyFinalized"
	| "ComplianceViolation919n"
	| "AldreteScoreInsufficient";

export class AnesthesiaProtocolError extends Error {
	constructor(
		readonly code: AnesthesiaErrorCode,
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = "AnesthesiaProtocolError";
	}
}

export interface ComplianceValidationReport {
	readonly isCompliant: boolean;
	readonly checkedAt: string;
	readonly order919nRuleViolations: readonly string[];
	readonly criticalAlarmsDetectedCount: number;
	readonly missingRequiredSections: readonly string[];
	readonly summary: string;
}

// ============================================================================
// 9. СЕРВИС АНЕСТЕЗИОЛОГИЧЕСКОГО ПРОТОКОЛА
// ============================================================================

export class AnesthesiaProtocolService {
	// --------------------------------------------------------------------------
	// Клинические детекторы и валидаторы витальных функций
	// --------------------------------------------------------------------------

	/**
	 * Вычисляет гемодинамические производные параметры:
	 * 1. САД (Mean Arterial Pressure) = (АДс + 2*АДд) / 3
	 * 2. ПД (Pulse Pressure) = АДс - АДд
	 * 3. Шоковый индекс Альговера = ЧСС / АДс
	 */
	public static calculateHemodynamics(
		systolicBp: number,
		diastolicBp: number,
		heartRate: number,
	): {
		meanArterialPressure: number;
		pulsePressure: number;
		shockIndex: number;
	} {
		if (systolicBp <= 0 || diastolicBp <= 0 || heartRate <= 0) {
			throw new AnesthesiaProtocolError(
				"InvalidVitalSigns",
				`Недопустимые параметры гемодинамики: АДс=${systolicBp}, АДд=${diastolicBp}, ЧСС=${heartRate}. Значения должны быть строго положительными.`,
			);
		}
		if (systolicBp < diastolicBp) {
			throw new AnesthesiaProtocolError(
				"InvalidVitalSigns",
				`Систолическое давление (${systolicBp}) не может быть ниже диастолического (${diastolicBp}).`,
			);
		}

		const meanArterialPressure = Math.round(
			(systolicBp + 2 * diastolicBp) / 3,
		);
		const pulsePressure = systolicBp - diastolicBp;
		const shockIndex = Number((heartRate / systolicBp).toFixed(2));

		return {
			meanArterialPressure,
			pulsePressure,
			shockIndex,
		};
	}

	/**
	 * Детекция критических состояний в реальном времени с формированием
	 * тревожных маркеров (Приказ Минздрава РФ № 919н).
	 */
	public static evaluateVitalAlarms(params: {
		spO2: number;
		heartRate: number;
		systolicBp: number;
		diastolicBp: number;
		etCO2?: number | undefined;
		timestamp?: string | undefined;
	}): {
		alarms: VitalSignAlarmMarker[];
		hasCriticalAlarm: boolean;
	} {
		const { spO2, heartRate, systolicBp, diastolicBp, etCO2 } = params;
		const ts = params.timestamp || new Date().toISOString();
		const alarms: VitalSignAlarmMarker[] = [];

		// 1. Мониторинг оксигенации (SpO2)
		if (spO2 < VITAL_THRESHOLDS.SPO2_CRITICAL_MIN) {
			alarms.push({
				code: "CRITICAL_DESATURATION",
				severity: spO2 < 85 ? "EMERGENCY" : "CRITICAL",
				metric: "SpO2",
				value: spO2,
				threshold: VITAL_THRESHOLDS.SPO2_CRITICAL_MIN,
				unit: "%",
				message: `КРИТИЧЕСКАЯ ДЕСАТУРАЦИЯ: SpO2 ${spO2}% (норма >= 95%, критический порог < 90%). Угроза острой гипоксии тканей!`,
				timestamp: ts,
				recommendedAction:
					"Немедленно увеличить фракцию FiO2 (100% O2), проверить проходимость ВДП, положение ларингеальной маски/трубки, герметичность контура, санировать трахеобронхиальное дерево.",
			});
		} else if (spO2 < VITAL_THRESHOLDS.SPO2_WARNING_MIN) {
			alarms.push({
				code: "WARNING_DESATURATION",
				severity: "WARNING",
				metric: "SpO2",
				value: spO2,
				threshold: VITAL_THRESHOLDS.SPO2_WARNING_MIN,
				unit: "%",
				message: `Предупреждение о снижении сатурации: SpO2 ${spO2}% (норма >= 95%).`,
				timestamp: ts,
				recommendedAction:
					"Оценить адекватность минутной вентиляции, подать кислород через назальные канюли/маску.",
			});
		}

		// 2. Мониторинг ритма и частоты сердечных сокращений (ЧСС)
		if (heartRate < VITAL_THRESHOLDS.HR_BRADYCARDIA_CRITICAL) {
			alarms.push({
				code: "CRITICAL_BRADYCARDIA",
				severity: "CRITICAL",
				metric: "ЧСС",
				value: heartRate,
				threshold: VITAL_THRESHOLDS.HR_BRADYCARDIA_CRITICAL,
				unit: "уд/мин",
				message: `КРИТИЧЕСКАЯ БРАДИКАРДИЯ: ЧСС ${heartRate} уд/мин (критический порог < 45 уд/мин). Риск асистолии и гипоперфузии!`,
				timestamp: ts,
				recommendedAction:
					"Прекратить стимуляцию блуждающего нерва, остановить хирургические манипуляции в полости рта, ввести Атропин 0.5-1.0 мг в/в, подготовить эфедрин/адреналин.",
			});
		} else if (heartRate < VITAL_THRESHOLDS.HR_BRADYCARDIA_WARNING) {
			alarms.push({
				code: "WARNING_BRADYCARDIA",
				severity: "WARNING",
				metric: "ЧСС",
				value: heartRate,
				threshold: VITAL_THRESHOLDS.HR_BRADYCARDIA_WARNING,
				unit: "уд/мин",
				message: `Предупреждение: склонность к брадикардии (ЧСС ${heartRate} уд/мин).`,
				timestamp: ts,
				recommendedAction:
					"Мониторинг глубины анестезии, исключение тригеминокардиального рефлекса.",
			});
		} else if (heartRate > VITAL_THRESHOLDS.HR_TACHYCARDIA_CRITICAL) {
			alarms.push({
				code: "CRITICAL_TACHYCARDIA",
				severity: "CRITICAL",
				metric: "ЧСС",
				value: heartRate,
				threshold: VITAL_THRESHOLDS.HR_TACHYCARDIA_CRITICAL,
				unit: "уд/мин",
				message: `КРИТИЧЕСКАЯ ТАХИКАРДИЯ: ЧСС ${heartRate} уд/мин (критический порог > 140 уд/мин). Опасность ишемии миокарда и фибрилляции!`,
				timestamp: ts,
				recommendedAction:
					"Оценить адекватность аналгезии и глубину седации, исключить поверхностный наркоз, гиповолемию, передозировку вазоконстриктора (адреналина в местном анестетике).",
			});
		} else if (heartRate > VITAL_THRESHOLDS.HR_TACHYCARDIA_WARNING) {
			alarms.push({
				code: "WARNING_TACHYCARDIA",
				severity: "WARNING",
				metric: "ЧСС",
				value: heartRate,
				threshold: VITAL_THRESHOLDS.HR_TACHYCARDIA_WARNING,
				unit: "уд/мин",
				message: `Предупреждение: тахикардия (ЧСС ${heartRate} уд/мин).`,
				timestamp: ts,
				recommendedAction:
					"Проверить уровень болевой импульсации, при необходимости углубить седацию/добавить анальгетик.",
			});
		}

		// 3. Мониторинг артериального давления (АД)
		if (systolicBp < VITAL_THRESHOLDS.SBP_HYPOTENSION_CRITICAL) {
			alarms.push({
				code: "CRITICAL_HYPOTENSION",
				severity: "CRITICAL",
				metric: "АДс",
				value: systolicBp,
				threshold: VITAL_THRESHOLDS.SBP_HYPOTENSION_CRITICAL,
				unit: "мм рт. ст.",
				message: `КРИТИЧЕСКАЯ АРТЕРИАЛЬНАЯ ГИПОТЕНЗИЯ: АДс ${systolicBp} мм рт. ст. (критический порог < 85 мм рт. ст.). Угроза нарушения коронарной и мозговой перфузии!`,
				timestamp: ts,
				recommendedAction:
					"Снизить скорость инфузии пропофола/ингаляции севофлурана, начать болюсную инфузию кристаллоидов, ввести вазопрессор (Эфедрин 5-10 мг в/в или Фенилэфрин 50-100 мкг).",
			});
		} else if (systolicBp < VITAL_THRESHOLDS.SBP_HYPOTENSION_WARNING) {
			alarms.push({
				code: "WARNING_HYPOTENSION",
				severity: "WARNING",
				metric: "АДс",
				value: systolicBp,
				threshold: VITAL_THRESHOLDS.SBP_HYPOTENSION_WARNING,
				unit: "мм рт. ст.",
				message: `Предупреждение: снижение артериального давления (АДс ${systolicBp} мм рт. ст.).`,
				timestamp: ts,
				recommendedAction:
					"Контроль темпа инфузионной терапии, титрование доз седативных препаратов.",
			});
		}

		if (
			systolicBp >= VITAL_THRESHOLDS.SBP_HYPERTENSION_CRITICAL ||
			diastolicBp >= VITAL_THRESHOLDS.DBP_HYPERTENSION_CRITICAL
		) {
			alarms.push({
				code: "CRITICAL_HYPERTENSION",
				severity: "CRITICAL",
				metric:
					systolicBp >= VITAL_THRESHOLDS.SBP_HYPERTENSION_CRITICAL
						? "АДс"
						: "АДд",
				value:
					systolicBp >= VITAL_THRESHOLDS.SBP_HYPERTENSION_CRITICAL
						? systolicBp
						: diastolicBp,
				threshold:
					systolicBp >= VITAL_THRESHOLDS.SBP_HYPERTENSION_CRITICAL
						? VITAL_THRESHOLDS.SBP_HYPERTENSION_CRITICAL
						: VITAL_THRESHOLDS.DBP_HYPERTENSION_CRITICAL,
				unit: "мм рт. ст.",
				message: `КРИТИЧЕСКАЯ ГИПЕРТЕНЗИЯ: АД ${systolicBp}/${diastolicBp} мм рт. ст. Риск ОНМК, внутричерепного кровоизлияния и острой сердечной недостаточности!`,
				timestamp: ts,
				recommendedAction:
					"Оценить болевой синдром, потенциировать анестезию, при сохранении криза ввести гипотензивные средства (урапидил, магния сульфат).",
			});
		}

		// 4. Капнография (EtCO2), если параметр передан
		if (etCO2 !== undefined) {
			if (etCO2 > VITAL_THRESHOLDS.ETCO2_HYPERCAPNIA_CRITICAL) {
				alarms.push({
					code: "CRITICAL_HYPERCAPNIA",
					severity: "CRITICAL",
					metric: "EtCO2",
					value: etCO2,
					threshold: VITAL_THRESHOLDS.ETCO2_HYPERCAPNIA_CRITICAL,
					unit: "мм рт. ст.",
					message: `КРИТИЧЕСКАЯ ГИПЕРКАПНИЯ: EtCO2 ${etCO2} мм рт. ст. (норма 35–45, порог > 50 мм рт. ст.). Выраженная гиповентиляция / угнетение дыхательного центра!`,
					timestamp: ts,
					recommendedAction:
						"Увеличить минутный объем дыхания (МОД), частоту и дыхательный объем ИВЛ, санировать ВДП, исключить обструкцию.",
				});
			} else if (etCO2 < VITAL_THRESHOLDS.ETCO2_HYPOCAPNIA_CRITICAL && etCO2 > 0) {
				alarms.push({
					code: "CRITICAL_HYPOCAPNIA",
					severity: "CRITICAL",
					metric: "EtCO2",
					value: etCO2,
					threshold: VITAL_THRESHOLDS.ETCO2_HYPOCAPNIA_CRITICAL,
					unit: "мм рт. ст.",
					message: `КРИТИЧЕСКАЯ ГИПОКАПНИЯ: EtCO2 ${etCO2} мм рт. ст. (порог < 20 мм рт. ст.). Риск гипервентиляции, падения сердечного выброса или разгерметизации контура!`,
					timestamp: ts,
					recommendedAction:
						"Проверить герметичность дыхательного контура и положение датчика капнографа, скорректировать параметры вентиляции, исключить гиповолемию.",
				});
			}
		}

		const hasCriticalAlarm = alarms.some(
			(a) => a.severity === "CRITICAL" || a.severity === "EMERGENCY",
		);

		return { alarms, hasCriticalAlarm };
	}

	/**
	 * Создает структурированную запись мониторинга витальных функций
	 * с авторасчетом гемодинамики и детекцией критических маркеров.
	 */
	public static createVitalSignsRecord(
		input: VitalSignsInput,
	): VitalSignsRecord {
		if (input.spO2 < 0 || input.spO2 > 100) {
			throw new AnesthesiaProtocolError(
				"InvalidVitalSigns",
				`Недопустимое значение SpO2: ${input.spO2}%. Диапазон 0–100%.`,
			);
		}
		if (input.heartRate < 20 || input.heartRate > 250) {
			throw new AnesthesiaProtocolError(
				"InvalidVitalSigns",
				`Недопустимое значение ЧСС: ${input.heartRate} уд/мин. Диапазон 20–250.`,
			);
		}
		if (input.systolicBp < 30 || input.systolicBp > 300) {
			throw new AnesthesiaProtocolError(
				"InvalidVitalSigns",
				`Недопустимое значение АДс: ${input.systolicBp} мм рт. ст. Диапазон 30–300.`,
			);
		}
		if (input.diastolicBp < 20 || input.diastolicBp > 200) {
			throw new AnesthesiaProtocolError(
				"InvalidVitalSigns",
				`Недопустимое значение АДд: ${input.diastolicBp} мм рт. ст. Диапазон 20–200.`,
			);
		}
		if (
			input.ramsayScore !== undefined &&
			!isRamsayScore(input.ramsayScore)
		) {
			throw new AnesthesiaProtocolError(
				"InvalidRamsayScore",
				`Недопустимое значение шкалы Рамси: ${input.ramsayScore}. Ожидается целое число от 1 до 6.`,
			);
		}

		const hemodynamics = this.calculateHemodynamics(
			input.systolicBp,
			input.diastolicBp,
			input.heartRate,
		);

		const timestampStr = input.timestamp
			? new Date(input.timestamp).toISOString()
			: new Date().toISOString();

		const { alarms, hasCriticalAlarm } = this.evaluateVitalAlarms({
			spO2: input.spO2,
			heartRate: input.heartRate,
			systolicBp: input.systolicBp,
			diastolicBp: input.diastolicBp,
			etCO2: input.etCO2,
			timestamp: timestampStr,
		});

		return {
			id: crypto.randomUUID(),
			timestamp: timestampStr,
			stage: input.stage,
			spO2: input.spO2,
			heartRate: input.heartRate,
			systolicBp: input.systolicBp,
			diastolicBp: input.diastolicBp,
			etCO2: input.etCO2,
			respiratoryRate: input.respiratoryRate,
			temperature: input.temperature,
			ramsayScore: input.ramsayScore,
			oxygenFlowLpm: input.oxygenFlowLpm,
			meanArterialPressure: hemodynamics.meanArterialPressure,
			pulsePressure: hemodynamics.pulsePressure,
			shockIndex: hemodynamics.shockIndex,
			notes: input.notes,
			alarms,
			hasCriticalAlarm,
		};
	}

	// --------------------------------------------------------------------------
	// Регистрация и подсчет медикаментов
	// --------------------------------------------------------------------------

	/**
	 * Валидирует и формирует запись введения лекарственного препарата / анестетика.
	 */
	public static createMedicationRecord(
		input: MedicationAdministrationInput,
	): MedicationAdministrationRecord {
		const trimmedName = input.drugName?.trim();
		if (!trimmedName) {
			throw new AnesthesiaProtocolError(
				"InvalidMedication",
				"Название препарата обязательно для заполнения.",
			);
		}
		if (typeof input.dose !== "number" || input.dose <= 0 || isNaN(input.dose)) {
			throw new AnesthesiaProtocolError(
				"InvalidMedication",
				`Недопустимая доза препарата "${trimmedName}": ${input.dose}. Доза должна быть положительным числом.`,
			);
		}
		if (!input.unit) {
			throw new AnesthesiaProtocolError(
				"InvalidMedication",
				`Для препарата "${trimmedName}" не указаны единицы измерения дозировки.`,
			);
		}
		if (!input.route) {
			throw new AnesthesiaProtocolError(
				"InvalidMedication",
				`Для препарата "${trimmedName}" не указан способ введения.`,
			);
		}
		if (!input.administeredBy?.trim()) {
			throw new AnesthesiaProtocolError(
				"InvalidMedication",
				`Не указан сотрудник, выполнивший введение препарата "${trimmedName}".`,
			);
		}

		// Автоопределение категории, если не передана явно
		let category: DrugCategory = input.category || "other";
		if (!input.category) {
			const lower = trimmedName.toLowerCase();
			if (
				lower.includes("пропофол") ||
				lower.includes("диприван") ||
				lower.includes("тиопентал")
			) {
				category = "general_anesthetic";
			} else if (
				lower.includes("севофлуран") ||
				lower.includes("севоран") ||
				lower.includes("закись азота")
			) {
				category = "inhalation_anesthetic";
			} else if (
				lower.includes("артикаин") ||
				lower.includes("убистезин") ||
				lower.includes("ультракаин") ||
				lower.includes("септанест") ||
				lower.includes("мепивакаин") ||
				lower.includes("скандонест") ||
				lower.includes("лидокаин")
			) {
				category = "local_anesthetic";
			} else if (
				lower.includes("мидазолам") ||
				lower.includes("дормикум") ||
				lower.includes("диазепам") ||
				lower.includes("реланиум") ||
				lower.includes("дексмедетомидин") ||
				lower.includes("дексдор")
			) {
				category = "sedative_hypnotic";
			} else if (
				lower.includes("фентанил") ||
				lower.includes("морфин") ||
				lower.includes("трамадол") ||
				lower.includes("промедол")
			) {
				category = "opioid_analgesic";
			} else if (
				lower.includes("кеторолак") ||
				lower.includes("кетонал") ||
				lower.includes("дексалгин") ||
				lower.includes("парацетамол")
			) {
				category = "nsaid";
			} else if (
				lower.includes("атропин") ||
				lower.includes("эфедрин") ||
				lower.includes("адреналин") ||
				lower.includes("эпинефрин")
			) {
				category = "emergency_cardiovascular";
			} else if (
				lower.includes("дексаметазон") ||
				lower.includes("преднизолон")
			) {
				category = "corticosteroid";
			} else if (
				lower.includes("ондансетрон") ||
				lower.includes("латран") ||
				lower.includes("церукал")
			) {
				category = "antiemetic";
			} else if (
				lower.includes("натрия хлорид") ||
				lower.includes("стерофундин") ||
				lower.includes("рингера") ||
				lower.includes("глюкоза")
			) {
				category = "infusion_solution";
			}
		}

		const timestampStr = input.timestamp
			? new Date(input.timestamp).toISOString()
			: new Date().toISOString();

		return {
			id: crypto.randomUUID(),
			timestamp: timestampStr,
			drugName: trimmedName,
			dose: input.dose,
			unit: input.unit,
			route: input.route,
			category,
			administeredBy: input.administeredBy.trim(),
			targetSite: input.targetSite?.trim(),
			notes: input.notes?.trim(),
		};
	}

	/**
	 * Подсчитывает суммарные введенные дозировки препаратов за все время процедуры.
	 */
	public static calculateCumulativeMedications(
		medications: readonly MedicationAdministrationRecord[],
	): readonly DrugCumulativeSummary[] {
		const map = new Map<
			string,
			{
				drugName: string;
				totalDose: number;
				unit: MedicationUnit;
				count: number;
				routes: Set<AdministrationRoute>;
			}
		>();

		for (const med of medications) {
			const key = `${med.drugName.toLowerCase()}_${med.unit}`;
			const existing = map.get(key);
			if (existing) {
				existing.totalDose += med.dose;
				existing.count += 1;
				existing.routes.add(med.route);
			} else {
				map.set(key, {
					drugName: med.drugName,
					totalDose: med.dose,
					unit: med.unit,
					count: 1,
					routes: new Set([med.route]),
				});
			}
		}

		return Array.from(map.values()).map((entry) => ({
			drugName: entry.drugName,
			totalDose: Number(entry.totalDose.toFixed(3)),
			unit: entry.unit,
			administrationCount: entry.count,
			routes: Array.from(entry.routes),
		}));
	}

	// --------------------------------------------------------------------------
	// Шкала Альдрете (Оценка готовности к выписке/переводу)
	// --------------------------------------------------------------------------

	/**
	 * Оценка статуса восстановления по модифицированной шкале Альдрете (Aldrete Score).
	 * По Приказу 919н: безопасная выписка / перевод из палаты пробуждения возможна при сумме >= 9 баллов.
	 */
	public static evaluateAldreteScore(
		evaluation: AldreteEvaluation,
	): AldreteScoreResult {
		const {
			activity,
			respiration,
			circulation,
			consciousness,
			oxygenSaturation,
		} = evaluation;

		const totalScore =
			activity +
			respiration +
			circulation +
			consciousness +
			oxygenSaturation;

		const isSafeForDischarge = totalScore >= 9;

		let clinicalVerdict = "";
		if (totalScore >= 9) {
			clinicalVerdict =
				"Критерии выписки/перевода достигнуты: витальные функции стабильны, сознание ясное, моторный и дыхательный статус восстановлены (Aldrete Score >= 9). Пациент готов к переводу в палату / выписке домой в сопровождении.";
		} else if (totalScore >= 7) {
			clinicalVerdict =
				"Требуется продолжение наблюдения в палате пробуждения: неполное восстановление рефлексов/гемодинамики (Aldrete Score 7–8). Выписка преждевременна.";
		} else {
			clinicalVerdict =
				"ВНИМАНИЕ: Пациент нестабилен или находится в состоянии глубокой седации/угнетения витальных функций (Aldrete Score <= 6). Требуется интенсивный мониторинг и респираторная поддержка!";
		}

		return {
			totalScore,
			isSafeForDischarge,
			breakdown: evaluation,
			evaluatedAt: new Date().toISOString(),
			clinicalVerdict,
		};
	}

	// --------------------------------------------------------------------------
	// Предоперационная оценка риска
	// --------------------------------------------------------------------------

	/**
	 * Создает и валидирует предоперационный осмотр анестезиолога.
	 */
	public static createPreoperativeAssessment(params: {
		anesthesiologistName: string;
		asaScore: AsaScore;
		isEmergency?: boolean;
		mallampatiClass: MallampatiClass;
		targetRamsayScore?: RamsayScore;
		solidFoodFastingHours: number;
		clearLiquidsFastingHours: number;
		allergies?: readonly string[];
		chronicDiseases?: readonly string[];
		airwayNotes?: string;
		premedication?: string;
		baselineVitals: {
			spO2: number;
			heartRate: number;
			systolicBp: number;
			diastolicBp: number;
			respiratoryRate?: number | undefined;
		};
	}): PreoperativeAssessment {
		if (!params.anesthesiologistName?.trim()) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"ФИО врача-анестезиолога обязательно для заполнения в предоперационном осмотре.",
			);
		}
		if (!isAsaScore(params.asaScore)) {
			throw new AnesthesiaProtocolError(
				"InvalidAsaScore",
				`Недопустимый класс риска ASA: ${params.asaScore}. Допустимы: ${ASA_SCORES.join(", ")}.`,
			);
		}
		if (!isMallampatiClass(params.mallampatiClass)) {
			throw new AnesthesiaProtocolError(
				"InvalidMallampatiClass",
				`Недопустимый класс по Маллампати: ${params.mallampatiClass}. Допустимы: ${MALLAMPATI_CLASSES.join(", ")}.`,
			);
		}

		const targetRamsay = params.targetRamsayScore ?? 2;
		if (!isRamsayScore(targetRamsay)) {
			throw new AnesthesiaProtocolError(
				"InvalidRamsayScore",
				`Недопустимый целевой балл шкалы Рамси: ${targetRamsay}. Ожидается 1..6.`,
			);
		}

		if (
			params.solidFoodFastingHours < 0 ||
			params.clearLiquidsFastingHours < 0
		) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"Голодный промежуток не может быть отрицательным числом.",
			);
		}

		// Адекватность голодного промежутка: твердая пища >= 6ч, прозрачные жидкости >= 2ч
		const isFastingAdequate =
			params.solidFoodFastingHours >= 6 &&
			params.clearLiquidsFastingHours >= 2;

		// Проверка исходных витальных функций
		this.calculateHemodynamics(
			params.baselineVitals.systolicBp,
			params.baselineVitals.diastolicBp,
			params.baselineVitals.heartRate,
		);

		return {
			evaluatedAt: new Date().toISOString(),
			anesthesiologistName: params.anesthesiologistName.trim(),
			asaScore: params.asaScore,
			isEmergency: Boolean(params.isEmergency),
			mallampatiClass: params.mallampatiClass,
			targetRamsayScore: targetRamsay,
			fastingStatus: {
				solidFoodHours: params.solidFoodFastingHours,
				clearLiquidsHours: params.clearLiquidsFastingHours,
				isFastingAdequate,
				notes: isFastingAdequate
					? "Голодный промежуток выдержан в полном объеме (Приказ № 919н)."
					: `ВНИМАНИЕ: Голодный промежуток недостаточен! (Твердая пища: ${params.solidFoodFastingHours}ч, норма >= 6ч; жидкости: ${params.clearLiquidsFastingHours}ч, норма >= 2ч). Риск аспирации желудочного содержимого!`,
			},
			allergies: params.allergies ? [...params.allergies] : [],
			chronicDiseases: params.chronicDiseases
				? [...params.chronicDiseases]
				: [],
			airwayNotes: params.airwayNotes?.trim(),
			premedication: params.premedication?.trim(),
			baselineVitals: { ...params.baselineVitals },
		};
	}

	// --------------------------------------------------------------------------
	// Создание и управление протоколом анестезии
	// --------------------------------------------------------------------------

	/**
	 * Инициализирует новый Протокол анестезиологического пособия.
	 */
	public static initProtocol(params: {
		organizationId: string;
		patientId: string;
		visitId: string;
		anesthesiologistId: string;
		anesthesiologistName: string;
		attendingDentistName: string;
		nurseAnesthetistName?: string;
		plannedProcedure: string;
		anesthesiaType: AnesthesiaType;
		preoperativeAssessment: PreoperativeAssessment;
		startedAt?: string | Date;
	}): AnesthesiaProtocol {
		if (!params.organizationId) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"organizationId обязателен.",
			);
		}
		if (!params.patientId) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"patientId обязателен.",
			);
		}
		if (!params.visitId) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"visitId обязателен.",
			);
		}
		if (!params.anesthesiologistName?.trim()) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"ФИО анестезиолога обязательно.",
			);
		}
		if (!params.attendingDentistName?.trim()) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"ФИО лечащего врача-стоматолога обязательно.",
			);
		}
		if (!params.plannedProcedure?.trim()) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"Планируемое вмешательство обязательно для заполнения.",
			);
		}

		const startedAtIso = params.startedAt
			? new Date(params.startedAt).toISOString()
			: new Date().toISOString();

		const protocolId = crypto.randomUUID();
		const dateStr = startedAtIso.substring(0, 10).replace(/-/g, "");
		const shortId = protocolId.substring(0, 6).toUpperCase();
		const protocolNumber = `AP-919N-${dateStr}-${shortId}`;

		// Формируем исходную запись витальных функций из предоперационного осмотра
		const baselineVitalRecord = this.createVitalSignsRecord({
			timestamp: startedAtIso,
			stage: "preoperative",
			spO2: params.preoperativeAssessment.baselineVitals.spO2,
			heartRate: params.preoperativeAssessment.baselineVitals.heartRate,
			systolicBp: params.preoperativeAssessment.baselineVitals.systolicBp,
			diastolicBp: params.preoperativeAssessment.baselineVitals.diastolicBp,
			respiratoryRate:
				params.preoperativeAssessment.baselineVitals.respiratoryRate,
			ramsayScore: params.preoperativeAssessment.targetRamsayScore,
			notes: "Исходные витальные функции перед началом анестезиологического пособия.",
		});

		return {
			id: protocolId,
			protocolNumber,
			organizationId: params.organizationId,
			patientId: params.patientId,
			visitId: params.visitId,
			createdAt: new Date().toISOString(),
			startedAt: startedAtIso,
			status: "in_progress",
			anesthesiologistId: params.anesthesiologistId,
			anesthesiologistName: params.anesthesiologistName.trim(),
			nurseAnesthetistName: params.nurseAnesthetistName?.trim(),
			attendingDentistName: params.attendingDentistName.trim(),
			plannedProcedure: params.plannedProcedure.trim(),
			anesthesiaType: params.anesthesiaType,
			preoperativeAssessment: params.preoperativeAssessment,
			vitalSignsTimeline: [baselineVitalRecord],
			medicationLog: [],
			adverseEvents: [],
		};
	}

	/**
	 * Добавляет измерение витальных функций в протокол.
	 */
	public static addVitalSigns(
		protocol: AnesthesiaProtocol,
		vitalInput: VitalSignsInput,
	): AnesthesiaProtocol {
		if (
			protocol.status === "completed" ||
			protocol.status === "interrupted"
		) {
			throw new AnesthesiaProtocolError(
				"ProtocolAlreadyFinalized",
				`Нельзя добавлять измерения витальных функций в завершенный протокол (${protocol.status}).`,
			);
		}

		const newRecord = this.createVitalSignsRecord(vitalInput);

		// Добавляем запись и сортируем по хронологии
		const updatedTimeline = [...protocol.vitalSignsTimeline, newRecord].sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		);

		return {
			...protocol,
			vitalSignsTimeline: updatedTimeline,
		};
	}

	/**
	 * Регистрирует введение анестетика или медикамента в протокол.
	 */
	public static addMedication(
		protocol: AnesthesiaProtocol,
		medInput: MedicationAdministrationInput,
	): AnesthesiaProtocol {
		if (
			protocol.status === "completed" ||
			protocol.status === "interrupted"
		) {
			throw new AnesthesiaProtocolError(
				"ProtocolAlreadyFinalized",
				`Нельзя регистрировать введение препаратов в завершенный протокол (${protocol.status}).`,
			);
		}

		const newMed = this.createMedicationRecord(medInput);

		const updatedLog = [...protocol.medicationLog, newMed].sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		);

		return {
			...protocol,
			medicationLog: updatedLog,
		};
	}

	/**
	 * Регистрирует осложнение, непредвиденную реакцию или врачебное вмешательство.
	 */
	public static recordAdverseEvent(
		protocol: AnesthesiaProtocol,
		params: {
			eventType: string;
			description: string;
			intervention: string;
			resolved: boolean;
			outcomeNotes?: string;
			timestamp?: string | Date;
		},
	): AnesthesiaProtocol {
		if (!params.eventType?.trim() || !params.description?.trim()) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"Тип события и описание обязательны для фиксации осложнения.",
			);
		}
		if (!params.intervention?.trim()) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"Предпринятое врачебное вмешательство обязательно для фиксации осложнения.",
			);
		}

		const event: AdverseEventRecord = {
			id: crypto.randomUUID(),
			timestamp: params.timestamp
				? new Date(params.timestamp).toISOString()
				: new Date().toISOString(),
			eventType: params.eventType.trim(),
			description: params.description.trim(),
			intervention: params.intervention.trim(),
			resolved: params.resolved,
			outcomeNotes: params.outcomeNotes?.trim(),
		};

		return {
			...protocol,
			adverseEvents: [...protocol.adverseEvents, event],
		};
	}

	/**
	 * Завершает и финализирует протокол анестезиологического пособия.
	 */
	public static finalizeProtocol(
		protocol: AnesthesiaProtocol,
		params: {
			endedAt?: string | Date;
			aldreteEvaluation: AldreteEvaluation;
			transferDestination:
				| "recovery_room"
				| "day_hospital"
				| "discharged_home"
				| "hospitalized_icu";
			finalNotes?: string;
			requireSafeAldreteForDischarge?: boolean;
		},
	): AnesthesiaProtocol {
		if (
			protocol.status === "completed" ||
			protocol.status === "interrupted"
		) {
			throw new AnesthesiaProtocolError(
				"ProtocolAlreadyFinalized",
				"Протокол анестезии уже был ранее финализирован.",
			);
		}

		const endedAtIso = params.endedAt
			? new Date(params.endedAt).toISOString()
			: new Date().toISOString();

		const startMs = new Date(protocol.startedAt).getTime();
		const endMs = new Date(endedAtIso).getTime();

		if (endMs < startMs) {
			throw new AnesthesiaProtocolError(
				"ValidationError",
				"Время окончания анестезии не может быть раньше времени начала.",
			);
		}

		const durationMinutes = Math.max(
			1,
			Math.round((endMs - startMs) / 60000),
		);

		const aldreteResult = this.evaluateAldreteScore(
			params.aldreteEvaluation,
		);

		if (
			params.requireSafeAldreteForDischarge &&
			params.transferDestination === "discharged_home" &&
			!aldreteResult.isSafeForDischarge
		) {
			throw new AnesthesiaProtocolError(
				"AldreteScoreInsufficient",
				`Выписка домой запрещена: оценка по шкале Альдрете составляет ${aldreteResult.totalScore}/10 баллов (требуется >= 9 по Приказу 919н).`,
			);
		}

		// Формируем детерминированный цифровой хеш-слепок протокола для защиты от модификаций
		const rawSignaturePayload = JSON.stringify({
			protocolNumber: protocol.protocolNumber,
			patientId: protocol.patientId,
			visitId: protocol.visitId,
			anesthesiologistName: protocol.anesthesiologistName,
			startedAt: protocol.startedAt,
			endedAt: endedAtIso,
			durationMinutes,
			vitalsCount: protocol.vitalSignsTimeline.length,
			medsCount: protocol.medicationLog.length,
			aldreteScore: aldreteResult.totalScore,
		});

		const signatureDigest = crypto
			.createHash("sha256")
			.update(rawSignaturePayload, "utf8")
			.digest("hex");

		return {
			...protocol,
			endedAt: endedAtIso,
			durationMinutes,
			status: "completed",
			aldreteRecovery: aldreteResult,
			postOpTransferDestination: params.transferDestination,
			finalNotes: params.finalNotes?.trim(),
			signedAt: new Date().toISOString(),
			signatureDigest,
		};
	}

	// --------------------------------------------------------------------------
	// Экспертиза соответствия Приказу Минздрава РФ № 919н
	// --------------------------------------------------------------------------

	/**
	 * Проверяет протокол анестезии на соответствие обязательным стандартам
	 * ведения медицинской документации по Приказу № 919н.
	 */
	public static validateOrder919nCompliance(
		protocol: AnesthesiaProtocol,
	): ComplianceValidationReport {
		const violations: string[] = [];
		const missingSections: string[] = [];
		const now = new Date().toISOString();

		// 1. Предоперационный осмотр
		if (!protocol.preoperativeAssessment) {
			missingSections.push("Предоперационный осмотр анестезиолога");
			violations.push(
				"Отсутствует обязательный предоперационный осмотр врача-анестезиолога-реаниматолога.",
			);
		} else {
			if (!protocol.preoperativeAssessment.asaScore) {
				violations.push(
					"Не указан класс анестезиолого-операционного риска по классификации ASA.",
				);
			}
			if (!protocol.preoperativeAssessment.mallampatiClass) {
				violations.push(
					"Не оценена проходимость верхних дыхательных путей по шкале Маллампати.",
				);
			}
			if (!protocol.preoperativeAssessment.fastingStatus) {
				violations.push(
					"Не зафиксирован голодный промежуток пациента.",
				);
			}
		}

		// 2. Мониторинг витальных функций (Приказ 919н: непрерывный мониторинг SpO2, АД, ЧСС)
		if (protocol.vitalSignsTimeline.length === 0) {
			missingSections.push("Мониторинг витальных функций");
			violations.push(
				"В протоколе отсутствуют записи мониторинга витальных функций.",
			);
		} else if (protocol.vitalSignsTimeline.length < 2) {
			violations.push(
				"Недостаточная частота фиксации витальных функций (требуется как минимум исходное и завершающее измерение).",
			);
		}

		// 3. Анализ критических инцидентов
		let criticalAlarmsCount = 0;
		for (const v of protocol.vitalSignsTimeline) {
			criticalAlarmsCount += v.alarms.filter(
				(a) => a.severity === "CRITICAL" || a.severity === "EMERGENCY",
			).length;
		}

		// Если были критические тревоги, но нет записей о действиях/осложнениях
		if (criticalAlarmsCount > 0 && protocol.adverseEvents.length === 0) {
			violations.push(
				`В ходе мониторинга зафиксировано ${criticalAlarmsCount} критических инцидентов, однако в протоколе отсутствуют записи о проведенных купирующих мероприятиях/осложнениях.`,
			);
		}

		// 4. Журнал медикаментов
		if (protocol.medicationLog.length === 0) {
			violations.push(
				"Не зафиксировано введение ни одного лекарственного средства / анестетика.",
			);
		}

		// 5. Оценка восстановления по Альдрете при завершении
		if (protocol.status === "completed") {
			if (!protocol.aldreteRecovery) {
				missingSections.push(
					"Оценка восстановления по шкале Альдрете",
				);
				violations.push(
					"Завершенный протокол не содержит оценки готовности к выписке/переводу по шкале Альдрете.",
				);
			} else if (
				protocol.postOpTransferDestination === "discharged_home" &&
				!protocol.aldreteRecovery.isSafeForDischarge
			) {
				violations.push(
					`Нарушение критериев безопасности: оформлена выписка домой при сумме баллов Альдрете ${protocol.aldreteRecovery.totalScore} < 9.`,
				);
			}

			if (!protocol.signedAt) {
				violations.push("Протокол не подписан электронной подписью.");
			}
		}

		const isCompliant =
			violations.length === 0 && missingSections.length === 0;

		const summary = isCompliant
			? "Протокол анестезиологического пособия полностью соответствует требованиям Приказа Минздрава России № 919н."
			: `Выявлены несоответствия Приказу № 919н (${violations.length} нарушений). Протокол требует доработки.`;

		return {
			isCompliant,
			checkedAt: now,
			order919nRuleViolations: violations,
			criticalAlarmsDetectedCount: criticalAlarmsCount,
			missingRequiredSections: missingSections,
			summary,
		};
	}

	// --------------------------------------------------------------------------
	// Генератор официального печатного отчета протокола (Приказ № 919н)
	// --------------------------------------------------------------------------

	/**
	 * Генерирует официальный структурированный юридический текст протокола
	 * для интеграции в ЭМК формы 043/у и экспорта в ЕГИСЗ.
	 */
	public static generateOfficialProtocolReport(
		protocol: AnesthesiaProtocol,
	): string {
		const cumulativeMeds = this.calculateCumulativeMedications(
			protocol.medicationLog,
		);

		const preOp = protocol.preoperativeAssessment;
		const asaDef = ASA_DEFINITIONS[preOp.asaScore];
		const mallampatiDef = MALLAMPATI_DEFINITIONS[preOp.mallampatiClass];
		const ramsayDef = RAMSAY_DEFINITIONS[preOp.targetRamsayScore];

		const lines: string[] = [];

		lines.push(
			"================================================================================",
		);
		lines.push(
			"              ПРОТОКОЛ АНЕСТЕЗИОЛОГИЧЕСКОГО ПОСОБИЯ (ПРИКАЗ МЗ РФ № 919н)       ",
		);
		lines.push(
			"================================================================================",
		);
		lines.push(`Номер протокола: ${protocol.protocolNumber}`);
		lines.push(`Статус: ${protocol.status.toUpperCase()}`);
		lines.push(`Врач-анестезиолог-реаниматолог: ${protocol.anesthesiologistName}`);
		if (protocol.nurseAnesthetistName) {
			lines.push(`Медицинская сестра-анестезист: ${protocol.nurseAnesthetistName}`);
		}
		lines.push(`Лечащий врач-стоматолог: ${protocol.attendingDentistName}`);
		lines.push(`Планируемое вмешательство: ${protocol.plannedProcedure}`);
		lines.push(`Вид анестезии/седации: ${protocol.anesthesiaType}`);
		lines.push(`Начало анестезии: ${protocol.startedAt}`);
		if (protocol.endedAt) {
			lines.push(`Окончание анестезии: ${protocol.endedAt}`);
			lines.push(`Длительность: ${protocol.durationMinutes} мин.`);
		}
		lines.push("");

		lines.push("--- I. ПРЕДОПЕРАЦИОННЫЙ ОСМОТР И ОЦЕНКА РИСКОВ ---");
		lines.push(`Физический статус: ${asaDef.titleRu} ${preOp.isEmergency ? "(Экстренная 'E')" : ""}`);
		lines.push(`  - Риск: ${asaDef.systemicRisk.toUpperCase()}`);
		lines.push(`  - Описание: ${asaDef.descriptionRu}`);
		lines.push(`Проходимость ВДП: ${mallampatiDef.titleRu}`);
		lines.push(`  - Анатомическая картина: ${mallampatiDef.anatomyRu}`);
		lines.push(`  - Риск трудной интубации: ${mallampatiDef.intubationDifficultyRisk.toUpperCase()}`);
		lines.push(`Целевой уровень седации: ${ramsayDef.titleRu} (${ramsayDef.clinicalStateRu})`);
		lines.push(
			`Голодный промежуток: твердая пища — ${preOp.fastingStatus.solidFoodHours} ч., жидкости — ${preOp.fastingStatus.clearLiquidsHours} ч. (${preOp.fastingStatus.isFastingAdequate ? "Адекватен" : "НЕ АДЕКВАТЕН!"})`,
		);
		if (preOp.allergies.length > 0) {
			lines.push(`Аллергологический анамнез: ${preOp.allergies.join(", ")}`);
		} else {
			lines.push("Аллергологический анамнез: Не отягощен");
		}
		if (preOp.chronicDiseases.length > 0) {
			lines.push(`Сопутствующие заболевания: ${preOp.chronicDiseases.join(", ")}`);
		}
		if (preOp.airwayNotes) {
			lines.push(`Особенности дыхательных путей: ${preOp.airwayNotes}`);
		}
		lines.push("");

		lines.push("--- II. МОНИТОРИНГ ВИТАЛЬНЫХ ФУНКЦИЙ ---");
		lines.push(
			"Время      | Этап         | SpO2  | ЧСС | АД (мм рт.ст.) | САД | EtCO2 | Рамси | Тревоги",
		);
		lines.push(
			"-----------+--------------+-------+-----+----------------+-----+-------+-------+--------",
		);
		for (const v of protocol.vitalSignsTimeline) {
			const timeShort = v.timestamp.substring(11, 19);
			const stagePadded = v.stage.padEnd(12);
			const spO2Padded = `${v.spO2}%`.padEnd(5);
			const hrPadded = `${v.heartRate}`.padEnd(3);
			const bpPadded = `${v.systolicBp}/${v.diastolicBp}`.padEnd(14);
			const mapPadded = `${v.meanArterialPressure}`.padEnd(3);
			const etCo2Padded = v.etCO2 !== undefined ? `${v.etCO2}`.padEnd(5) : " -   ";
			const ramsayPadded = v.ramsayScore !== undefined ? `${v.ramsayScore}`.padEnd(5) : " -   ";
			const alarmStr = v.alarms.length > 0
				? v.alarms.map((a) => `[${a.severity}:${a.code}]`).join(" ")
				: "Норма";

			lines.push(
				`${timeShort} | ${stagePadded} | ${spO2Padded} | ${hrPadded} | ${bpPadded} | ${mapPadded} | ${etCo2Padded} | ${ramsayPadded} | ${alarmStr}`,
			);
		}
		lines.push("");

		lines.push("--- III. ЖУРНАЛ ВВЕДЕНИЯ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ ---");
		for (const med of protocol.medicationLog) {
			const medTime = med.timestamp.substring(11, 19);
			lines.push(
				`[${medTime}] ${med.drugName} — ${med.dose} ${med.unit} (${med.route.toUpperCase()}), выполнил: ${med.administeredBy}${med.targetSite ? ` [Область: ${med.targetSite}]` : ""}`,
			);
		}
		lines.push("");
		lines.push("ИТОГОВЫЙ РАСХОД ПРЕПАРАТОВ:");
		for (const cum of cumulativeMeds) {
			lines.push(
				`  • ${cum.drugName}: ${cum.totalDose} ${cum.unit} (введений: ${cum.administrationCount}, пути: ${cum.routes.join(", ")})`,
			);
		}
		lines.push("");

		if (protocol.adverseEvents.length > 0) {
			lines.push("--- IV. ОСЛОЖНЕНИЯ И ОСОБЫЕ ПРОИСШЕСТВИЯ ---");
			for (const adv of protocol.adverseEvents) {
				lines.push(
					`[${adv.timestamp.substring(11, 19)}] ${adv.eventType}: ${adv.description}`,
				);
				lines.push(`  Врачебное вмешательство: ${adv.intervention}`);
				lines.push(
					`  Исход: ${adv.resolved ? "Купировано полностью" : "Требует дальнейшего контроля"}${adv.outcomeNotes ? ` (${adv.outcomeNotes})` : ""}`,
				);
			}
			lines.push("");
		}

		if (protocol.aldreteRecovery) {
			lines.push("--- V. ОЦЕНКА ПОСЛЕОПЕРАЦИОННОГО ВОССТАНОВЛЕНИЯ (ШКАЛА АЛЬДРЕТЕ) ---");
			lines.push(`Общий балл по шкале Альдрете: ${protocol.aldreteRecovery.totalScore} / 10`);
			lines.push(`  - Двигательная активность: ${protocol.aldreteRecovery.breakdown.activity} / 2`);
			lines.push(`  - Дыхание: ${protocol.aldreteRecovery.breakdown.respiration} / 2`);
			lines.push(`  - Гемодинамика: ${protocol.aldreteRecovery.breakdown.circulation} / 2`);
			lines.push(`  - Сознание: ${protocol.aldreteRecovery.breakdown.consciousness} / 2`);
			lines.push(`  - Оксигенация (SpO2): ${protocol.aldreteRecovery.breakdown.oxygenSaturation} / 2`);
			lines.push(`Клинический вердикт: ${protocol.aldreteRecovery.clinicalVerdict}`);
			if (protocol.postOpTransferDestination) {
				lines.push(`Направление перевода/выписки: ${protocol.postOpTransferDestination.toUpperCase()}`);
			}
			lines.push("");
		}

		if (protocol.finalNotes) {
			lines.push(`Заключительные комментарии: ${protocol.finalNotes}`);
			lines.push("");
		}

		if (protocol.signatureDigest) {
			lines.push("--- VI. ЭЛЕКТРОННАЯ ПОДПИСЬ И ЦЕЛОСТНОСТЬ ---");
			lines.push(`Подписано врачом-анестезиологом: ${protocol.anesthesiologistName}`);
			lines.push(`Время подписания: ${protocol.signedAt}`);
			lines.push(`Цифровой хеш-слепок (SHA-256): ${protocol.signatureDigest}`);
		}

		lines.push(
			"================================================================================",
		);

		return lines.join("\n");
	}
}
