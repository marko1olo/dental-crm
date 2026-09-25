import type {
	WarehouseInventoryAuditDocument,
	WarehouseTorg16WriteoffAct,
	WarehouseAuditItemLine,
	WarehouseInventoryCommissionMember,
} from "./warehouseInventoryEngine.js";
import {
	formatRubCurrency,
	formatKopecksToRublesPlain,
	numberToRussianWordsKopecks,
	kopecksToRubles,
	calculateInventoryAuditTotals,
} from "./warehouseInventoryEngine.js";

export function exportInventoryToCsv(doc: WarehouseInventoryAuditDocument): string {
	const header = [
		"№ п/п",
		"Артикул",
		"Наименование ТМЦ",
		"Категория",
		"Ед.изм",
		"Код ОКЕИ",
		"Партия (LOT)",
		"Срок годности",
		"FEFO Статус",
		"Учетное кол-во",
		"Фактическое кол-во",
		"Разница (кол-во)",
		"Тип расхождения",
		"Учетная цена (руб)",
		"Учетная сумма (руб)",
		"Фактическая сумма (руб)",
		"Излишек (руб)",
		"Недостача (руб)",
		"Место хранения",
	].join(";");

	const rows = doc.items.map((it, idx) => {
		const surplusRub = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageRub = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";
		const fefoRu = it.fefoStatus === "expired" ? "Просрочен" : it.fefoStatus === "warning_30" ? "<30 дней" : it.fefoStatus === "warning_60" ? "<60 дней" : "Свежий";
		const discRu = it.discrepancyType === "surplus" ? "Излишек" : it.discrepancyType === "shortage" ? "Недостача" : "Норма";

		return [
			idx + 1,
			`"${it.sku.replace(/"/g, '""')}"`,
			`"${it.nameRu.replace(/"/g, '""')}"`,
			`"${it.category.replace(/"/g, '""')}"`,
			`"${it.unitRu}"`,
			`"${it.okeiCode}"`,
			`"${it.batchNumber.replace(/"/g, '""')}"`,
			it.expiryDate,
			`"${fefoRu}"`,
			it.bookQuantity,
			it.actualQuantity,
			it.discrepancyQuantity,
			`"${discRu}"`,
			kopecksToRubles(it.unitCostKopecks).toFixed(2),
			kopecksToRubles(it.bookTotalKopecks).toFixed(2),
			kopecksToRubles(it.actualTotalKopecks).toFixed(2),
			surplusRub,
			shortageRub,
			`"${(it.storageLocationRu || "").replace(/"/g, '""')}"`,
		].join(";");
	});

	return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function exportInv19DiscrepanciesToCsv(doc: WarehouseInventoryAuditDocument): string {
	const discrepancies = doc.items.filter((it) => it.discrepancyType !== "match");
	const header = [
		"№",
		"Артикул",
		"Наименование ТМЦ",
		"Партия (LOT)",
		"Срок годности",
		"Учетное кол-во",
		"Фактическое кол-во",
		"Излишек (кол-во)",
		"Излишек (руб)",
		"Недостача (кол-во)",
		"Недостача (руб)",
		"Учетная цена (руб)",
	].join(";");

	const rows = discrepancies.map((it, idx) => {
		const surplusQty = it.discrepancyType === "surplus" ? it.discrepancyQuantity : 0;
		const surplusSum = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageQty = it.discrepancyType === "shortage" ? Math.abs(it.discrepancyQuantity) : 0;
		const shortageSum = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";

		return [
			idx + 1,
			`"${it.sku.replace(/"/g, '""')}"`,
			`"${it.nameRu.replace(/"/g, '""')}"`,
			`"${it.batchNumber.replace(/"/g, '""')}"`,
			it.expiryDate,
			it.bookQuantity,
			it.actualQuantity,
			surplusQty,
			surplusSum,
			shortageQty,
			shortageSum,
			kopecksToRubles(it.unitCostKopecks).toFixed(2),
		].join(";");
	});

	return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

// ---------------------------------------------------------------------------
// Экспорт в формат 1С (CommerceML 2.09 / XML Инвентаризация)
// ---------------------------------------------------------------------------

export function exportInventoryTo1C(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const xmlItems = doc.items.map((it) => `
    <Товар>
      <Ид>${it.itemId}</Ид>
      <Артикул>${it.sku}</Артикул>
      <Наименование>${it.nameRu}</Наименование>
      <БазоваяЕдиница Код="${it.okeiCode}">${it.unitRu}</БазоваяЕдиница>
      <Серия>${it.batchNumber}</Серия>
      <СрокГодности>${it.expiryDate}</СрокГодности>
      <КоличествоУчет>${it.bookQuantity}</КоличествоУчет>
      <КоличествоФакт>${it.actualQuantity}</КоличествоФакт>
      <КоличествоОтклонение>${it.discrepancyQuantity}</КоличествоОтклонение>
      <Цена>${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</Цена>
      <СуммаУчет>${kopecksToRubles(it.bookTotalKopecks).toFixed(2)}</СуммаУчет>
      <СуммаФакт>${kopecksToRubles(it.actualTotalKopecks).toFixed(2)}</СуммаФакт>
    </Товар>`).join("");

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация ВерсияСхемы="2.09" ДатаФормирования="${new Date().toISOString()}">
  <Документ.ИнвентаризацияТоваровНаСкладе>
    <Номер>${doc.documentNumber}</Номер>
    <Дата>${doc.auditDate}</Дата>
    <Организация>
      <Наименование>${doc.organizationNameRu}</Наименование>
      <ОКПО>${doc.organizationOkpo}</ОКПО>
      <ИНН>${doc.organizationInn}</ИНН>
    </Организация>
    <Склад>${doc.warehouseNameRu}</Склад>
    <МОЛ>${doc.molFullName}</МОЛ>
    <Основание>Приказ № ${doc.orderNumber} от ${doc.orderDate}</Основание>
    <СуммаУчетВсего>${totals.totalBookCostRubles.toFixed(2)}</СуммаУчетВсего>
    <СуммаФактВсего>${totals.totalActualCostRubles.toFixed(2)}</СуммаФактВсего>
    <СуммаИзлишекВсего>${totals.totalSurplusCostRubles.toFixed(2)}</СуммаИзлишекВсего>
    <СуммаНедостачаВсего>${totals.totalShortageCostRubles.toFixed(2)}</СуммаНедостачаВсего>
    <Товары>${xmlItems}
    </Товары>
  </Документ.ИнвентаризацияТоваровНаСкладе>
</КоммерческаяИнформация>`;
}

// ---------------------------------------------------------------------------
// Печатные формы (ИНВ-3, ИНВ-19, ТОРГ-16)
// ---------------------------------------------------------------------------

export function generateInv3Html(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const rows = doc.items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: center;">${it.okeiCode}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${it.actualQuantity}</td>
      <td style="text-align: right; font-weight: bold;">${kopecksToRubles(it.actualTotalKopecks).toFixed(2)}</td>
      <td style="text-align: right;">${it.bookQuantity}</td>
      <td style="text-align: right;">${kopecksToRubles(it.bookTotalKopecks).toFixed(2)}</td>
    </tr>`).join("");

	const commissionSigns = doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position} (${c.role === "chairman" ? "Председатель" : "Член комиссии"}):</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-3: ${doc.documentNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .receipt-box { border: 1px solid #000; padding: 8px; font-size: 9.5pt; margin-bottom: 12px; }
    .footer-box { margin-top: 16px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ИНВ-3<br>
    Утверждена постановлением Госкомстата РФ от 18.08.1998 № 88<br>
    Код по ОКУД <b>0317004</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад / Подразделение:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>Материально ответственное лицо:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div>
      <b>Номер описи:</b> ${doc.documentNumber}<br>
      <b>Дата составления:</b> ${doc.auditDate}<br>
      <b>Основание:</b> Приказ № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ</h2>
  <h3>товарно-материальных ценностей № ${doc.documentNumber}</h3>

  <div class="receipt-box">
    <b>Расписка:</b> К началу проведения инвентаризации все расходные и приходные документы на товарно-материальные ценности сданы в бухгалтерию, и все ценности, поступившие на мою ответственность, оприходованы, а выбывшие списаны в расход.<br>
    Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th>
        <th rowspan="2">Наименование ТМЦ</th>
        <th rowspan="2">Артикул</th>
        <th rowspan="2">Партия (LOT)</th>
        <th rowspan="2">Срок годности</th>
        <th colspan="2">Ед. изм.</th>
        <th rowspan="2">Цена (руб.)</th>
        <th colspan="2">Фактическое наличие</th>
        <th colspan="2">По данным учета</th>
      </tr>
      <tr>
        <th>наим.</th>
        <th>ОКЕИ</th>
        <th>Кол-во</th>
        <th>Сумма (руб.)</th>
        <th>Кол-во</th>
        <th>Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="8" style="text-align: right;">ИТОГО ПО ОПИСИ:</td>
        <td style="text-align: right;">${totals.totalActualQuantity}</td>
        <td style="text-align: right;">${totals.totalActualCostRubles.toFixed(2)}</td>
        <td style="text-align: right;">${totals.totalBookQuantity}</td>
        <td style="text-align: right;">${totals.totalBookCostRubles.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого фактическая сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalActualCostKopecks)}<br>
    <b>Итого учетная сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalBookCostKopecks)}
  </div>

  <div class="footer-box">
    <h4>Члены инвентаризационной комиссии:</h4>
    ${commissionSigns}
    <div style="margin-top: 12px;">
      Все ценности, поименованные в настоящей описи с № 1 по № ${doc.items.length}, комиссией проверены в натуре в моем присутствии и внесены в опись.<br>
      Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
    </div>
  </div>
</body>
</html>`;
}

export function generateInv19Html(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const discrepancies = doc.items.filter((it) => it.discrepancyType !== "match");

	const rows = discrepancies.map((it, idx) => {
		const surplusQty = it.discrepancyType === "surplus" ? it.discrepancyQuantity : 0;
		const surplusSum = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageQty = it.discrepancyType === "shortage" ? Math.abs(it.discrepancyQuantity) : 0;
		const shortageSum = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";

		return `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; background: #ecfdf5; font-weight: bold;">${surplusQty > 0 ? surplusQty : "-"}</td>
      <td style="text-align: right; background: #ecfdf5; font-weight: bold;">${surplusQty > 0 ? surplusSum : "-"}</td>
      <td style="text-align: right; background: #fef2f2; font-weight: bold;">${shortageQty > 0 ? shortageQty : "-"}</td>
      <td style="text-align: right; background: #fef2f2; font-weight: bold;">${shortageQty > 0 ? shortageSum : "-"}</td>
    </tr>`;
	}).join("");

	const commissionSigns = doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position}:</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-19: ${doc.documentNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ИНВ-19<br>
    Утверждена постановлением Госкомстата РФ от 18.08.1998 № 88<br>
    Код по ОКУД <b>0317019</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>МОЛ:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div>
      <b>Ведомость к описи №:</b> ${doc.documentNumber}<br>
      <b>Дата сверки:</b> ${doc.auditDate}<br>
      <b>Приказ:</b> № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ</h2>
  <h3>результатов инвентаризации ТМЦ № ${doc.documentNumber}</h3>

  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th>
        <th rowspan="2">Наименование ТМЦ</th>
        <th rowspan="2">Артикул</th>
        <th rowspan="2">Партия (LOT)</th>
        <th rowspan="2">Срок годности</th>
        <th rowspan="2">Ед. изм.</th>
        <th rowspan="2">Цена (руб.)</th>
        <th colspan="2" style="background: #d1fae5;">Излишки</th>
        <th colspan="2" style="background: #fee2e2;">Недостачи</th>
      </tr>
      <tr>
        <th style="background: #d1fae5;">Кол-во</th>
        <th style="background: #d1fae5;">Сумма (руб.)</th>
        <th style="background: #fee2e2;">Кол-во</th>
        <th style="background: #fee2e2;">Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="11" style="text-align: center; padding: 12px;">Расхождений не выявлено (книжные остатки совпадают с фактическими на 100%).</td></tr>'}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="7" style="text-align: right;">ИТОГО РАСХОЖДЕНИЙ:</td>
        <td style="text-align: right; color: #059669;">${totals.totalSurplusQuantity}</td>
        <td style="text-align: right; color: #059669;">${totals.totalSurplusCostRubles.toFixed(2)}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalShortageQuantity}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalShortageCostRubles.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого излишек прописью:</b> ${numberToRussianWordsKopecks(totals.totalSurplusCostKopecks)}<br>
    <b>Итого недостача прописью:</b> ${numberToRussianWordsKopecks(totals.totalShortageCostKopecks)}<br>
    <b>Итоговое сальдо сверки:</b> ${totals.netDiscrepancyCostRubles >= 0 ? "+" : ""}${totals.netDiscrepancyCostRubles.toFixed(2)} руб.
  </div>

  <div style="margin-top: 16px;">
    <h4>Подписи членов комиссии и МОЛ:</h4>
    ${commissionSigns}
    <div style="margin-top: 12px;">
      С результатами сличения согласен:<br>
      Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
    </div>
  </div>
</body>
</html>`;
}

