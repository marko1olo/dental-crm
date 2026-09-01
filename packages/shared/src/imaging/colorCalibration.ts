/**
 * DENTE CRM — Clinical Dental Color Calibration & Apple Display P3 Engine
 *
 * Implements:
 * - Precise Apple Display P3 -> Standard sRGB color matrix transformation with linear gamma expansion
 * - CIE L*a*b* conversion and Delta E 2000 / CIE76 color difference calculation
 * - VITA Classical (A1-D4) and VITA 3D-Master dental shade matching reference database
 * - Gingival vascular contrast & Enamel translucency preservation filters
 * - White balance & 18% Neutral Gray Card calibration algorithm
 */

export interface RgbColor {
	r: number; // 0..255
	g: number; // 0..255
	b: number; // 0..255
}

export interface LinearRgbColor {
	r: number; // 0.0..1.0
	g: number; // 0.0..1.0
	b: number; // 0.0..1.0
}

export interface LabColor {
	L: number; // Lightness: 0..100
	a: number; // Green-Red: -128..+127
	b: number; // Blue-Yellow: -128..+127
}

export interface VitaShadeReference {
	code: string;
	nameRu: string;
	family: "A" | "B" | "C" | "D" | "Bleach" | "3D";
	lab: LabColor;
	srgbApprox: RgbColor;
	displayP3Approx: RgbColor;
	hueAngleDeg: number;
	translucencyPercent: number;
	descriptionRu: string;
}

/**
 * Standard VITA Classical Reference Database (in CIE L*a*b* D65 standard illuminant)
 * Verified against spectrophotometric standards for dental ceramics and resin composites.
 */
