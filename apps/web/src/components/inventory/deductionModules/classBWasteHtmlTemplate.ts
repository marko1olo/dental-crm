export const CLASS_B_HTML_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #000; margin: 20px; line-height: 1.4; }
  .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
  .subtitle { text-align: center; font-size: 11px; margin-bottom: 16px; color: #333; }
  .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .meta-grid td { padding: 4px 6px; font-size: 12px; vertical-align: top; }
  .meta-grid td.label { font-weight: bold; width: 35%; color: #333; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.items th, table.items td { border: 1px solid #000; padding: 6px; font-size: 11px; text-align: left; }
  table.items th { background: #f2f2f2; font-weight: bold; }
  .signatures { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
  .sig-block { width: 45%; }
  .sig-line { border-bottom: 1px solid #000; height: 30px; margin-top: 20px; }
`;

export function renderClassBMetaTable(
	clinicName: string,
	actDate: string,
	sealNumber: string,
	barcode: string,
	staffPosition: string,
	staffName: string,
	disinfectionProtocol: string,
): string {
	return `
  <table class="meta-grid">
    <tr><td class="label">Медицинская организация:</td><td>${clinicName}</td></tr>
    <tr><td class="label">Дата и время закрытия смены:</td><td>${actDate}</td></tr>
    <tr><td class="label">Номер пломбы-стяжки:</td><td><strong>${sealNumber}</strong></td></tr>
    <tr><td class="label">Штрихкод упаковки / контейнера:</td><td><code>${barcode}</code></td></tr>
    <tr><td class="label">Вид тары и упаковки:</td><td>Желтый непрокалываемый контейнер для колюще-режущих отходов / желтый пакет Класса Б</td></tr>
    <tr><td class="label">Ответственное лицо (1 лицо):</td><td>${staffPosition} — <strong>${staffName}</strong> (без комиссии из 3 человек)</td></tr>
    <tr><td class="label">Регламент дезинфекции (СанПиН):</td><td>${disinfectionProtocol}</td></tr>
  </table>`;
}

export function renderClassBSignatures(position: string, name: string): string {
	return `
  <div class="signatures">
    <div class="sig-block">
      <div>Ответственный за сбор медотходов смены:</div>
      <div class="sig-line"></div>
      <div style="font-size: 10px; color: #666; margin-top: 4px;">(${position} / ${name})</div>
    </div>
    <div class="sig-block">
      <div>Спецоператор по вывозу медотходов:</div>
      <div class="sig-line"></div>
      <div style="font-size: 10px; color: #666; margin-top: 4px;">(Подпись водителя-экспедитора / Лицензия)</div>
    </div>
  </div>`;
}
