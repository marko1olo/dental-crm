/**
 * dentalLabWorkflowExport.ts — Vector SVG Renderers (FDI Odontogram, Barcode, QR),
 * A4 Printable Courier Blank, and RFC 4180 CSV Export.
 */

import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowModel";
import { ORTHOPEDIC_WORK_TYPES, LAB_WORKFLOW_STATUSES, formatRussianDate } from "./dentalLabWorkflowEngine";
import { generateQrCodeSvg as sharedGenerateQrCodeSvg } from "@dental/shared";
import { generateBarcodeSvg as canonicalCode128BarcodeSvg } from "./labMath";
import {
	ABUTMENT_TYPE_OPTIONS,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
} from "./orders/labWorkOrderPresets";

/**
 * 32-зубная формула FDI в виде компактного SVG вектора.
 */
export function generateOdontogramSvg(selectedTeeth: readonly number[] = []): string {
	const selectedSet = new Set(selectedTeeth);
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const renderQuadrant = (teeth: number[], startX: number, startY: number) => {
		return teeth
			.map((num, i) => {
				const x = startX + i * 30;
				const isSel = selectedSet.has(num);
				const bg = isSel ? "#0d9488" : "#f8fafc";
				const stroke = isSel ? "#0f766e" : "#cbd5e1";
				const textFill = isSel ? "#ffffff" : "#0f172a";

				return `<g transform="translate(${x}, ${startY})">
					<rect x="0" y="0" width="26" height="30" rx="4" fill="${bg}" stroke="${stroke}" stroke-width="1.5" />
					<text x="13" y="19" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="${textFill}">${num}</text>
				</g>`;
			})
			.join("");
	};

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 86" width="520" height="86" style="max-width: 100%;">
		<line x1="258" y1="4" x2="258" y2="82" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />
		<line x1="8" y1="43" x2="508" y2="43" stroke="#cbd5e1" stroke-width="1" />
		<text x="4" y="20" font-family="sans-serif" font-size="9" font-weight="700" fill="#64748b">ВЧ</text>
		<text x="4" y="66" font-family="sans-serif" font-size="9" font-weight="700" fill="#64748b">НЧ</text>
		${renderQuadrant(upperRight, 14, 6)}
		${renderQuadrant(upperLeft, 264, 6)}
		${renderQuadrant(lowerRight, 14, 48)}
		${renderQuadrant(lowerLeft, 264, 48)}
	</svg>`;
}

/**
 * Векторный штрихкод Code 128 (ISO/IEC 15417) для оптических сканеров.
 */
export function generateBarcodeSvg(data: string, width = 220, height = 48): string {
	return canonicalCode128BarcodeSvg(data, width, height);
}

/**
 * Векторный QR-код SVG для мобильных сканеров курьеров ЗТЛ по стандарту ISO/IEC 18004.
 */
export function generateQrCodeSvg(content: string, size = 90): string {
	return sharedGenerateQrCodeSvg(content || "DENTE-ZTL", { size, margin: 1 });
}

/**
 * Генерация строгого печатного бланка наряд-заказа ЗТЛ формата А4 для курьера лаборатории.
 */
export function generateDentalLabOrderA4PrintBlank(order: DentalLabWorkflowOrder): string {
	const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const stage = LAB_WORKFLOW_STATUSES[order.currentStage] || LAB_WORKFLOW_STATUSES.draft;
	const teethFormatted =
		order.selectedTeeth.length > 0 ? [...order.selectedTeeth].sort((a, b) => a - b).join(", ") : "Не указаны";

	const barcodeSvg = generateBarcodeSvg(order.orderNumber, 230, 48);
	const qrSvg = generateQrCodeSvg(
		`DENTE-ZTL:${order.orderNumber}|PATIENT:${order.patientName}|DOCTOR:${order.doctorName}|TEETH:${teethFormatted}|FITTING:${order.fittingDate || "N/A"}`,
		85,
	);
	const odontogramSvg = generateOdontogramSvg(order.selectedTeeth);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Наряд-заказ ЗТЛ № ${order.orderNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 10mm 14mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			color: #0f172a;
			background: #ffffff;
			margin: 0;
			padding: 4px;
			font-size: 12px;
			line-height: 1.35;
		}
		.header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
		.title { font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0 0 2px 0; color: #0f172a; }
		.subtitle { font-size: 11px; color: #475569; margin: 0; }
		.section-title {
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			background: #f1f5f9;
			padding: 4px 8px;
			margin: 8px 0 5px 0;
			border-left: 4px solid #0d9488;
		}
		.grid-2 { display: table; width: 100%; margin-bottom: 5px; }
		.col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
		.data-row { margin-bottom: 3px; font-size: 11.5px; }
		.label { font-weight: 600; color: #475569; width: 150px; display: inline-block; }
		.value { font-weight: 700; color: #0f172a; }
		.box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-top: 3px; }
		.teeth-block { text-align: center; margin: 4px 0; }
		.status-strip {
			display: table;
			width: 100%;
			border: 1px solid #cbd5e1;
			border-radius: 4px;
			background: #f8fafc;
			margin: 6px 0;
			table-layout: fixed;
		}
		.status-cell {
			display: table-cell;
			text-align: center;
			padding: 6px 4px;
			font-size: 10px;
			font-weight: 700;
			border-right: 1px solid #e2e8f0;
			color: #64748b;
		}
		.status-cell:last-child { border-right: none; }
		.status-cell.active {
			background: #0d9488;
			color: #ffffff;
		}
		.signatures { margin-top: 16px; display: table; width: 100%; }
		.sig-col { display: table-cell; width: 33.3%; padding: 0 8px; text-align: center; }
		.sig-line { border-bottom: 1px solid #0f172a; margin-top: 28px; margin-bottom: 4px; }
		.sig-sub { font-size: 9.5px; color: #64748b; }
	</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="vertical-align: middle;">
				<h1 class="title">Наряд-заказ № ${order.orderNumber} ${order.isWarrantyRework ? '<span style="color: #f43f5e; font-size: 12px; background: #ffe4e6; border: 1px solid #f43f5e; border-radius: 4px; padding: 2px 8px; vertical-align: middle; margin-left: 8px;">ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽)</span>' : ''}</h1>
				<p class="subtitle">${order.clinicName} • Зуботехническая лаборатория «${order.labName}»</p>
			</td>
			<td style="text-align: right; vertical-align: middle;">
				${barcodeSvg}
			</td>
		</tr>
	</table>

	${order.isWarrantyRework ? `
	<div class="box" style="background: #fff1f2; border: 1px solid #fecdd3; margin-bottom: 6px;">
		<div class="data-row"><span class="label" style="color: #e11d48; width: 180px;">Основание переделки:</span> <span class="value" style="color: #9f1239;">${order.reworkReason || "Гарантийная рекламация: скол облицовки / коррекция прилегания"}</span></div>
		${order.originalOrderNumber ? `<div class="data-row"><span class="label" style="color: #e11d48; width: 180px;">Исходный наряд-заказ:</span> <span class="value">№ ${order.originalOrderNumber}</span></div>` : ""}
		<div class="data-row"><span class="label" style="color: #e11d48; width: 180px;">Стоимость для пациента:</span> <span class="value" style="color: #15803d; font-weight: 800;">0 ₽ (БЕЗУСЛОВНАЯ ГАРАНТИЯ КЛИНИКИ)</span></div>
	</div>
	` : ""}

	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Пациент (Ф.И.О.):</span> <span class="value">${order.patientName}</span></div>
			<div class="data-row"><span class="label">№ Медкарты:</span> <span class="value">${order.patientChartNumber || "—"}</span></div>
			<div class="data-row"><span class="label">Врач-ортопед:</span> <span class="value">${order.doctorName}</span></div>
			<div class="data-row"><span class="label">Телефон врача:</span> <span class="value">${order.doctorPhone || "—"}</span></div>
		</div>
		<div class="col">
			<div class="data-row"><span class="label">Дата наряда:</span> <span class="value">${formatRussianDate(order.orderDateIso)}</span></div>
			<div class="data-row"><span class="label">Срок сдачи ЗТЛ:</span> <span class="value" style="color: #0d9488;">${formatRussianDate(order.expectedLabDateIso)}</span></div>
			<div class="data-row"><span class="label">Дата примерки:</span> <span class="value">${order.fittingDate ? formatRussianDate(order.fittingDate) : (order.scheduledVisitDateIso ? formatRussianDate(order.scheduledVisitDateIso) : "По согласованию")}</span></div>
			<div class="data-row"><span class="label">Текущий статус:</span> <span class="value">${stage.nameRu}</span></div>
		</div>
	</div>

	<!-- 5-Статусный трек клинического процесса -->
	<div class="status-strip">
		<div class="status-cell ${order.currentStage === "draft" ? "active" : ""}">
			1. Черновик
		</div>
		<div class="status-cell ${order.currentStage === "sent_to_lab" ? "active" : ""}">
			2. Отправлено в ЗТЛ
		</div>
		<div class="status-cell ${order.currentStage === "fitting_scheduled" ? "active" : ""}">
			3. Примерка (${order.fittingDate ? formatRussianDate(order.fittingDate) : "Дата"})
		</div>
		<div class="status-cell ${order.currentStage === "installed_completed" ? "active" : ""}">
			4. Сдано пациенту
		</div>
		<div class="status-cell ${order.currentStage === "warranty_rework" ? "active" : ""}" style="${order.currentStage === "warranty_rework" ? "background: #f43f5e; color: #ffffff;" : ""}">
			5. Гарантия (0 ₽)
		</div>
	</div>

	<div class="section-title">1. Зубная формула и локализация протезирования (FDI)</div>
	<div class="teeth-block">
		${odontogramSvg}
		<p style="margin: 3px 0 0 0; font-size: 11px; font-weight: 700;">Выбранные зубы: ${teethFormatted} (всего единиц: ${order.financials.unitsCount})</p>
	</div>

	<div class="section-title">2. Спецификация ортопедической конструкции</div>
	<div class="box">
		<div class="data-row"><span class="label">Вид конструкции:</span> <span class="value">${preset.nameRu}</span></div>
		<div class="data-row"><span class="label">Материал:</span> <span class="value">${order.materialName}</span></div>
		<div class="data-row">
			<span class="label">Оттенок (VITA):</span>
			<span class="value" style="color: #0d9488; font-size: 12.5px;">${order.shadeCode} (${order.shadeSystem.toUpperCase()})</span>
			${order.stumpShadeCode ? `<span style="margin-left: 14px;"><span class="label" style="width: auto;">Культя (ND):</span> <span class="value">${order.stumpShadeCode}</span></span>` : ""}
		</div>
		<div class="data-row">
			<span class="label">Прозрачность:</span> <span class="value">${order.translucency}</span>
			<span style="margin-left: 14px;"><span class="label" style="width: auto;">Текстура:</span> <span class="value">${order.surfaceTexture}</span></span>
		</div>
		${order.implantPlatform ? `<div class="data-row"><span class="label">Платформа имплантата:</span> <span class="value">${order.implantPlatform === "conical" ? "Конус Морзе (Conical Connection)" : "Шестигранник (Internal / External Hex)"}</span></div>` : ""}
		${order.abutmentType ? `<div class="data-row"><span class="label">Тип абатмента:</span> <span class="value">${ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu || order.abutmentType}</span></div>` : ""}
		${order.fixationType ? `<div class="data-row"><span class="label">Тип фиксации:</span> <span class="value">${order.fixationType === "screw_retained" ? "Винтовая фиксация (Screw-retained)" : "Цементная фиксация (Cement-retained)"}</span></div>` : ""}
		${order.occlusalScheme ? `<div class="data-row"><span class="label">Окклюзия:</span> <span class="value">${order.occlusalScheme}</span></div>` : ""}
		${order.contactTightness ? `<div class="data-row"><span class="label">Контакты:</span> <span class="value">${order.contactTightness}</span></div>` : ""}
	</div>

	${(order.implantComponents?.hasImplantComponents || order.workTypeId === "custom_abutment" || order.implantPlatform) ? `
	<div class="section-title">3. Опись и накладная компонентов имплантационной системы</div>
	<div class="box" style="padding: 4px 6px;">
		<table style="width: 100%; border-collapse: collapse; font-size: 10px;">
			<thead>
				<tr style="border-bottom: 1px solid #cbd5e1; color: #475569; text-align: left;">
					<th style="padding: 2px 4px;">Наименование компонента</th>
					<th style="padding: 2px 4px; width: 90px; text-align: center;">Количество</th>
					<th style="padding: 2px 4px; width: 140px;">Примечание</th>
				</tr>
			</thead>
			<tbody>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 2px 4px; font-weight: 600;">Трансферы слепочные (${order.implantComponents?.transfersType === "open_tray" ? "открытая ложка" : order.implantComponents?.transfersType === "closed_tray" ? "закрытая ложка" : "скан-боди / маркеры"})</td>
					<td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.transfersCount ?? (order.workTypeId === "custom_abutment" ? order.selectedTeeth.length : 0)} шт.</td>
					<td style="padding: 2px 4px; color: #64748b;">Возврат в клинику</td>
				</tr>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 2px 4px; font-weight: 600;">Лабораторные аналоги имплантатов / Multi-Unit</td>
					<td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.analogsCount ?? (order.workTypeId === "custom_abutment" ? order.selectedTeeth.length : 0)} шт.</td>
					<td style="padding: 2px 4px; color: #64748b;">Возврат на модели</td>
				</tr>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 2px 4px; font-weight: 600;">Формирователи десны (ФДМ)</td>
					<td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.healingAbutmentsCount ?? 0} шт.</td>
					<td style="padding: 2px 4px; color: #64748b;">В стерильной таре</td>
				</tr>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 2px 4px; font-weight: 600;">Винты клинические / лабораторные</td>
					<td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.screwsCount ?? (order.workTypeId === "custom_abutment" ? order.selectedTeeth.length : 0)} шт.</td>
					<td style="padding: 2px 4px; color: #64748b;">Усилие по паспорту системы</td>
				</tr>
				${order.implantComponents?.extraComponentsNotes ? `
				<tr>
					<td colspan="3" style="padding: 3px 4px; font-size: 9.5px; color: #0d9488; font-weight: 600;">
						Дополнительно: ${order.implantComponents.extraComponentsNotes}
					</td>
				</tr>` : ""}
			</tbody>
		</table>
	</div>
	` : ""}

	<div class="section-title">${(order.implantComponents?.hasImplantComponents || order.workTypeId === "custom_abutment" || order.implantPlatform) ? "4" : "3"}. Маршрутный лист 8 технологических этапов ЗТЛ</div>
	<div class="box" style="padding: 4px 6px;">
		<table style="width: 100%; border-collapse: collapse; font-size: 10px;">
			<thead>
				<tr style="border-bottom: 1px solid #cbd5e1; color: #475569; text-align: left;">
					<th style="padding: 2px 4px; width: 20px;">№</th>
					<th style="padding: 2px 4px;">Технологический этап ЗТЛ</th>
					<th style="padding: 2px 4px; width: 130px;">Цех лаборатории</th>
					<th style="padding: 2px 4px; width: 80px; text-align: center;">Статус</th>
				</tr>
			</thead>
			<tbody>
				${LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
					const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
					const isCurrent = order.techStage === stageKey;
					const isDone = (sDef.stepNumber < (LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber ?? 1));
					const rowBg = isCurrent ? "#f0fdfa" : "transparent";
					const statusText = isDone ? "ВЫПОЛНЕНО" : isCurrent ? "В РАБОТЕ" : "ОЖИДАНИЕ";
					const statusColor = isDone ? "#059669" : isCurrent ? "#0d9488" : "#94a3b8";
					return `<tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
						<td style="padding: 2px 4px; font-weight: 700; color: #64748b;">${sDef.stepNumber}</td>
						<td style="padding: 2px 4px; font-weight: ${isCurrent ? "700" : "500"}; color: ${isCurrent ? "#0f766e" : "#0f172a"};">${sDef.nameRu}</td>
						<td style="padding: 2px 4px; color: #64748b;">${sDef.departmentRu}</td>
						<td style="padding: 2px 4px; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 9.5px;">${statusText}</td>
					</tr>`;
				}).join("")}
			</tbody>
		</table>
	</div>

	<div class="section-title">${(order.implantComponents?.hasImplantComponents || order.workTypeId === "custom_abutment" || order.implantPlatform) ? "5" : "4"}. Клинические указания врачу и лаборатории</div>
	<div class="box" style="min-height: 32px;">
		${order.clinicalNotes ? `<p style="margin: 0; font-size: 11.5px;">${order.clinicalNotes}</p>` : '<p style="margin: 0; color: #94a3b8; font-style: italic; font-size: 11.5px;">Изготовление строго по анатомическим нормам и силиконовому ключу.</p>'}
	</div>

	<div class="section-title">${(order.implantComponents?.hasImplantComponents || order.workTypeId === "custom_abutment" || order.implantPlatform) ? "6" : "5"}. Взаиморасчеты и финансовый контроль</div>
	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Стоимость для пациента:</span> <span class="value" ${order.isWarrantyRework ? 'style="color: #15803d; font-weight: 800;"' : ''}>${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽ ${order.isWarrantyRework ? '(0 ₽ гарантия)' : ''}</span></div>
			<div class="data-row"><span class="label">Себестоимость ЗТЛ:</span> <span class="value">${order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽</span></div>
			<div class="data-row"><span class="label">Маржа клиники:</span> <span class="value" style="color: #0d9488;">${order.financials.clinicGrossMarginRub.toLocaleString("ru-RU")} ₽ (${order.financials.grossMarginPercent}%)</span></div>
			<div class="data-row" style="margin-top: 4px; font-size: 10.5px; color: #64748b;">
				Автономия врача (Мандат 8e п. 7): Истечение 30 дней плана лечения не блокирует наряды ЗТЛ и оплату.
			</div>
		</div>
		<div class="col" style="text-align: right;">
			${qrSvg}
		</div>
	</div>

	<div class="signatures">
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Врач-ортопед (${order.doctorName})</div>
		</div>
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Курьер (Принял / Передал)</div>
		</div>
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Зубной техник (${order.labName})</div>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Экспорт реестра наряд-заказов ЗТЛ в CSV файл для бухгалтерии и аналитики.
 */
export function exportDentalLabOrdersToCsv(orders: readonly DentalLabWorkflowOrder[]): string {
	const headers = [
		"Номер наряда",
		"Пациент",
		"№ Медкарты",
		"Врач-ортопед",
		"Лаборатория",
		"Вид конструкции",
		"Зубы (FDI)",
		"Кол-во единиц",
		"Оттенок (VITA)",
		"Оттенок культи (ND)",
		"Текущий статус",
		"Дата наряда",
		"План готовности ЗТЛ",
		"Дата примерки",
		"ID Приема",
		"Статус дедлайна",
		"Задержка ЗТЛ (Alert)",
		"Стоимость пациента (руб)",
		"Себестоимость ЗТЛ (руб)",
		"Маржа клиники (руб)",
		"ЗП врача (руб)",
		"Платформа имплантата",
		"Тип абатмента",
		"Тип фиксации",
		"Технологический этап ЗТЛ",
		"Примечания",
	];

	const escapeCsv = (val: unknown): string => {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = orders.map((ord) => {
		const preset = ORTHOPEDIC_WORK_TYPES[ord.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
		const stage = LAB_WORKFLOW_STATUSES[ord.currentStage] || LAB_WORKFLOW_STATUSES.draft;
		const teethStr = ord.selectedTeeth.join(", ");
		const implantPlatRu = ord.implantPlatform === "conical" ? "Конус Морзе" : ord.implantPlatform === "hex" ? "Шестигранник" : "—";
		const abutmentRu = ord.abutmentType ? (ABUTMENT_TYPE_OPTIONS.find((a) => a.id === ord.abutmentType)?.nameRu || ord.abutmentType) : "—";
		const fixationRu = ord.fixationType === "screw_retained" ? "Винтовая" : ord.fixationType === "cement_retained" ? "Цементная" : "—";
		const techStageRu = ord.techStage ? (LAB_TECHNOLOGICAL_STAGES[ord.techStage]?.nameRu || ord.techStage) : "—";

		return [
			escapeCsv(ord.orderNumber),
			escapeCsv(ord.patientName),
			escapeCsv(ord.patientChartNumber || ""),
			escapeCsv(ord.doctorName),
			escapeCsv(ord.labName),
			escapeCsv(preset.nameRu),
			escapeCsv(teethStr),
			escapeCsv(ord.financials.unitsCount),
			escapeCsv(ord.shadeCode),
			escapeCsv(ord.stumpShadeCode || ""),
			escapeCsv(stage.nameRu),
			escapeCsv(ord.orderDateIso),
			escapeCsv(ord.expectedLabDateIso),
			escapeCsv(ord.fittingDate || ord.scheduledVisitDateIso || ""),
			escapeCsv(ord.appointmentId || ""),
			escapeCsv(ord.delayAlert.status),
			escapeCsv(ord.isDelayedAlert ? "ДА" : "НЕТ"),
			escapeCsv(ord.financials.patientPriceTotalRub),
			escapeCsv(ord.financials.labCostTotalRub),
			escapeCsv(ord.financials.clinicGrossMarginRub),
			escapeCsv(ord.financials.doctorWageRub),
			escapeCsv(implantPlatRu),
			escapeCsv(abutmentRu),
			escapeCsv(fixationRu),
			escapeCsv(techStageRu),
			escapeCsv(ord.clinicalNotes || ""),
		].join(";");
	});

	// UTF-8 BOM для корректного открытия в Excel на Windows
	return `\uFEFF${headers.join(";")}\r\n${rows.join("\r\n")}`;
}