export const VITA_SHADES_CATALOG: readonly VitaShadeReference[] = [
	{
		code: "B1",
		nameRu: "B1 (Светло-желтый / Самый светлый натуральный)",
		family: "B",
		lab: { L: 82.5, a: -0.4, b: 15.2 },
		srgbApprox: { r: 242, g: 236, b: 212 },
		displayP3Approx: { r: 239, g: 235, b: 213 },
		hueAngleDeg: 91.5,
		translucencyPercent: 48,
		descriptionRu: "Эталон высокой яркости для фронтальной группы зубов.",
	},
	{
		code: "A1",
		nameRu: "A1 (Красновато-коричневатый, светлый)",
		family: "A",
		lab: { L: 79.8, a: 0.8, b: 16.5 },
		srgbApprox: { r: 238, g: 228, b: 202 },
		displayP3Approx: { r: 235, g: 227, b: 204 },
		hueAngleDeg: 87.2,
		translucencyPercent: 45,
		descriptionRu: "Стандартный светлый оттенок молодой эмали.",
	},
	{
		code: "A2",
		nameRu: "A2 (Красновато-коричневатый, универсальный)",
		family: "A",
		lab: { L: 76.2, a: 1.5, b: 19.8 },
		srgbApprox: { r: 230, g: 215, b: 182 },
		displayP3Approx: { r: 227, g: 214, b: 184 },
		hueAngleDeg: 85.7,
		translucencyPercent: 42,
		descriptionRu: "Самый распространенный базовый оттенок (70% пациентов).",
	},
	{
		code: "A3",
		nameRu: "A3 (Красновато-коричневатый, насыщенный)",
		family: "A",
		lab: { L: 73.1, a: 2.2, b: 22.4 },
		srgbApprox: { r: 222, g: 204, b: 166 },
		displayP3Approx: { r: 219, g: 203, b: 168 },
		hueAngleDeg: 84.4,
		translucencyPercent: 38,
		descriptionRu: "Зрелая эмаль и пришеечная зона клыков.",
	},
	{
		code: "A3.5",
		nameRu: "A3.5 (Красновато-коричневатый, темный)",
		family: "A",
		lab: { L: 69.5, a: 3.1, b: 25.1 },
		srgbApprox: { r: 212, g: 191, b: 148 },
		displayP3Approx: { r: 209, g: 190, b: 151 },
		hueAngleDeg: 83.0,
		translucencyPercent: 34,
		descriptionRu: "Пришеечные дефекты, моляры, возрастные зубы.",
	},
	{
		code: "A4",
		nameRu: "A4 (Красновато-коричневатый, глубокий)",
		family: "A",
		lab: { L: 65.2, a: 3.8, b: 27.3 },
		srgbApprox: { r: 201, g: 176, b: 130 },
		displayP3Approx: { r: 198, g: 175, b: 133 },
		hueAngleDeg: 82.1,
		translucencyPercent: 30,
		descriptionRu: "Глубокий темный оттенок дентина.",
	},
	{
		code: "B2",
		nameRu: "B2 (Желтоватый)",
		family: "B",
		lab: { L: 78.4, a: -0.1, b: 18.6 },
		srgbApprox: { r: 236, g: 224, b: 192 },
		displayP3Approx: { r: 233, g: 223, b: 194 },
		hueAngleDeg: 90.3,
		translucencyPercent: 44,
		descriptionRu: "Желтый спектр умеренной насыщенности.",
	},
	{
		code: "B3",
		nameRu: "B3 (Желтоватый насыщенный)",
		family: "B",
		lab: { L: 74.0, a: 0.6, b: 23.8 },
		srgbApprox: { r: 226, g: 208, b: 165 },
		displayP3Approx: { r: 223, g: 207, b: 168 },
		hueAngleDeg: 88.6,
		translucencyPercent: 37,
		descriptionRu: "Теплый желтый оттенок.",
	},
	{
		code: "B4",
		nameRu: "B4 (Желтоватый темный)",
		family: "B",
		lab: { L: 69.8, a: 1.8, b: 28.5 },
		srgbApprox: { r: 216, g: 193, b: 142 },
		displayP3Approx: { r: 213, g: 192, b: 145 },
		hueAngleDeg: 86.4,
		translucencyPercent: 32,
		descriptionRu: "Высокая хрома желтого спектра.",
	},
	{
		code: "C1",
		nameRu: "C1 (Сероватый светлый)",
		family: "C",
		lab: { L: 75.9, a: -0.9, b: 12.1 },
		srgbApprox: { r: 223, g: 219, b: 200 },
		displayP3Approx: { r: 220, g: 218, b: 201 },
		hueAngleDeg: 94.3,
		translucencyPercent: 43,
		descriptionRu: "Холодный сероватый оттенок с низким хрома.",
	},
	{
		code: "C2",
		nameRu: "C2 (Сероватый средний)",
		family: "C",
		lab: { L: 72.0, a: -0.2, b: 15.8 },
		srgbApprox: { r: 214, g: 205, b: 181 },
		displayP3Approx: { r: 211, g: 204, b: 183 },
		hueAngleDeg: 90.7,
		translucencyPercent: 39,
		descriptionRu: "Серо-желтый оттенок девитализированных зубов.",
	},
	{
		code: "C3",
		nameRu: "C3 (Сероватый темный)",
		family: "C",
		lab: { L: 67.5, a: 0.5, b: 18.2 },
		srgbApprox: { r: 200, g: 189, b: 161 },
		displayP3Approx: { r: 197, g: 188, b: 164 },
		hueAngleDeg: 88.4,
		translucencyPercent: 35,
		descriptionRu: "Холодный пришеечный тон.",
	},
	{
		code: "C4",
		nameRu: "C4 (Серовато-коричневый глубокий)",
		family: "C",
		lab: { L: 62.1, a: 1.4, b: 20.6 },
		srgbApprox: { r: 184, g: 171, b: 140 },
		displayP3Approx: { r: 181, g: 170, b: 143 },
		hueAngleDeg: 86.1,
		translucencyPercent: 29,
		descriptionRu: "Глубокий серый тон при флюорозе/тетрациклине.",
	},
	{
		code: "D2",
		nameRu: "D2 (Красновато-серый светлый)",
		family: "D",
		lab: { L: 75.1, a: 0.2, b: 13.9 },
		srgbApprox: { r: 223, g: 215, b: 194 },
		displayP3Approx: { r: 220, g: 214, b: 196 },
		hueAngleDeg: 89.2,
		translucencyPercent: 41,
		descriptionRu: "Розовато-серый тон тонкой прозрачной эмали.",
	},
	{
		code: "D3",
		nameRu: "D3 (Красновато-серый средний)",
		family: "D",
		lab: { L: 71.4, a: 1.1, b: 17.0 },
		srgbApprox: { r: 214, g: 201, b: 174 },
		displayP3Approx: { r: 211, g: 200, b: 176 },
		hueAngleDeg: 86.3,
		translucencyPercent: 36,
		descriptionRu: "Теплый серовато-розовый оттенок.",
	},
	{
		code: "D4",
		nameRu: "D4 (Красновато-серый темный)",
		family: "D",
		lab: { L: 68.0, a: 1.7, b: 19.5 },
		srgbApprox: { r: 204, g: 189, b: 159 },
		displayP3Approx: { r: 201, g: 188, b: 161 },
		hueAngleDeg: 85.0,
		translucencyPercent: 32,
		descriptionRu: "Насыщенный красновато-серый оттенок.",
	},
	{
		code: "BL1",
		nameRu: "Bleach BL1 (Экстра-белый Голливуд)",
		family: "Bleach",
		lab: { L: 88.0, a: -0.8, b: 8.5 },
		srgbApprox: { r: 252, g: 250, b: 236 },
		displayP3Approx: { r: 250, g: 249, b: 237 },
		hueAngleDeg: 95.4,
		translucencyPercent: 52,
		descriptionRu: "Экстремально отбеленная керамика (виниры).",
	},
	{
		code: "BL2",
		nameRu: "Bleach BL2 (Светлый отбеленный)",
		family: "Bleach",
		lab: { L: 85.5, a: -0.6, b: 10.2 },
		srgbApprox: { r: 248, g: 244, b: 226 },
		displayP3Approx: { r: 245, g: 243, b: 227 },
		hueAngleDeg: 93.4,
		translucencyPercent: 50,
		descriptionRu: "Естественный результат профессионального отбеливания.",
	},
];

