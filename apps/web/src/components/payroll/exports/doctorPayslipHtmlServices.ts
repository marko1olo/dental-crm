import { escapeXml } from "./escapeXml";
import type { DoctorPayrollResult, DoctorCompletedServiceItem } from "@dental/shared/payroll";

export function renderDoctorPayslipServicesTableHtml(
	payrollResult: DoctorPayrollResult,
	services?: readonly DoctorCompletedServiceItem[]
): string {
	if (!services || services.length === 0) return "";
	const isChairRental = payrollResult.payoutModel === "chair_rental";

	const serviceRows = services.map((s, index) => {
		const paidKop = s.actuallyPaidGrossKop ?? s.paidAmountKop ?? (s.isPaid ? s.grossRevenueKop : 0);
		const labKop = s.labCostKop ?? 0;
		const matKop = s.materialCostKop ?? 0;
		const netBaseKop = Math.max(0, paidKop - labKop - matKop);
		const pct = s.customCommissionPercent ?? payrollResult.baseCommissionPercent;
		const earnedKop = isChairRental ? netBaseKop : Math.round((netBaseKop * pct) / 100);

		const paidFormatted = (paidKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const labFormatted = labKop > 0 ? `-${(labKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽` : "—";
		const earnedFormatted = (earnedKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });

		return `<tr>
			<td style="text-align: center; color: #64748b;">${index + 1}</td>
			<td style="font-family: monospace;">${escapeXml(s.dateIso || "—")}</td>
			<td>${escapeXml(s.patientName)}${s.medicalCardNumber ? ` (${escapeXml(s.medicalCardNumber)})` : ""}</td>
			<td style="text-align: center; font-weight: bold;">${escapeXml(s.toothCode || "—")}</td>
			<td>${escapeXml(s.serviceNameRu)}</td>
			<td class="num">${paidFormatted} ₽</td>
			<td class="num" style="${labKop > 0 ? "color: #b91c1c;" : ""}">${labFormatted}</td>
			<td class="num" style="font-weight: 600; color: #0d9488;">${earnedFormatted} ₽</td>
		</tr>`;
	}).join("\n");

	return `
	<h2 style="font-size: 11pt; margin: 20px 0 8px 0; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
		Детализация приёмов и оказанных услуг по пациентам (Касса 54-ФЗ)
	</h2>
	<table class="table" style="font-size: 8.5pt;">
		<thead>
			<tr>
				<th style="width: 25px; text-align: center;">№</th>
				<th style="width: 75px;">Дата</th>
				<th>Пациент (№ карты)</th>
				<th style="width: 40px; text-align: center;">Зуб</th>
				<th>Наименование услуги</th>
				<th style="width: 90px; text-align: right;">Оплата 54-ФЗ</th>
				<th style="width: 80px; text-align: right;">Вычет ЗТЛ</th>
				<th style="width: 90px; text-align: right;">Начислено</th>
			</tr>
		</thead>
		<tbody>
			${serviceRows}
		</tbody>
	</table>`;
}
