import {
	type GeneratedDocument,
	type TreatmentPlanAcceptancePayload,
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
} from "../signatureRenderUtils.js";

export function treatmentPlanAcceptanceVariantLabel(
	value: TreatmentPlanAcceptancePayload["selectedVariant"],
): string {
	const labels: Record<
		TreatmentPlanAcceptancePayload["selectedVariant"],
		string
	> = {
		urgent: "срочный",
		standard: "стандартный",
		optimal: "оптимальный",
		staged: "этапный",
		maintenance: "поддерживающий",
		other: "индивидуальный",
	};
	return labels[value] ?? value;
}

export function fallbackTreatmentPlanAcceptance(document: GeneratedDocument): string {
	return `<h2>Согласование плана лечения</h2>
    <table>
      ${row("Выбранный вариант", "срочный / стандартный / оптимальный / этапный / поддерживающий")}
      ${row("Клиническая цель", "заполнить врачом: санация, восстановление функции, эстетика, подготовка к протезированию/имплантации")}
      ${row("Зубы/область", "заполнить по FDI или сегментам")}
      ${row("Ориентировочная стоимость", rub(document.totalAmountRub))}
      ${row("Срок действия сметы", "указать локальным правилом клиники")}
    </table>
    <h2>Пациенту объяснено</h2>
    ${checkList([
			"диагноз, цель лечения, этапы, сроки и ожидаемый результат",
			"альтернативные варианты: наблюдение, терапия, хирургия, ортопедия, ортодонтия, имплантация или отказ",
			"что стоимость меняется при новых клинических данных, КТ/снимках, осложнениях или изменении выбранных материалов",
			"какие варианты пациент отклонил и чем это может повлиять на прогноз",
			"гарантийные условия, ограничения и необходимость контрольных посещений",
		])}
    <h2>Отклоненные или отложенные варианты</h2>
    <p>______________________________________________________________________________</p>
    <p>______________________________________________________________________________</p>
    ${signatureBlock("Пациент согласовал план", "Врач")}`;
}

export function treatmentPlanAcceptance(document: GeneratedDocument): string {
	const payload = document.payload?.treatmentPlanAcceptance as
		| TreatmentPlanAcceptancePayload
		| undefined;
	if (!payload) {
		return fallbackTreatmentPlanAcceptance(document);
	}

	const stageRows = payload.acceptedStages
		.map(
			(stage) =>
				`<tr>${cell(stage.stageName)}${cell(stage.plannedServices)}${cell(stage.plannedTiming)}${cell(rub(stage.estimatedAmountRub ?? null))}</tr>`,
		)
		.join("");

	return `<h2>Согласование плана лечения</h2>
    <div class="notice">
      Документ фиксирует выбранный пациентом вариант лечения, сумму и границы согласия. Изменение диагноза, объема, материалов, сроков или стоимости оформляется новым согласованием или дополнительным соглашением.
    </div>
    <table>
      ${row("Выбранный вариант", treatmentPlanAcceptanceVariantLabel(payload.selectedVariant))}
      ${row("Клиническая цель", payload.clinicalGoal)}
      ${row("Диагноз / клиническое основание", payload.diagnosisSummary)}
      ${row("Зубы / область", payload.teethOrArea)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Смета действует до", payload.estimateValidUntil)}
      ${row("Условия оплаты", payload.paymentTerms)}
      ${row("Гарантия и контроль", payload.warrantyAndControlTerms)}
      ${row("Врач", payload.doctorFullName)}
      ${row("Дата и время согласования", payload.acceptedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Согласованные этапы</h2>
    <table>
      <tr><th>Этап</th><th>Услуги и объем</th><th>Срок</th><th>Оценка</th></tr>
      ${stageRows}
    </table>
    <h2>Отклоненные или отложенные альтернативы</h2>
    ${bulletList(payload.rejectedAlternatives)}
    <h2>Риски и ограничения</h2>
    ${bulletList(payload.risksAndLimitations)}
    ${checkList([
			"пациент получил ответы на вопросы до согласования плана",
			"пациенту объяснены альтернативы, включая наблюдение, второй взгляд, перенос лечения и отказ",
			"пациент понимает, что стоимость и сроки могут измениться при новых клинических данных, снимках, осложнениях или выборе других материалов",
			"существенное изменение объема лечения требует нового согласования",
		])}
    ${signatureBlock("Пациент согласовал план", "Врач")}`;
}
