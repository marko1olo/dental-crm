/**
 * VITA Classical & VITA 3D-Master Calibrated Dental Color Scales
 * 
 * Supports:
 * - VITA Classical A1-D4 (16 shades) + Bleach BL1-BL4 (4 shades) = 20 Classical shades
 * - VITA 3D-Master complete 29 shades: 0M1-0M3 (Bleach), 1M1-1M2, 2L1.5-2R2.5, 3L1.5-3R2.5, 4L1.5-4R2.5, 5M1-5M3
 * - Precise sRGB <-> CIELAB conversion (D65 Illuminant / 2° Standard Observer)
 * - CIEDE2000 & CIE76 Delta E, Delta L* (Lightness/Яркость), Delta C* (Chroma/Насыщенность), Delta H* (Hue)
 */

export interface ColorRGB {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
}

export interface ColorLab {
	L: number; // 0-100 (Lightness)
	a: number; // -128 to +127 (Green to Red)
	b: number; // -128 to +127 (Blue to Yellow)
}

export type VitaSystemType = 'classical' | '3d_master';

export interface VitaShade {
	code: string;
	nameRu: string;
	system: VitaSystemType;
	rgb: ColorRGB;
	lab: ColorLab;
	hueGroup: 'A' | 'B' | 'C' | 'D' | 'L' | 'M' | 'R' | 'Bleach';
	valueRanking: number; // 1 (lightest) to N (darkest)
	chromaLevel: number; // 1 to 5
	descriptionRu: string;
}

export interface ShadeDeltaResult {
	beforeShade: VitaShade;
	afterShade: VitaShade;
	deltaE00: number; // CIEDE2000
	deltaE76: number; // CIE76
	deltaL: number; // after.L - before.L (positive = lighter / brighter)
	deltaC: number; // after.C - before.C (positive = more saturated, negative = whiter/less yellow)
	deltaH: number; // hue difference in degrees
	isLighter: boolean;
	isNoticeable: boolean; // deltaE00 >= 1.2 (clinical perceptible threshold)
	stepDelta: number; // value ranking steps difference
	lightnessImprovementRu: string;
	chromaChangeRu: string;
	clinicalSummaryRu: string;
}

function sRGBToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function xyzF(t: number): number {
	const delta = 6 / 29;
	return t > delta * delta * delta ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

export function rgbToLab(rgb: ColorRGB): ColorLab {
	const r = sRGBToLinear(rgb.r / 255);
	const g = sRGBToLinear(rgb.g / 255);
	const b = sRGBToLinear(rgb.b / 255);

	let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
	let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
	let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

	x /= 0.95047;
	y /= 1.00000;
	z /= 1.08883;

	const fx = xyzF(x);
	const fy = xyzF(y);
	const fz = xyzF(z);

	const L = Math.max(0, 116 * fy - 16);
	const a = 500 * (fx - fy);
	const labB = 200 * (fy - fz);

	return { L, a, b: labB };
}

function labInvF(t: number): number {
	const delta = 6 / 29;
	return t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29);
}

function linearToSRGB(c: number): number {
	const val = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
	return Math.max(0, Math.min(255, Math.round(val * 255)));
}

export function labToRgb(lab: ColorLab): ColorRGB {
	const fy = (lab.L + 16) / 116;
	const fx = lab.a / 500 + fy;
	const fz = fy - lab.b / 200;

	let x = 0.95047 * labInvF(fx);
	let y = 1.00000 * labInvF(fy);
	let z = 1.08883 * labInvF(fz);

	const rLinear = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
	const gLinear = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
	const bLinear = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

	return {
		r: linearToSRGB(rLinear),
		g: linearToSRGB(gLinear),
		b: linearToSRGB(bLinear),
	};
}

function createVitaShade(
	code: string,
	nameRu: string,
	system: VitaSystemType,
	rgb: ColorRGB,
	hueGroup: 'A' | 'B' | 'C' | 'D' | 'L' | 'M' | 'R' | 'Bleach',
	valueRanking: number,
	chromaLevel: number,
	descriptionRu: string
): VitaShade {
	return {
		code,
		nameRu,
		system,
		rgb,
		lab: rgbToLab(rgb),
		hueGroup,
		valueRanking,
		chromaLevel,
		descriptionRu
	};
}

