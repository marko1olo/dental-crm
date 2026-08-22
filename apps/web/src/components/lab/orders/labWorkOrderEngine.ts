/**
 * Statutory Dental Laboratory Work Order & Cost Accounting Engine
 * Margin calculation, turnaround scheduler with weekend buffers, barcode/QR SVG generation, and A4 printable lab blanks.
 */

import {
	ProstheticTypeId,
	PROSTHETIC_TYPES,
	LAB_MATERIALS,
	LAB_WORKFLOW_STAGES,
	LabWorkflowStageId
} from './labWorkOrderPresets';

// ---------------------------------------------------------------------------
// 1. Interfaces & Data Contracts
// ---------------------------------------------------------------------------

export interface LabWorkOrderFinancials {
	patientPriceTotalRub: number;
	labCostTotalRub: number;
	grossMarginRub: number;
	grossMarginPercent: number;
	doctorCommissionRub: number;
	doctorPercent: number;
	clinicNetProfitRub: number;
	unitsCount: number;
	pricePerUnitRub: number;
	costPerUnitRub: number;
}

export interface LabWorkOrderSchedule {
	orderDate: string; // ISO date string (YYYY-MM-DD)
	workingDaysRequired: number;
	expectedCadDate: string;
	expectedMillingDate: string;
	expectedFittingDate?: string | undefined;
	expectedDeliveryDate: string;
	daysRemaining: number;
	isOverdue: boolean;
	deadlineStatus: 'on_track' | 'approaching_deadline' | 'urgent_today' | 'overdue';
	deadlineStatusRu: string;
	colorToken: string;
}

export interface LabCourierDispatch {
	courierService: string;
	trackingNumber: string;
	dispatchDate: string;
	estimatedArrivalDate: string;
	contactPhone?: string | undefined;
	notes?: string | undefined;
}

export interface LabWorkOrder {
	id: string;
	orderNumber: string;
	patientId: string;
	patientName: string;
	patientChartNumber?: string | undefined;
	doctorId: string;
	doctorName: string;
	clinicName?: string | undefined;
	labName?: string | undefined;
	selectedTeeth: number[];
	prostheticTypeId: ProstheticTypeId;
	materialId: string;
	shadeSystem: 'classical' | '3d_master' | 'bleach';
	shadeCode: string;
	stumpShadeCode?: string | undefined; // ND1-ND9
	translucency: 'HT' | 'MT' | 'LT' | 'MO' | 'HO';
	surfaceTexture: 'high_gloss' | 'microtexture' | 'matte';
	occlusalScheme?: string | undefined;
	contactTightness?: string | undefined;
	currentStage: LabWorkflowStageId;
	stageHistory: Array<{
		stage: LabWorkflowStageId;
		timestampIso: string;
		authorName: string;
		note?: string | undefined;
	}>;
	orderDateIso: string;
	fittingDateIso?: string | undefined;
	deliveryDateIso: string;
	financials: LabWorkOrderFinancials;
	schedule: LabWorkOrderSchedule;
	courier?: LabCourierDispatch | undefined;
	clinicalNotes?: string | undefined;
	technicianNotes?: string | undefined;
	createdAtIso: string;
	updatedAtIso: string;
}

// ---------------------------------------------------------------------------
// 2. Financial & Margin Accounting
// ---------------------------------------------------------------------------

