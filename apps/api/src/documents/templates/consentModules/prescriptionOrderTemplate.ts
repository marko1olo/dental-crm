import { type GeneratedDocument } from "@dental/shared";
import { cell, clinicalToothRowsTable } from "../baseRenderUtils.js";
import { checkList, signatureBlock } from "../signatureRenderUtils.js";

export function prescriptionMedicationOrder(document: GeneratedDocument): string {
	const payload = document.payload?.prescriptionMedicationOrder;
	if (payload) {
		const medicationRows = payload.medications
			.map(
				(medication) =>
					`<tr>${cell(medication.medication)}${cell(medication.dosage)}${cell(medication.instructions)}${cell(medication.duration)}</tr>`,
			)
			.join("");
		return `<h2>Назначение лекарственных препаратов</h2>
      <div class="notice">
        Это структурированное назначение клиники. Если нужен рецептурный бланк или электронный рецепт, клиника оформляет его по утвержденному процессу.
      </div>
      <h2>Клиническая привязка назначения</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        <tr><th>Препарат</th><th>Дозировка</th><th>Как принимать</th><th>Срок</th></tr>
        ${medicationRows}
      </table>
      <h2>Контроль безопасности</h2>
      ${checkList([...payload.safetyNotes, `Срочно связаться с клиникой: ${payload.urgentContactReason}`])}
      ${signatureBlock("Пациент получил назначения", "Врач")}`;
	}
	return `<h2>Назначение лекарственных препаратов</h2>
    <div class="notice">
      Черновик назначения должен быть проверен врачом. Если требуется рецептурный бланк или электронный рецепт,
      клиника оформляет его по своему утвержденному процессу.
    </div>
    <table>
      <tr><th>Препарат</th><th>Дозировка</th><th>Как принимать</th><th>Срок</th></tr>
      <tr><td>____________________</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
      <tr><td>____________________</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
    </table>
    <h2>Контроль безопасности</h2>
    ${checkList([
			"аллергии, беременность/лактация, антикоагулянты и постоянные препараты сверены",
			"пациенту объяснено, что нельзя менять дозировку без врача",
			"указан повод срочно связаться с клиникой: отек, сыпь, одышка, кровотечение, нарастающая боль, температура",
			"назначения согласованы с проведенным вмешательством и медицинской записью",
		])}
    ${signatureBlock("Пациент получил назначения", "Врач")}`;
}
