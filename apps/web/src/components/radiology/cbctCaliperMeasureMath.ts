/**
 * CBCT / Panoramic 3D MPR Caliper Measurements, Rulers & Angles Engine
 *
 * Clinical domain:
 * 1. Electronic Caliper (Штангенциркуль альвеолярного гребня)
 * 2. 2D / 3D Angles (Cobb angle, implant axis angulation)
 * 3. Rulers, Probes, and Hit Testing for CAD manipulation
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 */

export const MIN_IMPLANT_BONE_WIDTH_MM = 6.0;
export const MIN_IMPLANT_BONE_HEIGHT_MM = 10.0;

export interface Point2D {
	x: number; // 0..100 (%) or pixel/world coordinate
	y: number;
}

export interface Point3D {
	x: number;
	y: number;
	z: number;
}


/**
 * Измерение альвеолярного гребня электронным штангенциркулем
 */
export interface AlveolarRidgeCaliperMeasurement {
	id: string;
	fdiTooth?: string | null | undefined;
	label: string;
	// Координаты в % (0..100) относительно изображения или в мм
	crestPoint: Point2D; // Вершина альвеолярного гребня
	basePoint: Point2D; // Базальное основание / дно пазухи / крыша канала
	crestWidthLeft?: Point2D | undefined; // Левая граница ширины по гребню
	crestWidthRight?: Point2D | undefined; // Правая граница ширины по гребню
	// Рассчитанные клинические параметры в миллиметрах
	heightMm: number; // Высота гребня
	crestWidthMm: number; // Ширина по вершине гребня (Crestal width, 1-2 мм от вершины)
	midWidthMm: number; // Ширина на середине высоты (Mid-body width, ~5 мм)
	baseWidthMm: number; // Базальная ширина (~10 мм)
	// Оценка пригодности к имплантации
	implantFeasibility: {
		isAdequate: boolean;
		recommendedDiameterMm: number;
		recommendedLengthMm: number;
		requiresBoneGrafting: boolean;
		graftingType?: "sinus_lift" | "gbr_horizontal" | "ridge_split" | "none" | undefined;
		clinicalAdviceRu: string;
	};
}

/**
 * Трассировка нижнечелюстного канала (Nervus alveolaris inferior)
 */

export function calculatePhysicalDistanceMm(
	p1: Point2D,
	p2: Point2D,
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): number {
	const dxPx = ((p2.x - p1.x) / 100) * imageWidthPx;
	const dyPx = ((p2.y - p1.y) / 100) * imageHeightPx;
	const distPx = Math.hypot(dxPx, dyPx);
	return Number((distPx * pixelSpacingMm).toFixed(2));
}

/**
 * Calculates Euclidean physical 3D distance between two spatial points in millimeters.
 */
export function calculatePhysicalDistance3DMm(
	p1: Point3D,
	p2: Point3D,
): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const dz = p2.z - p1.z;
	return Number(Math.hypot(dx, dy, dz).toFixed(2));
}

/**
 * Оценка анатомической пригодности альвеолярного гребня для дентальной имплантации
 */
