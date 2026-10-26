import type { Form043AnamnesisData } from "../../emr043Types";
import { escapeHtml } from "../../emr043Math";

/** Рендерер 2-й секции: Анамнез жизни и заболевания */
export function renderAnamnesisSectionHtml(anamnesis: Form043AnamnesisData): string {
	return `
  <div class="section-title">2. Анамнез жизни и настоящего заболевания (Anamnesis vitae et morbi)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Жалобы при обращении:</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.chiefComplaint)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез заболевания (Morbi):</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.historyOfPresentIllness)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез жизни (Vitae):</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.medicalHistoryVitae)}</td>
    </tr>
    <tr>
      <td><strong>Аллергологический статус:</strong></td>
      <td>${escapeHtml(anamnesis.allergologicalHistory)}</td>
      <td style="width:18%;"><strong>Соматический статус:</strong></td>
      <td>${escapeHtml(anamnesis.concomitantSomaticDiseases)}</td>
    </tr>
    <tr>
      <td><strong>Постоянный прием препаратов:</strong></td>
      <td>${escapeHtml(anamnesis.currentSystemicMedications)}</td>
      <td><strong>Беременность / лактация:</strong></td>
      <td>${escapeHtml(anamnesis.pregnancyLactationStatus)}</td>
    </tr>
    <tr>
      <td><strong>Переносимость анестезии:</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.pastDentalInterventions)}</td>
    </tr>
  </table>`;
}