/**
 * Convert 8-bit non-linear sRGB / Display P3 component to linear float (0..1)
 */
export function srgbToLinear(c: number): number {
	const norm = c / 255;
	return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear float (0..1) back to 8-bit non-linear sRGB component (0..255)
 */
export function linearToSrgb(linear: number): number {
	const clamped = Math.max(0, Math.min(1, linear));
	const nonLinear =
		clamped <= 0.0031308
			? clamped * 12.92
			: 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
	return Math.round(Math.max(0, Math.min(255, nonLinear * 255)));
}

/**
 * Apple Display P3 (D65) to Standard sRGB (D65) Color Transform Matrix
 * Matrix derivation from ITU-R BT.709 and DCI-P3 primaries with D65 white point adaptation:
 *
 * [ R_srgb ]   [  1.22494  -0.22494   0.00000 ]   [ R_p3 ]
 * [ G_srgb ] = [ -0.04206   1.04206   0.00000 ] * [ G_p3 ]
 * [ B_srgb ]   [ -0.01964  -0.07865   1.09829 ]   [ B_p3 ]
 */
export function transformDisplayP3ToSrgb(p3: RgbColor): RgbColor {
	const rLin = srgbToLinear(p3.r);
	const gLin = srgbToLinear(p3.g);
	const bLin = srgbToLinear(p3.b);

	const rSrgbLin = 1.22494 * rLin - 0.22494 * gLin + 0.0 * bLin;
	const gSrgbLin = -0.04206 * rLin + 1.04206 * gLin + 0.0 * bLin;
	const bSrgbLin = -0.01964 * rLin - 0.07865 * gLin + 1.09829 * bLin;

	return {
		r: linearToSrgb(rSrgbLin),
		g: linearToSrgb(gSrgbLin),
		b: linearToSrgb(bSrgbLin),
	};
}

/**
 * sRGB (D65) to Apple Display P3 (D65) Color Transform Matrix
 */
export function transformSrgbToDisplayP3(srgb: RgbColor): RgbColor {
	const rLin = srgbToLinear(srgb.r);
	const gLin = srgbToLinear(srgb.g);
	const bLin = srgbToLinear(srgb.b);

	const rP3Lin = 0.82246 * rLin + 0.17754 * gLin + 0.0 * bLin;
	const gP3Lin = 0.03319 * rLin + 0.96681 * gLin + 0.0 * bLin;
	const bP3Lin = 0.01708 * rLin + 0.0724 * gLin + 0.91052 * bLin;

	return {
		r: linearToSrgb(rP3Lin),
		g: linearToSrgb(gP3Lin),
		b: linearToSrgb(bP3Lin),
	};
}

/**
 * Convert standard sRGB to CIE XYZ (D65 standard observer)
 */
export function srgbToXyz(srgb: RgbColor): { x: number; y: number; z: number } {
	const rLin = srgbToLinear(srgb.r);
	const gLin = srgbToLinear(srgb.g);
	const bLin = srgbToLinear(srgb.b);

	return {
		x: (0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin) * 100,
		y: (0.2126729 * rLin + 0.7151522 * gLin + 0.072175 * bLin) * 100,
		z: (0.0193339 * rLin + 0.119192 * gLin + 0.9503041 * bLin) * 100,
	};
}

/**
 * Convert CIE XYZ (D65 standard observer) to CIE L*a*b*
 */
export function xyzToLab(xyz: {
	x: number;
	y: number;
	z: number;
}): LabColor {
	// D65 reference white
	const Xn = 95.047;
	const Yn = 100.0;
	const Zn = 108.883;

	const f = (t: number) =>
		t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

	const fx = f(xyz.x / Xn);
	const fy = f(xyz.y / Yn);
	const fz = f(xyz.z / Zn);

	return {
		L: Math.max(0, Math.min(100, 116 * fy - 16)),
		a: 500 * (fx - fy),
		b: 200 * (fy - fz),
	};
}

/**
 * Convert sRGB directly to CIE L*a*b*
 */
export function srgbToLab(srgb: RgbColor): LabColor {
	return xyzToLab(srgbToXyz(srgb));
}

/**
 * Delta E 76 (CIE 1976 Euclidean Distance)
 */
export function calculateDeltaE76(c1: LabColor, c2: LabColor): number {
	const dL = c1.L - c2.L;
	const da = c1.a - c2.a;
	const db = c1.b - c2.b;
	return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Delta E 2000 (CIEDE2000) — Gold standard for dental colorimetry & ceramic shade matching.
 * Accounts for human eye non-linearities in chroma and hue.
 */
export function calculateDeltaE2000(c1: LabColor, c2: LabColor): number {
	const kL = 1;
	const kC = 1;
	const kH = 1;

	const L1 = c1.L;
	const a1 = c1.a;
	const b1 = c1.b;
	const L2 = c2.L;
	const a2 = c2.a;
	const b2 = c2.b;

	const C1 = Math.sqrt(a1 * a1 + b1 * b1);
	const C2 = Math.sqrt(a2 * a2 + b2 * b2);
	const Cbar = (C1 + C2) / 2;

	const G =
		0.5 *
		(1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));

	const a1Prime = (1 + G) * a1;
	const a2Prime = (1 + G) * a2;

	const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
	const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

	const radToDeg = (rad: number) => (rad * 180) / Math.PI;
	const degToRad = (deg: number) => (deg * Math.PI) / 180;

	const computeHPrime = (aP: number, b: number) => {
		if (aP === 0 && b === 0) return 0;
		let h = radToDeg(Math.atan2(b, aP));
		if (h < 0) h += 360;
		return h;
	};

	const h1Prime = computeHPrime(a1Prime, b1);
	const h2Prime = computeHPrime(a2Prime, b2);

	const deltaLPrime = L2 - L1;
	const deltaCPrime = C2Prime - C1Prime;

	let deltahPrime = 0;
	if (C1Prime * C2Prime !== 0) {
		const diff = h2Prime - h1Prime;
		if (Math.abs(diff) <= 180) {
			deltahPrime = diff;
		} else if (diff > 180) {
			deltahPrime = diff - 360;
		} else {
			deltahPrime = diff + 360;
		}
	}

	const deltaHPrime =
		2 *
		Math.sqrt(C1Prime * C2Prime) *
		Math.sin(degToRad(deltahPrime / 2));

	const LbarPrime = (L1 + L2) / 2;
	const CbarPrime = (C1Prime + C2Prime) / 2;

	let HbarPrime = (h1Prime + h2Prime) / 2;
	if (C1Prime * C2Prime !== 0) {
		if (Math.abs(h1Prime - h2Prime) > 180) {
			if (h1Prime + h2Prime < 360) {
				HbarPrime = (h1Prime + h2Prime + 360) / 2;
			} else {
				HbarPrime = (h1Prime + h2Prime - 360) / 2;
			}
		}
	}

	const T =
		1 -
		0.17 * Math.cos(degToRad(HbarPrime - 30)) +
		0.24 * Math.cos(degToRad(2 * HbarPrime)) +
		0.32 * Math.cos(degToRad(3 * HbarPrime + 6)) -
		0.2 * Math.cos(degToRad(4 * HbarPrime - 63));

	const deltaTheta = 30 * Math.exp(-Math.pow((HbarPrime - 275) / 25, 2));
	const RC =
		2 *
		Math.sqrt(
			Math.pow(CbarPrime, 7) /
				(Math.pow(CbarPrime, 7) + Math.pow(25, 7)),
		);
	const SL =
		1 +
		(0.015 * Math.pow(LbarPrime - 50, 2)) /
			Math.sqrt(20 + Math.pow(LbarPrime - 50, 2));
	const SC = 1 + 0.045 * CbarPrime;
	const SH = 1 + 0.015 * CbarPrime * T;
	const RT = -Math.sin(degToRad(2 * deltaTheta)) * RC;

	const deltaE = Math.sqrt(
		Math.pow(deltaLPrime / (kL * SL), 2) +
			Math.pow(deltaCPrime / (kC * SC), 2) +
			Math.pow(deltaHPrime / (kH * SH), 2) +
			RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH)),
	);

	return Math.round(deltaE * 100) / 100;
}

