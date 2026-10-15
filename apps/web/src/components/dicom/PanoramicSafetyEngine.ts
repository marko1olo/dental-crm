/**
 * PanoramicSafetyEngine.ts
 *
 * Clinical Safety, Anatomical Distance Measurement & Misch Implant Recommendation Engine:
 * 1. 1:1 Metric Distance Measurement to Critical Anatomical Landmarks:
 *    - Mandibular Canal (N. alveolaris inferior / IAN)
 *    - Mental Foramen (Foramen mentale)
 *    - Maxillary Sinus Floor (Sinus maxillaris)
 * 2. Mandate 8e Soft Non-Blocking Warning (<2.0 mm threshold):
 *    - Informational warning banner alerting surgeon of paresthesia or sinus perforation risk
 *    - Absolute Doctor Autonomy: never disables primary CTA buttons (canProceed = true)
 * 3. Auto-Selection & Auto-Recommendation of Implant Type based on Misch Density (D1..D5):
 *    - D1: Parallel / cylindrical, standard thread, mandatory cortical tapping, low torque
 *    - D2: Parallel / tapered standard thread, standard drilling, high primary stability
 *    - D3: Tapered active thread with bone condensation, moderate under-drilling
 *    - D4: Aggressive condensing thread, deep flutes, under-drilling / osteotome condensation
 *    - D5: Defect / immature bone: GBR / Sinus Lift prerequisite
 */

import {
	CANONICAL_IMPLANT_SYSTEMS,
	type ImplantSystemSpec,
} from "./implantCatalog";
import type { ExtendedMischClass } from "./panoramicMprMath";

export const ANATOMICAL_SAFETY_BUFFER_MM = 2.0;
export const ANATOMICAL_DANGER_THRESHOLD_MM = 1.5;

export interface AnatomicalProximityAudit {
	readonly distanceToMandibularCanalMm: number | null;
	readonly distanceToMentalForamenMm: number | null;
	readonly distanceToSinusFloorMm: number | null;
	readonly nearestStructure: "mandibular_canal" | "mental_foramen" | "maxillary_sinus" | "none";
	readonly minClearanceMm: number | null;
	readonly isWarning: boolean;
	readonly isCritical: boolean;
	readonly warningMessageRu: string | null;
	readonly canProceed: boolean; // Mandate 8e: Doctor Autonomy always true
}

export interface MischImplantRecommendation {
	readonly mischClass: ExtendedMischClass | "D1" | "D2" | "D3" | "D4" | "D5";
	readonly hu: number;
	readonly densityLabelRu: string;
	readonly bodyDesignRu: string;
	readonly threadTypeRu: string;
	readonly primaryStabilityExpectationRu: string;
	readonly recommendedSystems: readonly {
		readonly brand: string;
		readonly line: string;
		readonly reasonRu: string;
	}[];
	readonly surgicalProtocolRu: string;
	readonly requiresCorticalTap: boolean;
	readonly requiresUnderDrilling: boolean;
	readonly underDrillingMm: number;
	readonly requiresBoneAugmentation: boolean;
}

/**
 * Evaluates distances to critical anatomical structures and returns a soft non-blocking audit.
 * Complies with Mandate 8e (Doctor Autonomy): warnings are informational banners, never disabled buttons.
 */
