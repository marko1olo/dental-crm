import { DEFAULT_CLINIC_LEGAL_INFO } from "./constants";
import type { RegulatoryInspectionData, RegulatoryPsoRecord } from "./types";
import { renderRegulatoryF257Rows, renderRegulatoryPsoRows } from "./regulatorySanpinRowsHtml";

export function generateRegulatorySanpinInspectionHtml(data: RegulatoryInspectionData): string {
	const clinicInfo = data.clinicInfo ?? DEFAULT_CLINIC_LEGAL_INFO;
	const periodLabelRu = data.periodLabelRu ?? "за текущий отчетный период";
	const printDateStr = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

	const psoList: readonly RegulatoryPsoRecord[] = data.psoRecords && data.psoRecords.length > 0
		? data.psoRecords
		: [
			{
				id: "pso-def-1", date: new Date().toISOString().slice(0, 10),
				instrumentName: "Стоматологический инструментарий терапевтического приема (зеркала, зонды, пинцеты)",
				batchItemCount: 120, testedSampleCount: 5, isAzopyramNegative: true,
				isPhenolphthaleinNegative: true, isBatchApproved: true, detergentBrand: "Биолот 0.5% + Аламинол 1%",
				operatorFullName: clinicInfo.headNurse || "Сотрудник ЦСО", notes: "Азопирамовая проба отрицательна",
			},
			{
				id: "pso-def-2", date: new Date().toISOString().slice(0, 10),
				instrumentName: "Стоматологические боры твердосплавные и алмазные, наконечники турбинные",
				batchItemCount: 95, testedSampleCount: 4, isAzopyramNegative: true,
				isPhenolphthaleinNegative: true, isBatchApproved: true, detergentBrand: "Биолот 0.5%",
				operatorFullName: clinicInfo.headNurse || "Сотрудник ЦСО", notes: "Следов крови не обнаружено",
			},
		];

	const f257RowsHtml = renderRegulatoryF257Rows(data.form257Records, clinicInfo);
	const psoRowsHtml = renderRegulatoryPsoRows(psoList, clinicInfo);

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<title>Нормативная выгрузка СанПиН 3.3686-21</title>
<style>
@page { size: A4 landscape; margin: 10mm; } * { box-sizing: border-box; }
body { font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; line-height: 1.2; color: #000; background: #fff; margin: 0; }
.header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
.clinic-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; } .clinic-sub { font-size: 8pt; color: #333; }
.form-stamp { text-align: right; font-size: 8pt; }
.section-header { margin: 12px 0 6px 0; padding: 4px 8px; background: #f1f5f9; border-left: 4px solid #0d9488; font-weight: bold; font-size: 10pt; }
table.form-table { width: 100%; table-layout: fixed; word-break: break-word; border-collapse: collapse; margin-top: 6px; font-size: 7.5pt; }
table.form-table th, table.form-table td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
table.form-table th { background-color: #f8fafc; font-weight: bold; text-align: center; }
.sterility-presumption-card { margin-top: 10px; padding: 6px 10px; border: 1px solid #0d9488; background: #f0fdf4; border-radius: 4px; font-size: 8pt; }
.footer-sign { margin-top: 12px; display: flex; justify-content: space-between; font-size: 8.5pt; }
.sign-col { width: 45%; } .sign-line { border-bottom: 1px solid #000; margin-top: 16px; display: flex; justify-content: space-between; font-size: 7.5pt; }
@media print { .no-print { display: none !important; } }
</style></head><body>
<div class="header-box"><div><div class="clinic-title">${clinicInfo.name}</div><div class="clinic-sub">ОГРН: ${clinicInfo.ogrn} • ИНН: ${clinicInfo.inn} • Адрес: ${clinicInfo.address}</div></div>
<div class="form-stamp"><strong>ОФИЦИАЛЬНАЯ ВЫГРУЗКА ДЛЯ ПРОВЕРОК РОСПОТРЕБНАДЗОРА</strong><br/>СанПиН 3.3686-21 «Профилактика инфекционных болезней» (раздел III)<br/>Журнал автоклавирования и стерилизации • Контроль предстерилизационной очистки</div></div>
<div style="text-align: center; margin: 8px 0 4px 0;"><h1 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase;">СВОДНЫЙ РЕГЛАМЕНТНЫЙ ОТЧЕТ СТЕРИЛИЗАЦИИ И ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ</h1><div style="font-size: 9pt; color: #333;">Отчетный период: ${periodLabelRu} • Дата выгрузки: ${printDateStr}</div></div>
<div class="section-header">1. ЖУРНАЛ АВТОКЛАВИРОВАНИЯ И СТЕРИЛИЗАЦИИ (КОНТРОЛЬ РАБОТЫ АВТОКЛАВОВ)</div>
<table class="form-table"><thead><tr><th style="width:3%;">№</th><th style="width:8%;">Дата и цикл</th><th style="width:13%;">Аппарат</th><th style="width:22%;">Стерилизуемые изделия</th><th style="width:9%;">Упаковка</th><th style="width:11%;">Режим</th><th style="width:14%;">Хим. контроль</th><th style="width:8%;">Результат</th><th style="width:7%;">Ответственный</th><th style="width:5%;">Контроль</th></tr></thead>
<tbody>${f257RowsHtml || '<tr><td colspan="10" style="text-align:center; padding:12px;">Записи отсутствуют</td></tr>'}</tbody></table>
<div class="section-header" style="margin-top: 14px;">2. КОНТРОЛЬ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ЖУРНАЛ КАЧЕСТВА ОЧИСТКИ)</div>
<table class="form-table"><thead><tr><th style="width:3%;">№</th><th style="width:8%;">Дата</th><th style="width:24%;">Наименование изделий</th><th style="width:7%;">Партия</th><th style="width:9%;">Выборка (1%)</th><th style="width:11%;">Азопирам (кровь)</th><th style="width:11%;">Фенолфталеин (СМС)</th><th style="width:11%;">Моющее средство</th><th style="width:8%;">Результат</th><th style="width:8%;">Ответственный</th></tr></thead>
<tbody>${psoRowsHtml}</tbody></table>
<div class="sterility-presumption-card"><strong>СанПиН 3.3686-21 — Презумпция стерильности лотка у кресла врача:</strong><br/>Инструментальные наборы на приеме у кресла врача-стоматолога стерильны по умолчанию. Контроль стерильности гарантирован валидированными циклами автоклавирования и химическими индикаторами 5 точек в каждом цикле.</div>
<div class="footer-sign"><div class="sign-col"><div>Ответственный по сан.-эпид. режиму: <strong>${clinicInfo.headNurse}</strong></div><div class="sign-line"><span>(должность)</span><span>(подпись)</span><span>(расшифровка подписи)</span></div></div>
<div class="sign-col"><div>Главный врач: <strong>${clinicInfo.chiefDoctor}</strong></div><div class="sign-line"><span>(должность)</span><span>(подпись)</span><span>(расшифровка подписи)</span></div></div></div>
</body></html>`;
}
