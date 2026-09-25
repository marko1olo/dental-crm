import { formatKopecksRu } from "@dental/shared";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
	getDiscrepancyReason,
} from "./clinicalWriteoffPresets.js";
import {
	type ClinicalWriteoffDocument,
	kopecksToRubles,
} from "./clinicalWriteoffEngine.js";

export function generateAct0504230Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines
		.map((line, index) => {
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);
			const diffStr =
				line.discrepancyQuantity > 0
					? `+${line.discrepancyQuantity}`
					: line.discrepancyQuantity < 0
						? `${line.discrepancyQuantity}`
						: "—";

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">
					<strong>${line.nameRu}</strong>
					${line.serialNumber ? `<br><small style="color: #475569;">SN: ${line.serialNumber}</small>` : ""}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${line.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.lotNumber || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.expirationDate || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit} (${line.okeiCode})</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${diffStr}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${line.serviceCode} (${doc.patientName}${line.toothNumber ? `, Зуб №${line.toothNumber}` : ""})
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${line.discrepancyNotes || reasonDef.labelRu}
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт о списании материальных запасов № ${doc.actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.25; color: #000; }
		.header-flex { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.okud-block { text-align: right; font-size: 8pt; }
		.act-title { text-align: center; font-weight: bold; font-size: 13pt; margin: 10px 0 4px; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signatures-row { display: flex; justify-content: space-between; margin-top: 25px; }
		.sign-col { width: 30%; }
	</style>
</head>
<body>
	<div class="header-flex">
		<div>
			<strong>Учреждение:</strong> ${info.clinicNameRu}<br>
			<strong>Структурное подразделение:</strong> ${doc.cabinetNameRu}<br>
			<strong>Материально ответственное лицо:</strong> ${doc.doctorFullName} (${doc.doctorSpecialty})<br>
			<strong>Пациент:</strong> ${doc.patientName} ${doc.patientBirthDate ? `(д.р. ${doc.patientBirthDate})` : ""}
		</div>
		<div class="okud-block">
			Унифицированная форма по <strong>ОКУД 0504230</strong><br>
			по ОКПО <strong>${info.okpoCode}</strong><br>
			ИНН <strong>${info.inn}</strong> / КПП <strong>${info.kpp}</strong><br>
			Приказ Минфина России № 52н
		</div>
	</div>

	<div class="act-title">АКТ О СПИСАНИИ МАТЕРИАЛЬНЫХ ЗАПАСОВ № ${doc.actNumber}</div>
	<div style="text-align: center; margin-bottom: 8px;">Дата составления: <strong>${doc.actDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th rowspan="2">№</th>
				<th rowspan="2">Наименование медикаментов и материалов</th>
				<th rowspan="2">Номенкл. номер</th>
				<th rowspan="2">Партия (LOT)</th>
				<th rowspan="2">Срок годности</th>
				<th rowspan="2">Ед. изм.</th>
				<th colspan="3">Количество</th>
				<th rowspan="2">Цена, руб.</th>
				<th rowspan="2">Сумма, руб.</th>
				<th rowspan="2">Направление расхода (Услуга 804н / Пациент)</th>
				<th rowspan="2">Причина расхождения / обоснование</th>
			</tr>
			<tr>
				<th>По норме</th>
				<th>Факт</th>
				<th>Откл.</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО ПО АКТУ:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">—</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalMaterialsQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">—</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
				<td colspan="2" style="border: 1px solid #000; padding: 4px;"></td>
			</tr>
		</tbody>
	</table>

	<p>
		Всего израсходовано <strong>${doc.lines.length}</strong> наименований на общую сумму <strong>${totals.totalCostRubles.toFixed(2)} руб.</strong> (${totals.totalCostFormatted}).<br>
		${
			doc.isQuickCarpuleWriteoff
				? "Списание пустых использованных карпул и ампул анестетиков произведено старшей медсестрой / ассистентом в упрощенном порядке (без созыва комиссии)."
				: doc.isSingleSigner
					? "Списание произведено в упрощенном порядке лечащим врачом / ответственным сотрудником (без созыва комиссии по приказу клиники)."
					: "Списание произведено в соответствии с клиническими протоколами Минздрава РФ и технологическими картами по Приказу № 804н."
		}
	</p>

	<div class="signatures-row">
		<div class="sign-col" style="width: 45%;">
			<strong>СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО):</strong><br>
			${doc.writtenOffByRole || (doc.isQuickCarpuleWriteoff ? (info.headNursePosition || "Старшая медицинская сестра") : (doc.doctorSpecialty || "Врач-стоматолог"))}<br>
			________________ / ${doc.assistantFullName || doc.doctorFullName || info.headNurseFullName} /<br>
			«____» ________________ 2026 г.
		</div>
		<div class="sign-col" style="width: 45%;">
			<strong>МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО:</strong><br>
			${doc.doctorSpecialty || "Заведующий кабинетом"}<br>
			________________ / ${doc.doctorFullName || info.chiefDoctorFullName} /
		</div>
	</div>
</body>
</html>`;
}

/**
 * Генерация Требования-накладной по форме № М-11 (ОКУД 0315003)
 */
export function generateFormM11Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines
		.map((line, index) => {
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${line.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${line.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.okeiCode}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Требование-накладная М-11 № ${doc.actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.25; color: #000; }
		.header { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 8px 0; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin: 10px 0; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signs { display: flex; justify-content: space-between; margin-top: 20px; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<strong>Организация:</strong> ${info.clinicNameRu}<br>
			<strong>Отправитель:</strong> Центральный материальный склад (Аптека)<br>
			<strong>Получатель:</strong> ${doc.cabinetNameRu} (${doc.doctorFullName})
		</div>
		<div style="text-align: right; font-size: 8pt;">
			Типовая межотраслевая форма № <strong>М-11</strong><br>
			Форма по <strong>ОКУД 0315003</strong><br>
			по ОКПО <strong>${info.okpoCode}</strong>
		</div>
	</div>

	<div class="title">ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${doc.actNumber}</div>
	<div style="text-align: center;">Дата: <strong>${doc.actDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование материала</th>
				<th>Номенклатурный номер</th>
				<th>Ед. изм.</th>
				<th>Код ОКЕИ</th>
				<th>Затребовано</th>
				<th>Отпущено</th>
				<th>Цена, руб.</th>
				<th>Сумма, руб.</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalMaterialsQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<div class="signs">
		<div>
			<strong>Отпустил:</strong><br>
			${info.headNursePosition}<br>
			________________ / ${info.headNurseFullName} /
		</div>
		<div>
			<strong>Получил:</strong><br>
			${doc.doctorSpecialty}<br>
			________________ / ${doc.doctorFullName} /
		</div>
	</div>
</body>
</html>`;
}

/**
 * Генерация Акта о списании товаров по форме № ТОРГ-16 (ОКУД 0330216)
 */
export function generateTorg16Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines
		.map((line, index) => {
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${line.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${line.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${line.discrepancyNotes || reasonDef.labelRu}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт о списании товаров ТОРГ-16 № ${doc.actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.25; color: #000; }
		.header { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 8px 0; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin: 10px 0; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signs { display: flex; justify-content: space-between; margin-top: 25px; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<strong>Организация:</strong> ${info.clinicNameRu}<br>
			<strong>Структурное подразделение:</strong> ${doc.cabinetNameRu}
		</div>
		<div style="text-align: right; font-size: 8pt;">
			Унифицированная форма № <strong>ТОРГ-16</strong><br>
			Форма по <strong>ОКУД 0330216</strong><br>
			по ОКПО <strong>${info.okpoCode}</strong>
		</div>
	</div>

	<div class="title">АКТ О СПИСАНИИ ТОВАРОВ № ${doc.actNumber}</div>
	<div style="text-align: center;">Дата составления: <strong>${doc.actDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование товара / материала</th>
				<th>Артикул (SKU)</th>
				<th>Ед. изм.</th>
				<th>Количество</th>
				<th>Цена, руб.</th>
				<th>Сумма, руб.</th>
				<th>Причина списания</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalMaterialsQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
			</tr>
		</tbody>
	</table>

	<div class="signs">
		<div style="width: 45%;">
			<strong>Списание произведено единолично:</strong><br>
			${doc.writtenOffByRole || (doc.isQuickCarpuleWriteoff ? (info.headNursePosition || "Старшая медицинская сестра") : (doc.doctorSpecialty || "Врач-стоматолог"))}<br>
			________________ / ${doc.assistantFullName || doc.doctorFullName || info.headNurseFullName} /
		</div>
		<div style="width: 45%;">
			<strong>Согласовано (МОЛ):</strong><br>
			${doc.doctorSpecialty || info.chiefDoctorPosition}<br>
			________________ / ${doc.doctorFullName || info.chiefDoctorFullName} /
		</div>
	</div>
</body>
</html>`;
}

/**
 * Экспорт реестра списаний в формат CSV (RFC 4180 с UTF-8 BOM)
 */
export function exportClinicalWriteoffToCsv(
	docs: readonly ClinicalWriteoffDocument[],
): string {
	const headers = [
		"№ акта",
		"Дата акта",
		"Пациент",
		"Врач",
		"Кабинет",
		"Код услуги 804н",
		"Материал",
		"Артикул (SKU)",
		"Серия (LOT)",
		"Серийный номер (SN)",
		"Срок годности",
		"Ед. изм.",
		"По норме",
		"Фактически",
		"Отклонение",
		"Цена, руб.",
		"Сумма, руб.",
		"Причина отклонения",
		"Статус",
	];

	const rows: string[] = [];

	for (const doc of docs) {
		for (const line of doc.lines) {
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);

			rows.push(
				[
					`"${doc.actNumber}"`,
					doc.actDate,
					`"${doc.patientName}"`,
					`"${doc.doctorFullName}"`,
					`"${doc.cabinetNameRu}"`,
					`"${line.serviceCode}"`,
					`"${line.nameRu}"`,
					`"${line.sku}"`,
					`"${line.lotNumber || ""}"`,
					`"${line.serialNumber || ""}"`,
					`"${line.expirationDate || ""}"`,
					`"${line.unit}"`,
					line.standardQuantity.toString(),
					line.actualQuantity.toString(),
					line.discrepancyQuantity.toString(),
					unitRub.toFixed(2),
					totalRub.toFixed(2),
					`"${line.discrepancyNotes || reasonDef.labelRu}"`,
					`"${doc.status}"`,
				].join(";"),
			);
		}
	}

	const csvContent = [headers.join(";"), ...rows].join("\r\n");
	return `\uFEFF${csvContent}`;
}

