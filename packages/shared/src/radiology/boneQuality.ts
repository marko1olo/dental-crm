/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: CARL MISCH BONE QUALITY EVALUATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Quantitative assessment of bone density at planned dental implant sites.
 * Implements the Carl E. Misch bone density classification (D1–D5):
 * - D1: > 1250 HU / GV (Dense cortical bone, anterior mandible)
 * - D2: 850–1250 HU / GV (Thick porous cortical and coarse trabecular)
 * - D3: 350–850 HU / GV (Thin porous cortical and fine trabecular)
 * - D4: 150–350 HU / GV (Fine trabecular bone, posterior maxilla / tuber)
 * - D5: < 150 HU / GV (Immature, poorly mineralized bone / bone graft defect)
 *
 * Volumetric 3D Osteotomy Bed Sampling:
 * - Centerline axial sampling along implant vector [entry -> apex]
 * - Radial concentric ring at 60% radius across axial levels
 * - Trilinear voxel interpolation with out-of-volume air boundary handling
 * - Surgical drilling protocol, torque recommendations, and healing timeline
 *
 * Adapted from Dental-CBCT-Viewer reference core/boneQuality.ts.
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { trilinear, type VolumeSamplingData } from "./cprMath.js";
import { cross3, type Vec3 } from "./cbctSafetyEngine.js";

export type BoneClass = "D1" | "D2" | "D3" | "D4" | "D5";

/**
 * Misch clinical guidance interface detailing anatomical distribution, tactile feel,
 * drilling protocols, recommended insertion torque, and expected healing times.
 */
export interface MischGuidance {
	boneClass: BoneClass;
	classNameRu: string;
	densityRangeRu: string;
	anatomicLocationRu: string;
	corticalDescriptionRu: string;
	trabecularDescriptionRu: string;
	tactileFeelRu: string;
	clinicalDescriptionRu: string;
	surgicalPreparationProtocolRu: string;
	drillingProtocolRu: string;
	recommendedTorqueNcm: {
		min: number;
		max: number;
		target: number;
	};
	healingMonths: {
		mandible: number;
		maxilla: number;
	};
	colorHex: string;
	bgBadgeHex: string;
	borderBadgeHex: string;
}

export type BoneQualityProfile = MischGuidance;

/** Result of 3D implant bed bone density volumetric sampling */
export interface BoneSample {
	meanHU: number;
	bone: BoneClass;
	/** Number of in-volume samples averaged */
	samples: number;
	minHU?: number;
	maxHU?: number;
	stdDevHU?: number;
	profile?: BoneQualityProfile;
}

/**
 * Classifies CT Hounsfield Units (HU) or CBCT Gray Values (GV) into Misch bone classes.
 *
 * Standard Misch Reference Ranges:
 *   D1: > 1250 HU
 *   D2: 850–1250 HU
 *   D3: 350–850 HU
 *   D4: 150–350 HU
 *   D5: < 150 HU
 */