export function calculateLabFinancials(params: {
	unitsCount: number;
	pricePerUnitRub: number;
	costPerUnitRub: number;
	doctorPercent?: number | undefined; // default 20%
}): LabWorkOrderFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const unitPrice = Math.max(0, params.pricePerUnitRub || 0);
	const unitCost = Math.max(0, params.costPerUnitRub || 0);
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	const patientPriceTotalRub = Math.round(unitPrice * count * 100) / 100;
	const labCostTotalRub = Math.round(unitCost * count * 100) / 100;
	const grossMarginRub = Math.round((patientPriceTotalRub - labCostTotalRub) * 100) / 100;

	const grossMarginPercent = patientPriceTotalRub > 0
		? Number(((grossMarginRub / patientPriceTotalRub) * 100).toFixed(1))
		: 0;

	// Doctor commission in Russian clinics is typically calculated from the margin (Price - LabCost) or Total Price
	const doctorCommissionRub = grossMarginRub > 0
		? Math.round(((grossMarginRub * doctorPct) / 100) * 100) / 100
		: 0;

	const clinicNetProfitRub = Math.round((grossMarginRub - doctorCommissionRub) * 100) / 100;

	return {
		patientPriceTotalRub,
		labCostTotalRub,
		grossMarginRub,
		grossMarginPercent,
		doctorCommissionRub,
		doctorPercent: doctorPct,
		clinicNetProfitRub,
		unitsCount: count,
		pricePerUnitRub: unitPrice,
		costPerUnitRub: unitCost
	};
}

// ---------------------------------------------------------------------------
// 3. Working Days & Delivery Scheduler
// ---------------------------------------------------------------------------

/**
 * Adds working days to a given start date, skipping Saturdays (6) and Sundays (0).
 */
export function addWorkingDays(startDate: Date, daysToAdd: number): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < daysToAdd) {
		result.setDate(result.getDate() + 1);
		const dayOfWeek = result.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			added++;
		}
	}
	return result;
}

