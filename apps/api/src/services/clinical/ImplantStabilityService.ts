/**
 * ImplantStabilityService.ts — Сервис анализа стабильности дентальных имплантатов
 * методом частотно-резонансного анализа (RFA / ISQ — Implant Stability Quotient)
 * и трекинга остеоинтеграции во времени.
 *
 * КЛИНИЧЕСКИЕ СТАНДАРТЫ И ПРОТОКОЛЫ (ITI Consensus / Osstell / Penguin RFA):
 * 1. Замеры ISQ проводятся по 4 анатомическим направлениям:
 *    - Мезиально (Mesial)
 *    - Дистально (Distal)
 *    - Вестибулярно / Щечно (Buccal / Vestibular)
 *    - Язычно / Небно (Lingual / Palatal)
 *
 * 2. Клинические протоколы нагрузки на основе среднего ISQ (Mean ISQ):
 *    - ISQ >= 70: Немедленная нагрузка (Immediate loading, 0–72 часа)
 *    - 65 <= ISQ < 70: Ранняя нагрузка (Early loading, 4–6 недель)
 *    - ISQ < 65: Традиционная отсроченная нагрузка (Conventional delayed loading, 3–6 месяцев)
 *    - ISQ < 50: Критически низкая стабильность / риск фиброинтеграции
 *
 * 3. Мониторинг динамики остеоинтеграции (дельта ISQ во времени):
 *    - Положительная динамика (дельта >= +3): Прогрессирующая остеоинтеграция.
 *    - Физиологический спад первичной стабильности (2–4 недели, дельта от -1 до -5):
 *      Нормальная перестройка костной ткани (остеокластическая резорбция до вторичного остеогенеза).
 *    - ПРИЗНАКИ ДЕЗИНТЕГРАЦИИ (Падение ISQ > 5 единиц, дельта < -5):
 *      Критический маркер потери фиксации, периимплантита или перегрузки.
 *      Требует немедленной разгрузки, КЛКТ-контроля и антисептического протокола.
 *
 * 4. Учет челюсти (в/ч vs н/ч), типа кости (D1–D4 по Lekholm & Zarb) и торка установки (Н·см).
 */

/**
 * Валидные номера постоянных зубов по системе FDI (ISO 3950).
 */
export const FDI_PERMANENT_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18, // Верхний правый квадрант (1)
	21, 22, 23, 24, 25, 26, 27, 28, // Верхний левый квадрант (2)
	31, 32, 33, 34, 35, 36, 37, 38, // Нижний левый квадрант (3)
	41, 42, 43, 44, 45, 46, 47, 48, // Нижний правый квадрант (4)
]);

/**
 * 4 анатомических направления измерения ISQ.
 */
export type ISQMeasurementDirection =
	| "mesial"
	| "distal"
	| "buccal"
	| "lingual";

/**
 * Значения замеров ISQ по направлениям.
 */
export interface DirectionalISQ {
	readonly mesial?: number | null | undefined;
	readonly distal?: number | null | undefined;
	readonly buccal?: number | null | undefined;
	readonly lingual?: number | null | undefined; // Также используется для небного направления на в/ч
}

/**
 * Тип кости по Lekholm & Zarb.
 */
export type BoneDensityType = "D1" | "D2" | "D3" | "D4";

/**
 * Локализация по челюсти.
 */
export type JawLocation = "maxilla" | "mandible";

/**
 * Этап имплантологического лечения.
 */
export type ImplantationStage =
	| "placement" // Установка имплантата (первичная стабильность, день 0)
	| "uncovery" // Раскрытие имплантата / установка ФДМ (2-12 недель)
	| "loading" // Этап снятия слепков / ортопедической нагрузки
	| "followup"; // Диспансерный контроль в процессе функционирования

/**
 * Код клинического протокола нагрузки.
 */
export type LoadingProtocolCode =
	| "immediate_loading"
	| "early_loading"
	| "conventional_delayed_loading";

/**
 * Клинический статус остеоинтеграции.
 */
export type OsseointegrationStatus =
	| "progressive_osseointegration" // Уверенное нарастание стабильности
	| "stable_integration" // Стабильный уровень (плато)
	| "physiological_dip" // Физиологический спад 2-4 недели (перестройка кости)
	| "stability_loss_warning" // Умеренное снижение (требует внимания)
	| "desintegration_suspected"; // Падение ISQ > 5 (угроза дезинтеграции)

/**
 * Результат определения протокола нагрузки.
 */
export interface LoadingProtocolRecommendation {
	readonly protocol: LoadingProtocolCode;
	readonly titleRu: string;
	readonly isqThreshold: string;
	readonly recommendedPeriodRu: string;
	readonly minRecommendedTorqueNcm: number;
	readonly isImmediateEligible: boolean;
	readonly isEarlyEligible: boolean;
	readonly clinicalRationale: string;
	readonly contraindicationsRu: string[];
	readonly safetyWarningsRu: string[];
}

