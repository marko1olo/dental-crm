/**
 * VITA Classical & VITA 3D-Master Calibrated Dental Color Scales
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

export const VITA_CLASSICAL_SHADES: VitaShade[] = [
	createVitaShade('B1', 'VITA B1 (Ультрасветлый)', 'classical', { r: 245, g: 238, b: 220 }, 'B', 1, 1, 'Красновато-желтоватый, наивысшая светлота'),
	createVitaShade('A1', 'VITA A1 (Светлый базовый)', 'classical', { r: 242, g: 232, b: 212 }, 'A', 2, 1, 'Красновато-коричневатый, высокая светлота'),
	createVitaShade('B2', 'VITA B2', 'classical', { r: 238, g: 225, b: 198 }, 'B', 3, 2, 'Красновато-желтоватый, средняя насыщенность'),
	createVitaShade('D2', 'VITA D2', 'classical', { r: 232, g: 222, b: 202 }, 'D', 4, 2, 'Красновато-серый, нейтральная светлота'),
	createVitaShade('A2', 'VITA A2 (Универсальный эталон)', 'classical', { r: 234, g: 218, b: 192 }, 'A', 5, 2, 'Самый частый естественный оттенок (60% пациентов)'),
	createVitaShade('C1', 'VITA C1', 'classical', { r: 226, g: 218, b: 204 }, 'C', 6, 1, 'Сероватый оттенок низкой насыщенности'),
	createVitaShade('C2', 'VITA C2', 'classical', { r: 222, g: 210, b: 190 }, 'C', 7, 2, 'Сероватый со средней насыщенностью'),
	createVitaShade('D3', 'VITA D3', 'classical', { r: 225, g: 208, b: 180 }, 'D', 8, 3, 'Красновато-серый глубокий'),
	createVitaShade('A3', 'VITA A3', 'classical', { r: 226, g: 204, b: 172 }, 'A', 9, 3, 'Красновато-коричневатый, зрелый оттенок'),
	createVitaShade('B3', 'VITA B3', 'classical', { r: 228, g: 202, b: 160 }, 'B', 10, 3, 'Красновато-желтоватый насыщенный'),
	createVitaShade('A3.5', 'VITA A3.5', 'classical', { r: 218, g: 192, b: 156 }, 'A', 11, 4, 'Повышенная хроматичность для клыков и шеек'),
	createVitaShade('B4', 'VITA B4', 'classical', { r: 216, g: 188, b: 142 }, 'B', 12, 4, 'Интенсивный желтый тон высокой насыщенности'),
	createVitaShade('C3', 'VITA C3', 'classical', { r: 208, g: 194, b: 170 }, 'C', 13, 3, 'Глубокий серый оттенок'),
	createVitaShade('D4', 'VITA D4', 'classical', { r: 212, g: 192, b: 164 }, 'D', 14, 4, 'Красновато-серый приглушенный'),
	createVitaShade('A4', 'VITA A4 (Темный насыщенный)', 'classical', { r: 202, g: 174, b: 138 }, 'A', 15, 5, 'Глубокий коричневатый оттенок'),
	createVitaShade('C4', 'VITA C4 (Темный серый)', 'classical', { r: 192, g: 176, b: 150 }, 'C', 16, 4, 'Темный серо-коричневый тон')
];

export const VITA_3D_MASTER_SHADES: VitaShade[] = [
	// Bleach Shades (Group 0)
	createVitaShade('0M1', '3D-Master 0M1 (Ultra Bleach)', '3d_master', { r: 252, g: 250, b: 242 }, 'Bleach', 1, 1, 'Максимально осветленный оттенок'),
	createVitaShade('0M2', '3D-Master 0M2 (Bleach)', '3d_master', { r: 248, g: 244, b: 232 }, 'Bleach', 2, 2, 'Ультрабелый натуральный'),
	createVitaShade('0M3', '3D-Master 0M3 (Soft Bleach)', '3d_master', { r: 244, g: 238, b: 222 }, 'Bleach', 3, 3, 'Мягкий отбеленный тон'),

	// Group 1 (Value 1)
	createVitaShade('1M1', '3D-Master 1M1', '3d_master', { r: 242, g: 234, b: 218 }, 'M', 4, 1, 'Высокая светлота, средний тон'),
	createVitaShade('1M2', '3D-Master 1M2', '3d_master', { r: 238, g: 226, b: 202 }, 'M', 5, 2, 'Высокая светлота, насыщенный'),

	// Group 2 (Value 2)
	createVitaShade('2L1.5', '3D-Master 2L1.5', '3d_master', { r: 236, g: 224, b: 198 }, 'L', 6, 1, 'Желтоватый тон (L)'),
	createVitaShade('2M1', '3D-Master 2M1', '3d_master', { r: 235, g: 222, b: 200 }, 'M', 7, 1, 'Средний тон (M)'),
	createVitaShade('2M2', '3D-Master 2M2', '3d_master', { r: 232, g: 216, b: 188 }, 'M', 8, 2, 'Средний тон (M), насыщенность 2'),
	createVitaShade('2M3', '3D-Master 2M3', '3d_master', { r: 228, g: 208, b: 174 }, 'M', 9, 3, 'Средний тон (M), насыщенность 3'),
	createVitaShade('2R1.5', '3D-Master 2R1.5', '3d_master', { r: 236, g: 220, b: 202 }, 'R', 10, 1, 'Красноватый тон (R)'),

	// Group 3 (Value 3)
	createVitaShade('3L1.5', '3D-Master 3L1.5', '3d_master', { r: 226, g: 212, b: 182 }, 'L', 11, 1, 'Желтоватый средняя светлота'),
	createVitaShade('3M1', '3D-Master 3M1', '3d_master', { r: 224, g: 210, b: 184 }, 'M', 12, 1, 'Универсальный средний тон'),
	createVitaShade('3M2', '3D-Master 3M2', '3d_master', { r: 220, g: 202, b: 172 }, 'M', 13, 2, 'Средний тон, насыщенный'),
	createVitaShade('3M3', '3D-Master 3M3', '3d_master', { r: 215, g: 194, b: 158 }, 'M', 14, 3, 'Высокая насыщенность 3M3'),
	createVitaShade('3R2.5', '3D-Master 3R2.5', '3d_master', { r: 218, g: 196, b: 172 }, 'R', 15, 2, 'Красноватый зрелый тон'),

	// Group 4 (Value 4)
	createVitaShade('4M1', '3D-Master 4M1', '3d_master', { r: 212, g: 198, b: 170 }, 'M', 16, 1, 'Низкая светлота 4M1'),
	createVitaShade('4M2', '3D-Master 4M2', '3d_master', { r: 206, g: 188, b: 156 }, 'M', 17, 2, 'Низкая светлота, насыщенный'),
	createVitaShade('4M3', '3D-Master 4M3', '3d_master', { r: 198, g: 178, b: 142 }, 'M', 18, 3, 'Глубокий оттенок 4M3'),

	// Group 5 (Value 5)
	createVitaShade('5M1', '3D-Master 5M1', '3d_master', { r: 196, g: 180, b: 152 }, 'M', 19, 1, 'Минимальная светлота'),
	createVitaShade('5M2', '3D-Master 5M2', '3d_master', { r: 188, g: 170, b: 138 }, 'M', 20, 2, 'Темный глубокий оттенок'),
];

export const ALL_VITA_SHADES = [...VITA_CLASSICAL_SHADES, ...VITA_3D_MASTER_SHADES];