export function generateTorg16Html(act: WarehouseTorg16WriteoffAct): string {
	const rows = act.items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: right;">${it.quantity}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${it.totalCostRubles.toFixed(2)}</td>
      <td>${it.defectDescriptionRu}</td>
    </tr>`).join("");

	const commissionSigns = act.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position}:</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ТОРГ-16: ${act.actNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ТОРГ-16<br>
    Утверждена постановлением Госкомстата РФ от 25.12.1998 № 132<br>
    Код по ОКУД <b>0330216</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${act.organizationNameRu} (ОКПО: ${act.organizationOkpo}, ИНН: ${act.organizationInn})<br>
      <b>Склад:</b> ${act.warehouseNameRu}<br>
      <b>МОЛ:</b> ${act.molPosition} ${act.molFullName}
    </div>
    <div>
      <b>Акт №:</b> ${act.actNumber}<br>
      <b>Дата:</b> ${act.actDate}<br>
      <b>Основание:</b> Опись ${act.inventoryDocNumber}
    </div>
  </div>

  <h2>АКТ О СПИСАНИИ ТОВАРОВ</h2>
  <h3>№ ${act.actNumber} от ${act.actDate}</h3>

  <p><b>Причина списания:</b> ${act.reasonRu}</p>

  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Наименование ТМЦ</th>
        <th>Артикул</th>
        <th>Партия (LOT)</th>
        <th>Срок годности</th>
        <th>Ед.</th>
        <th>Кол-во</th>
        <th>Цена (руб.)</th>
        <th>Сумма (руб.)</th>
        <th>Причина списания</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="6" style="text-align: right;">ВСЕГО ПО АКТУ:</td>
        <td style="text-align: right;">${act.totalQuantity}</td>
        <td>&nbsp;</td>
        <td style="text-align: right;">${act.totalCostRubles.toFixed(2)}</td>
        <td>&nbsp;</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого сумма списания прописью:</b> ${numberToRussianWordsKopecks(act.totalCostKopecks)}
  </div>

  <div style="margin-top: 16px;">
    <h4>Члены комиссии:</h4>
    ${commissionSigns}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Эталонный демонстрационный датасет для стоматологического склада
// ---------------------------------------------------------------------------