export function evaluateAlveolarRidgeFeasibility(
	heightMm: number,
	crestWidthMm: number,
	midWidthMm?: number,
): AlveolarRidgeCaliperMeasurement["implantFeasibility"] {
	const effectiveMidWidth = midWidthMm ?? crestWidthMm * 1.15;
	const safeHeight = Math.max(0, heightMm);
	const safeWidth = Math.max(0, crestWidthMm);

	let isAdequate = false;
	let recommendedDiameterMm = 0;
	let recommendedLengthMm = 0;
	let requiresBoneGrafting = false;
	let graftingType: "sinus_lift" | "gbr_horizontal" | "ridge_split" | "none" = "none";
	let clinicalAdviceRu = "";

	if (safeHeight >= 10.0 && safeWidth >= 7.0) {
		isAdequate = true;
		recommendedDiameterMm = safeWidth >= 8.0 ? 4.5 : 4.0;
		recommendedLengthMm = safeHeight >= 12.0 ? 11.5 : 10.0;
		requiresBoneGrafting = false;
		graftingType = "none";
		clinicalAdviceRu = `Объем кости достаточен для классической имплантации (Ø${recommendedDiameterMm}x${recommendedLengthMm} мм). Первичная стабильность оптимальная.`;
	} else if (safeHeight >= 10.0 && safeWidth >= 5.0 && safeWidth < 7.0) {
		isAdequate = true;
		recommendedDiameterMm = 3.5;
		recommendedLengthMm = safeHeight >= 11.5 ? 10.0 : 8.5;
		requiresBoneGrafting = safeWidth < 5.8;
		graftingType = safeWidth < 5.8 ? "gbr_horizontal" : "none";
		clinicalAdviceRu = safeWidth < 5.8
			? "Узкий альвеолярный гребень: показана одновременная НКР (GBR) с костнозамещающим материалом и мембраной."
			: `Допустима установка узкого имплантата Ø${recommendedDiameterMm} мм без костной пластики.`;
	} else if (safeHeight < 8.0 && safeWidth >= 6.5) {
		isAdequate = false;
		recommendedDiameterMm = 4.0;
		recommendedLengthMm = 8.0;
		requiresBoneGrafting = true;
		graftingType = "sinus_lift";
		clinicalAdviceRu = `Дефицит вертикальной высоты (${safeHeight.toFixed(1)} мм < 8.0 мм): требуется открытый/закрытый синус-лифтинг или вертикальная аугментация.`;
	} else if (safeWidth < 5.0 && safeHeight >= 8.0) {
		isAdequate = false;
		recommendedDiameterMm = 3.5;
		recommendedLengthMm = 10.0;
		requiresBoneGrafting = true;
		graftingType = "ridge_split";
		clinicalAdviceRu = `Выраженная горизонтальная резорбция (${safeWidth.toFixed(1)} мм): показано расщепление альвеолярного гребня (Ridge Split) или сэндвич-пластика.`;
	} else {
		isAdequate = false;
		recommendedDiameterMm = 3.5;
		recommendedLengthMm = 8.0;
		requiresBoneGrafting = true;
		graftingType = "gbr_horizontal";
		clinicalAdviceRu = `Комбинированный дефицит кости (H=${safeHeight.toFixed(1)} мм, W=${safeWidth.toFixed(1)} мм): требуется предварительная 3D-реконструкция костной ткани.`;
	}

	return {
		isAdequate,
		recommendedDiameterMm,
		recommendedLengthMm,
		requiresBoneGrafting,
		graftingType,
		clinicalAdviceRu,
	};
}

/**
 * Полный расчет параметров альвеолярного гребня по точкам электронного штангенциркуля
 */