/**
 * Сводная статистика замера ISQ.
 */
export interface ISQMeasurementStatistics {
	readonly averageISQ: number;
	readonly minISQ: number;
	readonly maxISQ: number;
	readonly anisotropy: number; // Разброс между максимальным и минимальным направлением
	readonly directionalValues: Readonly<Record<ISQMeasurementDirection, number | null>>;
	readonly measuredDirectionsCount: number;
	readonly weakestDirection: ISQMeasurementDirection | null;
	readonly strongestDirection: ISQMeasurementDirection | null;
	readonly hasCriticalDirectionalWeakness: boolean; // Если одно из направлений < 50
}

/**
 * Модель сохраненного замера ISQ.
 */
export interface ImplantMeasurementRecord {
	readonly id: string;
	readonly toothNumber: number;
	readonly measuredAt: Date;
	readonly stage: ImplantationStage;
	readonly directions: DirectionalISQ;
	readonly insertionTorqueNcm?: number | null | undefined;
	readonly boneDensity?: BoneDensityType | null | undefined;
	readonly implantSystem?: string | null | undefined;
	readonly implantSize?: string | null | undefined; // e.g. "4.0 x 10 mm"
	readonly deviceModel?: string | null | undefined; // e.g. "Osstell Beacon", "Penguin RFA"
	readonly notes?: string | null | undefined;
}

/**
 * Упрощенный снимок для расчета динамики.
 */
export interface ImplantMeasurementSnapshot {
	readonly id: string;
	readonly measuredAt: Date;
	readonly averageISQ?: number | undefined;
	readonly directions?: DirectionalISQ | undefined;
}

/**
 * Результат оценки динамики остеоинтеграции между двумя замерами.
 */
export interface OsseointegrationDynamicsResult {
	readonly previousMeasurementId: string;
	readonly currentMeasurementId: string;
	readonly previousAverageISQ: number;
	readonly currentAverageISQ: number;
	readonly deltaISQ: number; // current - previous
	readonly isDesintegrationRisk: boolean; // Истинный, если падение ISQ > 5 единиц (delta < -5)
	readonly status: OsseointegrationStatus;
	readonly statusTitleRu: string;
	readonly daysElapsed: number;
	readonly isqVelocityPerWeek: number; // Изменение ISQ за 7 дней
	readonly directionalDeltas: Readonly<Record<ISQMeasurementDirection, number | null>>;
	readonly clinicalConclusionRu: string;
	readonly actionProtocolRu: string[];
	readonly requiresImmediateUnloading: boolean;
	readonly requiresCbctScan: boolean;
}

/**
 * Комплексный клинический отчет по имплантату.
 */
export interface ImplantStabilityReport {
	readonly toothNumber: number;
	readonly jaw: JawLocation;
	readonly latestStatistics: ISQMeasurementStatistics;
	readonly recommendedProtocol: LoadingProtocolRecommendation;
	readonly dynamics?: OsseointegrationDynamicsResult | null | undefined;
	readonly measurementsCount: number;
	readonly emrEntryTextRu: string; // Готовая запись для карты 043/у
}

/**
 * Ошибки валидации входных параметров.
 */
export class ImplantStabilityValidationError extends Error {
	public readonly field: string;
	public readonly code: string;

	constructor(field: string, code: string, message: string) {
		super(message);
		this.name = "ImplantStabilityValidationError";
		this.field = field;
		this.code = code;
	}
}

/**
 * Реализация сервиса ImplantStabilityService.
 */
export class ImplantStabilityService {
	public static readonly MIN_VALID_ISQ = 1;
	public static readonly MAX_VALID_ISQ = 100;
	public static readonly CRITICAL_DESINTEGRATION_DROP_THRESHOLD = 5.0; // Падение > 5 ISQ
	public static readonly IMMEDIATE_LOADING_MIN_ISQ = 70.0;
	public static readonly EARLY_LOADING_MIN_ISQ = 65.0;
	public static readonly CRITICAL_LOW_STABILITY_ISQ = 50.0;

	/**
	 * Валидирует и нормализует номер зуба по системе FDI (11–48).
	 */
	public static validateToothNumber(tooth: number | string): number {
		const parsed = typeof tooth === "string" ? Number.parseInt(tooth.trim(), 10) : tooth;
		if (!Number.isInteger(parsed) || !FDI_PERMANENT_TEETH.has(parsed)) {
			throw new ImplantStabilityValidationError(
				"toothNumber",
				"INVALID_FDI_TOOTH",
				`Некорректный номер зуба FDI: ${tooth}. Для имплантации допустимы постоянные зубы (11–18, 21–28, 31–38, 41–48).`,
			);
		}
		return parsed;
	}