// ---------------------------------------------------------------------------
// VITA Classical Catalog (16 standard + 4 Bleach shades)
// ---------------------------------------------------------------------------

export const VITA_CLASSICAL_BLEACH_SHADES: VitaShade[] = [
	createVitaShade('BL1', 'VITA Bleach BL1 (Ultra White)', 'classical', { r: 254, g: 252, b: 246 }, 'Bleach', 1, 1, 'Максимально яркий отбеленный оттенок (Hollywood White)'),
	createVitaShade('BL2', 'VITA Bleach BL2 (Bright White)', 'classical', { r: 250, g: 246, b: 236 }, 'Bleach', 2, 1, 'Яркий натуральный отбеленный оттенок'),
	createVitaShade('BL3', 'VITA Bleach BL3 (Natural Bleach)', 'classical', { r: 247, g: 242, b: 228 }, 'Bleach', 3, 2, 'Мягкий естественный отбеленный тон'),
	createVitaShade('BL4', 'VITA Bleach BL4 (Light Natural)', 'classical', { r: 245, g: 239, b: 222 }, 'Bleach', 4, 2, 'Светлый естественный тон на границе с B1'),
];

export const VITA_CLASSICAL_STANDARD_SHADES: VitaShade[] = [
	createVitaShade('B1', 'VITA B1 (Ультрасветлый)', 'classical', { r: 245, g: 238, b: 220 }, 'B', 5, 1, 'Красновато-желтоватый, наивысшая светлота классической шкалы'),
	createVitaShade('A1', 'VITA A1 (Светлый базовый)', 'classical', { r: 242, g: 232, b: 212 }, 'A', 6, 1, 'Красновато-коричневатый, высокая светлота'),
	createVitaShade('B2', 'VITA B2', 'classical', { r: 238, g: 225, b: 198 }, 'B', 7, 2, 'Красновато-желтоватый, средняя насыщенность'),
	createVitaShade('D2', 'VITA D2', 'classical', { r: 232, g: 222, b: 202 }, 'D', 8, 2, 'Красновато-серый, нейтральная светлота'),
	createVitaShade('A2', 'VITA A2 (Универсальный эталон)', 'classical', { r: 234, g: 218, b: 192 }, 'A', 9, 2, 'Самый частый естественный оттенок (60% взрослых пациентов)'),
	createVitaShade('C1', 'VITA C1', 'classical', { r: 226, g: 218, b: 204 }, 'C', 10, 1, 'Сероватый оттенок низкой насыщенности'),
	createVitaShade('C2', 'VITA C2', 'classical', { r: 222, g: 210, b: 190 }, 'C', 11, 2, 'Сероватый со средней насыщенностью'),
	createVitaShade('D3', 'VITA D3', 'classical', { r: 225, g: 208, b: 180 }, 'D', 12, 3, 'Красновато-серый глубокий'),
	createVitaShade('A3', 'VITA A3', 'classical', { r: 226, g: 204, b: 172 }, 'A', 13, 3, 'Красновато-коричневатый, зрелый натуральный оттенок'),
	createVitaShade('B3', 'VITA B3', 'classical', { r: 228, g: 202, b: 160 }, 'B', 14, 3, 'Красновато-желтоватый насыщенный'),
	createVitaShade('A3.5', 'VITA A3.5', 'classical', { r: 218, g: 192, b: 156 }, 'A', 15, 4, 'Повышенная хроматичность для клыков и шеек зубов'),
	createVitaShade('B4', 'VITA B4', 'classical', { r: 216, g: 188, b: 142 }, 'B', 16, 4, 'Интенсивный желтый тон высокой насыщенности'),
	createVitaShade('C3', 'VITA C3', 'classical', { r: 208, g: 194, b: 170 }, 'C', 17, 3, 'Глубокий серый оттенок'),
	createVitaShade('D4', 'VITA D4', 'classical', { r: 212, g: 192, b: 164 }, 'D', 18, 4, 'Красновато-серый приглушенный'),
	createVitaShade('A4', 'VITA A4 (Темный насыщенный)', 'classical', { r: 202, g: 174, b: 138 }, 'A', 19, 5, 'Глубокий коричневатый оттенок'),
	createVitaShade('C4', 'VITA C4 (Темный серый)', 'classical', { r: 192, g: 176, b: 150 }, 'C', 20, 4, 'Темный серо-коричневый тон')
];