export function calculateCaliperRidgeDimensions(params: {
	id?: string;
	crestPoint: Point2D;
	basePoint: Point2D;
	crestWidthLeft?: Point2D;
	crestWidthRight?: Point2D;
	imageWidthPx?: number;
	imageHeightPx?: number;
	pixelSpacingMm?: number;
	fdiTooth?: string | null;
	label?: string;
}): AlveolarRidgeCaliperMeasurement {
	const imageWidthPx = params.imageWidthPx ?? 1000;
	const imageHeightPx = params.imageHeightPx ?? 1000;
	const pixelSpacingMm = params.pixelSpacingMm ?? 0.1;

	// 1. Высота гребня
	const heightMm = calculatePhysicalDistanceMm(
		params.crestPoint,
		params.basePoint,
		imageWidthPx,
		imageHeightPx,
		pixelSpacingMm,
	);

	// 2. Ширина по гребню
	let crestWidthMm = 7.0; // Значение по умолчанию, если ширина не задана явно
	if (params.crestWidthLeft && params.crestWidthRight) {
		crestWidthMm = calculatePhysicalDistanceMm(
			params.crestWidthLeft,
			params.crestWidthRight,
			imageWidthPx,
			imageHeightPx,
			pixelSpacingMm,
		);
	}

	const midWidthMm = Number((crestWidthMm * 1.18).toFixed(2));
	const baseWidthMm = Number((crestWidthMm * 1.35).toFixed(2));

	const feasibility = evaluateAlveolarRidgeFeasibility(heightMm, crestWidthMm, midWidthMm);

	return {
		id: params.id || `caliper-${Date.now()}-${Math.abs(Math.round(heightMm * 10 + crestWidthMm * 10)).toString(36)}`,
		fdiTooth: params.fdiTooth ?? null,
		label: params.label || (params.fdiTooth ? `Штангенциркуль (Зуб ${params.fdiTooth})` : "Замер альвеолярного гребня"),
		crestPoint: params.crestPoint,
		basePoint: params.basePoint,
		crestWidthLeft: params.crestWidthLeft,
		crestWidthRight: params.crestWidthRight,
		heightMm,
		crestWidthMm,
		midWidthMm,
		baseWidthMm,
		implantFeasibility: feasibility,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANDIBULAR CANAL NERVE TRACER & SAFETY CORRIDOR (2.0 MM BUFFER)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сглаживание траектории нерва методом Catmull-Rom сплайн-интерполяции (2D)
 */

export interface CbctAngleMeasurement {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly startMm: Point3D; // Опорная точка плеча 1
	readonly vertexMm: Point3D; // Вершина угла (угловая точка)
	readonly endMm: Point3D; // Опорная точка плеча 2
	readonly angleDeg: number; // Рассчитанный угол в градусах θ ∈ [0°, 180°]
}

/**
 * Расчет угла в градусах θ ∈ [0°, 180°] по трем 2D-точкам (плечо 1 -> вершина -> плечо 2)
 */
export function calculateAngleBetween3Points2D(
	p1: Point2D,
	vertex: Point2D,
	p2: Point2D,
): number {
	const v1x = p1.x - vertex.x;
	const v1y = p1.y - vertex.y;
	const v2x = p2.x - vertex.x;
	const v2y = p2.y - vertex.y;

	const len1 = Math.hypot(v1x, v1y);
	const len2 = Math.hypot(v2x, v2y);

	if (len1 === 0 || len2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	const angleRad = Math.acos(cosTheta);
	const angleDeg = (angleRad * 180) / Math.PI;

	return Number(angleDeg.toFixed(1));
}

/**
 * Расчет угла в градусах θ ∈ [0°, 180°] по трем 3D-точкам в физических миллиметрах
 */
export function calculateAngleBetween3Points3D(
	p1: Point3D,
	vertex: Point3D,
	p2: Point3D,
): number {
	const v1x = p1.x - vertex.x;
	const v1y = p1.y - vertex.y;
	const v1z = p1.z - vertex.z;

	const v2x = p2.x - vertex.x;
	const v2y = p2.y - vertex.y;
	const v2z = p2.z - vertex.z;

	const len1 = Math.hypot(v1x, v1y, v1z);
	const len2 = Math.hypot(v2x, v2y, v2z);

	if (len1 === 0 || len2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y + v1z * v2z;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	const angleRad = Math.acos(cosTheta);
	const angleDeg = (angleRad * 180) / Math.PI;

	return Number(angleDeg.toFixed(1));
}

/**
 * Результат проверки попадания курсора в опорную точку (handle) измерения
 */
export interface MeasurementHandleHit {
	readonly type: "ruler" | "angle";
	readonly id: string;
	readonly handleIndex: number; // ruler: 0 (start) | 1 (end); angle: 0 (start) | 1 (vertex) | 2 (end)
	readonly plane: string;
	readonly distancePx: number;
}

/**
 * Интерактивный CAD Hit-testing для перемещения (drag-and-drop) опорных точек линеек и угломеров.
 * hitRadiusPx = 12 обеспечивает невидимый хитбокс захвата мыши 24x24px (Hit-Area).
 */
export function hitTestMeasurementHandle(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
	}[],
	angles: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly vertexPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
	}[],
	hitRadiusPx = 12,
): MeasurementHandleHit | null {
	let closestHit: MeasurementHandleHit | null = null;
	let minDistance = hitRadiusPx;

	// 1. Check Ruler handles (0 = start, 1 = end)
	for (const r of rulers) {
		const dStart = Math.hypot(pointerPx.x - r.startPx.x, pointerPx.y - r.startPx.y);
		if (dStart <= minDistance) {
			minDistance = dStart;
			closestHit = {
				type: "ruler",
				id: r.id,
				handleIndex: 0,
				plane: r.plane,
				distancePx: Number(dStart.toFixed(1)),
			};
		}
		const dEnd = Math.hypot(pointerPx.x - r.endPx.x, pointerPx.y - r.endPx.y);
		if (dEnd <= minDistance) {
			minDistance = dEnd;
			closestHit = {
				type: "ruler",
				id: r.id,
				handleIndex: 1,
				plane: r.plane,
				distancePx: Number(dEnd.toFixed(1)),
			};
		}
	}

	// 2. Check Angle handles (0 = start/arm1, 1 = vertex, 2 = end/arm2)
	for (const a of angles) {
		const dStart = Math.hypot(pointerPx.x - a.startPx.x, pointerPx.y - a.startPx.y);
		if (dStart <= minDistance) {
			minDistance = dStart;
			closestHit = {
				type: "angle",
				id: a.id,
				handleIndex: 0,
				plane: a.plane,
				distancePx: Number(dStart.toFixed(1)),
			};
		}
		const dVertex = Math.hypot(pointerPx.x - a.vertexPx.x, pointerPx.y - a.vertexPx.y);
		if (dVertex <= minDistance) {
			minDistance = dVertex;
			closestHit = {
				type: "angle",
				id: a.id,
				handleIndex: 1,
				plane: a.plane,
				distancePx: Number(dVertex.toFixed(1)),
			};
		}
		const dEnd = Math.hypot(pointerPx.x - a.endPx.x, pointerPx.y - a.endPx.y);
		if (dEnd <= minDistance) {
			minDistance = dEnd;
			closestHit = {
				type: "angle",
				id: a.id,
				handleIndex: 2,
				plane: a.plane,
				distancePx: Number(dEnd.toFixed(1)),
			};
		}
	}

	return closestHit;
}

/**
 * Результат проверки клика на тело измерения (линейку, угломер, пробник) или кнопку быстрого удаления
 */
export interface MeasurementObjectHit {
	readonly type: "ruler" | "angle" | "probe";
	readonly id: string;
	readonly plane: string;
	readonly isDeleteButtonHit: boolean;
	readonly distancePx: number;
}

/**
 * Интерактивный CAD Hit-testing для выбора (selection) или быстрого удаления (1-click delete) объектов измерений
 */
export function hitTestMeasurementObject(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number };
	}[],
	angles: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly vertexPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number };
	}[],
	probes: readonly {
		readonly id: string;
		readonly plane: string;
		readonly posPx: { readonly x: number; readonly y: number };
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number };
	}[] = [],
	lineHitTolerancePx = 10,
): MeasurementObjectHit | null {
	let closestHit: MeasurementObjectHit | null = null;
	let minDistance = lineHitTolerancePx;

	// Helper for point to segment distance in 2D pixels
	const distPointToSegPx = (
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

	// 1. Check Rulers (Badge, Delete Button, or Line Body)
	for (const r of rulers) {
		const midX = (r.startPx.x + r.endPx.x) / 2;
		const midY = (r.startPx.y + r.endPx.y) / 2;
		const badgeW = r.badgePx?.width ?? 64;
		const badgeH = r.badgePx?.height ?? 18;
		const badgeX = r.badgePx?.x ?? midX;
		const badgeY = r.badgePx?.y ?? midY;

		// Hitbox check for fast delete [×] trigger with 44x44 px hitbox for medical gloved touch (DEF-R2-06 / DEF-18.1)
		const deleteTargetX = badgeX + badgeW / 2 - 14;
		const deleteTargetY = badgeY;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		// Check if click is on badge
		const isInsideBadge =
			Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 &&
			Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;

		if (isDeleteHitbox || isInsideBadge) {
			const isDeleteHit =
				isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28;
			return {
				type: "ruler",
				id: r.id,
				plane: r.plane,
				isDeleteButtonHit: isDeleteHit,
				distancePx: 0,
			};
		}

		const dLine = distPointToSegPx(pointerPx, r.startPx, r.endPx);
		if (dLine <= minDistance) {
			minDistance = dLine;
			closestHit = {
				type: "ruler",
				id: r.id,
				plane: r.plane,
				isDeleteButtonHit: false,
				distancePx: Number(dLine.toFixed(1)),
			};
		}
	}

	// 2. Check Angles (Arms or Badge)
	for (const a of angles) {
		let badgeX = a.vertexPx.x;
		let badgeY = a.vertexPx.y;
		let badgeW = a.badgePx?.width ?? 60;
		let badgeH = a.badgePx?.height ?? 22;

		if (a.badgePx) {
			badgeX = a.badgePx.x;
			badgeY = a.badgePx.y;
		} else {
			const dx1 = a.startPx.x - a.vertexPx.x;
			const dy1 = a.startPx.y - a.vertexPx.y;
			const dx2 = a.endPx.x - a.vertexPx.x;
			const dy2 = a.endPx.y - a.vertexPx.y;
			const len1 = Math.hypot(dx1, dy1);
			const len2 = Math.hypot(dx2, dy2);
			if (len1 >= 5 && len2 >= 5) {
				const angle1 = Math.atan2(dy1, dx1);
				const angle2 = Math.atan2(dy2, dx2);
				let diff = angle2 - angle1;
				while (diff > Math.PI) diff -= Math.PI * 2;
				while (diff < -Math.PI) diff += Math.PI * 2;
				const bisectorAngle = angle1 + diff / 2;
				const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
				badgeX = a.vertexPx.x + Math.cos(bisectorAngle) * badgeDist;
				badgeY = a.vertexPx.y + Math.sin(bisectorAngle) * badgeDist;
			} else if (len1 >= 5) {
				badgeX = (a.vertexPx.x + a.startPx.x) / 2;
				badgeY = (a.vertexPx.y + a.startPx.y) / 2 - 12;
			} else {
				badgeY -= 16;
			}
		}

		// Hitbox check for fast delete [×] trigger with 44x44 px hitbox for medical gloved touch (DEF-R2-06 / DEF-18.1)
		const deleteTargetX = badgeX + badgeW / 2 - 14;
		const deleteTargetY = badgeY;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		const isInsideBadge =
			Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 &&
			Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;

		if (isDeleteHitbox || isInsideBadge) {
			const isDeleteHit =
				isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28;
			return {
				type: "angle",
				id: a.id,
				plane: a.plane,
				isDeleteButtonHit: isDeleteHit,
				distancePx: 0,
			};
		}

		const dArm1 = distPointToSegPx(pointerPx, a.vertexPx, a.startPx);
		const dArm2 = distPointToSegPx(pointerPx, a.vertexPx, a.endPx);
		const minArmDist = Math.min(dArm1, dArm2);

		if (minArmDist <= minDistance) {
			minDistance = minArmDist;
			closestHit = {
				type: "angle",
				id: a.id,
				plane: a.plane,
				isDeleteButtonHit: false,
				distancePx: Number(minArmDist.toFixed(1)),
			};
		}
	}

	// 3. Check Probes
	for (const p of probes) {
		const badgeW = p.badgePx?.width ?? 80;
		const badgeH = p.badgePx?.height ?? 22;
		const badgeX = p.badgePx?.x ?? (p.posPx.x + 10);
		const badgeY = p.badgePx?.y ?? (p.posPx.y - 22);
		const deleteTargetX = badgeX + badgeW - 14;
		const deleteTargetY = badgeY + badgeH / 2;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		const dProbe = Math.hypot(pointerPx.x - p.posPx.x, pointerPx.y - p.posPx.y);
		if (isDeleteHitbox) {
			return {
				type: "probe",
				id: p.id,
				plane: p.plane,
				isDeleteButtonHit: true,
				distancePx: 0,
			};
		}
		if (dProbe <= minDistance + 4) {
			minDistance = dProbe;
			closestHit = {
				type: "probe",
				id: p.id,
				plane: p.plane,
				isDeleteButtonHit: false,
				distancePx: Number(dProbe.toFixed(1)),
			};
		}
	}

	return closestHit;
}

/**
 * Draws visual 22px circular delete [×] button badge on measurement overlays (DEF-03 / DEF-18.1 / DEF-R2-06).
 * Visual: round badge radius 11px (diameter 22px), background rgba(239, 68, 68, 0.35)
 * with border #ef4444 (1.5px) and crisp white cross in center (12px bold).
 * Retains 44x44px invisible touch-friendly hit-test area.
 */
export function drawMeasurementDeleteButton(
	ctx: CanvasRenderingContext2D,
	centerX: number,
	centerY: number,
	radius = 11,
): void {
	ctx.save();
	ctx.shadowBlur = 0;
	// Round badge background
	ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
	ctx.strokeStyle = "#ef4444";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// Crisp white cross in the center
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 12px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("×", centerX, centerY);
	ctx.restore();
}

export const drawCaliperDeleteButton = drawMeasurementDeleteButton;

/**
 * Standard crisp high-contrast overlay pad background & border tokens (The Hammer V 8.0: Rendering Brutality)
 * Guarantees WCAG AAA contrast (>= 7:1) over hyperdense white cortical bone and enamel.
 */
export const CRISP_OVERLAY_PAD_BG = "rgba(15, 23, 42, 0.92)";
export const CRISP_OVERLAY_BORDER_GOLD = "#f59e0b";
export const CRISP_OVERLAY_BORDER_CYAN = "#06b6d4";
export const CRISP_OVERLAY_BORDER_BLUE = "#0284c7";


/**
 * Измерение линейкой (Caliper Ruler) в физических миллиметрах
 */
export interface CbctMeasurementRuler {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly startMm: Point3D;
	readonly endMm: Point3D;
	readonly distanceMm: number;
	readonly fdiTooth?: string | null | undefined;
	readonly label?: string | undefined;
}

/**
 * Точечный маркер замера плотности HU (Probe Marker)
 */
export interface CbctProbeMarker {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly worldMm: Point3D;
	readonly hu: number;
	readonly tissueName: string;
	readonly mischClass?: string | undefined;
}

/**
 * Данные для рендеринга HTML/CSS оверлея бейджа линейки
 */
export interface RulerHtmlOverlayData {
	readonly id: string;
	readonly plane: string;
	readonly text: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly distanceMm: number;
	readonly isSelected: boolean;
}

/**
 * Данные для рендеринга HTML/CSS оверлея бейджа угла
 */
export interface AngleHtmlOverlayData {
	readonly id: string;
	readonly plane: string;
	readonly text: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly angleDeg: number;
	readonly isSelected: boolean;
}

/**
 * Данные для рендеринга HTML/CSS оверлея бейджа плотности HU
 */
export interface ProbeHtmlOverlayData {
	readonly id: string;
	readonly plane: string;
	readonly text: string;
	readonly tooltip: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly hu: number;
	readonly tissueName: string;
	readonly isSelected: boolean;
}

/**
 * Форматирование текста длины линейки (мм)
 */
export function formatRulerBadgeText(distanceMm: number): string {
	return `${distanceMm.toFixed(1)} мм`;
}

/**
 * Форматирование текста угла (градусы)
 */
export function formatAngleBadgeText(angleDeg: number): string {
	return `${angleDeg.toFixed(1)}°`;
}

/**
 * Форматирование текста плотности HU
 */
export function formatProbeBadgeText(hu: number, tissueName?: string): string {
	return tissueName ? `${hu} HU · ${tissueName}` : `${hu} HU`;
}

/**
 * Расчет экранных координат плавающего DOM-бейджа угла по биссектрисе
 */
export function calculateAngleBadgePosition(
	p1Screen: { readonly x: number; readonly y: number },
	vertexScreen: { readonly x: number; readonly y: number },
	p2Screen: { readonly x: number; readonly y: number },
): { x: number; y: number } {
	const dx1 = p1Screen.x - vertexScreen.x;
	const dy1 = p1Screen.y - vertexScreen.y;
	const dx2 = p2Screen.x - vertexScreen.x;
	const dy2 = p2Screen.y - vertexScreen.y;
	const len1 = Math.hypot(dx1, dy1);
	const len2 = Math.hypot(dx2, dy2);

	if (len1 >= 5 && len2 >= 5) {
		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);
		let diff = angle2 - angle1;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;
		const bisectorAngle = angle1 + diff / 2;
		const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
		return {
			x: Number((vertexScreen.x + Math.cos(bisectorAngle) * badgeDist).toFixed(1)),
			y: Number((vertexScreen.y + Math.sin(bisectorAngle) * badgeDist).toFixed(1)),
		};
	} else if (len1 >= 5) {
		return {
			x: Number(((vertexScreen.x + p1Screen.x) / 2).toFixed(1)),
			y: Number(((vertexScreen.y + p1Screen.y) / 2 - 14).toFixed(1)),
		};
	}
	return {
		x: vertexScreen.x,
		y: vertexScreen.y - 18,
	};
}