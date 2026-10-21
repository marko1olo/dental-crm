import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowModel";
import {
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
} from "../orders/labWorkOrderPresets";

export function renderImplantComponentsSection(order: DentalLabWorkflowOrder): string {
	if (!order.implantComponents?.hasImplantComponents && order.workTypeId !== "custom_abutment" && !order.implantPlatform) {
		return "";
	}
	return `<div class="section-title">3. Опись компонентов имплантационной системы</div>
	<div class="box" style="padding: 4px 6px;">
		<table style="width: 100%; border-collapse: collapse; font-size: 10px;">
			<thead><tr style="border-bottom: 1px solid #cbd5e1; color: #475569; text-align: left;"><th style="padding: 2px 4px;">Компонент</th><th style="padding: 2px 4px; width: 90px; text-align: center;">Кол-во</th><th style="padding: 2px 4px; width: 140px;">Примечание</th></tr></thead>
			<tbody>
				<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2px 4px; font-weight: 600;">Трансферы слепочные</td><td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.transfersCount ?? (order.workTypeId === "custom_abutment" ? order.selectedTeeth.length : 0)} шт.</td><td style="padding: 2px 4px; color: #64748b;">Возврат в клинику</td></tr>
				<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2px 4px; font-weight: 600;">Лабораторные аналоги имплантатов</td><td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.analogsCount ?? (order.workTypeId === "custom_abutment" ? order.selectedTeeth.length : 0)} шт.</td><td style="padding: 2px 4px; color: #64748b;">Возврат на модели</td></tr>
				<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 2px 4px; font-weight: 600;">Винты клинические / лабораторные</td><td style="padding: 2px 4px; text-align: center; font-weight: 700;">${order.implantComponents?.screwsCount ?? (order.workTypeId === "custom_abutment" ? order.selectedTeeth.length : 0)} шт.</td><td style="padding: 2px 4px; color: #64748b;">По паспорту системы</td></tr>
			</tbody>
		</table>
	</div>`;
}

export function renderTechStagesSection(order: DentalLabWorkflowOrder, sectionNum: number): string {
	return `<div class="section-title">${sectionNum}. Маршрутный лист 8 технологических этапов ЗТЛ</div>
	<div class="box" style="padding: 4px 6px;">
		<table style="width: 100%; border-collapse: collapse; font-size: 10px;">
			<thead><tr style="border-bottom: 1px solid #cbd5e1; color: #475569; text-align: left;"><th style="padding: 2px 4px; width: 20px;">№</th><th style="padding: 2px 4px;">Этап</th><th style="padding: 2px 4px; width: 130px;">Цех</th><th style="padding: 2px 4px; width: 80px; text-align: center;">Статус</th></tr></thead>
			<tbody>
				${LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
					const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
					const isCurrent = order.techStage === stageKey;
					const isDone = (sDef.stepNumber < (LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber ?? 1));
					const statusText = isDone ? "ВЫПОЛНЕНО" : isCurrent ? "В РАБОТЕ" : "ОЖИДАНИЕ";
					const statusColor = isDone ? "#059669" : isCurrent ? "#0d9488" : "#94a3b8";
					return `<tr style="background: ${isCurrent ? "#f0fdfa" : "transparent"}; border-bottom: 1px solid #f1f5f9;">
						<td style="padding: 2px 4px; font-weight: 700; color: #64748b;">${sDef.stepNumber}</td>
						<td style="padding: 2px 4px; font-weight: ${isCurrent ? "700" : "500"}; color: ${isCurrent ? "#0f766e" : "#0f172a"};">${sDef.nameRu}</td>
						<td style="padding: 2px 4px; color: #64748b;">${sDef.departmentRu}</td>
						<td style="padding: 2px 4px; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 9.5px;">${statusText}</td>
					</tr>`;
				}).join("")}
			</tbody>
		</table>
	</div>`;
}

export function renderSignaturesSection(order: DentalLabWorkflowOrder): string {
	return `<div class="signatures">
		<div class="sig-col"><div class="sig-line"></div><div class="sig-sub">Врач-ортопед (${order.doctorName})</div></div>
		<div class="sig-col"><div class="sig-line"></div><div class="sig-sub">Курьер (Принял / Передал)</div></div>
		<div class="sig-col"><div class="sig-line"></div><div class="sig-sub">Зубной техник (${order.labName})</div></div>
	</div>`;
}