	/**
	 * Определяет челюсть (верхняя / нижняя) по номеру зуба FDI.
	 */
	public static getJawLocation(toothNumber: number): JawLocation {
		const validTooth = this.validateToothNumber(toothNumber);
		// Квадранты 1 и 2 — верхняя челюсть (maxilla), 3 и 4 — нижняя (mandible)
		const quadrant = Math.floor(validTooth / 10);
		return quadrant === 1 || quadrant === 2 ? "maxilla" : "mandible";
	}

	/**
	 * Валидирует единичное значение ISQ (1..100).
	 */
	public static validateSingleISQ(value: unknown, directionName: string): number {
		if (value === null || value === undefined) {
			throw new ImplantStabilityValidationError(
				directionName,
				"ISQ_REQUIRED",
				`Значение ISQ для направления '${directionName}' не может быть пустым.`,
			);
		}

		const num = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(num) || Number.isNaN(num)) {
			throw new ImplantStabilityValidationError(
				directionName,
				"ISQ_NOT_A_NUMBER",
				`Значение ISQ для направления '${directionName}' должно быть числом (получено: ${value}).`,
			);
		}

		if (num < this.MIN_VALID_ISQ || num > this.MAX_VALID_ISQ) {
			throw new ImplantStabilityValidationError(
				directionName,
				"ISQ_OUT_OF_RANGE",
				`Значение ISQ для направления '${directionName}' (${num}) выходит за пределы допустимой шкалы RFA (${this.MIN_VALID_ISQ}–${this.MAX_VALID_ISQ}).`,
			);
		}