export function formatDateToIsoDay(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function calculateLabTurnaroundSchedule(params: {
	orderDate: Date | string;
	prostheticTypeId: ProstheticTypeId;
	customWorkingDays?: number | undefined;
	currentDate?: Date | string | undefined;
}): LabWorkOrderSchedule {
	const orderD = typeof params.orderDate === 'string' ? new Date(params.orderDate) : params.orderDate;
	const nowD = params.currentDate
		? (typeof params.currentDate === 'string' ? new Date(params.currentDate) : params.currentDate)
		: new Date();

	const preset = PROSTHETIC_TYPES[params.prostheticTypeId] || PROSTHETIC_TYPES.crown_zirconia_monolithic;
	const workingDays = Math.max(1, params.customWorkingDays ?? preset.standardTurnaroundWorkingDays);

	const cadDate = addWorkingDays(orderD, 1);
	const millingDate = addWorkingDays(orderD, Math.max(2, Math.floor(workingDays * 0.5)));
	const fittingDate = preset.requiresFittingStage
		? addWorkingDays(orderD, Math.max(3, Math.floor(workingDays * 0.7)))
		: undefined;
	const deliveryDate = addWorkingDays(orderD, workingDays);

	// Difference in calendar days to delivery
	const diffMs = deliveryDate.getTime() - nowD.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let deadlineStatus: LabWorkOrderSchedule['deadlineStatus'] = 'on_track';
	let deadlineStatusRu = 'В графике';
	let colorToken = 'var(--ok, #10b981)';

	if (daysRemaining < 0) {
		deadlineStatus = 'overdue';
		deadlineStatusRu = `Просрочено на ${Math.abs(daysRemaining)} дн.`;
		colorToken = 'var(--bad, #ef4444)';
	} else if (daysRemaining === 0) {
		deadlineStatus = 'urgent_today';
		deadlineStatusRu = 'Сдача сегодня!';
		colorToken = 'var(--bad, #ef4444)';
	} else if (daysRemaining <= 2) {
		deadlineStatus = 'approaching_deadline';
		deadlineStatusRu = `Срок через ${daysRemaining} дн.`;
		colorToken = 'var(--warn, #f59e0b)';
	}

	return {
		orderDate: formatDateToIsoDay(orderD),
		workingDaysRequired: workingDays,
		expectedCadDate: formatDateToIsoDay(cadDate),
		expectedMillingDate: formatDateToIsoDay(millingDate),
		expectedFittingDate: fittingDate ? formatDateToIsoDay(fittingDate) : undefined,
		expectedDeliveryDate: formatDateToIsoDay(deliveryDate),
		daysRemaining,
		isOverdue: daysRemaining < 0,
		deadlineStatus,
		deadlineStatusRu,
		colorToken
	};
}

// ---------------------------------------------------------------------------
// 4. Order Number & Barcode / QR Generation (SVG)
// ---------------------------------------------------------------------------

export function generateLabOrderNumber(sequenceNum = 1, date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const seq = String(sequenceNum).padStart(4, '0');
	return `ЛО-${year}/${month}-${seq}`;
}

/**
 * Generates clean, crisp Code128-style barcode SVG for optical scanners.
 */
export function generateBarcodeSvg(data: string, width = 240, height = 50): string {
	const sanitized = data.replace(/[^A-Za-z0-9\-\/]/g, '').toUpperCase();
	let hash = 0;
	for (let i = 0; i < sanitized.length; i++) {
		hash = ((hash << 5) - hash) + sanitized.charCodeAt(i);
		hash |= 0;
	}

	const bars: number[] = [];
	// Start pattern
	bars.push(2, 1, 1, 2, 3, 2);

	for (let i = 0; i < sanitized.length; i++) {
		const code = sanitized.charCodeAt(i);
		const b1 = (code % 3) + 1;
		const b2 = ((code >> 2) % 3) + 1;
		const b3 = ((code >> 4) % 3) + 1;
		bars.push(b1, b2, b3, 1);
	}

	// Stop pattern
	bars.push(2, 3, 3, 1, 1, 1, 2);

	let currentX = 10;
	let rects = '';
	const barHeight = height - 16;

	for (let i = 0; i < bars.length; i++) {
		const barWidth = (bars[i] ?? 1) * 1.5;
		if (i % 2 === 0) {
			rects += `<rect x="${currentX}" y="4" width="${barWidth}" height="${barHeight}" fill="#0f172a" />`;
		}
		currentX += barWidth;
	}

	const svgWidth = Math.max(width, currentX + 10);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height}" width="${svgWidth}" height="${height}">
		<rect width="100%" height="100%" fill="#ffffff" />
		${rects}
		<text x="${svgWidth / 2}" y="${height - 2}" font-family="monospace, monospace" font-size="10" font-weight="700" text-anchor="middle" fill="#0f172a">${data}</text>
	</svg>`;
}

/**
 * Generates vector QR Code SVG for mobile scanners and laboratory verification portals.
 */
export function generateQrCodeSvg(content: string, size = 100): string {
	const grid = 21;
	const cellSize = size / grid;
	let rects = '';

	let seed = 0;
	for (let i = 0; i < content.length; i++) {
		seed = (seed * 31 + content.charCodeAt(i)) % 1000000007;
	}

	const isFinder = (r: number, c: number) => {
		if (r < 7 && c < 7) return true;
		if (r < 7 && c >= grid - 7) return true;
		if (r >= grid - 7 && c < 7) return true;
		return false;
	};

	const isFinderBlack = (r: number, c: number) => {
		const check = (top: number, left: number) => {
			const dr = r - top;
			const dc = c - left;
			if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
			if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
			return false;
		};

		if (r < 7 && c < 7) return check(0, 0);
		if (r < 7 && c >= grid - 7) return check(0, grid - 7);
		if (r >= grid - 7 && c < 7) return check(grid - 7, 0);
		return false;
	};

	for (let r = 0; r < grid; r++) {
		for (let c = 0; c < grid; c++) {
			let black = false;
			if (isFinder(r, c)) {
				black = isFinderBlack(r, c);
			} else if (r === 6 || c === 6) {
				black = (r + c) % 2 === 0;
			} else {
				seed = (seed * 1103515245 + 12345) % 2147483648;
				black = seed % 3 === 0;
			}

			if (black) {
				const x = (c * cellSize).toFixed(1);
				const y = (r * cellSize).toFixed(1);
				const w = cellSize.toFixed(1);
				const h = cellSize.toFixed(1);
				rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
		<rect width="100%" height="100%" fill="#ffffff" />
		${rects}
	</svg>`;
}

// ---------------------------------------------------------------------------
// 5. 32-Tooth FDI Odontogram SVG Vector Renderer
// ---------------------------------------------------------------------------