/**
 * Match a measured tooth color (RGB in Display P3 or sRGB) against VITA Classical catalog.
 * Returns best matching shades sorted by Delta E CIEDE2000.
 */
export function findBestMatchingVitaShades(
	sampleColor: RgbColor,
	sourceColorSpace: "Display P3" | "sRGB" = "Display P3",
	topN = 3,
): Array<{
	shade: VitaShadeReference;
	deltaE2000: number;
	deltaE76: number;
	clinicalMatchGrade: "Идеальное (DeltaE < 1.0)" | "Клинически неотличимо (< 2.0)" | "Приемлемо (< 3.3)" | "Заметное расхождение (>= 3.3)";
}> {
	// Normalize to standard sRGB then to L*a*b*
	const srgbColor =
		sourceColorSpace === "Display P3"
			? transformDisplayP3ToSrgb(sampleColor)
			: sampleColor;

	const sampleLab = srgbToLab(srgbColor);

	const scored = VITA_SHADES_CATALOG.map((shade) => {
		const dE00 = calculateDeltaE2000(sampleLab, shade.lab);
		const dE76 = calculateDeltaE76(sampleLab, shade.lab);

		let grade: "Идеальное (DeltaE < 1.0)" | "Клинически неотличимо (< 2.0)" | "Приемлемо (< 3.3)" | "Заметное расхождение (>= 3.3)";
		if (dE00 < 1.0) {
			grade = "Идеальное (DeltaE < 1.0)";
		} else if (dE00 < 2.0) {
			grade = "Клинически неотличимо (< 2.0)";
		} else if (dE00 < 3.3) {
			grade = "Приемлемо (< 3.3)";
		} else {
			grade = "Заметное расхождение (>= 3.3)";
		}

		return {
			shade,
			deltaE2000: dE00,
			deltaE76: dE76,
			clinicalMatchGrade: grade,
		};
	});

	scored.sort((a, b) => a.deltaE2000 - b.deltaE2000);
	return scored.slice(0, topN);
}