export const VITA_CLASSICAL_SHADES: VitaShade[] = [
	...VITA_CLASSICAL_BLEACH_SHADES,
	...VITA_CLASSICAL_STANDARD_SHADES
];

// ---------------------------------------------------------------------------
// VITA 3D-Master Catalog (29 shades: Groups 0..5)
// ---------------------------------------------------------------------------

export const VITA_3D_MASTER_SHADES: VitaShade[] = [
	// Group 0 (Bleach)
	createVitaShade('0M1', '3D-Master 0M1 (Ultra Bleach)', '3d_master', { r: 254, g: 251, b: 243 }, 'Bleach', 1, 1, 'Максимально осветленный оттенок 3D-Master'),
	createVitaShade('0M2', '3D-Master 0M2 (Bleach)', '3d_master', { r: 249, g: 245, b: 233 }, 'Bleach', 2, 2, 'Ультрабелый натуральный оттенок'),
	createVitaShade('0M3', '3D-Master 0M3 (Soft Bleach)', '3d_master', { r: 245, g: 239, b: 223 }, 'Bleach', 3, 3, 'Мягкий отбеленный тон'),

	// Group 1 (Value 1)
	createVitaShade('1M1', '3D-Master 1M1', '3d_master', { r: 242, g: 234, b: 218 }, 'M', 4, 1, 'Высокая светлота, средний цветовой тон'),
	createVitaShade('1M2', '3D-Master 1M2', '3d_master', { r: 238, g: 226, b: 202 }, 'M', 5, 2, 'Высокая светлота, повышенная насыщенность'),

	// Group 2 (Value 2)
	createVitaShade('2L1.5', '3D-Master 2L1.5', '3d_master', { r: 236, g: 224, b: 198 }, 'L', 6, 1, 'Желтоватый тон (L), светлота 2'),
	createVitaShade('2L2.5', '3D-Master 2L2.5', '3d_master', { r: 232, g: 218, b: 186 }, 'L', 7, 2, 'Желтоватый тон (L), насыщенность 2.5'),
	createVitaShade('2M1', '3D-Master 2M1', '3d_master', { r: 235, g: 222, b: 200 }, 'M', 8, 1, 'Средний тон (M), светлота 2'),
	createVitaShade('2M2', '3D-Master 2M2', '3d_master', { r: 232, g: 216, b: 188 }, 'M', 9, 2, 'Средний тон (M), насыщенность 2'),
	createVitaShade('2M3', '3D-Master 2M3', '3d_master', { r: 228, g: 208, b: 174 }, 'M', 10, 3, 'Средний тон (M), насыщенность 3'),
	createVitaShade('2R1.5', '3D-Master 2R1.5', '3d_master', { r: 236, g: 220, b: 202 }, 'R', 11, 1, 'Красноватый тон (R), светлота 2'),
	createVitaShade('2R2.5', '3D-Master 2R2.5', '3d_master', { r: 231, g: 212, b: 190 }, 'R', 12, 2, 'Красноватый тон (R), насыщенность 2.5'),

	// Group 3 (Value 3)
	createVitaShade('3L1.5', '3D-Master 3L1.5', '3d_master', { r: 226, g: 212, b: 182 }, 'L', 13, 1, 'Желтоватый тон (L), средняя светлота 3'),
	createVitaShade('3L2.5', '3D-Master 3L2.5', '3d_master', { r: 221, g: 204, b: 168 }, 'L', 14, 2, 'Желтоватый тон (L), насыщенность 2.5'),
	createVitaShade('3M1', '3D-Master 3M1', '3d_master', { r: 224, g: 210, b: 184 }, 'M', 15, 1, 'Универсальный средний тон (M)'),
	createVitaShade('3M2', '3D-Master 3M2', '3d_master', { r: 220, g: 202, b: 172 }, 'M', 16, 2, 'Средний тон (M), насыщенность 2'),
	createVitaShade('3M3', '3D-Master 3M3', '3d_master', { r: 215, g: 194, b: 158 }, 'M', 17, 3, 'Высокая насыщенность 3M3'),
	createVitaShade('3R1.5', '3D-Master 3R1.5', '3d_master', { r: 225, g: 206, b: 184 }, 'R', 18, 1, 'Красноватый тон (R), светлота 3'),
	createVitaShade('3R2.5', '3D-Master 3R2.5', '3d_master', { r: 218, g: 196, b: 172 }, 'R', 19, 2, 'Красноватый зрелый тон (R)'),

	// Group 4 (Value 4)
	createVitaShade('4L1.5', '3D-Master 4L1.5', '3d_master', { r: 214, g: 200, b: 170 }, 'L', 20, 1, 'Желтоватый тон (L), низкая светлота 4'),
	createVitaShade('4L2.5', '3D-Master 4L2.5', '3d_master', { r: 208, g: 190, b: 154 }, 'L', 21, 2, 'Желтоватый тон (L), насыщенность 2.5'),
	createVitaShade('4M1', '3D-Master 4M1', '3d_master', { r: 212, g: 198, b: 170 }, 'M', 22, 1, 'Низкая светлота 4M1'),
	createVitaShade('4M2', '3D-Master 4M2', '3d_master', { r: 206, g: 188, b: 156 }, 'M', 23, 2, 'Низкая светлота, насыщенный 4M2'),
	createVitaShade('4M3', '3D-Master 4M3', '3d_master', { r: 198, g: 178, b: 142 }, 'M', 24, 3, 'Глубокий оттенок 4M3'),
	createVitaShade('4R1.5', '3D-Master 4R1.5', '3d_master', { r: 212, g: 194, b: 172 }, 'R', 25, 1, 'Красноватый тон (R), светлота 4'),
	createVitaShade('4R2.5', '3D-Master 4R2.5', '3d_master', { r: 205, g: 184, b: 158 }, 'R', 26, 2, 'Красноватый тон (R), насыщенность 2.5'),

	// Group 5 (Value 5)
	createVitaShade('5M1', '3D-Master 5M1', '3d_master', { r: 196, g: 180, b: 152 }, 'M', 27, 1, 'Минимальная светлота 5M1'),
	createVitaShade('5M2', '3D-Master 5M2', '3d_master', { r: 188, g: 170, b: 138 }, 'M', 28, 2, 'Темный глубокий оттенок 5M2'),
	createVitaShade('5M3', '3D-Master 5M3', '3d_master', { r: 180, g: 160, b: 126 }, 'M', 29, 3, 'Максимально темный оттенок 5M3')
];