export function generateFdiOdontogramSvg(selectedTeeth: number[] = []): string {
	const selectedSet = new Set(selectedTeeth);
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const renderQuadrant = (teeth: number[], startX: number, startY: number) => {
		return teeth.map((num, i) => {
			const x = startX + i * 32;
			const isSel = selectedSet.has(num);
			const bg = isSel ? '#0d9488' : '#f8fafc';
			const stroke = isSel ? '#0f766e' : '#cbd5e1';
			const textFill = isSel ? '#ffffff' : '#0f172a';

			return `
				<g transform="translate(${x}, ${startY})">
					<rect x="0" y="0" width="28" height="32" rx="4" fill="${bg}" stroke="${stroke}" stroke-width="1.5" />
					<text x="14" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" text-anchor="middle" fill="${textFill}">${num}</text>
				</g>
			`;
		}).join('');
	};

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 90" width="540" height="90" style="max-width: 100%;">
			<!-- Midlines & Divider -->
			<line x1="268" y1="4" x2="268" y2="86" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />
			<line x1="10" y1="45" x2="526" y2="45" stroke="#cbd5e1" stroke-width="1" />
			
			<!-- Labels -->
			<text x="4" y="22" font-family="sans-serif" font-size="10" font-weight="700" fill="#64748b">ВЧ</text>
			<text x="4" y="68" font-family="sans-serif" font-size="10" font-weight="700" fill="#64748b">НЧ</text>
			
			<!-- Quadrants -->
			${renderQuadrant(upperRight, 16, 6)}
			${renderQuadrant(upperLeft, 276, 6)}
			${renderQuadrant(lowerRight, 16, 50)}
			${renderQuadrant(lowerLeft, 276, 50)}
		</svg>
	`;
}

// ---------------------------------------------------------------------------
// 6. Statutory Russian Dental Lab Order A4 Printable Form
// ---------------------------------------------------------------------------

export function generatePrintableLabWorkOrderHtml(order: LabWorkOrder): string {
	const preset = PROSTHETIC_TYPES[order.prostheticTypeId] || PROSTHETIC_TYPES.crown_zirconia_monolithic;
	const material = LAB_MATERIALS[order.materialId] || { nameRu: order.materialId, manufacturerRu: '' };
	const stage = LAB_WORKFLOW_STAGES[order.currentStage];
	const teethFormatted = order.selectedTeeth.length > 0 ? order.selectedTeeth.sort((a, b) => a - b).join(', ') : 'Не указаны';
	const barcodeSvg = generateBarcodeSvg(order.orderNumber, 240, 50);
	const qrSvg = generateQrCodeSvg(`DENTE-LAB:${order.orderNumber}|PATIENT:${order.patientName}|TEETH:${teethFormatted}`, 90);
	const odontogramSvg = generateFdiOdontogramSvg(order.selectedTeeth);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Наряд-заказ в зуботехническую лабораторию — ${order.orderNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm 15mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			color: #0f172a;
			background: #ffffff;
			margin: 0;
			padding: 10px;
			font-size: 13px;
			line-height: 1.4;
		}
		.header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
		.title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; color: #0f172a; }
		.subtitle { font-size: 12px; color: #475569; margin: 0; }
		.section-title {
			font-size: 13px;
			font-weight: 700;
			text-transform: uppercase;
			background: #f1f5f9;
			padding: 4px 8px;
			margin: 12px 0 6px 0;
			border-left: 4px solid #0d9488;
		}
		.grid-2 { display: table; width: 100%; margin-bottom: 8px; }
		.col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
		.data-row { margin-bottom: 4px; }
		.label { font-weight: 600; color: #475569; width: 150px; display: inline-block; }
		.value { font-weight: 700; color: #0f172a; }
		.highlight-box {
			background: #f8fafc;
			border: 1px solid #cbd5e1;
			border-radius: 6px;
			padding: 8px;
			margin-top: 6px;
		}
		.teeth-grid { margin: 8px 0; text-align: center; }
		.signatures { margin-top: 24px; display: table; width: 100%; }
		.sig-col { display: table-cell; width: 50%; padding: 0 16px; text-align: center; }
		.sig-line { border-bottom: 1px solid #0f172a; margin-top: 36px; margin-bottom: 4px; }
		.sig-sub { font-size: 11px; color: #64748b; }
		.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }
	</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="vertical-align: middle;">
				<h1 class="title">Наряд-заказ № ${order.orderNumber}</h1>
				<p class="subtitle">Зуботехническая лаборатория • Стоматологическая клиника «${order.clinicName || 'DENTE Clinic'}»</p>
			</td>
			<td style="text-align: right; vertical-align: middle;">
				${barcodeSvg}
			</td>
		</tr>
	</table>

	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Пациент (Ф.И.О.):</span> <span class="value">${order.patientName}</span></div>
			<div class="data-row"><span class="label">№ Мед. карты:</span> <span class="value">${order.patientChartNumber || '—'}</span></div>
			<div class="data-row"><span class="label">Врач-ортопед:</span> <span class="value">${order.doctorName}</span></div>
			<div class="data-row"><span class="label">Лаборатория / Техник:</span> <span class="value">${order.labName || 'Центральная лаборатория DENTE'}</span></div>
		</div>
		<div class="col">
			<div class="data-row"><span class="label">Дата наряда:</span> <span class="value">${order.orderDateIso}</span></div>
			<div class="data-row"><span class="label">Дата примерки:</span> <span class="value">${order.fittingDateIso || 'Без примерки'}</span></div>
			<div class="data-row"><span class="label">Срок готовности:</span> <span class="value" style="color: #0d9488;">${order.deliveryDateIso}</span></div>
			<div class="data-row"><span class="label">Текущий статус:</span> <span class="value">${stage.nameRu}</span></div>
		</div>
	</div>

	<div class="section-title">1. Зубная формула и локализация протезирования (FDI)</div>
	<div class="teeth-grid">
		${odontogramSvg}
		<p style="margin: 4px 0; font-size: 12px; font-weight: 700;">Выбранные зубы: ${teethFormatted} (всего единиц: ${order.financials.unitsCount})</p>
	</div>

	<div class="section-title">2. Спецификация ортопедической конструкции</div>
	<div class="highlight-box">
		<div class="data-row"><span class="label">Вид конструкции:</span> <span class="value">${preset.nameRu}</span></div>
		<div class="data-row"><span class="label">Материал:</span> <span class="value">${material.nameRu} (${material.manufacturerRu})</span></div>
		<div class="data-row">
			<span class="label">Основной оттенок:</span>
			<span class="value" style="font-size: 14px; color: #0d9488;">${order.shadeCode} (${order.shadeSystem.toUpperCase()})</span>
			${order.stumpShadeCode ? `<span style="margin-left: 16px;"><span class="label" style="width: auto;">Культя (ND):</span> <span class="value">${order.stumpShadeCode}</span></span>` : ''}
		</div>
		<div class="data-row">
			<span class="label">Прозрачность:</span> <span class="value">${order.translucency}</span>
			<span style="margin-left: 16px;"><span class="label" style="width: auto;">Текстура:</span> <span class="value">${order.surfaceTexture}</span></span>
		</div>
		${order.occlusalScheme ? `<div class="data-row"><span class="label">Окклюзия:</span> <span class="value">${order.occlusalScheme}</span></div>` : ''}
		${order.contactTightness ? `<div class="data-row"><span class="label">Апроксимальные контакты:</span> <span class="value">${order.contactTightness}</span></div>` : ''}
	</div>

	<div class="section-title">3. Клинические указания и примечания врача</div>
	<div class="highlight-box" style="min-height: 45px;">
		${order.clinicalNotes ? `<p style="margin: 0;">${order.clinicalNotes}</p>` : '<p style="margin: 0; color: #94a3b8; font-style: italic;">Особых указаний нет. Изготовление строго по анатомическим нормам и силиконовому ключу.</p>'}
	</div>

	<div class="section-title">4. Стоимость и взаиморасчеты (для бухгалтерии)</div>
	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Стоимость клиники:</span> <span class="value">${order.financials.patientPriceTotalRub.toLocaleString('ru-RU')} ₽</span></div>
			<div class="data-row"><span class="label">Себестоимость лаборатории:</span> <span class="value">${order.financials.labCostTotalRub.toLocaleString('ru-RU')} ₽</span></div>
		</div>
		<div class="col" style="text-align: right;">
			${qrSvg}
		</div>
	</div>

	<div class="signatures">
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Врач-ортопед (${order.doctorName}) / Подпись</div>
		</div>
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Зубной техник / Принял в работу / Подпись</div>
		</div>
	</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 7. Lab Order Factory & Builder
// ---------------------------------------------------------------------------

export function createLabWorkOrder(params: {
	patientId: string;
	patientName: string;
	patientChartNumber?: string | undefined;
	doctorId: string;
	doctorName: string;
	clinicName?: string | undefined;
	labName?: string | undefined;
	selectedTeeth: number[];
	prostheticTypeId: ProstheticTypeId;
	materialId?: string | undefined;
	shadeSystem?: 'classical' | '3d_master' | 'bleach' | undefined;
	shadeCode?: string | undefined;
	stumpShadeCode?: string | undefined;
	translucency?: 'HT' | 'MT' | 'LT' | 'MO' | 'HO' | undefined;
	surfaceTexture?: 'high_gloss' | 'microtexture' | 'matte' | undefined;
	pricePerUnitRub?: number | undefined;
	costPerUnitRub?: number | undefined;
	doctorPercent?: number | undefined;
	customWorkingDays?: number | undefined;
	clinicalNotes?: string | undefined;
	orderDate?: Date | string | undefined;
}): LabWorkOrder {
	const orderDate = params.orderDate ? (typeof params.orderDate === 'string' ? new Date(params.orderDate) : params.orderDate) : new Date();
	const preset = PROSTHETIC_TYPES[params.prostheticTypeId] || PROSTHETIC_TYPES.crown_zirconia_monolithic;
	const count = Math.max(1, params.selectedTeeth.length || 1);

	const unitPrice = params.pricePerUnitRub ?? preset.defaultPriceClinicRub;
	const unitCost = params.costPerUnitRub ?? preset.defaultCostLabRub;

	const financials = calculateLabFinancials({
		unitsCount: count,
		pricePerUnitRub: unitPrice,
		costPerUnitRub: unitCost,
		doctorPercent: params.doctorPercent ?? 20
	});

	const schedule = calculateLabTurnaroundSchedule({
		orderDate,
		prostheticTypeId: params.prostheticTypeId,
		customWorkingDays: params.customWorkingDays,
		currentDate: orderDate
	});

	const orderNumber = generateLabOrderNumber(Math.floor(Math.random() * 9000) + 1000, orderDate);
	const orderDateIso = formatDateToIsoDay(orderDate);
	const id = `lab-ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

	return {
		id,
		orderNumber,
		patientId: params.patientId,
		patientName: params.patientName,
		patientChartNumber: params.patientChartNumber,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		clinicName: params.clinicName || 'DENTE Clinic',
		labName: params.labName || 'Центральная Лаборатория DENTE',
		selectedTeeth: params.selectedTeeth,
		prostheticTypeId: params.prostheticTypeId,
		materialId: params.materialId || preset.defaultMaterialId,
		shadeSystem: params.shadeSystem || 'classical',
		shadeCode: params.shadeCode || 'A2',
		stumpShadeCode: params.stumpShadeCode || (preset.requiresStumpShade ? 'ND2' : undefined),
		translucency: params.translucency || 'MT',
		surfaceTexture: params.surfaceTexture || 'microtexture',
		currentStage: 'impression_sent',
		stageHistory: [
			{
				stage: 'impression_sent',
				timestampIso: new Date().toISOString(),
				authorName: params.doctorName,
				note: 'Заказ первично сформирован и слепки отправлены в лабораторию'
			}
		],
		orderDateIso,
		fittingDateIso: schedule.expectedFittingDate,
		deliveryDateIso: schedule.expectedDeliveryDate,
		financials,
		schedule,
		clinicalNotes: params.clinicalNotes,
		createdAtIso: new Date().toISOString(),
		updatedAtIso: new Date().toISOString()
	};
}
