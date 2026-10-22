import type { WarehouseInventoryAuditDocument } from "./warehouseAuditTypes.js";
import { kopecksToRubles } from "@dental/shared";
import { calculateInventoryAuditTotals } from "./warehouseAuditTotalsCalculator.js";

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
