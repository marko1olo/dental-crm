import {
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
} from "./labWorkOrderPresets";
import type { LabWorkOrder } from "./labWorkOrderTypes";

export function renderPrintImplantComponentsSection(order: LabWorkOrder): string {
	const count = order.selectedTeeth.length;
	const isScrew = order.prostheticTypeId === "implant_screw_retained_crown";
	const transfers = order.implantComponents?.transfersCount ?? (isScrew ? count : 0);
	const analogs = order.implantComponents?.analogsCount ?? (isScrew ? count : 0);
	const screws = order.implantComponents?.screwsCount ?? (isScrew ? count : 0);
	const healing = order.implantComponents?.healingAbutmentsCount ?? 0;
	const trayType = order.implantComponents?.transfersType === "open_tray"
		? "открытая ложка"
		: order.implantComponents?.transfersType === "closed_tray"
		? "закрытая ложка"
		: "скан-боди / маркеры";

	return `
	<div class="section-title">3. Опись и накладная компонентов имплантационной системы</div>
	<div class="highlight-box" style="padding: 6px 8px;">
		<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
			<thead>
				<tr style="border-bottom: 1px solid #cbd5e1; color: #475569; text-align: left;">
					<th style="padding: 3px 4px;">Наименование компонента</th>
					<th style="padding: 3px 4px; width: 100px; text-align: center;">Количество</th>
					<th style="padding: 3px 4px; width: 150px;">Примечание</th>
				</tr>
			</thead>
			<tbody>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 3px 4px; font-weight: 600;">Трансферы слепочные (${trayType})</td>
					<td style="padding: 3px 4px; text-align: center; font-weight: 700;">${transfers} шт.</td>
					<td style="padding: 3px 4px; color: #64748b;">Возврат в клинику</td>
				</tr>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 3px 4px; font-weight: 600;">Лабораторные аналоги имплантатов / Multi-Unit</td>
					<td style="padding: 3px 4px; text-align: center; font-weight: 700;">${analogs} шт.</td>
					<td style="padding: 3px 4px; color: #64748b;">Возврат на модели</td>
				</tr>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 3px 4px; font-weight: 600;">Формирователи десны (ФДМ)</td>
					<td style="padding: 3px 4px; text-align: center; font-weight: 700;">${healing} шт.</td>
					<td style="padding: 3px 4px; color: #64748b;">В стерильной таре</td>
				</tr>
				<tr style="border-bottom: 1px solid #f1f5f9;">
					<td style="padding: 3px 4px; font-weight: 600;">Винты клинические / лабораторные</td>
					<td style="padding: 3px 4px; text-align: center; font-weight: 700;">${screws} шт.</td>
					<td style="padding: 3px 4px; color: #64748b;">Усилие по паспорту системы</td>
				</tr>
				${order.implantComponents?.extraComponentsNotes ? `
				<tr>
					<td colspan="3" style="padding: 4px; font-size: 10.5px; color: #0d9488; font-weight: 600;">
						Дополнительно: ${order.implantComponents.extraComponentsNotes}
					</td>
				</tr>` : ""}
			</tbody>
		</table>
	</div>`;
}

export function renderPrintTechStagesSection(order: LabWorkOrder, sectionIndex: number): string {
	const currentStep = LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepIndex ?? 1;

	return `
	<div class="section-title">${sectionIndex}. Маршрутный лист 8 технологических этапов ЗТЛ</div>
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
					const isDone = sDef.stepIndex < currentStep;
					const rowBg = isCurrent ? "#f0fdfa" : "transparent";
					const statusText = isDone ? "ВЫПОЛНЕНО" : isCurrent ? "В РАБОТЕ" : "ОЖИДАНИЕ";
					const statusColor = isDone ? "#059669" : isCurrent ? "#0d9488" : "#94a3b8";
					return `<tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
						<td style="padding: 3px 4px; font-weight: 700; color: #64748b;">${sDef.stepIndex}</td>
						<td style="padding: 3px 4px; font-weight: ${isCurrent ? "700" : "500"}; color: ${isCurrent ? "#0f766e" : "#0f172a"};">${sDef.nameRu}</td>
						<td style="padding: 3px 4px; color: #64748b;">${sDef.shortTitleRu}</td>
						<td style="padding: 3px 4px; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 10px;">${statusText}</td>
					</tr>`;
				}).join("")}
			</tbody>
		</table>
	</div>`;
}
