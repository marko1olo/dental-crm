/**
 * Statutory Dental Laboratory Work Order & Cost Accounting Engine
 * Margin calculation, turnaround scheduler with weekend buffers, barcode/QR SVG generation, and A4 printable lab blanks.
 */

import {
	ProstheticTypeId,
	PROSTHETIC_TYPES,
	LAB_MATERIALS,
	LAB_WORKFLOW_STAGES,
	LabWorkflowStageId,
	ImplantPlatformType,
	AbutmentCategoryType,
	ABUTMENT_TYPE_OPTIONS,
	FixationType,
	LabTechnologicalStageId,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER
} from './labWorkOrderPresets';
import { generateQrMatrix, generateQrCodeSvg as sharedGenerateQrCodeSvg } from '@dental/shared';
import { generateBarcodeSvg as canonicalCode128BarcodeSvg } from '../labMath';

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
	// Implant & Abutment Specifications
	implantPlatform?: ImplantPlatformType | undefined;
	abutmentType?: AbutmentCategoryType | string | undefined;
	fixationType?: FixationType | undefined;
	// Clinical Workflow Status & 8 Technological Stages
	currentStage: LabWorkflowStageId;
	techStage?: LabTechnologicalStageId | undefined;
	stageHistory: Array<{
		stage: LabWorkflowStageId;
		timestampIso: string;
		authorName: string;
		note?: string | undefined;
	}>;
	techStageHistory?: Array<{
		stage: LabTechnologicalStageId;
		timestampIso: string;
		authorName: string;
		note?: string | undefined;
	}> | undefined;
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
 * Generates clean, authentic Code 128 (ISO/IEC 15417) barcode SVG for optical scanners.
 */
export function generateBarcodeSvg(data: string, _width = 240, _height = 50): string {
	return canonicalCode128BarcodeSvg(data);
}

/**
 * Generates vector QR Code SVG for mobile scanners and laboratory verification portals using ISO/IEC 18004 engine.
 */