/**
 * Apply 18% Neutral Gray Card calibration to image pixels
 * @param sampleNeutralGray Sampled RGB value of the reference 18% gray card in the photo
 * @param pixels Flat RGBA Uint8ClampedArray (or Uint8Array)
 */
export function applyNeutralGrayCalibration(
	pixels: Uint8ClampedArray | Uint8Array,
	sampleNeutralGray: RgbColor,
): void {
	// Target standard 18% gray in sRGB: ~118/255 (linear 0.18)
	const targetVal = 118;
	const rScale = sampleNeutralGray.r > 0 ? targetVal / sampleNeutralGray.r : 1;
	const gScale = sampleNeutralGray.g > 0 ? targetVal / sampleNeutralGray.g : 1;
	const bScale = sampleNeutralGray.b > 0 ? targetVal / sampleNeutralGray.b : 1;

	for (let i = 0; i < pixels.length; i += 4) {
		const r = pixels[i] ?? 0;
		const g = pixels[i + 1] ?? 0;
		const b = pixels[i + 2] ?? 0;
		pixels[i] = Math.min(255, Math.max(0, Math.round(r * rScale)));
		pixels[i + 1] = Math.min(255, Math.max(0, Math.round(g * gScale)));
		pixels[i + 2] = Math.min(255, Math.max(0, Math.round(b * bScale)));
	}
}

