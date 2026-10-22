import { getDecontaminationMethod, getMedicalWasteClass, getMedicalWastePackaging } from "./medicalWastePresets.js";
import type { MedicalWasteTransferAct } from "./types";

export function generateWasteTransferActHtml(act: MedicalWasteTransferAct): string {
	const rowsHtml = act.transferredRecords.map((r, i) => {
		const classDef = getMedicalWasteClass(r.wasteClass);
		const packDef = getMedicalWastePackaging(r.packageType);
		const decontamDef = getDecontaminationMethod(r.decontaminationMethod);
		return `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.timestamp}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">Класс ${classDef.letterCode}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.departmentNameRu}</td>
			<td style="border: 1px solid #000; padding: 4px;">${packDef.nameRu}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.packageCount}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${r.netWeightKg.toFixed(2)}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.sealNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${decontamDef.nameRu}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт приема-передачи медицинских отходов № ${act.actNumber}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.3; color: #000; background: #fff; }
		.header { text-align: center; font-weight: bold; margin-bottom: 12px; }
		.title { font-size: 13pt; text-transform: uppercase; margin-bottom: 4px; }
		.parties { margin-bottom: 12px; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 14px; background: transparent; }
		th { border: 1px solid #000; padding: 5px; background: #fff; font-size: 9pt; font-weight: bold; }
		td { border: 1px solid #000; padding: 4px; background: #fff; }
		.totals { margin-bottom: 16px; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; }
		.sign-col { width: 46%; }
		@media print {
			body { background: #fff !important; color: #000 !important; }
			table, th, td { border: 1px solid #000 !important; background: #fff !important; color: #000 !important; }
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="title">АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ № ${act.actNumber}</div>
		<div>к Договору № ${act.disposalCompanyInfo.contractNumber} от ${act.disposalCompanyInfo.contractDate} г.</div>
		<div style="margin-top: 6px;">Дата составления: <strong>${act.actDate} г.</strong></div>
	</div>
	<div class="parties">
		<strong>Сдал (Клиника):</strong> ${act.clinicInfo.name}, ИНН ${act.clinicInfo.inn}, ОГРН ${act.clinicInfo.ogrn}, адрес: ${act.clinicInfo.address}, в лице ${act.clinicInfo.responsiblePosition} ${act.clinicInfo.responsiblePerson}.<br>
		<strong>Принял (Спецоператор):</strong> ${act.disposalCompanyInfo.name}, ИНН ${act.disposalCompanyInfo.inn}, Лицензия ${act.disposalCompanyInfo.licenseNumber}, водитель/экспедитор ${act.disposalCompanyInfo.driverFullName}, автотранспорт: ${act.disposalCompanyInfo.vehiclePlateNumber}.
	</div>
	<p>В соответствии с требованиями СанПиН 2.1.3684-21 Стороны подтверждают передачу следующей партии медицинских отходов:</p>
	<table>
		<thead>
			<tr><th>№</th><th>Дата накопления</th><th>Класс</th><th>Подразделение</th><th>Вид тары</th><th>Мест</th><th>Масса нетто (кг)</th><th>№ пломбы</th><th>Метод обеззараживания</th></tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #fff;">
				<td colspan="5" style="border: 1px solid #000; padding: 5px; text-align: right;">ВСЕГО ПЕРЕДАНО:</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: center;">${act.totalPackagesCount}</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: right;">${act.totalNetWeightKg.toFixed(2)}</td>
				<td colspan="2" style="border: 1px solid #000; padding: 5px;"></td>
			</tr>
		</tbody>
	</table>
	<div class="totals">
		Сводка по классам опасности:<br>
		- Класс А: ${act.totalsByClass.class_A.count} мест, масса ${act.totalsByClass.class_A.totalNetWeightKg.toFixed(2)} кг.<br>
		- Класс Б: ${act.totalsByClass.class_B.count} мест, масса ${act.totalsByClass.class_B.totalNetWeightKg.toFixed(2)} кг.<br>
		- Класс В: ${act.totalsByClass.class_V.count} мест, масса ${act.totalsByClass.class_V.totalNetWeightKg.toFixed(2)} кг.<br>
		- Класс Г: ${act.totalsByClass.class_G.count} мест, масса ${act.totalsByClass.class_G.totalNetWeightKg.toFixed(2)} кг.<br>
		<strong>Общая масса нетто: ${act.totalNetWeightKg.toFixed(2)} кг (${act.totalPackagesCount} упаковочных мест/контейнеров).</strong>
	</div>
	<div class="signatures">
		<div class="sign-col"><strong>СДАЛ:</strong> ${act.clinicInfo.responsiblePosition}<br>________________ / ${act.clinicInfo.responsiblePerson} /</div>
		<div class="sign-col"><strong>ПРИНЯЛ:</strong> Водитель-экспедитор Спецоператора<br>________________ / ${act.disposalCompanyInfo.driverFullName} /</div>
	</div>
</body>
</html>`;
}