export function classifyBone(hu: number): BoneClass {
	if (hu > 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	if (hu >= 150) return "D4";
	return "D5";
}

/**
 * Clinical reference dataset for Carl Misch bone density classes (D1–D5).
 */
export const MISCH_CLINICAL_GUIDANCE: Record<BoneClass, MischGuidance> = {
	D1: {
		boneClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		densityRangeRu: "> 1250 HU (GV)",
		anatomicLocationRu:
			"Передний отдел нижней челюсти (между ментальными отверстиями / симфиз)",
		corticalDescriptionRu: "Плотная гомогенная кортикальная кость («кость дуба»)",
		trabecularDescriptionRu:
			"Практически отсутствует, минимальные костномозговые пространства",
		tactileFeelRu: "Дуб / слоновая кость (очень плотная древесина)",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным пространством и скудным кровоснабжением. Чрезвычайно высокая первичная механическая фиксация, но повышенный риск термического остеонекроза при сверлении.",
		surgicalPreparationProtocolRu:
			"Полное препарирование на всю рабочую длину с калибровкой кортикальной фрезой. Обязательное нарезание резьбы метчиком (bone tap) на всю глубину на скорости 15–25 об/мин с обильным внешним и внутренним охлаждением стерильным физраствором для исключения перегрева кости выше 47°C. Рекомендуются имплантаты с мелким шагом резьбы.",
		drillingProtocolRu:
			"Полное препарирование ложа, нарезание резьбы метчиком на всю глубину, обильное охлаждение для защиты от термонекроза",
		recommendedTorqueNcm: { min: 35, max: 50, target: 40 },
		healingMonths: { mandible: 3, maxilla: 4 },
		colorHex: "#1d4ed8",
		bgBadgeHex: "#dbeafe",
		borderBadgeHex: "#93c5fd",
	},
	D2: {
		boneClass: "D2",
		classNameRu:
			"Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		densityRangeRu: "850–1250 HU (GV)",
		anatomicLocationRu:
			"Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		corticalDescriptionRu: "Выраженная плотная кортикальная пластинка",
		trabecularDescriptionRu: "Плотная губчатая кость с высокой минерализацией",
		tactileFeelRu: "Сосна / белое дерево (плотная древесина средней твердости)",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции и высокой первичной стабильности.",
		surgicalPreparationProtocolRu:
			"Классический ступенчатый хирургический протокол сверления с финишной фрезой номинального диаметра. Нарезание резьбы метчиком только кортикальной шейки (на 2–3 мм при выраженном кортексе). Прогноз первичной стабильности 35–45 Н·см.",
		drillingProtocolRu:
			"Стандартный ступенчатый протокол, метчик только при плотной кортикальной пластинке в области шейки",
		recommendedTorqueNcm: { min: 30, max: 45, target: 35 },
		healingMonths: { mandible: 3, maxilla: 4 },
		colorHex: "#047857",
		bgBadgeHex: "#d1fae5",
		borderBadgeHex: "#6ee7b7",
	},
	D3: {
		boneClass: "D3",
		classNameRu:
			"Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		densityRangeRu: "350–850 HU (GV)",
		anatomicLocationRu:
			"Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		corticalDescriptionRu: "Тонкая пористая кортикальная пластинка",
		trabecularDescriptionRu: "Мелкоячеистая губчатая кость средней плотности",
		tactileFeelRu: "Плотная бальза / фанера",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
		surgicalPreparationProtocolRu:
			"Щадящее препарирование ложа: финишная фреза на 0.5–1.0 мм меньше номинального диаметра имплантата (under-drilling) для достижения бикортикальной фиксации и компрессии кости. Метчик не используется. Предпочтительны корневидные имплантаты с коническим телом и выраженным режущим профилем.",
		drillingProtocolRu:
			"Протокол недопрепарирования (under-drilling) на 0.5–1.0 мм меньше диаметра имплантата для остеоконденсации",
		recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
		healingMonths: { mandible: 4, maxilla: 5 },
		colorHex: "#b45309",
		bgBadgeHex: "#fef3c7",
		borderBadgeHex: "#fcd34d",
	},
	D4: {
		boneClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		densityRangeRu: "150–350 HU (GV)",
		anatomicLocationRu:
			"Дистальный отдел верхней челюсти (область моляров и бугра верхней челюсти)",
		corticalDescriptionRu: "Практически отсутствует",
		trabecularDescriptionRu:
			"Крупноячеистая редкая губчатая кость низкой плотности («пенопласт»)",
		tactileFeelRu: "Пенопласт / мягкая бальза",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности и провала имплантата при стандартном протоколе сверления.",
		surgicalPreparationProtocolRu:
			"Максимальное сохранение костного вещества: остеоконденсация (ручные или моторные остеотомы вместо фрез), препарирование только тонким пилотным сверлом 2.0 мм с последующим раздвижением трабекул остеотомами. Применение имплантатов с агрессивной самонарезающей резьбой. Протокол недопрепарирования ложа на 1–2 размера фрез. Бикортикальная фиксация в дно пазухи или небный кортекс.",
		drillingProtocolRu:
			"Остеотомический протокол с биконденсацией кости, конусный имплантат с агрессивной резьбой, без финишных фрез",
		recommendedTorqueNcm: { min: 15, max: 25, target: 20 },
		healingMonths: { mandible: 4, maxilla: 6 },
		colorHex: "#c2410c",
		bgBadgeHex: "#ffedd5",
		borderBadgeHex: "#fdba74",
	},
	D5: {
		boneClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		densityRangeRu: "< 150 HU (GV)",
		anatomicLocationRu:
			"Зоны недавних удалений, свежие костные аугментаты или выраженная атрофия",
		corticalDescriptionRu: "Отсутствует",
		trabecularDescriptionRu:
			"Незрелая неминерализованная кость или фиброзная ткань",
		tactileFeelRu: "Воздушный мусс / волокнистая ткань",
		clinicalDescriptionRu:
			"Крайне низкая плотность (незрелый регенерат, остеомаляция или тяжелая остеопения). Условия для первичной стабильности стандартного дентального имплантата отсутствуют.",
		surgicalPreparationProtocolRu:
			"Установка стандартного дентального имплантата противопоказана без предварительной костной пластики (GBR) и выдержки 6–9 месяцев для минерализации, либо применение бикортикальных скуловых (Zygoma) / птеригоидных имплантатов.",
		drillingProtocolRu:
			"Прямая имплантация противопоказана без предварительной костной пластики (GBR / аугментация)",
		recommendedTorqueNcm: { min: 0, max: 15, target: 10 },
		healingMonths: { mandible: 6, maxilla: 9 },
		colorHex: "#b91c1c",
		bgBadgeHex: "#fee2e2",
		borderBadgeHex: "#fca5a5",
	},
};

/**
 * Returns complete Misch clinical guidance (drilling protocol, torque, healing, anatomy)
 * for a specified bone density class.
 */
export function getMischBoneClinicalGuidance(
	boneClass: BoneClass,
): MischGuidance {
	return MISCH_CLINICAL_GUIDANCE[boneClass];
}

function normalize(v: Vec3): Vec3 {
	const l = Math.hypot(v[0], v[1], v[2]) || 1;
	return [v[0] / l, v[1] / l, v[2] / l];
}

/** Sample one world point; returns null when coordinates fall outside the volume bounding box */
function sampleWorld(
	vol: VolumeSamplingData,
	x: number,
	y: number,
	z: number,
): number | null {
	const ci = (x - vol.origin[0]) * vol.invSx;
	const cj = (y - vol.origin[1]) * vol.invSy;
	const ck = (z - vol.origin[2]) * vol.invSz;

	if (
		ci < 0 ||
		cj < 0 ||
		ck < 0 ||
		ci >= vol.dims[0] - 1 ||
		cj >= vol.dims[1] - 1 ||
		ck >= vol.dims[2] - 1
	) {
		return null;
	}

	return trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
}

/**
 * High-precision volumetric sampling of bone density along the planned implant bed:
 * - Centerline plus a concentric ring of radial samples at 60% radius (representing
 *   the intimate implant-bone contact zone) over the full entry -> apex length.
 * - Samples outside the volume bounding box are ignored.
 * - Calculates mean HU, min, max, standard deviation, and attaches the matching Misch profile.
 *
 * Returns null if the implant length is negligible (< 1e-6) or if zero samples lie within the volume.
 */
export function sampleImplantBoneHU(
	vol: VolumeSamplingData,
	entry: Vec3,
	apex: Vec3,
	radius: number,
	axialSteps = 12,
	radialSteps = 4,
): BoneSample | null {
	const dir: Vec3 = [
		apex[0] - entry[0],
		apex[1] - entry[1],
		apex[2] - entry[2],
	];
	const len = Math.hypot(dir[0], dir[1], dir[2]);
	if (len < 1e-6) return null;

	const u: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];
	const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const p1 = normalize(cross3(u, ref));
	const p2 = cross3(u, p1);
	const rr = radius * 0.6;

	let sum = 0;
	let n = 0;
	let min = Infinity;
	let max = -Infinity;
	const collected: number[] = [];

	for (let a = 0; a <= axialSteps; a++) {
		const t = a / axialSteps;
		const cx = entry[0] + dir[0] * t;
		const cy = entry[1] + dir[1] * t;
		const cz = entry[2] + dir[2] * t;

		const c = sampleWorld(vol, cx, cy, cz);
		if (c !== null) {
			sum += c;
			n++;
			collected.push(c);
			if (c < min) min = c;
			if (c > max) max = c;
		}

		for (let r = 0; r < radialSteps; r++) {
			const ang = (2 * Math.PI * r) / radialSteps;
			const ca = Math.cos(ang) * rr;
			const sa = Math.sin(ang) * rr;
			const px = cx + p1[0] * ca + p2[0] * sa;
			const py = cy + p1[1] * ca + p2[1] * sa;
			const pz = cz + p1[2] * ca + p2[2] * sa;
			const v = sampleWorld(vol, px, py, pz);
			if (v !== null) {
				sum += v;
				n++;
				collected.push(v);
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
	}

	if (n === 0) return null;

	const meanHU = sum / n;

	let varSum = 0;
	for (const v of collected) {
		const diff = v - meanHU;
		varSum += diff * diff;
	}
	const stdDevHU = Math.sqrt(varSum / n);
	const bone = classifyBone(meanHU);

	const cleanMin = min !== Infinity ? min : meanHU;
	const cleanMax = max !== -Infinity ? max : meanHU;

	return {
		meanHU: Math.abs(meanHU - Math.round(meanHU)) < 1e-6 ? Math.round(meanHU) : meanHU,
		bone,
		samples: n,
		minHU: Math.abs(cleanMin - Math.round(cleanMin)) < 1e-6 ? Math.round(cleanMin) : cleanMin,
		maxHU: Math.abs(cleanMax - Math.round(cleanMax)) < 1e-6 ? Math.round(cleanMax) : cleanMax,
		stdDevHU: Math.abs(stdDevHU - Math.round(stdDevHU)) < 1e-6 ? Math.round(stdDevHU) : stdDevHU,
		profile: getMischBoneClinicalGuidance(bone),
	};
}
