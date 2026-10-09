/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY ENGINE — IMPLANT STABILITY PREDICTOR (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Predictive engine for primary implant stability (ISQ, insertion torque N·cm),
 * osteotomy drilling sequence generation, and under-drilling / cortical tap
 * recommendations per implant system (Osstem, Straumann, Nobel Biocare, etc.).
 *
 * 100% pure TypeScript, zero DOM/VTK dependencies.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	MischBoneClass,
	MischClass,
	OsteotomyRecommendation,
	ImplantSystem,
	HUZoneProfile,
	DrillProtocol,
	DrillStep,
} from "./types.js";
import { classifyMisch } from "./boneDensityClassifier.js";

/**
 * Determines surgical osteotomy preparation protocol, insertion torque,
 * and ISQ stability forecast based on Misch bone class and cortical thickness.
 */
export function determineOsteotomyProtocol(
	misch: MischBoneClass,
	corticalThicknessMm: number,
): OsteotomyRecommendation {
	switch (misch) {
		case "D1":
			return {
				drillProtocol: "bone_tap_countersink",
				drillProtocolDescriptionRu:
					"Обязательное нарезание резьбы метчиком (bone tap) на всю глубину и зенкование (countersink)",
				recommendedTorqueNcm: { min: 35, max: 45, target: 40 },
				estimatedISQ: { min: 75, max: 85, target: 80 },
				primaryStabilityExpected: "high",
				coolingRecommendationRu:
					"Обильное наружное и внутреннее охлаждение стерильным физраствором 0.9% (+4°C), скорость метчика 15–25 об/мин",
				surgicalTipsRu: [
					"Защита от термического остеонекроза (порог перегрева 47°C)",
					"Калибровка кортикальной фрезой номинального диаметра",
					"Рекомендуются имплантаты с мелким шагом резьбы и коническим телом",
				],
			};

		case "D2":
			return {
				drillProtocol: "standard",
				drillProtocolDescriptionRu:
					"Стандартный ступенчатый протокол препарирования номинального диаметра",
				recommendedTorqueNcm: { min: 35, max: 40, target: 38 },
				estimatedISQ: { min: 70, max: 80, target: 75 },
				primaryStabilityExpected: "high",
				coolingRecommendationRu:
					"Стандартное охлаждение физраствором при 800–1200 об/мин",
				surgicalTipsRu: [
					"Оптимальный баланс кортикальной фиксации и кровоснабжения",
					"Метчик применяется только в области плотной шейки (на 2–3 мм) при выраженном кортексе",
					"Высокая прогнозируемость немедленной нагрузки при торке >= 35 Н·см",
				],
			};

		case "D3": {
			const isThinCortex = corticalThicknessMm < 1.0;
			return {
				drillProtocol: isThinCortex ? "under_drill" : "standard",
				drillProtocolDescriptionRu: isThinCortex
					? "Щадящее препарирование ложа (under-drilling на 0.5 мм при тонком кортексе)"
					: "Стандартное бережное препарирование с финишной калибровкой",
				recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
				estimatedISQ: { min: 60, max: 70, target: 65 },
				primaryStabilityExpected: "medium",
				coolingRecommendationRu:
					"Умеренное охлаждение, защита трабекулярного каркаса",
				surgicalTipsRu: [
					"Конденсация трабекул финишной конусной фрезой без чрезмерного высверливания",
					"Предпочтительны корневидные имплантаты с выраженным режущим профилем",
					"При достижении торка >= 30 Н·см возможна фиксация формирователя десны",
				],
			};
		}

		case "D4":
			return {
				drillProtocol: "under_drill",
				drillProtocolDescriptionRu:
					"Протокол недопрепарирования (under-drilling) на 1–2 шага диаметра фрезы и остеоконденсация",
				recommendedTorqueNcm: { min: 15, max: 25, target: 20 },
				estimatedISQ: { min: 45, max: 60, target: 52 },
				primaryStabilityExpected: "low",
				coolingRecommendationRu:
					"Охлаждение на этапе пилотного сверла, ручные остеотомы без термической травмы",
				surgicalTipsRu: [
					"Использование ручных или моторных остеотомов (компрессия кости вместо высверливания стружки)",
					"Имплантаты с глубокой агрессивной самонарезающей резьбой (увеличенный шаг)",
					"Поиск бикортикальной опоры (дно верхнечелюстной пазухи, кортикальная пластинка носа или неба)",
					"Рекомендуется двухэтапный протокол с установкой винта-заглушки и ушиванием наглухо",
				],
			};

		case "D5":
		default:
			return {
				drillProtocol: "bicortical_fixation",
				drillProtocolDescriptionRu:
					"Протокол бикортикальной фиксации либо отсроченная имплантация после реконструктивной аугментации (GBR)",
				recommendedTorqueNcm: { min: 10, max: 20, target: 15 },
				estimatedISQ: { min: 30, max: 45, target: 38 },
				primaryStabilityExpected: "compromised",
				coolingRecommendationRu:
					"Минимальная механическая травма ложа, бережная ирригация",
				surgicalTipsRu: [
					"Прямая установка стандартного имплантата сопряжена с высоким риском ранней дезинтеграции",
					"Рекомендуется предварительная направленная костная регенерация (GBR) с экспозицией 6–9 месяцев",
					"При невозможности пластики рассмотреть скуловые (Zygoma) или птеригоидные имплантаты",
					"Отказ от ранней или функциональной нагрузки до подтверждения остеоинтеграции",
				],
			};
	}
}

