/**
 * CBCT / Panoramic 3D MPR Caliper Measurements & Mandibular Canal Nerve Tracer Engine (Facade)
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 650 строк).
 * 100% transparent backwards compatibility for all existing call sites.
 */

export * from './cbctCaliperMeasureMath.js';
export * from './cbctNerveCanalMath.js';

import type { Point2D, Point3D } from './cbctCaliperMeasureMath.js';
import {
  CRISP_OVERLAY_PAD_BG,
  CRISP_OVERLAY_BORDER_GOLD,
  drawMeasurementDeleteButton,
} from './cbctCaliperMeasureMath.js';
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from './cbctNerveCanalMath.js';

/**
 * Draws floating 3D Mandibular Canal (IAN) trajectory badge tooltip (DEF-R2-03).
 * Visual: bold 12px monospace font, dense dark background rgba(15, 23, 42, 0.92)
 * with #f59e0b border (1.0px) and gold text (#fbbf24).
 * Padding: >= 6px horizontal (8px), >= 3px vertical (5px).
 */
export function drawMandibularNerveBadge(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	totalLengthMm: number,
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
): void {
	ctx.save();
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = CRISP_OVERLAY_BORDER_GOLD;
	ctx.lineWidth = 1.0;
	const text = `Канал IAN (3D ${totalLengthMm.toFixed(1)} мм · ${safetyMarginMm.toFixed(1)} мм буфер)`;
	ctx.font = "bold 12px monospace";
	const tw = ctx.measureText(text).width;
	const padX = 8; // >= 6px horizontal padding
	const padY = 5; // >= 3px vertical padding
	const badgeW = tw + padX * 2;
	const badgeH = 22; // 12px font + 2 * 5px vertical padding
	const badgeX = posPx.x - badgeW / 2;
	const badgeY = posPx.y - 24;

	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#fbbf24";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, posPx.x, badgeY + badgeH / 2);
	ctx.restore();
}

export const drawNerveCanalBadge = drawMandibularNerveBadge;


// ─────────────────────────────────────────────────────────────────────────────
// 6. ENDODONTIC ROOT CANAL CALIPER & SCHNEIDER CURVATURE MATHEMATICS (3D CAD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Классификация кривизны корневого канала по методу Шнайдера (Schneider, 1971):
 * - straight (0..5°): Прямой канал
 * - moderate (10..25°): Средний / умеренный изгиб
 * - severe (>25°): Сильно искривленный канал
 */
export type EndoCurvatureGrade = "straight" | "moderate" | "severe";

/**
 * Измерение корневого канала эндодонтическим калипером по Шнайдеру
 */
export interface EndoCanalMeasurement {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly orificeMm: Point3D; // Клик 1: Устье канала
	readonly apexMm: Point3D; // Клик 2: Апекс (верхушка корня)
	readonly inflectionMm?: Point3D | undefined; // Клик 3 (опционально): Точка изгиба
	readonly lengthMm: number; // Общая физическая 3D длина канала в мм (с учетом voxel spacing)
	readonly coronalLengthMm: number; // Длина коронкового сегмента (устье -> точка изгиба, либо общая если изгиба нет)
	readonly apicalLengthMm: number; // Длина апикального сегмента (точка изгиба -> апекс, либо 0 если изгиба нет)
	readonly schneiderAngleDeg: number; // Угол кривизны по Шнайдеру в градусах: θ ∈ [0°, 180°]
	readonly curvatureGrade: EndoCurvatureGrade; // straight | moderate | severe
	readonly curvatureGradeRu: string; // «Прямой (0–5°)» | «Средний изгиб (10–25°)» | «Сильно искривленный (>25°)»
	readonly clinicalAdviceRu: string; // Клинические рекомендации по безопасности препарирования
	readonly fdiTooth?: string | null | undefined;
	readonly canalName?: string | undefined; // «MB1», «MB2», «DB», «P», «Дистальный», «Небный»
	readonly label?: string | undefined;
}

/**
 * Классификация кривизны корневого канала по Шнайдеру с выдачей клинических рекомендаций
 */
