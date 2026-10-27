import {
	type GeneratedDocument,
	type TreatmentPlanPayload,
	renderGraphicalDentalFormulaHtml,
} from "@dental/shared";
import {
	clinicalToothRowsTable,
	cell,
	row,
	rub,
} from "../baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "../signatureRenderUtils.js";

export function treatmentPlan(document: GeneratedDocument): string {
	const payload = document.payload?.treatmentPlan as
		| TreatmentPlanPayload
		| undefined;
	if (payload) {
		const stageRows = payload.plannedStages
			.map(
				(stage) =>
					`<tr>${cell(stage.stageName)}${cell(stage.plannedServices)}${cell(stage.plannedTiming)}${cell(
						stage.clinicalNotes?.trim() || "по клинической ситуации",
					)}${cell(rub(stage.estimatedAmountRub ?? null))}</tr>`,
			)
			.join("");
		return `<h2>Клинический план лечения</h2>
    <div class="notice">
      План лечения фиксирует клиническую логику, этапы, альтернативы и ориентировочную стоимость. Перед вмешательством нужны информированное согласие и, при изменении объема, новое согласование.
    </div>
    <table>
      ${row("Повод обращения", payload.clinicalReason)}
      ${row("Диагноз / клиническое основание", payload.diagnosisSummary)}
      ${row("Зубы / область", payload.teethOrArea)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Прогноз и ограничения", payload.prognosisAndLimits ?? "")}
      ${row("Контрольный план", payload.controlPlan ?? "")}
      ${row("Врач", payload.doctorFullName ?? "")}
      ${row("Дата подготовки плана", payload.plannedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${renderGraphicalDentalFormulaHtml({
			clinicalToothRows: payload.clinicalToothRows,
			title: "Графическая зубная формула (FDI 11–48 / 51–85)",
		})}
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Цели лечения</h2>
    ${bulletList(payload.treatmentGoals)}
    <h2>Планируемые этапы</h2>
    <table>
      <tr><th>Этап</th><th>Услуги и объем</th><th>Срок</th><th>Клинические заметки</th><th>Оценка</th></tr>
      ${stageRows}
    </table>
    <h2>Альтернативы</h2>
    ${bulletList(payload.alternatives)}
    <h2>Риски и ограничения</h2>
    ${bulletList(payload.risksAndLimitations)}
    ${checkList([
			"пациент получил ответы на вопросы по плану лечения",
			"план лечения не заменяет отдельное информированное согласие перед вмешательством",
			"при изменении диагноза, объема, материалов, сроков или стоимости план требует нового согласования",
		])}
    ${signatureBlock("Пациент ознакомлен", signatureParty("Врач", payload.doctorFullName))}`;
	}

	return `<h2>Клинический план</h2>
    <table>
      ${row("Повод обращения", "заполнить из приема/диктовки")}
      ${row("Диагноз/предварительное заключение", "заполняет врач после осмотра и диагностики")}
      ${row("План лечения", document.title)}
      ${row("Ориентировочная стоимость", rub(document.totalAmountRub))}
    </table>
    <h2>Этапы</h2>
    ${checkList([
			"диагностика, фото-протокол, снимки при показаниях",
			"санация/терапия/гигиена перед ортопедией или хирургией",
			"основное лечение по специальности",
			"контрольный осмотр и рекомендации",
			"альтернативный план и отказанные варианты зафиксированы",
		])}
    <p class="small">План лечения не является подписанной медицинской записью до проверки врачом.</p>
    ${signatureBlock("Пациент ознакомлен", "Врач")}`;
}