export function generateQrCodeSvg(content: string, size = 100): string {
	try {
		const { matrix, size: matrixSize } = generateQrMatrix(content || 'DENTE-LAB', 'M');
		const margin = 1;
		const totalCells = matrixSize + margin * 2;
		const cellSize = size / totalCells;
		let rects = '';
		for (let r = 0; r < matrixSize; r++) {
			const row = matrix[r];
			if (!row) continue;
			for (let c = 0; c < matrixSize; c++) {
				if (row[c]) {
					const x = ((c + margin) * cellSize).toFixed(2);
					const y = ((r + margin) * cellSize).toFixed(2);
					const w = cellSize.toFixed(2);
					const h = cellSize.toFixed(2);
					rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" />`;
				}
			}
		}
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#ffffff" />${rects}</svg>`;
	} catch {
		return sharedGenerateQrCodeSvg(content || 'DENTE-LAB', { size, margin: 1 });
	}
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
	const isSigned = order.currentStage === 'delivered_completed' || (order.currentStage as string) === 'completed' || (order.currentStage as string) === 'delivered';
	const stampText = isSigned ? 'ПОДПИСАНО ВРАЧОМ' : 'ЧЕРНОВИК (В РАБОТЕ)';
	const stampColor = isSigned ? '#059669' : '#d97706';
	const stampBg = isSigned ? '#f0fdf4' : '#fffbeb';
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

	<div style="border: 2px dashed ${stampColor}; background: ${stampBg}; color: ${stampColor}; font-weight: 800; font-size: 11px; padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.04em; text-transform: uppercase;">
		<span>ШТАМП: ${stampText}</span>
		<span>ЭТАП: ${stage.nameRu}</span>
	</div>

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
		${order.implantPlatform ? `<div class="data-row"><span class="label">Платформа имплантата:</span> <span class="value">${order.implantPlatform === 'conical' ? 'Конус Морзе (Conical Connection)' : 'Шестигранник (Internal / External Hex)'}</span></div>` : ''}
		${order.abutmentType ? `<div class="data-row"><span class="label">Тип абатмента:</span> <span class="value">${ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu || order.abutmentType}</span></div>` : ''}
		${order.fixationType ? `<div class="data-row"><span class="label">Тип фиксации:</span> <span class="value">${order.fixationType === 'screw_retained' ? 'Винтовая фиксация (Screw-retained)' : 'Цементная фиксация (Cement-retained)'}</span></div>` : ''}
		${order.occlusalScheme ? `<div class="data-row"><span class="label">Окклюзия:</span> <span class="value">${order.occlusalScheme}</span></div>` : ''}
		${order.contactTightness ? `<div class="data-row"><span class="label">Апроксимальные контакты:</span> <span class="value">${order.contactTightness}</span></div>` : ''}
	</div>

	<div class="section-title">3. Маршрутный лист 8 технологических этапов ЗТЛ</div>
	<div class="highlight-box" style="padding: 6px 8px;">
		<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
			<thead>
				<tr style="border-bottom: 1px solid #cbd5e1; color: #475569; text-align: left;">
					<th style="padding: 3px 4px; width: 24px;">№</th>
					<th style="padding: 3px 4px;">Технологический этап</th>
					<th style="padding: 3px 4px; width: 140px;">Ответственный цех</th>
					<th style="padding: 3px 4px; width: 90px; text-align: center;">Статус</th>
				</tr>
			</thead>
			<tbody>
				${LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
					const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
					const isCurrent = order.techStage === stageKey;
					const isDone = (sDef.stepIndex < (LAB_TECHNOLOGICAL_STAGES[order.techStage || 'impression_scan']?.stepIndex ?? 1));
					const rowBg = isCurrent ? '#f0fdfa' : 'transparent';
					const statusText = isDone ? 'ВЫПОЛНЕНО' : isCurrent ? 'В РАБОТЕ' : 'ОЖИДАНИЕ';
					const statusColor = isDone ? '#059669' : isCurrent ? '#0d9488' : '#94a3b8';
					return `<tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
						<td style="padding: 3px 4px; font-weight: 700; color: #64748b;">${sDef.stepIndex}</td>
						<td style="padding: 3px 4px; font-weight: ${isCurrent ? '700' : '500'}; color: ${isCurrent ? '#0f766e' : '#0f172a'};">${sDef.nameRu}</td>
						<td style="padding: 3px 4px; color: #64748b;">${sDef.shortTitleRu}</td>
						<td style="padding: 3px 4px; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 10px;">${statusText}</td>
					</tr>`;
				}).join('')}
			</tbody>
		</table>
	</div>

	<div class="section-title">4. Клинические указания и примечания врача</div>
	<div class="highlight-box" style="min-height: 45px;">
		${order.clinicalNotes ? `<p style="margin: 0;">${order.clinicalNotes}</p>` : '<p style="margin: 0; color: #94a3b8; font-style: italic;">Особых указаний нет. Изготовление строго по анатомическим нормам и силиконовому ключу.</p>'}
	</div>

	<div class="section-title">5. Стоимость и взаиморасчеты (для бухгалтерии)</div>
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
	implantPlatform?: ImplantPlatformType | undefined;
	abutmentType?: AbutmentCategoryType | string | undefined;
	fixationType?: FixationType | undefined;
	pricePerUnitRub?: number | undefined;
	costPerUnitRub?: number | undefined;
	doctorPercent?: number | undefined;
	customWorkingDays?: number | undefined;
	clinicalNotes?: string | undefined;
	orderDate?: Date | string | undefined;
	orderNumber?: string | undefined;
	sequenceNumber?: number | undefined;
	initialStage?: LabWorkflowStageId | undefined;
	techStage?: LabTechnologicalStageId | undefined;
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

	// Explicit orderNumber or monotonic sequence number
	const seq = params.sequenceNumber ?? ((Math.floor(Date.now() / 1000) % 9000) + 1000);
	const orderNumber = params.orderNumber || generateLabOrderNumber(seq, orderDate);
	const orderDateIso = formatDateToIsoDay(orderDate);
	const id = `lab-ord-${Date.now()}-${params.patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001"}`;
	const initialStage: LabWorkflowStageId = params.initialStage || 'impression_sent';
	const techStage: LabTechnologicalStageId = params.techStage || 'impression_scan';

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
		implantPlatform: params.implantPlatform,
		abutmentType: params.abutmentType,
		fixationType: params.fixationType,
		currentStage: initialStage,
		techStage,
		stageHistory: [
			{
				stage: initialStage,
				timestampIso: new Date().toISOString(),
				authorName: params.doctorName,
				note: 'Заказ первично сформирован и слепки отправлены в лабораторию'
			}
		],
		techStageHistory: [
			{
				stage: techStage,
				timestampIso: new Date().toISOString(),
				authorName: params.doctorName,
				note: 'Первичный технологический этап ЗТЛ'
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