export function classifySchneiderCurvature(angleDeg: number): {
	readonly grade: EndoCurvatureGrade;
	readonly labelRu: string;
	readonly clinicalAdviceRu: string;
} {
	const angle = Math.max(0, Number(angleDeg.toFixed(1)));
	if (angle <= 5.0) {
		return {
			grade: "straight",
			labelRu: "Прямой (0–5°)",
			clinicalAdviceRu: "Прямой канал: минимальный риск поломки инструмента. Стандартный протокол препарирования.",
		};
	}
	if (angle <= 25.0) {
		return {
			grade: "moderate",
			labelRu: "Средний изгиб (10–25°)",
			clinicalAdviceRu: "Умеренный изгиб: рекомендуются гибкие Ni-Ti файлы с контролируемой памятью формы (CM-Wire), обильная ирригация.",
		};
	}
	return {
		grade: "severe",
		labelRu: "Сильно искривленный (>25°)",
		clinicalAdviceRu: "Выраженное искривление: высокий риск блокировки (ledge) и отлома инструмента! Требуется создание ковровой дорожки (Glide path .02) и реципрокная обработка.",
	};
}

/**
 * Преобразование 3D-точки в физические миллиметры с учетом воксельного шага (Voxel Spacing)
 */
function toPhysical3D(p: Point3D, spacing?: Point3D | number): Point3D {
	if (!spacing) return p;
	if (typeof spacing === "number") {
		return { x: p.x * spacing, y: p.y * spacing, z: p.z * spacing };
	}
	return { x: p.x * spacing.x, y: p.y * spacing.y, z: p.z * spacing.z };
}

/**
 * Расчет угла кривизны по Шнайдеру (Schneider Angle) в пространстве 3D в градусах θ ∈ [0°, 180°].
 * Клик 1: Устье канала -> Клик 2: Апекс (верхушка) -> опциональный Клик 3: Точка изгиба.
 * Если точка изгиба не указана, канал считается прямым (угол 0.0°).
 * При наличии точки изгиба угол измеряется как угол отклонения хода канала от первоначального направления
 * (угол между продолжением линии устье->изгиб и линией изгиб->апекс).
 */
export function calculateSchneiderAngle3D(
	orifice: Point3D,
	apex: Point3D,
	inflection?: Point3D,
	voxelSpacing?: Point3D | number,
): number {
	if (!inflection) return 0.0;
	const pO = toPhysical3D(orifice, voxelSpacing);
	const pA = toPhysical3D(apex, voxelSpacing);
	const pI = toPhysical3D(inflection, voxelSpacing);

	// Вектор коронковой части канала (от устья к точке изгиба)
	const v1x = pI.x - pO.x;
	const v1y = pI.y - pO.y;
	const v1z = pI.z - pO.z;

	// Вектор верхушечной части канала (от точки изгиба к апексу)
	const v2x = pA.x - pI.x;
	const v2y = pA.y - pI.y;
	const v2z = pA.z - pI.z;

	const len1 = Math.hypot(v1x, v1y, v1z);
	const len2 = Math.hypot(v2x, v2y, v2z);

	if (len1 === 0 || len2 === 0) return 0.0;

	// Угол между направлением коронкового хода и апикального хода (угол девиации)
	const dot = v1x * v2x + v1y * v2y + v1z * v2z;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	const angleRad = Math.acos(cosTheta);
	const angleDeg = (angleRad * 180) / Math.PI;

	return Number(angleDeg.toFixed(1));
}

/**
 * Расчет физической 3D-длины корневого канала в миллиметрах вдоль анатомической траектории
 */
export function calculateEndoCanalLength3DMm(
	orifice: Point3D,
	apex: Point3D,
	inflection?: Point3D,
	voxelSpacing?: Point3D | number,
): number {
	const pO = toPhysical3D(orifice, voxelSpacing);
	const pA = toPhysical3D(apex, voxelSpacing);

	if (!inflection) {
		return Number(Math.hypot(pA.x - pO.x, pA.y - pO.y, pA.z - pO.z).toFixed(1));
	}

	const pI = toPhysical3D(inflection, voxelSpacing);
	const len1 = Math.hypot(pI.x - pO.x, pI.y - pO.y, pI.z - pO.z);
	const len2 = Math.hypot(pA.x - pI.x, pA.y - pI.y, pA.z - pI.z);
	return Number((len1 + len2).toFixed(1));
}

/**
 * Комплексный расчет структуры измерения корневого канала
 */