export const ALL_VITA_SHADES: VitaShade[] = [...VITA_CLASSICAL_SHADES, ...VITA_3D_MASTER_SHADES];

export function getVitaShadeByCode(code: string): VitaShade | undefined {
	const normalized = (code || '').trim().toUpperCase();
	return ALL_VITA_SHADES.find(s => s.code.toUpperCase() === normalized);
}

// ---------------------------------------------------------------------------
// Comprehensive Shade Delta Calculator (Lightness, Saturation & Clinical Impact)
// ---------------------------------------------------------------------------

function degToRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
	return (rad * 180) / Math.PI;
}

export function colorDistanceDeltaE76(lab1: ColorLab, lab2: ColorLab): number {
	const dL = lab1.L - lab2.L;
	const da = lab1.a - lab2.a;
	const db = lab1.b - lab2.b;
	return Math.sqrt(dL * dL + da * da + db * db);
}

export function colorDistanceDeltaE2000(lab1: ColorLab, lab2: ColorLab): number {
	const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
	const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

	const avgL = (L1 + L2) / 2;
	const C1 = Math.sqrt(a1 * a1 + b1 * b1);
	const C2 = Math.sqrt(a2 * a2 + b2 * b2);
	const avgC = (C1 + C2) / 2;

	const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
	const a1p = (1 + G) * a1;
	const a2p = (1 + G) * a2;

	const C1p = Math.sqrt(a1p * a1p + b1 * b1);
	const C2p = Math.sqrt(a2p * a2p + b2 * b2);
	const avgCp = (C1p + C2p) / 2;

	let h1p = Math.atan2(b1, a1p);
	if (h1p < 0) h1p += 2 * Math.PI;
	let h2p = Math.atan2(b2, a2p);
	if (h2p < 0) h2p += 2 * Math.PI;

	let dhp: number;
	if (Math.abs(h1p - h2p) <= Math.PI) {
		dhp = h2p - h1p;
	} else if (h2p <= h1p) {
		dhp = h2p - h1p + 2 * Math.PI;
	} else {
		dhp = h2p - h1p - 2 * Math.PI;
	}

	const dLp = L2 - L1;
	const dCp = C2p - C1p;
	const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2);

	let avghp = (h1p + h2p) / 2;
	if (Math.abs(h1p - h2p) > Math.PI) {
		if (h1p + h2p < 2 * Math.PI) {
			avghp += Math.PI;
		} else {
			avghp -= Math.PI;
		}
	}

	const T =
		1 -
		0.17 * Math.cos(avghp - degToRad(30)) +
		0.24 * Math.cos(2 * avghp) +
		0.32 * Math.cos(3 * avghp + degToRad(6)) -
		0.20 * Math.cos(4 * avghp - degToRad(63));

	const dTheta = degToRad(30) * Math.exp(-Math.pow((radToDeg(avghp) - 275) / 25, 2));
	const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
	const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
	const SC = 1 + 0.045 * avgCp;
	const SH = 1 + 0.015 * avgCp * T;
	const RT = -Math.sin(2 * dTheta) * RC;

	const deltaE = Math.sqrt(
		Math.pow(dLp / SL, 2) +
		Math.pow(dCp / SC, 2) +
		Math.pow(dHp / SH, 2) +
		RT * (dCp / SC) * (dHp / SH)
	);

	return deltaE;
}

