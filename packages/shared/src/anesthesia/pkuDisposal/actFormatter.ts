/**
 * @dental/shared/anesthesia/pkuDisposal/actFormatter.ts
 * SanPiN 3.3686-21 Official Act Text & HTML Generator (Mandate 8b, <= 120 lines)
 */

import { ANESTHESIA_DRUG_CATALOG } from "../catalog.js";
import type { AnesthesiaPkuDisposalRecord } from "../types.js";

function getReasonLabel(reason: string): string {
	if (reason === "used_in_procedure") return "израсходовано при проведении анестезии на приеме";
	if (reason === "shift_batch_deduction") return "пакетный расход за смену (мягкий овердрафт)";
	if (reason === "damaged_broken") return "механическое повреждение / бой карпулы";
	if (reason === "expired") return "истечение установленного срока годности";
	return "вскрытая неиспользованная остаточная доза";
}

export function generateAnesthesiaPkuDisposalAct(record: AnesthesiaPkuDisposalRecord): string {
	const drugSpec = ANESTHESIA_DRUG_CATALOG[record.drugId];
	const drugTradeName = record.drugNameRu || drugSpec?.tradeNamesRu[0] || drugSpec?.nameRu || "Местный анестетик";
	const reasonText = getReasonLabel(record.disposalReason);
	const medCard = record.medicalCardNumber || record.medicalCardNumber043 || "Не указан";
	const container = record.wasteCollectionContainerRu || "Желтый непрокалываемый контейнер Класса Б";

	return [
		"═══════════════════════════════════════════════════════════════════════════════",
		"  АКТ СПИСАНИЯ И УТИЛИЗАЦИИ МЕСТНЫХ АНЕСТЕТИКОВ (САНПИН 3.3686-21)",
		`  Регистрационный номер: ${record.recordNumber} от ${record.dateIso} ${record.time}`,
		"═══════════════════════════════════════════════════════════════════════════════",
		`Медицинская организация: ${record.clinicName} (Кабинет № ${record.cabinetNumber})`,
		`Пациент: ${record.patientFullName} | Медицинская карта приёма №: ${medCard}`,
		`Лечащий врач: ${record.doctorFullName} | Ассистент/Медсестра: ${record.nurseFullName}`,
		"───────────────────────────────────────────────────────────────────────────────",
		"СВЕДЕНИЯ О СПИСАННОМ ПРЕПАРАТЕ:",
		`• Препарат: «${drugTradeName}» (${record.activeSubstanceRu})`,
		`• Серия: ${record.seriesNumber} | Партия: ${record.batchNumber} | Годен до: ${record.expirationDate}`,
		`• Израсходовано: ${record.carpulesUsedCount} карп. (${record.volumeMlTotal} мл) | Утилизировано: ${record.carpulesDisposedCount} шт.`,
		`• Причина списания: ${reasonText}`,
		"───────────────────────────────────────────────────────────────────────────────",
		"ОБЕЗЗАРАЖИВАНИЕ И УТИЛИЗАЦИЯ (СанПиН 3.3686-21 раздел X):",
		`• Класс опасности отходов: Класс Б (эпидемиологически опасные)`,
		`• Метод сбора: Сбор в ${container}`,
		`• Складской режим: Мягкий овердрафт партий (Soft Negative Stock)`,
		"───────────────────────────────────────────────────────────────────────────────",
		"ПОДПИСИ ОТВЕТСТВЕННЫХ ЛИЦ:",
		`Врач-стоматолог: ____________________ / ${record.doctorFullName} /`,
		`Медсестра / ассистент: ____________________ / ${record.nurseFullName} / ${record.assistantSignatureConfirmed ? "[ЭЦП ПОДТВЕРЖДЕНА В 1 КЛИК]" : "[ТРЕБУЕТСЯ ПОДПИСЬ]"}`,
		"Порядок оформления: пакетное списание медсестрой в 1 клик (СанПиН 3.3686-21, комиссия из 3 человек не требуется).",
		"═══════════════════════════════════════════════════════════════════════════════",
	].join("\n");
}

export function generateAnesthesiaPkuDisposalHtml(record: AnesthesiaPkuDisposalRecord): string {
	const drugSpec = ANESTHESIA_DRUG_CATALOG[record.drugId];
	const drugTradeName = record.drugNameRu || drugSpec?.tradeNamesRu[0] || drugSpec?.nameRu || "Местный анестетик";
	const medCard = record.medicalCardNumber || record.medicalCardNumber043 || "Не указан";
	const container = record.wasteCollectionContainerRu || "Желтый контейнер Класса Б";

	return `
<div class="sanpin-pku-act-document" style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #0f172a; max-width: 760px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff;">
  <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; color: #0369a1;">${record.clinicName}</div>
    <div style="font-size: 11pt; font-weight: bold; margin-top: 4px;">АКТ СПИСАНИЯ И УТИЛИЗАЦИИ КАРПУЛ АНЕСТЕТИКА</div>
    <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">СанПиН 3.3686-21 раздел X • Мягкий овердрафт склада</div>
    <div style="font-size: 9pt; font-weight: 600; margin-top: 6px; color: #0284c7;">Акт № ${record.recordNumber} от ${record.dateIso} ${record.time}</div>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5pt;">
    <tr>
      <td style="padding: 4px 8px; font-weight: bold; width: 35%; border-bottom: 1px solid #e2e8f0;">Пациент:</td>
      <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0;">${record.patientFullName} (Карта приёма № ${medCard})</td>
    </tr>
    <tr>
      <td style="padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Кабинет / Врач:</td>
      <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0;">Кабинет № ${record.cabinetNumber} | ${record.doctorFullName}</td>
    </tr>
  </table>
  <div style="font-weight: bold; font-size: 10pt; color: #0369a1; margin-bottom: 6px;">Препарат: «${drugTradeName}» (${record.activeSubstanceRu})</div>
  <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 8.5pt; margin-bottom: 16px;">
    <div><strong>Класс отходов:</strong> Медицинские отходы Класса Б. Сбор в ${container}.</div>
    <div><strong>Списано:</strong> ${record.carpulesUsedCount} карп. (${record.volumeMlTotal} мл). Мягкий овердрафт склада.</div>
    <div style="color: #0d9488; font-weight: 600; margin-top: 4px;">Оформлено медсестрой в 1 клик (СанПиН 3.3686-21: без комиссии из 3 человек).</div>
  </div>
</div>
`;
}
