export interface CarpuleDisposalActHtmlParams {
	readonly actNumber: string;
	readonly dateIso: string;
	readonly nurseName: string;
	readonly doctorName: string;
	readonly disposalReason: string;
	readonly isOverdraft: boolean;
	readonly drugNameRu: string;
	readonly drugDefaultSeries: string;
	readonly drugDefaultExp: string;
	readonly fefoBadgeText: string;
	readonly carpulesCount: number;
	readonly volumeTotalMl: number;
}

export function generateCarpuleDisposalActHtml(
	params: CarpuleDisposalActHtmlParams,
): string {
	const {
		actNumber,
		dateIso,
		nurseName,
		doctorName,
		disposalReason,
		isOverdraft,
		drugNameRu,
		drugDefaultSeries,
		drugDefaultExp,
		fefoBadgeText,
		carpulesCount,
		volumeTotalMl,
	} = params;

	const reasonText =
		disposalReason === "used_in_procedure"
			? "Использовано при лечении"
			: disposalReason === "partial_dose"
				? "Остаток карпулы после анестезии"
				: disposalReason === "broken_capsule"
					? "Бой карпулы при зарядке"
					: "Истечение срока годности (FEFO утилизация)";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт списания карпул ${actNumber}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #0f172a; margin: 20mm; line-height: 1.4; }
  .clinic-header { text-align: center; font-size: 10pt; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  h1 { text-align: center; font-size: 13pt; margin: 0 0 4px 0; }
  .sub { text-align: center; font-size: 9.5pt; color: #475569; margin-bottom: 20px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10pt; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #cbd5e1; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
  th, td { border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 700; }
  .signatures { margin-top: 30px; font-size: 10pt; }
  .stamp { display: inline-block; margin-top: 16px; padding: 8px 16px; border: 2px dashed #0d9488; color: #0f766e; font-size: 9pt; font-weight: bold; text-transform: uppercase; border-radius: 6px; }
</style>
</head>
<body>
  <div class="clinic-header">Стоматологическая клиника • Процедурный кабинет</div>
  <h1>АКТ СПИСАНИЯ И УТИЛИЗАЦИИ КАРПУЛ АНЕСТЕТИКОВ № ${actNumber}</h1>
  <div class="sub">Регламент СанПиН 3.3686-21 (Медицинские отходы класса Б) • Доступно врачу и администратору в 1 клик (без комиссии из 3 человек)</div>

  <div class="meta-grid">
    <div><strong>Дата списания:</strong> ${dateIso}</div>
    <div><strong>Ответственный сотрудник:</strong> ${nurseName}</div>
    <div><strong>Лечащий врач:</strong> ${doctorName}</div>
    <div><strong>Причина:</strong> ${reasonText}</div>
    <div><strong>Класс отходов:</strong> Класс Б (дезинфекция Аламинол 3%, 60 мин)</div>
    <div><strong>Статус склада:</strong> ${isOverdraft ? "Мягкий овердрафт (оприходование в пути)" : "Штатный остаток"}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Наименование препарата</th>
        <th>Серия / Партия</th>
        <th>FEFO статус</th>
        <th>Кол-во</th>
        <th>Объем, мл</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${drugNameRu}</td>
        <td>${drugDefaultSeries} (до ${drugDefaultExp})</td>
        <td>${fefoBadgeText}</td>
        <td>${carpulesCount} шт.</td>
        <td>${volumeTotalMl} мл</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div><strong>Списание произвел(а):</strong> ________________ / ${nurseName} (по СанПиН 3.3686-21, единолично без комиссии)</div>
    <div style="margin-top: 8px;"><strong>МОЛ отделения / врач:</strong> ________________ / ${doctorName}</div>
  </div>

  <div class="stamp">Списано и обеззаражено • СанПиН 3.3686-21</div>
</body>
</html>`;
}
