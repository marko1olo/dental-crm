import {
	PROSTHETIC_TYPES,
	LAB_MATERIALS,
	LAB_WORKFLOW_STAGES,
	ABUTMENT_TYPE_OPTIONS,
} from "./labWorkOrderPresets";
import { generateBarcodeSvg, generateQrCodeSvg, generateFdiOdontogramSvg } from "./labWorkOrderBarcodes";
import { LAB_WORK_ORDER_A4_PRINT_STYLES } from "./labWorkOrderPrintStyles";
import { renderPrintImplantComponentsSection, renderPrintTechStagesSection } from "./labWorkOrderPrintSections";
import type { LabWorkOrder } from "./labWorkOrderTypes";

export function generatePrintableLabWorkOrderHtml(order: LabWorkOrder): string {
	const preset = PROSTHETIC_TYPES[order.prostheticTypeId] || PROSTHETIC_TYPES.crown_zirconia_monolithic;
	const material = LAB_MATERIALS[order.materialId] || { nameRu: order.materialId, manufacturerRu: "" };
	const stage = LAB_WORKFLOW_STAGES[order.currentStage] || LAB_WORKFLOW_STAGES.in_progress;
	const teethFormatted = order.selectedTeeth.length > 0 ? order.selectedTeeth.sort((a, b) => a - b).join(", ") : "Не указаны";
	const barcodeSvg = generateBarcodeSvg(order.orderNumber, 240, 50);
	const qrSvg = generateQrCodeSvg(`DENTE-LAB:${order.orderNumber}|PATIENT:${order.patientName}|TEETH:${teethFormatted}`, 90);
	const isDraft = order.currentStage === "draft" || order.currentStage === "draft_order" || order.currentStage === "impression_sent";
	const stampText = isDraft ? "ЧЕРНОВИК (В РАБОТЕ)" : "ПОДПИСАНО ВРАЧОМ • В ПРОИЗВОДСТВЕ ЗТЛ";
	const stampColor = isDraft ? "#d97706" : "#059669";
	const stampBg = isDraft ? "#fffbeb" : "#f0fdf4";
	const odontogramSvg = generateFdiOdontogramSvg(order.selectedTeeth);
	const hasImplantWork = Boolean(order.implantComponents?.hasImplantComponents || order.prostheticTypeId === "implant_screw_retained_crown" || order.implantPlatform || order.abutmentType);

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Наряд-заказ — ${order.orderNumber}</title><style>${LAB_WORK_ORDER_A4_PRINT_STYLES}</style></head><body>
	<table class="header-table"><tr>
		<td style="vertical-align: middle;">
			<h1 class="title">Наряд-заказ № ${order.orderNumber} ${order.isWarrantyRework ? '<span style="color: #f43f5e; font-size: 12px; background: #ffe4e6; border: 1px solid #f43f5e; border-radius: 4px; padding: 2px 8px; vertical-align: middle; margin-left: 8px;">ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽)</span>' : ""}</h1>
			<p class="subtitle">Зуботехническая лаборатория • Стоматологическая клиника «${order.clinicName || "DENTE Clinic"}»</p>
		</td>
		<td style="text-align: right; vertical-align: middle;">${barcodeSvg}</td>
	</tr></table>
	<div style="border: 2px dashed ${stampColor}; background: ${stampBg}; color: ${stampColor}; font-weight: 800; font-size: 11px; padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.04em; text-transform: uppercase;">
		<span>ШТАМП: ${stampText}</span><span>ЭТАП: ${stage.nameRu}</span>
	</div>
	${order.isWarrantyRework ? `<div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;"><div style="color: #e11d48; font-weight: 800; font-size: 12px; text-transform: uppercase;">БЕЗУСЛОВНАЯ ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽ ДЛЯ ПАЦИЕНТА)</div><div style="font-size: 11px; color: #9f1239; margin-top: 2px;">Основание: ${order.reworkReason || "Гарантийная рекламация: коррекция прилегания / окклюзии"}${order.originalOrderNumber ? ` • Исходный наряд-заказ № ${order.originalOrderNumber}` : ""}</div></div>` : ""}
	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Пациент (Ф.И.О.):</span> <span class="value">${order.patientName}</span></div>
			<div class="data-row"><span class="label">№ Мед. карты:</span> <span class="value">${order.patientChartNumber || "—"}</span></div>
			<div class="data-row"><span class="label">Врач-ортопед:</span> <span class="value">${order.doctorName}</span></div>
			<div class="data-row"><span class="label">Лаборатория / Техник:</span> <span class="value">${order.labName || "Центральная лаборатория DENTE"}</span></div>
		</div>
		<div class="col">
			<div class="data-row"><span class="label">Дата наряда:</span> <span class="value">${order.orderDateIso}</span></div>
			<div class="data-row"><span class="label">Дата примерки:</span> <span class="value">${order.fittingDateIso || "Без примерки"}</span></div>
			<div class="data-row"><span class="label">Срок готовности:</span> <span class="value" style="color: #0d9488;">${order.deliveryDateIso}</span></div>
			<div class="data-row"><span class="label">Текущий статус:</span> <span class="value">${stage.nameRu}</span></div>
		</div>
	</div>
	<div class="section-title">1. Зубная формула и локализация протезирования (FDI 11–48 / 51–85)</div>
	<div class="teeth-grid">${odontogramSvg}<p style="margin: 4px 0; font-size: 12px; font-weight: 700;">Выбранные зубы: ${teethFormatted} (всего единиц: ${order.financials.unitsCount})</p></div>
	<div class="section-title">2. Спецификация ортопедической конструкции</div>
	<div class="highlight-box">
		<div class="data-row"><span class="label">Вид конструкции:</span> <span class="value">${preset.nameRu}</span></div>
		<div class="data-row"><span class="label">Материал:</span> <span class="value">${material.nameRu} (${material.manufacturerRu})</span></div>
		<div class="data-row"><span class="label">Основной оттенок:</span> <span class="value" style="font-size: 14px; color: #0d9488;">${order.shadeCode} (${order.shadeSystem.toUpperCase()})</span>${order.stumpShadeCode ? `<span style="margin-left: 16px;"><span class="label" style="width: auto;">Культя (ND):</span> <span class="value">${order.stumpShadeCode}</span></span>` : ""}</div>
		<div class="data-row"><span class="label">Прозрачность:</span> <span class="value">${order.translucency}</span><span style="margin-left: 16px;"><span class="label" style="width: auto;">Текстура:</span> <span class="value">${order.surfaceTexture}</span></span></div>
		${order.implantPlatform ? `<div class="data-row"><span class="label">Платформа имплантата:</span> <span class="value">${order.implantPlatform === "conical" ? "Конус Морзе (Conical Connection)" : "Шестигранник (Internal / External Hex)"}</span></div>` : ""}
		${order.abutmentType ? `<div class="data-row"><span class="label">Тип абатмента:</span> <span class="value">${ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu || order.abutmentType}</span></div>` : ""}
		${order.fixationType ? `<div class="data-row"><span class="label">Тип фиксации:</span> <span class="value">${order.fixationType === "screw_retained" ? "Винтовая фиксация (Screw-retained)" : "Цементная фиксация (Cement-retained)"}</span></div>` : ""}
		${order.occlusalScheme ? `<div class="data-row"><span class="label">Окклюзия:</span> <span class="value">${order.occlusalScheme}</span></div>` : ""}
		${order.contactTightness ? `<div class="data-row"><span class="label">Апроксимальные контакты:</span> <span class="value">${order.contactTightness}</span></div>` : ""}
	</div>
	${hasImplantWork ? renderPrintImplantComponentsSection(order) : ""}
	${renderPrintTechStagesSection(order, hasImplantWork ? 4 : 3)}
	<div class="section-title">${hasImplantWork ? "5" : "4"}. Клинические указания и примечания врача</div>
	<div class="highlight-box" style="min-height: 45px;">
		${order.clinicalNotes ? `<p style="margin: 0;">${order.clinicalNotes}</p>` : '<p style="margin: 0; color: #94a3b8; font-style: italic;">Особых указаний нет. Изготовление строго по анатомическим нормам и силиконовому ключу.</p>'}
	</div>
	<div class="section-title">${hasImplantWork ? "6" : "5"}. Стоимость и взаиморасчеты (для бухгалтерии)</div>
	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Стоимость клиники:</span> <span class="value" ${order.isWarrantyRework ? 'style="color: #15803d; font-weight: 800;"' : ""}>${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽ ${order.isWarrantyRework ? "(0 ₽ гарантия)" : ""}</span></div>
			<div class="data-row"><span class="label">Себестоимость лаборатории:</span> <span class="value">${order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽</span></div>
			<div class="data-row" style="margin-top: 6px; font-size: 11px; color: #64748b;">Клиническое решение лечащего врача • Наряд авторизован к производству</div>
		</div>
		<div class="col" style="text-align: right;">${qrSvg}</div>
	</div>
	<div class="signatures">
		<div class="sig-col"><div class="sig-line"></div><div class="sig-sub">Врач-ортопед (${order.doctorName}) / Подпись</div></div>
		<div class="sig-col"><div class="sig-line"></div><div class="sig-sub">Зубной техник / Принял в работу / Подпись</div></div>
	</div>
</body></html>`;
}
