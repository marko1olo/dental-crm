import { escapeXml } from "./escapeXml";
import type { ConsolidatedStaffPayrollSummary } from "../engine/staffPayrollAssistantAdminTypes";
import { renderStaffRecordAccrualsXml } from "./zup31XmlAccruals";

export function generate1CZup31Xml(
	summary: ConsolidatedStaffPayrollSummary,
	documentNumber: string = "ЗП-001",
	documentDate: string = new Date().toISOString().slice(0, 10)
): string {
	const docDateFormatted = documentDate;
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);

	const accrualsXml = summary.records
		.map((r) => renderStaffRecordAccrualsXml(r).join("\n"))
		.filter((str) => str.length > 0)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<ЗарплатаКадрыДокумент xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.13" ВерсияФормата="1.13">
\t<Документ ОтражениеЗарплатыВБухучете Номер="${escapeXml(documentNumber)}" Дата="${escapeXml(docDateFormatted)}">
\t\t<Организация>
\t\t\t<Наименование>${escapeXml(summary.clinicName)}</Наименование>
\t\t\t<ИНН>${escapeXml(summary.organizationInn)}</ИНН>
\t\t\t<КПП>${escapeXml(summary.organizationKpp)}</КПП>
\t\t</Организация>
\t\t<ПериодРегистрации>${escapeXml(summary.periodStartIso.slice(0, 7))}-01</ПериодРегистрации>
\t\t<ИтогоНачислено>${totalGrossRub}</ИтогоНачислено>
\t\t<Начисления>
${accrualsXml}
\t\t</Начисления>
\t</Документ>
</ЗарплатаКадрыДокумент>`;
}