export function calculateShadeDelta(
	beforeInput: VitaShade | string,
	afterInput: VitaShade | string
): ShadeDeltaResult {
	const before = typeof beforeInput === 'string' ? (getVitaShadeByCode(beforeInput) || VITA_CLASSICAL_SHADES[8]!) : beforeInput;
	const after = typeof afterInput === 'string' ? (getVitaShadeByCode(afterInput) || VITA_CLASSICAL_SHADES[4]!) : afterInput;

	const deltaE00 = colorDistanceDeltaE2000(before.lab, after.lab);
	const deltaE76 = colorDistanceDeltaE76(before.lab, after.lab);

	const deltaL = Math.round((after.lab.L - before.lab.L) * 10) / 10;

	const cBefore = Math.sqrt(before.lab.a * before.lab.a + before.lab.b * before.lab.b);
	const cAfter = Math.sqrt(after.lab.a * after.lab.a + after.lab.b * after.lab.b);
	const deltaC = Math.round((cAfter - cBefore) * 10) / 10;

	let hBefore = radToDeg(Math.atan2(before.lab.b, before.lab.a));
	if (hBefore < 0) hBefore += 360;
	let hAfter = radToDeg(Math.atan2(after.lab.b, after.lab.a));
	if (hAfter < 0) hAfter += 360;
	const deltaH = Math.round((hAfter - hBefore) * 10) / 10;

	const isLighter = deltaL > 0;
	const isNoticeable = deltaE00 >= 1.2;
	const stepDelta = before.valueRanking - after.valueRanking;

	let lightnessImprovementRu = 'Без изменений светлоты';
	if (deltaL > 0.5) {
		lightnessImprovementRu = `Осветление на +${deltaL} ед. L* (динамика: ${Math.abs(stepDelta)} ст. шкалы)`;
	} else if (deltaL < -0.5) {
		lightnessImprovementRu = `Потемнение на ${deltaL} ед. L*`;
	}

	let chromaChangeRu = 'Насыщенность стабильна';
	if (deltaC < -0.5) {
		chromaChangeRu = `Снижение желтизны/насыщенности на ${deltaC} ед. C*`;
	} else if (deltaC > 0.5) {
		chromaChangeRu = `Повышение насыщенности на +${deltaC} ед. C*`;
	}

	let clinicalSummaryRu = `ΔE₀₀ = ${deltaE00.toFixed(1)} (${before.code} -> ${after.code})`;
	if (stepDelta > 0) {
		clinicalSummaryRu += ` • Эффект отбеливания: +${stepDelta} ступ.`;
	} else if (stepDelta < 0) {
		clinicalSummaryRu += ` • Сдвиг в темную зону: ${stepDelta} ступ.`;
	} else {
		clinicalSummaryRu += ` • Коррекция цветового тона`;
	}

	return {
		beforeShade: before,
		afterShade: after,
		deltaE00: Math.round(deltaE00 * 100) / 100,
		deltaE76: Math.round(deltaE76 * 100) / 100,
		deltaL,
		deltaC,
		deltaH,
		isLighter,
		isNoticeable,
		stepDelta,
		lightnessImprovementRu,
		chromaChangeRu,
		clinicalSummaryRu
	};
}