export function calculateEndoCanalMeasurement(params: {
	id?: string;
	plane?: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	orifice: Point3D;
	apex: Point3D;
	inflection?: Point3D;
	voxelSpacing?: Point3D | number;
	fdiTooth?: string | null;
	canalName?: string;
	label?: string;
}): EndoCanalMeasurement {
	const pO = toPhysical3D(params.orifice, params.voxelSpacing);
	const pA = toPhysical3D(params.apex, params.voxelSpacing);
	const pI = params.inflection ? toPhysical3D(params.inflection, params.voxelSpacing) : undefined;

	const coronalLengthMm = pI
		? Number(Math.hypot(pI.x - pO.x, pI.y - pO.y, pI.z - pO.z).toFixed(1))
		: Number(Math.hypot(pA.x - pO.x, pA.y - pO.y, pA.z - pO.z).toFixed(1));

	const apicalLengthMm = pI
		? Number(Math.hypot(pA.x - pI.x, pA.y - pI.y, pA.z - pI.z).toFixed(1))
		: 0.0;

	const lengthMm = Number((coronalLengthMm + apicalLengthMm).toFixed(1));
	const schneiderAngleDeg = calculateSchneiderAngle3D(
		params.orifice,
		params.apex,
		params.inflection,
		params.voxelSpacing,
	);
	const classification = classifySchneiderCurvature(schneiderAngleDeg);

	const defaultLabel = params.canalName
		? (params.fdiTooth ? `Зуб ${params.fdiTooth} (${params.canalName})` : `Канал ${params.canalName}`)
		: (params.fdiTooth ? `Зуб ${params.fdiTooth}` : "Корневой канал");

	return {
		id: params.id || `endo-canal-${Date.now()}-${Math.abs(Math.round(lengthMm * 10)).toString(36)}`,
		plane: params.plane ?? "panoramic",
		orificeMm: params.orifice,
		apexMm: params.apex,
		inflectionMm: params.inflection,
		lengthMm,
		coronalLengthMm,
		apicalLengthMm,
		schneiderAngleDeg,
		curvatureGrade: classification.grade,
		curvatureGradeRu: classification.labelRu,
		clinicalAdviceRu: classification.clinicalAdviceRu,
		fdiTooth: params.fdiTooth ?? null,
		canalName: params.canalName,
		label: params.label || defaultLabel,
	};
}

/**
 * Спокойный неблокирующий текст для HUD-плашки эндо-калипера:
 * «Канал: 21.2 мм, изгиб 18°» (Мандат 8e / Директива 3)
 */
export function formatEndoCanalHudText(lengthMm: number, angleDeg: number): string {
	const safeLength = Number.isFinite(lengthMm) ? lengthMm : 0;
	const safeAngle = Number.isFinite(angleDeg) ? angleDeg : 0;
	const isNearInteger = Math.abs(safeAngle - Math.round(safeAngle)) < 0.05;
	const angleFormatted = isNearInteger ? `${Math.round(safeAngle)}°` : `${safeAngle.toFixed(1)}°`;
	return `Канал: ${safeLength.toFixed(1)} мм, изгиб ${angleFormatted}`;
}

/**
 * Форматирование текста для наэкранного бейджа канала
 */
export function formatEndoCanalBadgeText(
	lengthMm: number,
	angleDeg: number,
	gradeRu?: string,
): string {
	const hud = formatEndoCanalHudText(lengthMm, angleDeg);
	return gradeRu ? `${hud} (${gradeRu})` : hud;
}

/**
 * Форматирование записи в эндодонтический протокол медицинской карты (Форма 043/у)
 */
export function formatEndoCanalProtocolEntry(canal: EndoCanalMeasurement): string {
	const prefix = canal.fdiTooth
		? canal.canalName
			? `Зуб ${canal.fdiTooth}, канал ${canal.canalName}: `
			: `Зуб ${canal.fdiTooth}: `
		: canal.canalName
			? `Канал ${canal.canalName}: `
			: "Корневой канал: ";

	const isNearInteger = Math.abs(canal.schneiderAngleDeg - Math.round(canal.schneiderAngleDeg)) < 0.05;
	const angleFormatted = isNearInteger
		? `${Math.round(canal.schneiderAngleDeg)}°`
		: `${canal.schneiderAngleDeg.toFixed(1)}°`;

	return `${prefix}рабочая длина ${canal.lengthMm.toFixed(1)} мм, угол кривизны по Шнайдеру ${angleFormatted} (${canal.curvatureGradeRu}). ${canal.clinicalAdviceRu}`;
}

