/**
 * perioProfileMath.ts — Анатомическая геометрия и расчет профиля пародонтальных карманов
 * (SEPA / Florida Probe / AAP-EFP).
 *
 * Создан по образу DentalPin (PerioProfileStrip.vue, PerioArchBlock.vue).
 * Поддерживает:
 * - Расчет полилиний края десны (GM, синяя линия)
 * - Расчет полилиний дна карманов (PD / CAL, красная линия)
 * - Расчет замкнутого полигона объема кармана (bandPath, полупрозрачный карман)
 * - Симметричный отсчет для верхней (depth-up) и нижней (depth-down) челюстей
 * - Точную миллиметровую сетку (0..15 мм с шагом 1 мм, жирные линии 0, 5, 10, 15 мм)
 * - Анатомические силуэты зубов 11..48 с точной посадкой эмалево-цементной границы (CEJ) на 0 мм
 */

import {
	isFurcationEligibleTooth,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";

export type PerioArch = "upper" | "lower";
export type PerioAspect = "buccal" | "lingual";
export type PerioStripDirection = "depth-up" | "depth-down";

export interface Point2D {
	readonly x: number;
	readonly y: number;
}

export interface GridlineSpec {
	readonly y: number;
	readonly mm: number;
	readonly isBold: boolean;
	readonly label: string;
}

export interface PerioProfileOptions {
	readonly columnWidth?: number | undefined;
	readonly stripHeight?: number | undefined;
	readonly maxMm?: number | undefined;
	readonly mmScale?: number | undefined;
	readonly baselineY?: number | undefined;
}

export interface PerioPolylineResult {
	readonly gmPath: string;
	readonly pdPath: string;
	readonly bandPath: string;
	readonly gmPoints: readonly Point2D[];
	readonly pdPoints: readonly Point2D[];
	readonly baselineY: number;
	readonly gridlines: readonly GridlineSpec[];
	readonly totalWidth: number;
	readonly stripHeight: number;
	readonly mmScale: number;
	readonly maxMm: number;
	readonly direction: PerioStripDirection;
}

export const PERIO_MAX_PROBING_MM = 15;
export const PERIO_DEFAULT_COLUMN_WIDTH = 60;
export const PERIO_DEFAULT_STRIP_HEIGHT = 130;
export const PERIO_DEFAULT_MM_SCALE = 4;
export const PERIO_SITE_OFFSETS: readonly [number, number, number] = [0.2, 0.5, 0.8];

/**
 * Определяет направление роста глубины кармана:
 * - 'depth-up': baseline внизу, глубина растет вверх (верхняя челюсть, корень направлен вверх)
 * - 'depth-down': baseline вверху, глубина растет вниз (нижняя челюсть, корень направлен вниз)
 */
export function getStripDirection(arch: PerioArch, aspect: PerioAspect = "buccal"): PerioStripDirection {
	if (arch === "upper") {
		return aspect === "buccal" ? "depth-up" : "depth-down";
	}
	return aspect === "buccal" ? "depth-down" : "depth-up";
}

/**
 * Расчет Y-координаты базовой линии 0 мм (эмалево-цементная граница CEJ).
 */
export function getBaselineY(direction: PerioStripDirection, stripHeight = PERIO_DEFAULT_STRIP_HEIGHT): number {
	return direction === "depth-up" ? Math.round(stripHeight * 0.63) : Math.round(stripHeight * 0.37);
}

/**
 * Преобразование глубины в миллиметрах в Y-координату SVG.
 * Clamped в диапазоне -3..maxMm.
 */
export function depthToY(
	mm: number,
	baselineY: number,
	direction: PerioStripDirection,
	mmScale = PERIO_DEFAULT_MM_SCALE,
	maxMm = PERIO_MAX_PROBING_MM
): number {
	const clamped = Math.max(-5, Math.min(maxMm, mm));
	const offset = clamped * mmScale;
	return direction === "depth-up" ? baselineY - offset : baselineY + offset;
}

/**
 * X-координата сайта зондирования (3 сайта на зуб, 20%, 50%, 80% ширины колонки).
 */
export function siteX(toothIdx: number, siteIdx: number, columnWidth = PERIO_DEFAULT_COLUMN_WIDTH): number {
	const offset = PERIO_SITE_OFFSETS[siteIdx] ?? 0.5;
	return Math.round((toothIdx * columnWidth + columnWidth * offset) * 10) / 10;
}

/**
 * Анатомический порядок сайтов слева направо для каждого зуба:
 * - Квадранты 1 и 4 (пациент справа -> левая сторона зубного ряда):
 *     вестибулярно: DB -> B -> MB (дистально -> медиально)
 *     орально: DL -> L -> ML
 * - Квадранты 2 и 3 (пациент слева -> правая сторона зубного ряда):
 *     вестибулярно: MB -> B -> DB (медиально -> дистально)
 *     орально: ML -> L -> DL
 */
export function getOrderedSitesForTooth(
	toothNumber: number,
	aspect: PerioAspect
): readonly [PerioSiteKey, PerioSiteKey, PerioSiteKey] {
	const isRightSide = toothNumber < 20 || (toothNumber >= 40 && toothNumber < 50);
	if (aspect === "buccal") {
		return isRightSide
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
	}
	return isRightSide
		? ["distoLingual", "midLingual", "mesioLingual"]
		: ["mesioLingual", "midLingual", "distoLingual"];
}

/**
 * Построение SVG-строки полилинии (M x0,y0 L x1,y1 ...).
 */
export function buildPolylinePath(points: readonly Point2D[]): string {
	if (points.length === 0) return "";
	return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/**
 * Построение замкнутого полигона объема кармана между линией GM и линией PD.
 */
export function buildBandPolygonPath(gmPoints: readonly Point2D[], pdPoints: readonly Point2D[]): string {
	if (gmPoints.length < 2 || pdPoints.length < 2 || gmPoints.length !== pdPoints.length) {
		return "";
	}
	const forward = gmPoints
		.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
		.join(" ");
	const backward = pdPoints
		.slice()
		.reverse()
		.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
		.join(" ");
	return `${forward} ${backward} Z`;
}

/**
 * Построение миллиметровых горизонтальных линий сетки.
 */
export function buildGridlines(
	baselineY: number,
	direction: PerioStripDirection,
	mmScale = PERIO_DEFAULT_MM_SCALE,
	maxMm = PERIO_MAX_PROBING_MM
): readonly GridlineSpec[] {
	const grid: GridlineSpec[] = [];
	for (let mm = 0; mm <= maxMm; mm++) {
		const isBold = mm % 5 === 0;
		const y = depthToY(mm, baselineY, direction, mmScale, maxMm);
		grid.push({
			y: Math.round(y * 10) / 10,
			mm,
			isBold,
			label: mm === 0 ? "0 (CEJ)" : `${mm} mm`,
		});
	}
	return grid;
}

/**
 * Главная математическая функция: расчет всех точек, полилиний и сетки для ряда зубов.
 */
export function calculatePerioProfilePolylines(
	teeth: readonly PerioToothRecord[],
	arch: PerioArch,
	aspect: PerioAspect = "buccal",
	options?: PerioProfileOptions
): PerioPolylineResult {
	const columnWidth = options?.columnWidth ?? PERIO_DEFAULT_COLUMN_WIDTH;
	const stripHeight = options?.stripHeight ?? PERIO_DEFAULT_STRIP_HEIGHT;
	const maxMm = options?.maxMm ?? PERIO_MAX_PROBING_MM;
	const mmScale = options?.mmScale ?? PERIO_DEFAULT_MM_SCALE;
	const direction = options?.baselineY !== undefined
		? (options.baselineY > stripHeight / 2 ? "depth-up" : "depth-down")
		: getStripDirection(arch, aspect);

	const baselineY = options?.baselineY ?? getBaselineY(direction, stripHeight);
	const totalWidth = teeth.length * columnWidth;

	const gmPoints: Point2D[] = [];
	const pdPoints: Point2D[] = [];

	teeth.forEach((tooth, toothIdx) => {
		if (tooth.isMissing) return;

		const sites = getOrderedSitesForTooth(tooth.toothNumber, aspect);
		sites.forEach((siteKey, siteIdx) => {
			const measurement = tooth[siteKey];
			if (!measurement) return;

			const pd = measurement.probingDepthMm ?? 0;
			const gm = measurement.gingivalMarginMm ?? 0;

			// Если зондирование не проводилось (0 мм) и рецессии нет (0 мм),
			// точку можно пропустить или отрисовать на CEJ
			const x = siteX(toothIdx, siteIdx, columnWidth);
			const gmY = depthToY(gm, baselineY, direction, mmScale, maxMm);
			const pdY = depthToY(gm + pd, baselineY, direction, mmScale, maxMm);

			gmPoints.push({ x, y: gmY });
			pdPoints.push({ x, y: pdY });
		});
	});

	const gmPath = buildPolylinePath(gmPoints);
	const pdPath = buildPolylinePath(pdPoints);
	const bandPath = buildBandPolygonPath(gmPoints, pdPoints);
	const gridlines = buildGridlines(baselineY, direction, mmScale, maxMm);

	return {
		gmPath,
		pdPath,
		bandPath,
		gmPoints,
		pdPoints,
		baselineY,
		gridlines,
		totalWidth,
		stripHeight,
		mmScale,
		maxMm,
		direction,
	};
}

/**
 * Данные анатомических силуэтов зубов 1..8 (Napkin Unfolding Symmetry).
 * Извлечены из DentalPin / профессиональных анатомических векторных моделей.
 */
export interface ToothLateralGeometry {
	readonly position: number;
	readonly viewBox: string;
	readonly vbWidth: number;
	readonly vbHeight: number;
	readonly gumLineY: number;
	readonly crown: string;
	readonly roots: readonly string[];
	readonly gumLine: string;
}

export const TOOTH_LATERAL_GEOMETRIES: Record<number, ToothLateralGeometry> = {
	1: {
		position: 1,
		viewBox: "0 0 46 134",
		vbWidth: 46,
		vbHeight: 134,
		gumLineY: 95,
		crown:
			"M39.2326 94.6438C33.1163 85.5409 14.1409 86.0457 6.65385 94.6438C-0.669089 102.084 0.287887 121.08 3.03399 127.814C15.6411 135.545 38.1091 133.675 43.8511 128.437C46.722 121.828 43.8511 103.747 39.2326 94.6438Z",
		roots: [
			"M18.1375 13.8391C16.1403 42.3702 9.64956 79.4307 6.65381 94.3946C18.9498 99.8859 26.179 100.443 39.8567 95.5168C40.4808 78.9319 40.0564 39.577 33.3659 14.8367C26.953 -8.87723 18.913 2.76033 18.1375 13.8391Z",
		],
		gumLine: "M 0,95 Q 23,100 46,95",
	},
	2: {
		position: 2,
		viewBox: "0 0 40 125",
		vbWidth: 40,
		vbHeight: 125,
		gumLineY: 85,
		crown:
			"M36.0861 86.4908C33.7138 80.3598 11.2384 78.6075 6.61846 84.8639C0.82482 92.7098 0.250476 113.268 1.62396 116.146C2.99745 119.024 8.866 122.152 18.6053 123.653C28.3446 125.155 35.7115 121.526 37.959 117.647C40.2066 113.768 38.4585 92.6219 36.0861 86.4908Z",
		roots: [
			"M12.487 53.0815C10.4083 62.2149 9.40701 74.1863 8.61621 83.112C16.2849 89.5132 36.3357 86.7405 36.3357 86.7405C36.3357 86.7405 34.7467 75.1037 35.0871 71.475C37.6081 44.5978 35.3738 25.049 34.213 18.4214C32.6315 12.4571 28.4694 0.328393 22.476 1.0291C14.9842 1.90499 18.3555 19.2973 17.7312 26.8049C17.0027 35.5656 14.1102 45.9493 12.487 53.0815Z",
		],
		gumLine: "M 0,85 Q 20,92 40,85",
	},
	3: {
		position: 3,
		viewBox: "0 0 47 146",
		vbWidth: 47,
		vbHeight: 146,
		gumLineY: 103,
		crown:
			"M44.5622 115.129C42.5478 107.137 40.7902 95.6772 22.907 95.8989C3.61725 96.1381 1 114.898 1 129.988C1 136.106 7.90619 141.245 12.8348 143.598C17.3509 145.755 30.8565 145.156 34.2382 143.598C37.7635 141.975 41.3094 141.201 44.5622 135.108C46.8285 130.862 46.0953 121.211 44.5622 115.129Z",
		roots: [
			"M9.09261 76.4153C8.17217 80.9327 7.17502 95.9485 6.7915 102.892C6.7915 102.892 16.3143 107.776 22.907 107.886C29.8761 108.003 40.0297 102.892 40.0297 102.892C38.1121 97.8724 34.7883 71.2707 35.4275 67.1299C36.0667 62.989 34.4048 42.9121 33.5099 38.3948C32.6151 33.8775 30.3139 20.5764 29.9304 15.0552C29.5469 9.53405 25.9674 0.875868 22.3879 1.00135C18.8084 1.12683 19.0641 4.01289 18.1692 5.51866C17.2743 7.02443 17.1465 16.561 16.763 20.5764C16.3795 24.5917 16.3795 25.5956 14.5897 29.36C12.8 33.1244 11.7772 43.7903 11.7772 47.0528C11.7772 50.3153 10.2432 70.7687 9.09261 76.4153Z",
		],
		gumLine: "M 0,103 Q 23,110 47,103",
	},
	4: {
		position: 4,
		viewBox: "0 0 40 100",
		vbWidth: 40,
		vbHeight: 100,
		gumLineY: 62.5,
		crown:
			"M33.75 62.5c-3.75,-4 -23.5,-4 -26.5,0 -5.25,7 -6,15.25 -6,19 -0.25,2.75 2.5,8.25 17,10 18,2 20.5,-7.5 20.5,-9.5 0,-3.5 -1,-15.25 -5.25,-19.5z",
		roots: [
			"M21.5 27.75c2.5,-7.75 4,-13.75 4.5,-17.75 0.25,-1.75 -1.5,-8.5 0.5,-8.5 2.25,0 8.25,8 9,13.5 0.75,5.25 -0.5,22.25 -1.25,29 -0.75,5.5 -0.75,14.25 -0.5,18 -12.5,7.5 -18,7 -26.5,0.5 0,0 2,-3.75 2.5,-12.5 0.25,-5.25 -1.5,-14.25 -1.75,-20.25 -1.25,-16.25 2.75,-27.75 5.5,-28.25 3.5,0.25 3.5,18 8,25.75l0.25 0.5",
		],
		gumLine: "M 0,62.5 Q 20,67.5 40,62.5",
	},
	5: {
		position: 5,
		viewBox: "0 0 40 125",
		vbWidth: 40,
		vbHeight: 125,
		gumLineY: 80,
		crown:
			"M32.0429 80.3319C25.3641 76.7153 12.3775 76.9648 8.17236 80.3319C2.73036 89.0619 -0.0157515 103.786 1.34475 110.396C2.70524 117.005 18.5365 125.61 21.2575 123.74C24.6402 121.414 38.3256 113.139 38.944 108.4C39.5624 103.661 34.8625 94.5572 34.6151 87.8227C34.4172 82.4352 32.9797 80.8392 32.0429 80.3319Z",
		roots: [
			"M9.01314 60.2618C8.22157 63.8534 8.10614 75.0609 8.14736 80.2156C17.5183 82.1917 23.0911 82.7369 33.6258 81.9617C33.5021 81.0887 32.5126 72.9825 31.6469 65.8739C30.7574 58.5708 31.0285 49.412 31.0285 46.5436C31.0285 43.6752 29.9153 33.3242 28.4311 29.5828C26.947 25.8415 27.5654 18.4834 26.8233 15.3656C26.0812 12.2478 20.8866 0.400168 17.9182 1.02373C14.9498 1.64728 17.1761 6.38633 16.1867 15.9891C15.3951 23.6714 12.8473 34.5296 11.9815 37.0654C10.7447 40.3079 10.0026 55.7721 9.01314 60.2618Z",
		],
		gumLine: "M 0,80 Q 20,88 40,80",
	},
	6: {
		position: 6,
		viewBox: "0 0 64 128",
		vbWidth: 64,
		vbHeight: 128,
		gumLineY: 85,
		crown:
			"M52.5724 83.8192C38.6457 77.1735 21.2542 79.2177 11.7848 82.6763C9.77918 83.4088 8.23738 84.9707 7.35306 86.9098C5.1137 91.8204 1 101.871 1 109.443C1 114.19 5.86637 124.628 14.0266 126.184C20.4417 127.407 24.7345 122.822 31.8129 122.686C39.6605 122.535 44.3969 129.286 51.6033 126.184C58.803 123.084 64.5464 115.023 62.6258 109.443C60.8828 104.378 59.6213 92.6599 54.5345 85.8667C54.0084 85.1642 53.3957 84.2121 52.5724 83.8192Z",
		roots: [
			"M31.6876 1C25.1117 1 26.9905 28.8602 19.7883 35.2319C21.1244 45.8096 28.5513 59.3963 32.3139 60.4685C35.8211 61.468 44.0879 37.2308 45.7162 28.8602C41.0818 22.7385 37.1989 1 31.6876 1Z",
			"M54.537 84.9802C54.537 83.5 52.5329 73.4613 54.537 64.8658C57.0421 54.1215 59.2967 40.8785 59.2967 31.3836C59.2967 22.4209 58.7387 10.8979 52.1445 5.22081C51.5917 4.74482 50.7688 5.08408 50.6455 5.80208C48.2891 19.5153 42.5034 48.131 33.2436 59.8685C30.5486 63.2845 16.6396 32.362 13.0019 10.5877C12.8671 9.78116 11.9139 9.48249 11.4381 10.1484C8.49442 14.2692 4.6997 23.8642 6.43885 39.1295C8.94396 61.1178 9.94601 59.2438 9.94601 68.364C9.94601 72.1459 8.4267 80.7768 7.6531 85.1369",
		],
		gumLine: "M 0,85 Q 32,95 64,85",
	},
	7: {
		position: 7,
		viewBox: "0 0 66 124",
		vbWidth: 66,
		vbHeight: 124,
		gumLineY: 78,
		crown:
			"M57.655 80.8343C57.2557 80.5265 56.8413 80.2327 56.4129 79.9525C44.8747 72.4037 23.1621 74.6455 11.3233 76.9591C10.1919 77.2013 8.70714 77.8501 7.72107 78.7268C7.41105 79.0024 7.15033 79.3005 6.96539 79.6156C-7.5536 104.353 8.35603 122.835 13.4349 122.835C18.6519 122.835 21.1362 113.835 28.589 112.835C36.0418 111.834 46.4758 124.585 52.6865 122.835C57.5011 121.478 63.8657 109.459 64.8594 104.709C65.8531 99.9594 61.3815 83.8342 57.655 80.8343Z",
		roots: [
			"M23.1237 1.08372C17.9564 4.38375 17.6582 22.6256 18.1551 31.334C20.6394 39.2507 26.8998 54.484 32.0671 52.084C37.2344 49.684 39.1058 39.9172 39.3957 35.3338C34.1787 29.3338 30.2039 17.7089 30.2039 15.3339C30.2039 12.9588 28.2164 -0.166297 23.1237 1.08372Z",
			"M10.79 62.9522C11.6845 68.8711 7 78.5 7.31157 78.7704C27.6459 73.526 38.316 73.7571 56.0109 80C58.3299 72.0579 59.4894 47.6533 54.5201 30.8499C48.5135 10.5393 40.5231 6.64772 37.9971 7.02392C34.767 9.65731 40.7302 23.326 39.7363 31.9786C39.2337 36.3543 34.1459 54.2997 31.1643 51.6663C22.468 45.0201 18.6789 33.6715 17.3744 30.8499C16.2812 28.4853 15.3867 18.31 15.014 15.6766C14.6413 13.0432 12.9641 8.27783 10.79 8.65412C8.61602 9.0304 5.86595 15.8311 4.45422 22.3228C3.33612 27.4642 4.45422 40.0042 5.94496 47.6535C7.37238 54.9779 9.79624 56.3761 10.79 62.9522Z",
		],
		gumLine: "M 0,78 Q 33,88 66,78",
	},
	8: {
		position: 8,
		viewBox: "0 0 67 104",
		vbWidth: 67,
		vbHeight: 104,
		gumLineY: 63,
		crown:
			"M58.1322 63.4319C48.1437 53.9492 13.933 57.9421 8.18956 62.1842C5.31786 66.2599 -0.100915 76.682 1.19759 85.7652C2.33379 93.7129 8.96183 100.615 11.9353 100.987C17.9284 101.735 27.5423 95.3723 33.7851 96.3704C40.028 97.3686 44.0234 103.357 48.7679 102.983C53.5125 102.609 59.8802 99.3649 64.6247 92.8769C69.3693 82.1469 60.5045 70.7928 58.1322 63.4319Z",
		roots: [
			"M30.9758 1.09548C28.5411 1.78154 24.8995 7.08434 24.4209 9.70447C24.2544 20.4602 25.9192 41.1732 33.91 37.9792C41.9008 34.7851 41.4846 20.8761 40.2777 14.3209C39.5285 12.2622 34.1616 0.197776 30.9758 1.09548Z",
			"M40.877 4.12291C58.0573 11.4094 58.1489 46.1284 56.9835 62.1402C38.3215 55.4866 27.3562 55.8281 7.04093 63C9.63795 60.5048 10.1207 54.0303 10.0375 52.1586C9.74852 45.6613 6.60782 42.3046 7.04093 31.8214C7.9399 10.0619 15.1566 3.54066 18.6526 3C24.1687 3 27.3814 27.6287 32.1621 35.9891C32.4602 36.5103 33.1208 36.5476 33.4394 36.0387C34.5725 34.2284 36.4464 30.1401 38.3799 24.5852C41.3765 15.9762 35.7579 2.25139 40.877 4.12291Z",
		],
		gumLine: "M 0,63 Q 33,73 67,63",
	},
};

/**
 * Получение геометрии силуэта зуба по номеру FDI (11..48).
 */
export function getToothLateralGeometry(toothNumber: number): ToothLateralGeometry {
	const pos = Math.abs(toothNumber % 10);
	return TOOTH_LATERAL_GEOMETRIES[pos] ?? TOOTH_LATERAL_GEOMETRIES[1]!;
}

/**
 * Расчет SVG transform для размещения и симметричного разворота зуба.
 */
export function getToothTransform(
	toothNumber: number,
	direction: PerioStripDirection,
	toothCenterX: number,
	baselineY: number,
	scale = 0.78
): string {
	const geo = getToothLateralGeometry(toothNumber);
	const isLeftSideInChart = toothNumber >= 20 && toothNumber < 40; // Q2 (21..28) & Q3 (31..38)
	const sx = isLeftSideInChart ? -scale : scale;
	const sy = direction === "depth-up" ? scale : -scale;

	const nativeCenterX = geo.vbWidth / 2;
	const nativeGumY = geo.gumLineY;

	return `translate(${toothCenterX.toFixed(1)}, ${baselineY.toFixed(1)}) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) translate(${(-nativeCenterX).toFixed(1)}, ${(-nativeGumY).toFixed(1)})`;
}

export { isFurcationEligibleTooth };
