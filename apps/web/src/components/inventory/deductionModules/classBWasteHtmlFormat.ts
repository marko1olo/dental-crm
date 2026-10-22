import { CLASS_B_WEIGHT_ESTIMATES } from "@dental/shared";
import {
	CLASS_B_HTML_STYLES,
	renderClassBMetaTable,
	renderClassBSignatures,
} from "./classBWasteHtmlTemplate.js";

export function formatShiftCloseClassBWasteActHtml(
	actNumber: string,
	actDate: string,
	sealNumber: string,
	barcode: string,
	carpulesCount: number,
	needlesCount: number,
	sharpsCount: number,
	grossKg: number,
	tareKg: number,
	netKg: number,
	responsibleStaffName: string,
	responsibleStaffPosition: string,
	clinicName = "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА",
	options?: {
		brokenCarpulesCount?: number | undefined;
		partiallyUsedCarpulesCount?: number | undefined;
		disinfectionProtocol?: string | undefined;
		cabinetId?: string | undefined;
		chairId?: string | undefined;
	},
): string {
	const totalSharps = needlesCount + sharpsCount;
	const brokenCount = Math.max(0, options?.brokenCarpulesCount ?? 0);
	const partialCount = Math.max(0, options?.partiallyUsedCarpulesCount ?? 0);
	const disinfectionProtocol =
		options?.disinfectionProtocol ||
		"Химическая дезинфекция 3% Аламинол (замачивание 60 мин) / автоклавирование 134°C (СанПиН 2.1.3684-21 и СанПиН 3.3686-21)";

	const standardEmptyCount = Math.max(0, carpulesCount - brokenCount - partialCount);
	const locationInfo = options?.cabinetId
		? ` • Кабинет: ${options.cabinetId}${options.chairId ? ` (Кресло ${options.chairId})` : ""}`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт утилизации медицинских отходов Класса Б — ${actNumber}</title>
<style>${CLASS_B_HTML_STYLES}</style>
</head>
<body>
  <div class="title">АКТ НАКОПЛЕНИЯ И ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ КЛАССА Б № ${actNumber}</div>
  <div class="subtitle">Учет по СанПиН 2.1.3684-21 и СанПиН 3.3686-21 • Закрытие рабочей смены${locationInfo}</div>
  ${renderClassBMetaTable(clinicName, actDate, sealNumber, barcode, responsibleStaffPosition, responsibleStaffName, disinfectionProtocol)}
  <table class="items">
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">№</th>
        <th>Наименование фракции отходов</th>
        <th style="width: 80px; text-align: center;">Класс</th>
        <th style="width: 100px; text-align: right;">Количество</th>
        <th style="width: 100px; text-align: right;">Масса нетто (кг)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td>Отработанные пустые карпулы анестетиков стеклянные целые (1.7 мл)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${standardEmptyCount} шт.</td>
        <td style="text-align: right;">${(standardEmptyCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg).toFixed(3)}</td>
      </tr>
      ${brokenCount > 0 ? `<tr>
        <td style="text-align: center;">1а</td>
        <td>Разбитые стеклянные карпулы анестетиков (бой при установке, дезинфекция 3% Аламинол)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${brokenCount} шт.</td>
        <td style="text-align: right;">${(brokenCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg).toFixed(3)}</td>
      </tr>` : ""}
      ${partialCount > 0 ? `<tr>
        <td style="text-align: center;">1б</td>
        <td>Не полностью израсходованные карпулы анестетика с остатками раствора</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${partialCount} шт.</td>
        <td style="text-align: right;">${(partialCount * (CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg + 0.001)).toFixed(3)}</td>
      </tr>` : ""}
      <tr>
        <td style="text-align: center;">2</td>
        <td>Остроконечные колюще-режущие медицинские изделия (иглы 30G/27G, лезвия скальпелей, эндофайлы)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${totalSharps} шт.</td>
        <td style="text-align: right;">${(totalSharps * CLASS_B_WEIGHT_ESTIMATES.sharpsNeedleKg).toFixed(3)}</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td>Загрязненные биологическими жидкостями СИЗ и расходники (перчатки, валики, слюноотсосы, салфетки)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">1 место</td>
        <td style="text-align: right;">${Math.max(0.01, Number((netKg - carpulesCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg - totalSharps * CLASS_B_WEIGHT_ESTIMATES.sharpsNeedleKg).toFixed(3)))}</td>
      </tr>
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="3" style="text-align: right;">ИТОГО ПО АКТУ:</td>
        <td style="text-align: right;">${carpulesCount + totalSharps} ед.</td>
        <td style="text-align: right;">${netKg.toFixed(3)} кг</td>
      </tr>
    </tbody>
  </table>
  <div style="font-size: 11px; color: #444; margin-bottom: 20px;">
    Масса брутто: <strong>${grossKg.toFixed(3)} кг</strong> | Масса тары: <strong>${tareKg.toFixed(3)} кг</strong> | Масса нетто: <strong>${netKg.toFixed(3)} кг</strong>.<br>
    Дезинфекция проведена в соответствии с СанПиН 2.1.3684-21 и СанПиН 3.3686-21 (${disinfectionProtocol}).
  </div>
  ${renderClassBSignatures(responsibleStaffPosition, responsibleStaffName)}
</body>
</html>`;
}