/**
 * Hit-testing для интерактивного захвата (drag-and-drop) узлов эндо-калипера
 */
export function hitTestEndoCanalHandle(
	pointerPx: { readonly x: number; readonly y: number },
	canals: readonly {
		readonly id: string;
		readonly plane: string;
		readonly orificePx: { readonly x: number; readonly y: number };
		readonly apexPx: { readonly x: number; readonly y: number };
		readonly inflectionPx?: { readonly x: number; readonly y: number } | undefined;
	}[],
	hitRadiusPx = 12,
): { id: string; handleType: "orifice" | "apex" | "inflection"; distancePx: number } | null {
	let closestHit: { id: string; handleType: "orifice" | "apex" | "inflection"; distancePx: number } | null = null;
	let minDistance = hitRadiusPx;

	for (const c of canals) {
		const dOrifice = Math.hypot(pointerPx.x - c.orificePx.x, pointerPx.y - c.orificePx.y);
		if (dOrifice <= minDistance) {
			minDistance = dOrifice;
			closestHit = { id: c.id, handleType: "orifice", distancePx: Number(dOrifice.toFixed(1)) };
		}
		const dApex = Math.hypot(pointerPx.x - c.apexPx.x, pointerPx.y - c.apexPx.y);
		if (dApex <= minDistance) {
			minDistance = dApex;
			closestHit = { id: c.id, handleType: "apex", distancePx: Number(dApex.toFixed(1)) };
		}
		if (c.inflectionPx) {
			const dInflection = Math.hypot(pointerPx.x - c.inflectionPx.x, pointerPx.y - c.inflectionPx.y);
			if (dInflection <= minDistance) {
				minDistance = dInflection;
				closestHit = { id: c.id, handleType: "inflection", distancePx: Number(dInflection.toFixed(1)) };
			}
		}
	}

	return closestHit;
}

/**
 * Hit-testing для клика по каналу или быстрому удалению [×]
 */
export function hitTestEndoCanalObject(
	pointerPx: { readonly x: number; readonly y: number },
	canals: readonly {
		readonly id: string;
		readonly plane: string;
		readonly orificePx: { readonly x: number; readonly y: number };
		readonly apexPx: { readonly x: number; readonly y: number };
		readonly inflectionPx?: { readonly x: number; readonly y: number } | undefined;
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number } | undefined;
	}[],
	lineHitTolerancePx = 10,
): { id: string; isDeleteButtonHit: boolean; distancePx: number } | null {
	const distPointToSeg = (
		pt: { x: number; y: number },
		p1: { x: number; y: number },
		p2: { x: number; y: number },
	): number => {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		const l2 = dx * dx + dy * dy;
		if (l2 === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
		let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / l2;
		t = Math.max(0, Math.min(1, t));
		const projX = p1.x + t * dx;
		const projY = p1.y + t * dy;
		return Math.hypot(pt.x - projX, pt.y - projY);
	};

	let closestHit: { id: string; isDeleteButtonHit: boolean; distancePx: number } | null = null;
	let minDistance = lineHitTolerancePx;

	for (const c of canals) {
		const badgeX = c.badgePx?.x ?? (c.inflectionPx ? c.inflectionPx.x : (c.orificePx.x + c.apexPx.x) / 2);
		const badgeY = c.badgePx?.y ?? (c.inflectionPx ? c.inflectionPx.y - 20 : (c.orificePx.y + c.apexPx.y) / 2 - 20);
		const badgeW = c.badgePx?.width ?? 90;
		const badgeH = c.badgePx?.height ?? 22;

		// 44x44 px hitbox for medical gloved touch (DEF-R2-06 / DEF-18.1)
		const deleteTargetX = badgeX + badgeW / 2 - 14;
		const deleteTargetY = badgeY;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		const isInsideBadge =
			Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 &&
			Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;

		if (isDeleteHitbox || isInsideBadge) {
			const isDeleteHit = isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28;
			return {
				id: c.id,
				isDeleteButtonHit: isDeleteHit,
				distancePx: 0,
			};
		}

		if (c.inflectionPx) {
			const d1 = distPointToSeg(pointerPx, c.orificePx, c.inflectionPx);
			const d2 = distPointToSeg(pointerPx, c.inflectionPx, c.apexPx);
			const minD = Math.min(d1, d2);
			if (minD <= minDistance) {
				minDistance = minD;
				closestHit = { id: c.id, isDeleteButtonHit: false, distancePx: Number(minD.toFixed(1)) };
			}
		} else {
			const d = distPointToSeg(pointerPx, c.orificePx, c.apexPx);
			if (d <= minDistance) {
				minDistance = d;
				closestHit = { id: c.id, isDeleteButtonHit: false, distancePx: Number(d.toFixed(1)) };
			}
		}
	}

	return closestHit;
}

/**
 * Отрисовка наэкранного бейджа корневого канала на Canvas с гарантией контраста WCAG AAA
 */
export function drawEndoCanalBadge(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	lengthMm: number,
	angleDeg: number,
	gradeRu?: string,
): void {
	ctx.save();
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = "#14b8a6"; // Crisp teal border
	ctx.lineWidth = 1.0;

	const text = formatEndoCanalBadgeText(lengthMm, angleDeg, gradeRu);
	ctx.font = "bold 12px monospace";
	const tw = ctx.measureText(text).width;
	const padX = 8;
	const padY = 5;
	const badgeW = tw + padX * 2;
	const badgeH = 22;
	const badgeX = posPx.x - badgeW / 2;
	const badgeY = posPx.y - 24;

	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#5eead4"; // High-contrast light teal text
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, posPx.x, badgeY + badgeH / 2);
	ctx.restore();
}