export function evaluateAnatomicalSafety(params: {
	readonly distanceToCanalMm?: number | null | undefined;
	readonly distanceToForamenMm?: number | null | undefined;
	readonly distanceToSinusFloorMm?: number | null | undefined;
}): AnatomicalProximityAudit {
	const canal = params.distanceToCanalMm ?? null;
	const foramen = params.distanceToForamenMm ?? null;
	const sinus = params.distanceToSinusFloorMm ?? null;

	const validDistances: { type: "mandibular_canal" | "mental_foramen" | "maxillary_sinus"; dist: number }[] = [];
	if (typeof canal === "number" && Number.isFinite(canal)) {
		validDistances.push({ type: "mandibular_canal", dist: canal });
	}
	if (typeof foramen === "number" && Number.isFinite(foramen)) {
		validDistances.push({ type: "mental_foramen", dist: foramen });
	}
	if (typeof sinus === "number" && Number.isFinite(sinus)) {
		validDistances.push({ type: "maxillary_sinus", dist: sinus });
	}

	if (validDistances.length === 0) {
		return {
			distanceToMandibularCanalMm: null,
			distanceToMentalForamenMm: null,
			distanceToSinusFloorMm: null,
			nearestStructure: "none",
			minClearanceMm: null,
			isWarning: false,
			isCritical: false,
			warningMessageRu: null,
			canProceed: true,
		};
	}

	validDistances.sort((a, b) => a.dist - b.dist);
	const nearest = validDistances[0]!;
	const minClearance = Math.round(nearest.dist * 10) / 10;
	const isCritical = minClearance < ANATOMICAL_DANGER_THRESHOLD_MM;
	const isWarning = minClearance < ANATOMICAL_SAFETY_BUFFER_MM;

	let message: string | null = null;
	if (isCritical) {
		if (nearest.type === "mandibular_canal") {
			message = `⚠️ КРИТИЧЕСКИЙ РИСК: зазор до нижнечелюстного канала ${minClearance.toFixed(1)} мм (<1.5 мм). Высокий риск нейропатии N. alveolaris inferior!`;
		} else if (nearest.type === "mental_foramen") {
			message = `⚠️ КРИТИЧЕСКИЙ РИСК: зазор до ментального отверстия ${minClearance.toFixed(1)} мм (<1.5 мм). Риск парестезии нижней губы и подбородка!`;
		} else {
			message = `⚠️ КРИТИЧЕСКИЙ РИСК: зазор до дна гайморовой пазухи ${minClearance.toFixed(1)} мм (<1.5 мм). Риск перфорации мембраны Шнейдера!`;
		}
	} else if (isWarning) {
		if (nearest.type === "mandibular_canal") {
			message = `⚠️ Внимание: буфер до стенки нижнечелюстного канала ${minClearance.toFixed(1)} мм (<2.0 мм). Рекомендуется контроль наклона оси.`;
		} else if (nearest.type === "mental_foramen") {
			message = `⚠️ Внимание: дистанция до Foramen mentale ${minClearance.toFixed(1)} мм (<2.0 мм). Соблюдайте мезиальный отступ.`;
		} else {
			message = `⚠️ Внимание: дистанция до дна пазухи ${minClearance.toFixed(1)} мм (<2.0 мм). Контролируйте апикальный стоппер.`;
		}
	}

	return {
		distanceToMandibularCanalMm: canal,
		distanceToMentalForamenMm: foramen,
		distanceToSinusFloorMm: sinus,
		nearestStructure: nearest.type,
		minClearanceMm: minClearance,
		isWarning,
		isCritical,
		warningMessageRu: message,
		canProceed: true, // Mandate 8e: never disable buttons
	};
}

/**
 * Auto-selects and recommends optimal dental implant system body design and drilling protocol
 * based on sampled Hounsfield Units (HU) and Misch Bone Classification.
 */
