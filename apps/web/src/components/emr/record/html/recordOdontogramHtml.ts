import type { Form043DentalStatusData } from "../../emr043Types";
import { dentalBiteTypeLabels } from "@dental/shared";
import { escapeHtml, calculateDmftIndex, calculateCpitnIndex } from "../../emr043Math";
import { renderFdiFormulaTableHtml } from "./recordHtmlFdiTable";

/** Рендерер 3-й секции: Стоматологический статус, формула FDI и индексы */
export function renderOdontogramSectionHtml(dental: Form043DentalStatusData): string {
	const dmft = calculateDmftIndex(dental.odontogramTeeth);
	const cpitn = calculateCpitnIndex(dental.cpitnIndex);

	return `
  <div class="section-title">3. Стоматологический статус, зубная формула FDI и клинические индексы</div>
  ${renderFdiFormulaTableHtml(dental.odontogramTeeth)}

  <table class="data-table">
    <tr>
      <td style="width:33%;">
        <strong>Индекс КПУ(з): </strong>
        <span style="font-size:9.5pt; font-weight:800; color:#0369a1;">${dmft.totalDmft}</span> (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing})
        <br/><span style="font-size:7pt; color:#64748b;">Интенсивность: <strong>${escapeHtml(dmft.intensityLevelLabel)}</strong></span>
      </td>
      <td style="width:34%;">
        <strong>Пародонтальный индекс CPITN: </strong>
        <br/><span style="font-weight:700;">${escapeHtml(cpitn.treatmentNeedLabel)}</span>
        <br/><span style="font-size:7pt; color:#64748b;">${escapeHtml(cpitn.maxCodeText)}</span>
      </td>
      <td style="width:33%;">
        <strong>Индекс гигиены: </strong>
        <br/><span>${escapeHtml(dental.hygieneIndexOhiS?.ratingText || "OHI-S = 0.8 (удовл.)")}</span>
        <br/><strong>Прикус: </strong><span>${escapeHtml(dentalBiteTypeLabels[dental.biteType] || dental.biteDescription || "Ортогнатический")}</span>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <strong>Состояние СОПР, десен и пародонта:</strong>
        Слизистая ${dental.oralMucosaStatus?.color === "pale_pink_normal" ? "бледно-розовая, умеренно увлажнена" : "гиперемирована"}, патологических элементов ${dental.oralMucosaStatus?.pathologicalElements || "нет"}.
        Десневые сосочки ${dental.oralMucosaStatus?.gingivalPapillae === "normal_pointed" ? "остроконечные, плотно прилежат к шейкам зубов" : "гипертрофированы"}.
        Язык: ${escapeHtml(dental.oralMucosaStatus?.tongueStatus || "чистый, влажный")}.
        Лимфоузлы: ${escapeHtml(dental.oralMucosaStatus?.regionalLymphNodes || "не увеличены, безболезненны")}.
        ВНЧС: ${escapeHtml(dental.oralMucosaStatus?.tmjFunction || "открывание рта свободное, в полном объеме, движений девиации и крепитации/щелчков в суставах нет.")}.
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <strong>Рентгенологическое обследование (ОПТГ / КЛКТ):</strong>
        ${escapeHtml(dental.xrayFindingsDescription)}
        ${dental.xrayRadiationDoseMsv ? ` <em>(Суммарная лучевая нагрузка: ${dental.xrayRadiationDoseMsv} мЗв)</em>` : ""}
      </td>
    </tr>
  </table>`;
}