/**
 * Generate a drill sequence protocol based on bone class, implant system and dimensions.
 */
export function generateDrillProtocol(
	zones: HUZoneProfile,
	system: ImplantSystem,
	diameterMm: number,
	lengthMm: number,
): DrillProtocol {
	// Анатомически взвешенная плотность: 20% кортикальная пластинка, 60% губчатая кость, 20% апикальная зона
	const avgHU =
		zones.corticalHU * 0.2 + zones.cancellousHU * 0.6 + zones.apicalHU * 0.2;
	const mischClass = classifyMisch(avgHU);
	const warnings: string[] = [];
	let underdrillingApplied = false;
	let corticalTapRequired = false;

	const steps: DrillStep[] = [];

	// --- Common first step: Pilot drill ---
	steps.push({
		step: 1,
		drillType: "Pilot Drill",
		diameterMm: 2.0,
		depthMm: lengthMm,
		rpmRange: "800–1000 RPM",
		torqueNcm: "45 Ncm",
		irrigation: true,
		note: "Обязательное охлаждение физраствором",
	});

	if (mischClass === "D1") {
		// Very dense — cortical tap required, low RPM, prevent necrosis
		corticalTapRequired = true;
		warnings.push(
			`D1-кость (HU=${Math.round(avgHU)}): Обязательно кортикальная фреза (Cortical Tap). Низкие обороты! Риск остеонекроза при перегреве.`,
		);

		steps.push({
			step: 2,
			drillType: "Cortical Drill",
			diameterMm: 2.8,
			depthMm: Math.min(4, lengthMm * 0.3),
			rpmRange: "400–600 RPM",
			torqueNcm: "40 Ncm",
			irrigation: true,
			note: "Только кортикальная зона — не глубже 30% длины",
		});
		steps.push({
			step: 3,
			drillType: `Profile Drill ${diameterMm - 0.5}mm`,
			diameterMm: diameterMm - 0.5,
			depthMm: lengthMm,
			rpmRange: "500–700 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
			note: "Профильное сверло на 0.5мм меньше номинала",
		});
		steps.push({
			step: 4,
			drillType: "Cortical Tap",
			diameterMm: diameterMm,
			depthMm: Math.min(3, lengthMm * 0.2),
			rpmRange: "15–20 RPM",
			torqueNcm: "50 Ncm",
			irrigation: true,
			note: "Нарезка резьбы только в кортикальной зоне",
		});
		steps.push({
			step: 5,
			drillType: `Final Profile ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "500 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
	} else if (mischClass === "D2") {
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.8mm",
			diameterMm: 2.8,
			depthMm: lengthMm,
			rpmRange: "800–1000 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 3,
			drillType: `Profile Drill ${diameterMm - 0.2}mm`,
			diameterMm: diameterMm - 0.2,
			depthMm: lengthMm,
			rpmRange: "700–900 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 4,
			drillType: `Final Drill ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "800 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
	} else if (mischClass === "D3") {
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.8mm",
			diameterMm: 2.8,
			depthMm: lengthMm,
			rpmRange: "1000–1200 RPM",
			torqueNcm: "35 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 3,
			drillType: `Final Drill ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "1000 RPM",
			torqueNcm: "35 Ncm",
			irrigation: true,
			note: "Нормальный протокол — кость достаточно мягкая",
		});
	} else {
		// D4 — very soft, underdrill 1-1.5 steps to maximize primary stability
		underdrillingApplied = true;
		const effectiveDrill = Math.max(2.0, diameterMm - 1.5);
		warnings.push(
			`D4-кость (HU=${Math.round(avgHU)}): Недопрепарирование (Under-drilling)! Сверло на ${(diameterMm - effectiveDrill).toFixed(1)}мм меньше номинала. Максимальная первичная стабильность.`,
		);
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.0mm",
			diameterMm: 2.0,
			depthMm: lengthMm,
			rpmRange: "1200 RPM",
			torqueNcm: "25 Ncm",
			irrigation: false,
			note: "D4: минимальный диаметр для максимального захвата",
		});
		steps.push({
			step: 3,
			drillType: `Under-profile ${effectiveDrill}mm`,
			diameterMm: effectiveDrill,
			depthMm: lengthMm,
			rpmRange: "1000 RPM",
			torqueNcm: "30 Ncm",
			irrigation: false,
			note: `Намеренно меньше ${diameterMm}мм — компрессионная остеоинтеграция`,
		});
	}

	// System-specific final notes
	const systemNote = getSystemNote(system, mischClass, diameterMm);
	if (systemNote) {
		const lastStep = steps[steps.length - 1];
		if (lastStep) {
			lastStep.note = `${lastStep.note || ""} | ${systemNote}`;
		}
	}

	// Angulation note if zones differ significantly (rough heuristic)
	if (Math.abs(zones.corticalHU - zones.apicalHU) > 400) {
		warnings.push(
			`Значительная разница плотности кортикала (${Math.round(zones.corticalHU)} HU) и апекса (${Math.round(zones.apicalHU)} HU). Учитывайте при планировании глубины.`,
		);
	}

	return {
		mischClass,
		implantSystem: system,
		implantDiameterMm: diameterMm,
		implantLengthMm: lengthMm,
		avgOverallHU: avgHU,
		zones,
		steps,
		warnings,
		underdrillingApplied,
		corticalTapRequired,
	};
}

function getSystemNote(
	system: ImplantSystem,
	misch: MischClass,
	diameter: number,
): string {
	switch (system) {
		case "osstem":
			return misch === "D4"
				? `Osstem: TS III SA — активная резьба, рекомендован Ø${diameter}×10mm+`
				: `Osstem: TS III — стандартный протокол`;
		case "straumann":
			return misch === "D1"
				? `Straumann BLT: обязателен Tap бор`
				: `Straumann BLX: самонарезающий — исключить tap`;
		case "nobel":
			return misch === "D4"
				? `Nobel Active: самоконденсирующая резьба — ДОПУСТИМО без финального сверла`
				: `Nobel Parallel CC: стандартный протокол`;
		default:
			return "";
	}
}