export function getImplantRecommendationForMisch(
	hu: number,
): MischImplantRecommendation {
	if (!Number.isFinite(hu) || hu < 150) {
		// D5: Defect / Soft Immature Bone (<150 HU)
		return {
			mischClass: "D5",
			hu,
			densityLabelRu: "D5 (<150 HU) — Незрелая кость / Костный дефект",
			bodyDesignRu: "Установка стандартного имплантата отложена / Бикортикальная фиксация",
			threadTypeRu: "Широкая штопорная резьба с максимальным шагом",
			primaryStabilityExpectationRu: "Низкая (ISQ < 50, торк < 15 N·cm)",
			recommendedSystems: [
				{
					brand: "Straumann",
					line: "BLX (Roxolid / SLActive)",
					reasonRu: "Максимальная гидрофильность поверхности и остеоинтеграция в регенерате",
				},
				{
					brand: "Osstem",
					line: "TS IV SA",
					reasonRu: "Специальная коническая форма для мягкой кости с глубокими режущими лезвиями",
				},
			],
			surgicalProtocolRu:
				"Показана НКР (GBR) с костнозамещающим материалом и коллагеновой мембраной или закрытый/открытый синус-лифтинг. Прямая установка только при достаточной апикальной бикортикальной фиксации.",
			requiresCorticalTap: false,
			requiresUnderDrilling: false,
			underDrillingMm: 0,
			requiresBoneAugmentation: true,
		};
	}

	if (hu < 350) {
		// D4: Spongy Soft Bone (150 - 350 HU)
		return {
			mischClass: "D4",
			hu,
			densityLabelRu: "D4 (150–350 HU) — Мягкая губчатая кость",
			bodyDesignRu: "Выраженный конус с активным самонарезающим телом",
			threadTypeRu: "Агрессивная конденсирующая резьба с глубокими витками",
			primaryStabilityExpectationRu: "Умеренная (ISQ 60–68, целевой торк 30–40 N·cm)",
			recommendedSystems: [
				{
					brand: "Nobel Biocare",
					line: "NobelActive",
					reasonRu: "Биконическое тело с конденсирующей обратной резьбой, расширяющее мягкую кость",
				},
				{
					brand: "MIS Implants",
					line: "V3 / SEVEN",
					reasonRu: "Микрокольца на шейке и переменная резьба для предотвращения резорбции",
				},
				{
					brand: "Osstem",
					line: "TS IV SA",
					reasonRu: "Штопорная резьба с открытой верхушкой для компрессии трабекул",
				},
			],
			surgicalProtocolRu:
				"Применить протокол недопрепарирования ложа (Under-drilling -1.0 мм от номинала) либо остеотомную экспансию/компрессию кости для достижения торка ≥ 35 N·cm.",
			requiresCorticalTap: false,
			requiresUnderDrilling: true,
			underDrillingMm: 1.0,
			requiresBoneAugmentation: false,
		};
	}

	if (hu < 850) {
		// D3: Porous Cortical & Fine Trabecular (350 - 850 HU)
		return {
			mischClass: "D3",
			hu,
			densityLabelRu: "D3 (350–850 HU) — Тонкий кортикал и губчатая кость",
			bodyDesignRu: "Анатомический конический или корневидный контур",
			threadTypeRu: "Двойная резьба с микрорезьбой в пришеечной зоне",
			primaryStabilityExpectationRu: "Высокая (ISQ 70–75, целевой торк 35–45 N·cm)",
			recommendedSystems: [
				{
					brand: "Dentium",
					line: "SuperLine",
					reasonRu: "Глубокая двойная резьба с увеличенным шагом и коническим соединением 11°",
				},
				{
					brand: "Osstem",
					line: "TS III SA",
					reasonRu: "Сбалансированная штопорная резьба с самонарезающими боковыми бороздками",
				},
				{
					brand: "Straumann",
					line: "Bone Level Tapered (BLT)",
					reasonRu: "Конический апекс для точного позиционирования при умеренной плотности",
				},
			],
			surgicalProtocolRu:
				"Стандартный протокол препарирования с финишным профильным сверлом. При слабой первичной фиксации — недосверливание на 0.5 мм.",
			requiresCorticalTap: false,
			requiresUnderDrilling: false,
			underDrillingMm: 0,
			requiresBoneAugmentation: false,
		};
	}

	if (hu <= 1250) {
		// D2: Dense Trabecular & Thick Cortical (850 - 1250 HU)
		return {
			mischClass: "D2",
			hu,
			densityLabelRu: "D2 (850–1250 HU) — Плотная кортикальная и трабекулярная кость",
			bodyDesignRu: "Цилиндрический или умеренно конический корневидный имплантат",
			threadTypeRu: "Стандартная микрорезьба с умеренным шагом",
			primaryStabilityExpectationRu: "Превосходная (ISQ 75–85, целевой торк 35–45 N·cm)",
			recommendedSystems: [
				{
					brand: "Osstem",
					line: "TS III SA / CA",
					reasonRu: "Золотой стандарт остеоинтеграции, стабильное коническое соединение",
				},
				{
					brand: "Straumann",
					line: "Bone Level (BLT / BLX)",
					reasonRu: "Сплав Roxolid с высочайшей механической прочностью",
				},
				{
					brand: "Nobel Biocare",
					line: "NobelParallel CC",
					reasonRu: "Параллельные стенки обеспечивают равномерное распределение нагрузки",
				},
				{
					brand: "Dentium",
					line: "SuperLine",
					reasonRu: "Идеальное прилегание платформы и стабильность маргинальной кости",
				},
			],
			surgicalProtocolRu:
				"Золотой стандарт клинического протокола: полное сверление до номинального диаметра, обильное охлаждение, немедленная или ранняя нагрузка.",
			requiresCorticalTap: false,
			requiresUnderDrilling: false,
			underDrillingMm: 0,
			requiresBoneAugmentation: false,
		};
	}

	// D1: Dense Cortical (>1250 HU)
	return {
		mischClass: "D1",
		hu,
		densityLabelRu: "D1 (>1250 HU) — Сверхплотная кортикальная кость (Oak-like)",
		bodyDesignRu: "Цилиндрический имплантат с параллельными стенками",
		threadTypeRu: "Мелкая резьба с малым шагом без расширения",
		primaryStabilityExpectationRu: "Максимальная механическая (ISQ 80+, контролировать перегрев!)",
		recommendedSystems: [
			{
				brand: "Straumann",
				line: "Standard Plus / BLT",
				reasonRu: "Цилиндрическое тело снижает компрессионное напряжение на кортикальную кость",
			},
			{
				brand: "Nobel Biocare",
				line: "NobelParallel CC",
				reasonRu: "Параллельный профиль предотвращает заклинивание и избыточный торк",
			},
			{
				brand: "Osstem",
				line: "TS III SA (с кортикальным метчиком)",
				reasonRu: "Применение полного цикла фрез и профильного метчика обеспечивает пассивную посадку",
			},
		],
		surgicalProtocolRu:
			"ОБЯЗАТЕЛЕН кортикальный метчик (Cortical Bone Tap) на всю толщину пластинки. Обильная ирригация стерильным физраствором 4°C для профилактики асептического некроза. Торк не должен превышать 45 N·cm.",
		requiresCorticalTap: true,
		requiresUnderDrilling: false,
		underDrillingMm: 0,
		requiresBoneAugmentation: false,
	};
}