/**
 * Отрисовка измерения корневого канала на Canvas
 */
export function drawEndoCanalMeasurement(
	ctx: CanvasRenderingContext2D,
	canal: {
		readonly id: string;
		readonly orificePx: { readonly x: number; readonly y: number };
		readonly apexPx: { readonly x: number; readonly y: number };
		readonly inflectionPx?: { readonly x: number; readonly y: number } | undefined;
		readonly lengthMm: number;
		readonly schneiderAngleDeg: number;
		readonly curvatureGradeRu?: string | undefined;
		readonly isSelected?: boolean | undefined;
	},
): void {
	ctx.save();

	const isSelected = Boolean(canal.isSelected);
	const mainColor = isSelected ? "#38bdf8" : "#14b8a6"; // Sky blue when selected, Teal otherwise
	const apicalColor = canal.schneiderAngleDeg > 25 ? "#f43f5e" : canal.schneiderAngleDeg > 5 ? "#f59e0b" : mainColor;

	// 1. Отрисовка коронковой части канала
	ctx.beginPath();
	ctx.strokeStyle = mainColor;
	ctx.lineWidth = isSelected ? 2.5 : 1.8;
	ctx.moveTo(canal.orificePx.x, canal.orificePx.y);

	if (canal.inflectionPx) {
		ctx.lineTo(canal.inflectionPx.x, canal.inflectionPx.y);
		ctx.stroke();

		// 2. Отрисовка апикальной части канала
		ctx.beginPath();
		ctx.strokeStyle = apicalColor;
		ctx.lineWidth = isSelected ? 2.5 : 1.8;
		ctx.moveTo(canal.inflectionPx.x, canal.inflectionPx.y);
		ctx.lineTo(canal.apexPx.x, canal.apexPx.y);
		ctx.stroke();

		// 3. Узел точки изгиба (желтый маркер)
		ctx.fillStyle = "#fbbf24";
		ctx.strokeStyle = "#78350f";
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.arc(canal.inflectionPx.x, canal.inflectionPx.y, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.lineTo(canal.apexPx.x, canal.apexPx.y);
		ctx.stroke();
	}

	// 4. Узел устья (бирюзовый маркер)
	ctx.fillStyle = "#2dd4bf";
	ctx.strokeStyle = "#134e4a";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.arc(canal.orificePx.x, canal.orificePx.y, 4.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// 5. Узел апекса (красный / оранжевый маркер)
	ctx.fillStyle = "#f43f5e";
	ctx.strokeStyle = "#881337";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.arc(canal.apexPx.x, canal.apexPx.y, 4.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// 6. Бейдж с результатами
	const badgePos = canal.inflectionPx
		? canal.inflectionPx
		: { x: (canal.orificePx.x + canal.apexPx.x) / 2, y: (canal.orificePx.y + canal.apexPx.y) / 2 };
	drawEndoCanalBadge(ctx, badgePos, canal.lengthMm, canal.schneiderAngleDeg, canal.curvatureGradeRu);

	// 7. Кнопка быстрого удаления [×] при активном выборе
	if (isSelected) {
		const badgeW = 120;
		const deleteTargetX = badgePos.x + badgeW / 2 + 10;
		const deleteTargetY = badgePos.y - 13;
		drawMeasurementDeleteButton(ctx, deleteTargetX, deleteTargetY, 11);
	}

	ctx.restore();
}

/**
 * Projects a 3D mandibular nerve spline onto a transverse cross-section slice.
 * Calculates the exact intersection point with the slice plane (perpendicular to arch tangent).
 * Returns the local cross-section coordinates (x: bucco-lingual offset in mm, y: depth from alveolar crest in mm),
 * or null if the nerve curve does not intersect or pass near this slice.
 */
export function project3DNerveToCrossSection(
	nerve3D: readonly Point3D[],
	sliceCenterMm: Point3D,
	normal2D: { readonly x: number; readonly y: number },
	tangent2D: { readonly x: number; readonly y: number },
	sliceHeightMm = 34.0,
	topCrestMarginMm = 4.0,
	maxDistanceToSlicePlaneMm = 3.0,
): { readonly xOffsetMm: number; readonly yDepthMm: number; readonly distanceToPlaneMm: number } | null {
	if (!nerve3D || nerve3D.length < 2) return null;

	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const nx = nLen > 1e-6 ? normal2D.x / nLen : 0;
	const ny = nLen > 1e-6 ? normal2D.y / nLen : 1;

	const tLen = Math.hypot(tangent2D.x, tangent2D.y);
	const tx = tLen > 1e-6 ? tangent2D.x / tLen : -ny;
	const ty = tLen > 1e-6 ? tangent2D.y / tLen : nx;

	const crestZ = sliceCenterMm.z + (sliceHeightMm / 2.0 - topCrestMarginMm);

	let bestIntersection: { x: number; y: number; z: number } | null = null;
	let minPlaneDist = Infinity;

	for (let i = 0; i < nerve3D.length - 1; i++) {
		const p1 = nerve3D[i]!;
		const p2 = nerve3D[i + 1]!;

		// Out-of-plane signed distance along the arch tangent
		const d1 = (p1.x - sliceCenterMm.x) * tx + (p1.y - sliceCenterMm.y) * ty;
		const d2 = (p2.x - sliceCenterMm.x) * tx + (p2.y - sliceCenterMm.y) * ty;

		if (d1 * d2 <= 0 && Math.abs(d2 - d1) > 1e-6) {
			// Segment straddles or touches slice plane
			const t = Math.max(0, Math.min(1, -d1 / (d2 - d1)));
			const interX = p1.x + t * (p2.x - p1.x);
			const interY = p1.y + t * (p2.y - p1.y);
			const interZ = p1.z + t * (p2.z - p1.z);
			bestIntersection = { x: interX, y: interY, z: interZ };
			minPlaneDist = 0;
			break;
		}

		const absD1 = Math.abs(d1);
		if (absD1 < minPlaneDist) {
			minPlaneDist = absD1;
			bestIntersection = { x: p1.x, y: p1.y, z: p1.z };
		}
	}

	if (!bestIntersection || minPlaneDist > maxDistanceToSlicePlaneMm) {
		return null;
	}

	// Calculate in-slice horizontal bucco-lingual offset (along normal2D)
	const xOffsetMm = (bestIntersection.x - sliceCenterMm.x) * nx + (bestIntersection.y - sliceCenterMm.y) * ny;
	// Calculate in-slice vertical depth from alveolar crest (cranial-to-caudal downwards)
	const yDepthMm = crestZ - bestIntersection.z;

	return {
		xOffsetMm: Number(xOffsetMm.toFixed(2)),
		yDepthMm: Number(yDepthMm.toFixed(2)),
		distanceToPlaneMm: Number(minPlaneDist.toFixed(2)),
	};
}

