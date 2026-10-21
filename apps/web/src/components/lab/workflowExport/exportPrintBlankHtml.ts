import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowModel";
import { ORTHOPEDIC_WORK_TYPES, LAB_WORKFLOW_STATUSES, formatRussianDate } from "../dentalLabWorkflowEngine";
import { generateOdontogramSvg, generateBarcodeSvg, generateQrCodeSvg } from "./exportSvgGenerators";
import { A4_PRINT_BLANK_CSS } from "./exportPrintBlankStyles";
import {
	renderImplantComponentsSection,
	renderTechStagesSection,
	renderSignaturesSection,
} from "./exportPrintBlankSections";
import { ABUTMENT_TYPE_OPTIONS } from "../orders/labWorkOrderPresets";

export function generateDentalLabOrderA4PrintBlank(order: DentalLabWorkflowOrder): string {
	const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const stage = LAB_WORKFLOW_STATUSES[order.currentStage] || LAB_WORKFLOW_STATUSES.draft;
	const teethFormatted = order.selectedTeeth.length > 0 ? [...order.selectedTeeth].sort((a, b) => a - b).join(", ") : "Не указаны";
	const barcodeSvg = generateBarcodeSvg(order.orderNumber, 230, 48);
	const qrSvg = generateQrCodeSvg(`DENTE-ZTL:${order.orderNumber}|PATIENT:${order.patientName}|DOCTOR:${order.doctorName}|TEETH:${teethFormatted}|FITTING:${order.fittingDate || "N/A"}`, 85);
	const odontogramSvg = generateOdontogramSvg(order.selectedTeeth);
	const hasImplants = Boolean(order.implantComponents?.hasImplantComponents || order.workTypeId === "custom_abutment" || order.implantPlatform);

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Наряд-заказ ЗТЛ № ${order.orderNumber}</title><style>${A4_PRINT_BLANK_CSS}</style></head>
<body>
	<table class="header-table">
		<tr>
			<td style="vertical-align: middle;">
				<h1 class="title">Наряд-заказ № ${order.orderNumber} ${order.isWarrantyRework ? '<span style="color: #f43f5e; font-size: 12px; background: #ffe4e6; border: 1px solid #f43f5e; border-radius: 4px; padding: 2px 8px; vertical-align: middle; margin-left: 8px;">ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽)</span>' : ''}</h1>
				<p class="subtitle">${order.clinicName} • Зуботехническая лаборатория «${order.labName}»</p>
			</td>
			<td style="text-align: right; vertical-align: middle;">${barcodeSvg}</td>
		</tr>
	</table>
	${order.isWarrantyRework ? `<div class="box" style="background: #fff1f2; border: 1px solid #fecdd3; margin-bottom: 6px;">
		<div class="data-row"><span class="label" style="color: #e11d48; width: 180px;">Основание переделки:</span> <span class="value" style="color: #9f1239;">${order.reworkReason || "Гарантийная рекламация: скол облицовки / коррекция прилегания"}</span></div>
		${order.originalOrderNumber ? `<div class="data-row"><span class="label" style="color: #e11d48; width: 180px;">Исходный наряд-заказ:</span> <span class="value">№ ${order.originalOrderNumber}</span></div>` : ""}
		<div class="data-row"><span class="label" style="color: #e11d48; width: 180px;">Стоимость для пациента:</span> <span class="value" style="color: #15803d; font-weight: 800;">0 ₽ (БЕЗУСЛОВНАЯ ГАРАНТИЯ КЛИНИКИ)</span></div>
	</div>` : ""}
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
	<div class="status-strip">
		<div class="status-cell ${order.currentStage === "draft" ? "active" : ""}">1. Черновик</div>
		<div class="status-cell ${order.currentStage === "sent_to_lab" ? "active" : ""}">2. Отправлено в ЗТЛ</div>
		<div class="status-cell ${order.currentStage === "fitting_scheduled" ? "active" : ""}">3. Примерка (${order.fittingDate ? formatRussianDate(order.fittingDate) : "Дата"})</div>
		<div class="status-cell ${order.currentStage === "installed_completed" ? "active" : ""}">4. Сдано пациенту</div>
		<div class="status-cell ${order.currentStage === "warranty_rework" ? "active" : ""}" style="${order.currentStage === "warranty_rework" ? "background: #f43f5e; color: #ffffff;" : ""}">5. Гарантия (0 ₽)</div>
	</div>
	<div class="section-title">1. Зубная формула и локализация протезирования (FDI)</div>
	<div class="teeth-block">${odontogramSvg}<p style="margin: 3px 0 0 0; font-size: 11px; font-weight: 700;">Выбранные зубы: ${teethFormatted} (всего единиц: ${order.financials.unitsCount})</p></div>
	<div class="section-title">2. Спецификация ортопедической конструкции</div>
	<div class="box">
		<div class="data-row"><span class="label">Вид конструкции:</span> <span class="value">${preset.nameRu}</span></div>
		<div class="data-row"><span class="label">Материал:</span> <span class="value">${order.materialName}</span></div>
		<div class="data-row"><span class="label">Оттенок (VITA):</span> <span class="value" style="color: #0d9488; font-size: 12.5px;">${order.shadeCode} (${order.shadeSystem.toUpperCase()})</span>${order.stumpShadeCode ? `<span style="margin-left: 14px;"><span class="label" style="width: auto;">Культя (ND):</span> <span class="value">${order.stumpShadeCode}</span></span>` : ""}</div>
		<div class="data-row"><span class="label">Прозрачность:</span> <span class="value">${order.translucency}</span><span style="margin-left: 14px;"><span class="label" style="width: auto;">Текстура:</span> <span class="value">${order.surfaceTexture}</span></span></div>
		${order.implantPlatform ? `<div class="data-row"><span class="label">Платформа имплантата:</span> <span class="value">${order.implantPlatform === "conical" ? "Конус Морзе" : "Шестигранник"}</span></div>` : ""}
		${order.abutmentType ? `<div class="data-row"><span class="label">Тип абатмента:</span> <span class="value">${ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu || order.abutmentType}</span></div>` : ""}
		${order.fixationType ? `<div class="data-row"><span class="label">Тип фиксации:</span> <span class="value">${order.fixationType === "screw_retained" ? "Винтовая фиксация" : "Цементная фиксация"}</span></div>` : ""}
		${order.occlusalScheme ? `<div class="data-row"><span class="label">Окклюзия:</span> <span class="value">${order.occlusalScheme}</span></div>` : ""}
		${order.contactTightness ? `<div class="data-row"><span class="label">Контакты:</span> <span class="value">${order.contactTightness}</span></div>` : ""}
	</div>
	${renderImplantComponentsSection(order)}
	${renderTechStagesSection(order, hasImplants ? 4 : 3)}
	<div class="section-title">${hasImplants ? "5" : "4"}. Клинические указания врачу и лаборатории</div>
	<div class="box" style="min-height: 32px;">${order.clinicalNotes ? `<p style="margin: 0; font-size: 11.5px;">${order.clinicalNotes}</p>` : '<p style="margin: 0; color: #94a3b8; font-style: italic; font-size: 11.5px;">Изготовление строго по анатомическим нормам и силиконовому ключу.</p>'}</div>
	<div class="section-title">${hasImplants ? "6" : "5"}. Взаиморасчеты и финансовый контроль</div>
	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Стоимость для пациента:</span> <span class="value" ${order.isWarrantyRework ? 'style="color: #15803d; font-weight: 800;"' : ''}>${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽ ${order.isWarrantyRework ? '(0 ₽ гарантия)' : ''}</span></div>
			<div class="data-row"><span class="label">Себестоимость ЗТЛ:</span> <span class="value">${order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽</span></div>
			<div class="data-row"><span class="label">Маржа клиники:</span> <span class="value" style="color: #0d9488;">${order.financials.clinicGrossMarginRub.toLocaleString("ru-RU")} ₽ (${order.financials.grossMarginPercent}%)</span></div>
		</div>
		<div class="col" style="text-align: right;">${qrSvg}</div>
	</div>
	${renderSignaturesSection(order)}
</body></html>`;
}