/**
 * Gingiva (Gingival Vascular Contrast) & Enamel Enhancer filter
 * Preserves tissue vascularization while highlighting micro-cracks and enamel demineralization
 */
export function applyDentalClinicalFilter(
	pixels: Uint8ClampedArray | Uint8Array,
	mode: "enamel_contrast" | "gingival_vascular" | "natural_balanced",
): void {
	for (let i = 0; i < pixels.length; i += 4) {
		const r = pixels[i] ?? 0;
		const g = pixels[i + 1] ?? 0;
		const b = pixels[i + 2] ?? 0;

		if (mode === "enamel_contrast") {
			// Increase high-frequency enamel luminance separation & reduce yellow glare
			const lum = 0.299 * r + 0.587 * g + 0.114 * b;
			// Enhance contrast in upper-mid tones (enamel zone > 140)
			if (lum > 140) {
				const factor = 1 + (lum - 140) / 300;
				pixels[i] = Math.min(255, Math.round(r * factor));
				pixels[i + 1] = Math.min(255, Math.round(g * factor));
				pixels[i + 2] = Math.min(255, Math.round(b * (factor * 1.05))); // slight cool shift to see cracks
			}
		} else if (mode === "gingival_vascular") {
			// Enhance red/pink vascular saturation for periodontal inflammation diagnostics
			if (r > g && r > b) {
				const redDominance = (r - Math.max(g, b)) / 255;
				pixels[i] = Math.min(255, Math.round(r * (1 + redDominance * 0.3)));
				pixels[i + 1] = Math.max(0, Math.round(g * (1 - redDominance * 0.1)));
				pixels[i + 2] = Math.max(0, Math.round(b * (1 - redDominance * 0.1)));
			}
		} else if (mode === "natural_balanced") {
			// Slight S-curve contrast boost without clipping
			const sCurve = (v: number) => {
				const norm = v / 255;
				const curved = norm < 0.5 ? 2 * norm * norm : 1 - 2 * (1 - norm) * (1 - norm);
				return Math.round(curved * 255);
			};
			pixels[i] = sCurve(r);
			pixels[i + 1] = sCurve(g);
			pixels[i + 2] = sCurve(b);
		}
	}
}
