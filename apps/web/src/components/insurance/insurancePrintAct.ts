/**
 * insurancePrintAct.ts — Генерация печатных форм двусторонних актов сдачи-приемки и экспорта CSV по ДМС.
 */

import {
	formatRubKopecks,
	calculateRegistryTotals,
	type DmsRegistryServiceRecord,
	type DmsRegistrySummary,
} from "./insuranceMath";

export interface ClinicActInfo {
	readonly name: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly bankAccount?: string | undefined;
	readonly bic?: string | undefined;
	readonly corrAccount?: string | undefined;
}

export interface InsurerActInfo {
	readonly name: string;
	readonly inn?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly representative: string;
}

export interface BilateralAcceptanceActParams {
	readonly records: readonly DmsRegistryServiceRecord[];
	readonly summary: DmsRegistrySummary;
	readonly clinicInfo: ClinicActInfo;
	readonly insurerInfo: InsurerActInfo;
	readonly actNumber: string;
	readonly actDate: string;
}

/**
 * Экспорт реестра в формат CSV (с поддержкой Excel, кодировка UTF-8 с BOM, разделитель ';')
 */
export function exportRegistryToCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinicInfo: { name: string; inn: string; kpp?: string | undefined },
	insurerName: string,
	periodStr: string,
): string {
	const escapeCsv = (val: string | number | null | undefined): string => {
		if (val == null) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const headerLines: string[] = [
		`# Реестр оказанных медицинских услуг по ДМС;${escapeCsv(clinicInfo.name)};ИНН: ${escapeCsv(clinicInfo.inn)}`,
		`# Страховая компания: ${escapeCsv(insurerName)};Период: ${escapeCsv(periodStr)}`,
		`# Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`,
		"",
		[
			escapeCsv("№ п/п"),
			escapeCsv("Дата визита"),
			escapeCsv("ФИО Пациента"),
			escapeCsv("Номер полиса ДМС"),
			escapeCsv("№ Гар. письма"),
			escapeCsv("Код услуги 804н"),
			escapeCsv("Наименование услуги"),
			escapeCsv("Диагноз (МКБ-10)"),
			escapeCsv("Зуб"),
			escapeCsv("Кол-во"),
			escapeCsv("Цена за ед. (руб)"),
			escapeCsv("Сумма всего (руб)"),
			escapeCsv("Покрыто ДМС (руб)"),
			escapeCsv("Доплата пациента (руб)"),
			escapeCsv("Врач-стоматолог"),
			escapeCsv("Статус/Примечание"),
		].join(";"),
	];

	const rows = records.map((r, idx) => {
		return [
			escapeCsv(idx + 1),
			escapeCsv(r.visitDate),
			escapeCsv(r.patientFullName),
			escapeCsv(r.policyNumber),
			escapeCsv(r.letterNumber || "—"),
			escapeCsv(r.serviceCode804n),
			escapeCsv(r.serviceName),
			escapeCsv(r.diagnosisCodeMkb10 || "—"),
			escapeCsv(r.toothNumber || "—"),
			escapeCsv(r.quantity),
			escapeCsv(r.unitPriceRub.toFixed(2)),
			escapeCsv(r.totalPriceRub.toFixed(2)),
			escapeCsv(r.dmsCoveredRub.toFixed(2)),
			escapeCsv(r.patientPaidRub.toFixed(2)),
			escapeCsv(r.doctorFullName || "—"),
			escapeCsv(r.isExcluded ? `Исключение (${r.exclusionReason || "не покрывается"})` : "Покрыто ДМС"),
		].join(";");
	});

	const totals = calculateRegistryTotals(records, insurerName, "", "");
	const totalRow = [
		escapeCsv("ИТОГО"),
		escapeCsv(""),
		escapeCsv(`Пациентов: ${totals.uniquePatientsCount}`),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(`Всего услуг: ${totals.totalServicesCount}`),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(totals.totalAmountRub.toFixed(2)),
		escapeCsv(totals.totalDmsCoveredRub.toFixed(2)),
		escapeCsv(totals.totalPatientPaidRub.toFixed(2)),
		escapeCsv(""),
		escapeCsv(totals.isBalanced ? "БАЛАНС СХОДИТСЯ" : "ОШИБКА БАЛАНСА"),
	].join(";");

	const csvContent = "\uFEFF" + [...headerLines, ...rows, "", totalRow].join("\r\n");
	return csvContent;
}

/**
 * Генерация HTML-шаблона двустороннего акта сдачи-приемки оказанных услуг по ДМС для печати
 */
export function generateBilateralAcceptanceActHtml(params: BilateralAcceptanceActParams): string {
	const { records, summary, clinicInfo, insurerInfo, actNumber, actDate } = params;

	const rowsHtml = records
		.map(
			(r, i) => `
		<tr>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.visitDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">${r.patientFullName}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.policyNumber}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${r.serviceCode804n}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.serviceName} ${r.toothNumber ? `(зуб ${r.toothNumber})` : ""}</td>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.quantity}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.unitPriceRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold;">${formatRubKopecks(r.dmsCoveredRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.patientPaidRub)}</td>
		</tr>
	`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сдачи-приемки оказанных медицинских услуг ДМС № ${actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #000; margin: 0; padding: 10px; }
		h1 { font-size: 14pt; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
		.subtitle { text-align: center; font-size: 11pt; margin-bottom: 16px; }
		.parties { margin-bottom: 14px; text-align: justify; }
		table.registry-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; }
		table.registry-table th { border: 1px solid #000; background: #f0f0f0; padding: 5px; text-align: center; font-weight: bold; }
		.totals-block { margin: 16px 0; font-size: 11pt; }
		.totals-block strong { font-size: 12pt; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
		.sign-box { width: 46%; border-top: 1px solid #000; padding-top: 8px; }
		.sign-title { font-weight: bold; margin-bottom: 6px; }
		.stamp-place { margin-top: 40px; font-size: 9pt; color: #555; }
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<h1>АКТ СДАЧИ-ПРИЕМКИ № ${actNumber}</h1>
	<div class="subtitle">оказанных медицинских услуг по Договору ДМС № ${insurerInfo.contractNumber} от ${insurerInfo.contractDate} г.</div>
	<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold;">
		<div>г. Москва</div>
		<div>${actDate} г.</div>
	</div>

	<div class="parties">
		<strong>Исполнитель:</strong> ${clinicInfo.name}, ИНН ${clinicInfo.inn}, ОГРН ${clinicInfo.ogrn || "—"}, адрес: ${clinicInfo.address}, в лице Главного врача ${clinicInfo.chiefDoctor}, с одной стороны, и<br>
		<strong>Заказчик (Страховщик):</strong> ${insurerInfo.name}, ИНН ${insurerInfo.inn || "—"}, в лице ${insurerInfo.representative}, с другой стороны, составили настоящий Акт о нижеследующем:
	</div>

	<div style="margin-bottom: 8px;">
		1. В соответствии с условиями Договора ДМС Исполнителем в период с <strong>${summary.periodStart || "начало месяца"}</strong> по <strong>${summary.periodEnd || "конец месяца"}</strong> были надлежащим образом и в полном объеме оказаны медицинские услуги застрахованным лицам Заказчика:
	</div>

	<table class="registry-table">
		<thead>
			<tr>
				<th>№</th>
				<th>Дата</th>
				<th>Застрахованный (Пациент)</th>
				<th>Полис ДМС</th>
				<th>Код 804н</th>
				<th>Наименование услуги</th>
				<th>Кол-во</th>
				<th>Тариф (руб)</th>
				<th>К оплате ДМС</th>
				<th>Доплата пациента</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #fafafa;">
				<td colspan="6" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО К ОПЛАТЕ СТРАХОВЩИКОМ:</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: center;">${summary.totalServicesCount}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalAmountRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000; font-size: 10.5pt;">${formatRubKopecks(summary.totalDmsCoveredRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalPatientPaidRub)}</td>
			</tr>
		</tbody>
	</table>

	<div class="totals-block">
		2. Общая стоимость оказанных медицинских услуг составляет <strong>${formatRubKopecks(summary.totalAmountRub)}</strong>.<br>
		3. Сумма, подлежащая перечислению Страховщиком на расчетный счет Исполнителя: <strong>${formatRubKopecks(summary.totalDmsCoveredRub)}</strong> (НДС не облагается на основании пп. 2 п. 2 ст. 149 НК РФ).<br>
		4. Сумма софинансирования/доплаты, оплаченная непосредственно пациентами: <strong>${formatRubKopecks(summary.totalPatientPaidRub)}</strong>.<br>
		5. Стороны взаимных претензий по объему, качеству и срокам оказания медицинских услуг не имеют.
	</div>

	<div class="signatures">
		<div class="sign-box">
			<div class="sign-title">ОТ ИСПОЛНИТЕЛЯ (Клиника):</div>
			<div>${clinicInfo.name}</div>
			<div style="margin-top: 15px;">Главный врач: ________________ / ${clinicInfo.chiefDoctor} /</div>
			<div class="stamp-place">М.П.</div>
		</div>
		<div class="sign-box">
			<div class="sign-title">ОТ ЗАКАЗЧИКА (Страховщик):</div>
			<div>${insurerInfo.name}</div>
			<div style="margin-top: 15px;">Представитель: ________________ / ${insurerInfo.representative} /</div>
			<div class="stamp-place">М.П.</div>
		</div>
	</div>
</body>
</html>
`;
}