		return Math.round(num * 10) / 10;
	}

	/**
	 * Валидирует и нормализует замеры по 4 направлениям.
	 * Требуется как минимум 1 валидный замер (в идеале — 4).
	 */
	public static validateDirectionalISQ(directions: DirectionalISQ): {
		mesial: number | null;
		distal: number | null;
		buccal: number | null;
		lingual: number | null;
	} {
		if (!directions || typeof directions !== "object") {
			throw new ImplantStabilityValidationError(
				"directions",
				"DIRECTIONS_OBJECT_REQUIRED",
				"Не передан объект замеров ISQ по направлениям.",
			);
		}

		const normalized = {
			mesial: directions.mesial !== undefined && directions.mesial !== null
				? this.validateSingleISQ(directions.mesial, "mesial")
				: null,
			distal: directions.distal !== undefined && directions.distal !== null
				? this.validateSingleISQ(directions.distal, "distal")
				: null,
			buccal: directions.buccal !== undefined && directions.buccal !== null
				? this.validateSingleISQ(directions.buccal, "buccal")
				: null,
			lingual: directions.lingual !== undefined && directions.lingual !== null
				? this.validateSingleISQ(directions.lingual, "lingual")
				: null,
		};

		const count = Object.values(normalized).filter((v) => v !== null).length;
		if (count === 0) {
			throw new ImplantStabilityValidationError(
				"directions",
				"NO_VALID_DIRECTIONS",
				"Необходимо указать хотя бы одно валидное направление замера ISQ (мезиально, дистально, вестибулярно или язычно).",
			);
		}

		return normalized;
	}

	/**
	 * Расчет среднего ISQ и статистических показателей по 4 направлениям.
	 */
	public static calculateStatistics(directions: DirectionalISQ): ISQMeasurementStatistics {
		const normalized = this.validateDirectionalISQ(directions);

		const entries: Array<{ dir: ISQMeasurementDirection; val: number }> = [];
		if (normalized.mesial !== null) entries.push({ dir: "mesial", val: normalized.mesial });
		if (normalized.distal !== null) entries.push({ dir: "distal", val: normalized.distal });
		if (normalized.buccal !== null) entries.push({ dir: "buccal", val: normalized.buccal });
		if (normalized.lingual !== null) entries.push({ dir: "lingual", val: normalized.lingual });

		const values = entries.map((e) => e.val);
		const sum = values.reduce((acc, v) => acc + v, 0);
		const averageISQ = Math.round((sum / values.length) * 10) / 10;
		const minISQ = Math.min(...values);
		const maxISQ = Math.max(...values);
		const anisotropy = Math.round((maxISQ - minISQ) * 10) / 10;

		let weakestDirection: ISQMeasurementDirection | null = null;
		let strongestDirection: ISQMeasurementDirection | null = null;

		for (const entry of entries) {
			if (entry.val === minISQ && !weakestDirection) {
				weakestDirection = entry.dir;
			}
			if (entry.val === maxISQ && !strongestDirection) {
				strongestDirection = entry.dir;
			}
		}

		const hasCriticalDirectionalWeakness = minISQ < this.CRITICAL_LOW_STABILITY_ISQ;

		return {
			averageISQ,
			minISQ,
			maxISQ,
			anisotropy,
			directionalValues: {
				mesial: normalized.mesial,
				distal: normalized.distal,
				buccal: normalized.buccal,
				lingual: normalized.lingual,
			},
			measuredDirectionsCount: values.length,
			weakestDirection,
			strongestDirection,
			hasCriticalDirectionalWeakness,
		};
	}

	/**
	 * Определение клинического протокола нагрузки на основе среднего ISQ,
	 * торка введения и параметров челюсти.
	 */
	public static determineLoadingProtocol(
		input: number | DirectionalISQ | ISQMeasurementStatistics,
		context?: {
			toothNumber?: number | undefined;
			insertionTorqueNcm?: number | null | undefined;
			boneDensity?: BoneDensityType | null | undefined;
			isParafunctionPresent?: boolean | undefined; // Бруксизм / гипертонус жевательных мышц
		} | undefined,
	): LoadingProtocolRecommendation {
		let averageISQ: number;
		let minISQ: number;
		let anisotropy = 0;

		if (typeof input === "number") {
			const validated = this.validateSingleISQ(input, "averageISQ");
			averageISQ = validated;
			minISQ = validated;
		} else if ("averageISQ" in input) {
			averageISQ = input.averageISQ;
			minISQ = input.minISQ;
			anisotropy = input.anisotropy;
		} else {
			const stats = this.calculateStatistics(input);
			averageISQ = stats.averageISQ;
			minISQ = stats.minISQ;
			anisotropy = stats.anisotropy;
		}

		const jaw = context?.toothNumber ? this.getJawLocation(context.toothNumber) : "mandible";
		const torque = context?.insertionTorqueNcm ?? null;
		const parafunction = context?.isParafunctionPresent ?? false;

		const contraindicationsRu: string[] = [];
		const safetyWarningsRu: string[] = [];

		if (parafunction) {
			contraindicationsRu.push("Бруксизм или гипертонус жевательной мускулатуры (высокий риск перегрузки)");
		}
		if (anisotropy >= 12) {
			safetyWarningsRu.push(
				`Выраженная анизотропия стабильности (${anisotropy} ед. ISQ): костная поддержка неравномерна (вероятен локальный дефект кортикальной пластинки)`,
			);
		}
		if (minISQ < this.CRITICAL_LOW_STABILITY_ISQ) {
			safetyWarningsRu.push(
				`Минимальный вектор ISQ (${minISQ}) ниже критического уровня 50: повышенный риск локальной дестабилизации`,
			);
		}

		// 1. Немедленная нагрузка (ISQ >= 70)
		if (averageISQ >= this.IMMEDIATE_LOADING_MIN_ISQ) {
			if (torque !== null && torque < 35) {
				safetyWarningsRu.push(
					`Торк введения (${torque} Н·см) ниже рекомендуемого для немедленной нагрузки (>= 35 Н·см), требуется осторожность при изготовлении провизорной конструкции`,
				);
			}

			return {
				protocol: "immediate_loading",
				titleRu: "Немедленная нагрузка (Immediate loading)",
				isqThreshold: "ISQ >= 70",
				recommendedPeriodRu: "0–72 часа (до 1 недели)",
				minRecommendedTorqueNcm: 35,
				isImmediateEligible: !parafunction && (torque === null || torque >= 35),
				isEarlyEligible: true,
				clinicalRationale:
					"Высокая первичная/вторичная механическая стабильность. Плотный контакт с кортикальной и губчатой костью обеспечивает минимальную микроподвижность (< 100-150 мкм), допуская изготовление временной несъемной конструкции с выведением из окклюзии (или в полной окклюзии при тотальных конструкциях).",
				contraindicationsRu,
				safetyWarningsRu,
			};
		}

		// 2. Ранняя нагрузка (65 <= ISQ < 70)
		if (averageISQ >= this.EARLY_LOADING_MIN_ISQ) {
			return {
				protocol: "early_loading",
				titleRu: "Ранняя нагрузка (Early loading, 4–6 недель)",
				isqThreshold: "65 <= ISQ < 70",
				recommendedPeriodRu: jaw === "mandible" ? "4–6 недель" : "6–8 недель",
				minRecommendedTorqueNcm: 25,
				isImmediateEligible: false,
				isEarlyEligible: !parafunction,
				clinicalRationale:
					"Хорошая стабильность имплантата. Немедленная нагрузка не рекомендуется из-за риска превышения порога микроподвижности в период физиологической резорбции. Рекомендована ранняя нагрузка через 4–6 недель после формирования первичного остеоидного матрикса и вторичной стабильности.",
				contraindicationsRu,
				safetyWarningsRu,
			};
		}

		// 3. Традиционная отсроченная нагрузка (ISQ < 65)
		const delayedPeriod = jaw === "maxilla" ? "4–6 месяцев" : "2–3 месяца";
		if (averageISQ < this.CRITICAL_LOW_STABILITY_ISQ) {
			safetyWarningsRu.push(
				"Критически низкий ISQ (< 50): высокий риск микроподвижности и волокнистой инкапсуляции. Показан двухэтапный закрытый протокол с полным погружением под слизистую.",
			);
		}

		return {
			protocol: "conventional_delayed_loading",
			titleRu: "Традиционная отсроченная нагрузка (Conventional delayed loading, 3–6 месяцев)",
			isqThreshold: "ISQ < 65",
			recommendedPeriodRu: delayedPeriod,
			minRecommendedTorqueNcm: 15,
			isImmediateEligible: false,
			isEarlyEligible: false,
			clinicalRationale:
				"Умеренная или низкая первичная стабильность. Высокий риск фиброинтеграции и дезинтеграции при досрочной функциональной нагрузке. Показан классический двухэтапный протокол с закрытым заживлением под слизисто-надкостничным лоскутом либо установка ФДМ без окклюзионного контакта.",
			contraindicationsRu,
			safetyWarningsRu,
		};
	}

	/**
	 * Извлекает средний ISQ из записи или снимка.
	 */
	private static extractAverageISQ(item: ImplantMeasurementRecord | ImplantMeasurementSnapshot): number {
		if ("averageISQ" in item && typeof item.averageISQ === "number") {
			return item.averageISQ;
		}
		if ("directions" in item && item.directions) {
			return this.calculateStatistics(item.directions).averageISQ;
		}
		throw new ImplantStabilityValidationError(
			"measurement",
			"MISSING_ISQ_DATA",
			"В замере отсутствуют как средний ISQ, так и направления измерений.",
		);
	}

	/**
	 * Оценка динамики остеоинтеграции между двумя замерами.
	 *
	 * КРИТИЧЕСКИЙ ИНВАРИАНТ:
	 * При падении ISQ > 5 единиц (дельта < -5) регистрируется признак дезинтеграции
	 * (status = 'desintegration_suspected', isDesintegrationRisk = true).
	 */
	public static evaluateOsseointegrationDynamics(
		previous: ImplantMeasurementRecord | ImplantMeasurementSnapshot,
		current: ImplantMeasurementRecord | ImplantMeasurementSnapshot,
	): OsseointegrationDynamicsResult {
		const prevISQ = this.extractAverageISQ(previous);
		const currISQ = this.extractAverageISQ(current);

		const deltaISQ = Math.round((currISQ - prevISQ) * 10) / 10;

		const prevDate = new Date(previous.measuredAt);
		const currDate = new Date(current.measuredAt);
		const diffMs = currDate.getTime() - prevDate.getTime();
		const daysElapsed = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
		const weeksElapsed = daysElapsed / 7;
		const isqVelocityPerWeek = Math.round(((deltaISQ / weeksElapsed)) * 10) / 10;

		// Directional deltas if directions available in both
		const prevDirs = "directions" in previous && previous.directions
			? this.validateDirectionalISQ(previous.directions)
			: null;
		const currDirs = "directions" in current && current.directions
			? this.validateDirectionalISQ(current.directions)
			: null;

		const directionalDeltas: Record<ISQMeasurementDirection, number | null> = {
			mesial: prevDirs?.mesial !== null && prevDirs?.mesial !== undefined && currDirs?.mesial !== null && currDirs?.mesial !== undefined
				? Math.round((currDirs.mesial - prevDirs.mesial) * 10) / 10
				: null,
			distal: prevDirs?.distal !== null && prevDirs?.distal !== undefined && currDirs?.distal !== null && currDirs?.distal !== undefined
				? Math.round((currDirs.distal - prevDirs.distal) * 10) / 10
				: null,
			buccal: prevDirs?.buccal !== null && prevDirs?.buccal !== undefined && currDirs?.buccal !== null && currDirs?.buccal !== undefined
				? Math.round((currDirs.buccal - prevDirs.buccal) * 10) / 10
				: null,
			lingual: prevDirs?.lingual !== null && prevDirs?.lingual !== undefined && currDirs?.lingual !== null && currDirs?.lingual !== undefined
				? Math.round((currDirs.lingual - prevDirs.lingual) * 10) / 10
				: null,
		};

		// 1. ДЕЗИНТЕГРАЦИЯ: Падение ISQ > 5 единиц (delta < -5.0)
		const isDesintegrationRisk = deltaISQ < -this.CRITICAL_DESINTEGRATION_DROP_THRESHOLD;

		if (isDesintegrationRisk) {
			return {
				previousMeasurementId: previous.id,
				currentMeasurementId: current.id,
				previousAverageISQ: prevISQ,
				currentAverageISQ: currISQ,
				deltaISQ,
				isDesintegrationRisk: true,
				status: "desintegration_suspected",
				statusTitleRu: "Угроза дезинтеграции имплантата (Падение ISQ > 5 единиц)",
				daysElapsed,
				isqVelocityPerWeek,
				directionalDeltas,
				clinicalConclusionRu: `Критическое снижение стабильности (падение на ${Math.abs(deltaISQ)} ед. ISQ за ${daysElapsed} дн.). Высокая вероятность периимплантита, маргинальной костной резорбции, окклюзионной перегрузки или несостоятельности остеоинтеграции.`,
				actionProtocolRu: [
					"Немедленная полная разгрузка имплантата (снятие временной коронки / супраструктуры).",
					"Проведение прицельной рентгенографии и КЛКТ для оценки периимплантного края кости.",
					"Зондирование периимплантной борозды на предмет кровоточивости (BoP) и гноетечения.",
					"Окклюзионный анализ для выявления суперконтактов и боковых сил сдвига.",
					"Контрольный замер RFA через 14–21 день. При отсутствии стабилизации — эксплантация.",
				],
				requiresImmediateUnloading: true,
				requiresCbctScan: true,
			};
		}

		// 2. Уверенное нарастание стабильности (delta >= +3.0)
		if (deltaISQ >= 3.0) {
			return {
				previousMeasurementId: previous.id,
				currentMeasurementId: current.id,
				previousAverageISQ: prevISQ,
				currentAverageISQ: currISQ,
				deltaISQ,
				isDesintegrationRisk: false,
				status: "progressive_osseointegration",
				statusTitleRu: "Прогрессирующая остеоинтеграция",
				daysElapsed,
				isqVelocityPerWeek,
				directionalDeltas,
				clinicalConclusionRu: `Положительная динамика созревания костного контакта (+${deltaISQ} ед. ISQ). Формирование зрелой пластинчатой кости вокруг витков резьбы имплантата.`,
				actionProtocolRu: [
					"Продолжение планового ортопедического протокола согласно таймлайну.",
					"Переход к этапу оттисков / цифрового сканирования при достижении целевого ISQ.",
				],
				requiresImmediateUnloading: false,
				requiresCbctScan: false,
			};
		}

		// 3. Физиологический спад первичной стабильности (2–4 недели, дельта от -1.0 до -5.0)
		const isEarlyRemodelingWindow = daysElapsed >= 10 && daysElapsed <= 35;
		if (deltaISQ < 0 && deltaISQ >= -this.CRITICAL_DESINTEGRATION_DROP_THRESHOLD && isEarlyRemodelingWindow) {
			return {
				previousMeasurementId: previous.id,
				currentMeasurementId: current.id,
				previousAverageISQ: prevISQ,
				currentAverageISQ: currISQ,
				deltaISQ,
				isDesintegrationRisk: false,
				status: "physiological_dip",
				statusTitleRu: "Физиологический спад первичной стабильности (Remodeling Dip)",
				daysElapsed,
				isqVelocityPerWeek,
				directionalDeltas,
				clinicalConclusionRu: `Умеренное снижение стабильности на ${Math.abs(deltaISQ)} ед. ISQ на ${Math.round(weeksElapsed)}-й неделе. Типичная фаза ремоделирования костной ткани (остеокластическая резорбция перед фазой аппозиционного остеогенеза).`,
				actionProtocolRu: [
					"Исключить окклюзионные нагрузки на имплантат в переходный период.",
					"Повторный замер ISQ через 3–4 недели для подтверждения формирования вторичной стабильности.",
				],
				requiresImmediateUnloading: false,
				requiresCbctScan: false,
			};
		}

		// 4. Умеренное снижение вне окна ремоделирования (дельта от -1.0 до -5.0)
		if (deltaISQ < -1.0) {
			return {
				previousMeasurementId: previous.id,
				currentMeasurementId: current.id,
				previousAverageISQ: prevISQ,
				currentAverageISQ: currISQ,
				deltaISQ,
				isDesintegrationRisk: false,
				status: "stability_loss_warning",
				statusTitleRu: "Предупреждение: отрицательная динамика стабильности",
				daysElapsed,
				isqVelocityPerWeek,
				directionalDeltas,
				clinicalConclusionRu: `Отрицательный тренд стабильности (${deltaISQ} ед. ISQ). Требуется клинический контроль окклюзии и гигиены.`,
				actionProtocolRu: [
					"Проверка окклюзионных контактов копиркой 8-12 мкм.",
					"Оценка состояния периимплантной слизистой (индекс гигиены, отек, гиперемия).",
					"Контрольный замер ISQ через 2 недели.",
				],
				requiresImmediateUnloading: false,
				requiresCbctScan: false,
			};
		}

		// 5. Стабильное состояние (дельта от -1.0 до +2.9)
		return {
			previousMeasurementId: previous.id,
			currentMeasurementId: current.id,
			previousAverageISQ: prevISQ,
			currentAverageISQ: currISQ,
			deltaISQ,
			isDesintegrationRisk: false,
			status: "stable_integration",
			statusTitleRu: "Стабильное состояние остеоинтеграции",
			daysElapsed,
			isqVelocityPerWeek,
			directionalDeltas,
			clinicalConclusionRu: `Стабильная фиксация имплантата (дельта ${deltaISQ >= 0 ? "+" : ""}${deltaISQ} ед. ISQ). Процесс остеоинтеграции протекает без признаков резорбции.`,
			actionProtocolRu: [
				"Плановый протокол диспансерного наблюдения и протезирования.",
			],
			requiresImmediateUnloading: false,
			requiresCbctScan: false,
		};
	}

	/**
	 * Анализ многоточечного временного ряда замеров одного имплантата.
	 */
	public static analyzeStabilityTrajectory(records: ImplantMeasurementRecord[]): {
		trajectorySummaryRu: string;
		baselineISQ: number;
		latestISQ: number;
		totalDeltaISQ: number;
		minObservedISQ: number;
		maxObservedISQ: number;
		hasRemodelingDipOccurred: boolean;
		hasAnyDesintegrationAlarm: boolean;
		measurementsEvaluated: number;
	} {
		if (!records || records.length === 0) {
			throw new ImplantStabilityValidationError(
				"records",
				"RECORDS_EMPTY",
				"Для анализа траектории требуется хотя бы один замер ISQ.",
			);
		}

		// Сортировка по возрастанию даты
		const sorted = [...records].sort(
			(a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
		);

		const firstRecord = sorted[0];
		const lastRecord = sorted[sorted.length - 1];

		if (!firstRecord || !lastRecord) {
			throw new ImplantStabilityValidationError(
				"records",
				"RECORDS_INVALID",
				"Не удалось извлечь начальный или конечный замер траектории.",
			);
		}

		const statsList = sorted.map((r) => this.calculateStatistics(r.directions));
		const firstStats = statsList[0];
		const lastStats = statsList[statsList.length - 1];

		if (!firstStats || !lastStats) {
			throw new ImplantStabilityValidationError(
				"records",
				"STATS_EMPTY",
				"Не удалось рассчитать статистику по замерам.",
			);
		}

		const baselineISQ = firstStats.averageISQ;
		const latestISQ = lastStats.averageISQ;
		const totalDeltaISQ = Math.round((latestISQ - baselineISQ) * 10) / 10;

		const averages = statsList.map((s) => s.averageISQ);
		const minObservedISQ = Math.min(...averages);
		const maxObservedISQ = Math.max(...averages);

		let hasRemodelingDipOccurred = false;
		let hasAnyDesintegrationAlarm = false;

		for (let i = 1; i < sorted.length; i++) {
			const prevRecord = sorted[i - 1];
			const currRecord = sorted[i];
			if (prevRecord && currRecord) {
				const dynamics = this.evaluateOsseointegrationDynamics(prevRecord, currRecord);
				if (dynamics.status === "physiological_dip") {
					hasRemodelingDipOccurred = true;
				}
				if (dynamics.isDesintegrationRisk) {
					hasAnyDesintegrationAlarm = true;
				}
			}
		}

		let trajectorySummaryRu = "";
		if (hasAnyDesintegrationAlarm) {
			trajectorySummaryRu = `Внимание! В анамнезе зафиксирован критический эпизод падения ISQ > 5 ед. Текущий ISQ: ${latestISQ}.`;
		} else if (totalDeltaISQ >= 5) {
			trajectorySummaryRu = `Выраженный прирост стабильности (+${totalDeltaISQ} ед. ISQ от исходного ${baselineISQ}). Зрелая остеоинтеграция.`;
		} else if (totalDeltaISQ >= 0) {
			trajectorySummaryRu = `Стабильная траектория остеоинтеграции (дельта +${totalDeltaISQ} ед. ISQ, исходный: ${baselineISQ}, текущий: ${latestISQ}).`;
		} else {
			trajectorySummaryRu = `Траектория с умеренным снижением стабильности (${totalDeltaISQ} ед. ISQ от базового значения).`;
		}

		return {
			trajectorySummaryRu,
			baselineISQ,
			latestISQ,
			totalDeltaISQ,
			minObservedISQ,
			maxObservedISQ,
			hasRemodelingDipOccurred,
			hasAnyDesintegrationAlarm,
			measurementsEvaluated: sorted.length,
		};
	}

	/**
	 * Формирование клинической записи для электронной карты 043/у.
	 */
	public static formatEmrEntry(params: {
		toothNumber: number;
		stage: ImplantationStage;
		stats: ISQMeasurementStatistics;
		protocol: LoadingProtocolRecommendation;
		dynamics?: OsseointegrationDynamicsResult | null | undefined;
		deviceModel?: string | null | undefined;
		insertionTorqueNcm?: number | null | undefined;
		boneDensity?: BoneDensityType | null | undefined;
	}): string {
		const tooth = params.toothNumber;
		const jaw = this.getJawLocation(tooth) === "maxilla" ? "Верхняя челюсть" : "Нижняя челюсть";
		const device = params.deviceModel || "Частотно-резонансный анализатор (RFA/SmartPeg)";
		const dirs = params.stats.directionalValues;

		const dirLines = [
			dirs.mesial !== null ? `M (мезиально): ${dirs.mesial}` : null,
			dirs.distal !== null ? `D (дистально): ${dirs.distal}` : null,
			dirs.buccal !== null ? `B (вестибулярно): ${dirs.buccal}` : null,
			dirs.lingual !== null ? `L (язычно/небно): ${dirs.lingual}` : null,
		].filter(Boolean).join(", ");

		const stageLabels: Record<ImplantationStage, string> = {
			placement: "Первичная стабильность (установка имплантата)",
			uncovery: "Вторичная стабильность (раскрытие / установка ФДМ)",
			loading: "Проверка перед ортопедической нагрузкой",
			followup: "Диспансерный контроль остеоинтеграции",
		};

		let text = `Протокол RFA/ISQ-стабильности имплантата в позиции зуба ${tooth} (${jaw}):\n`;
		text += `• Этап: ${stageLabels[params.stage] || params.stage}\n`;
		text += `• Прибор: ${device}\n`;
		if (params.insertionTorqueNcm) {
			text += `• Торк установки: ${params.insertionTorqueNcm} Н·см\n`;
		}
		if (params.boneDensity) {
			text += `• Плотность кости: ${params.boneDensity} (по Lekholm & Zarb)\n`;
		}
		text += `• Замеры по направлениям: [ ${dirLines} ]\n`;
		text += `• Средний ISQ: ${params.stats.averageISQ} (Min: ${params.stats.minISQ}, Max: ${params.stats.maxISQ}, Разброс: ${params.stats.anisotropy})\n`;
		text += `• Клинический протокол нагрузки: ${params.protocol.titleRu}\n`;
		text += `• Сроки нагрузки: ${params.protocol.recommendedPeriodRu}\n`;

		if (params.dynamics) {
			text += `• Динамика остеоинтеграции: ${params.dynamics.statusTitleRu} (Дельта ISQ: ${params.dynamics.deltaISQ >= 0 ? "+" : ""}${params.dynamics.deltaISQ} за ${params.dynamics.daysElapsed} дн.)\n`;
			if (params.dynamics.isDesintegrationRisk) {
				text += `  ВНИМАНИЕ: ${params.dynamics.clinicalConclusionRu}\n`;
			}
		}

		return text;
	}

	/**
	 * Генерация комплексного клинического отчета по стабильности имплантата.
	 */
	public static generateClinicalStabilityReport(params: {
		toothNumber: number;
		measurements: ImplantMeasurementRecord[];
		isParafunctionPresent?: boolean | undefined;
	}): ImplantStabilityReport {
		const tooth = this.validateToothNumber(params.toothNumber);
		const jaw = this.getJawLocation(tooth);

		if (!params.measurements || params.measurements.length === 0) {
			throw new ImplantStabilityValidationError(
				"measurements",
				"MEASUREMENTS_EMPTY",
				"Для формирования отчета необходим хотя бы один замер стабильности.",
			);
		}

		const sorted = [...params.measurements].sort(
			(a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
		);

		const latest = sorted[sorted.length - 1];
		if (!latest) {
			throw new ImplantStabilityValidationError(
				"measurements",
				"MEASUREMENTS_EMPTY",
				"Не удалось извлечь последний замер стабильности.",
			);
		}

		const latestStats = this.calculateStatistics(latest.directions);

		const recommendedProtocol = this.determineLoadingProtocol(latestStats, {
			toothNumber: tooth,
			insertionTorqueNcm: latest.insertionTorqueNcm,
			boneDensity: latest.boneDensity,
			isParafunctionPresent: params.isParafunctionPresent,
		});

		let dynamics: OsseointegrationDynamicsResult | null = null;
		if (sorted.length >= 2) {
			const prev = sorted[sorted.length - 2];
			if (prev) {
				dynamics = this.evaluateOsseointegrationDynamics(prev, latest);
			}
		}

		const emrEntryTextRu = this.formatEmrEntry({
			toothNumber: tooth,
			stage: latest.stage,
			stats: latestStats,
			protocol: recommendedProtocol,
			dynamics,
			deviceModel: latest.deviceModel,
			insertionTorqueNcm: latest.insertionTorqueNcm,
			boneDensity: latest.boneDensity,
		});

		return {
			toothNumber: tooth,
			jaw,
			latestStatistics: latestStats,
			recommendedProtocol,
			dynamics,
			measurementsCount: sorted.length,
			emrEntryTextRu,
		};
	}
}
