import type { Form043VisitDiaryEntry, Form043PrintConfig } from "../../emr043Types";
import { escapeHtml } from "../../emr043Math";

/** Рендерер 4-й секции: Дневники клинических приемов SOAP */
export function renderDiariesSectionHtml(diaries: Form043VisitDiaryEntry[], cfg: Form043PrintConfig): string {
	const diariesToRender = (diaries || []).filter((d) => {
		if (!cfg.selectedDiaryIds || cfg.selectedDiaryIds.length === 0) return true;
		return cfg.selectedDiaryIds.includes(d.id);
	});

	if (diariesToRender.length === 0) {
		return `
      <div class="section-title">4. Дневник посещений и протоколы лечения</div>
      <div style="border: 0.75pt dashed #cbd5e1; padding: 10px; text-align: center; color: #64748b; font-style: italic;">
        Дневниковые записи клинических приемов отсутствуют.
      </div>`;
	}

	const cardsHtml = diariesToRender
		.map(
			(d, idx) => `
        <div class="soap-diary-card" style="border: 0.75pt solid #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; background:#ffffff;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
            <div style="font-weight:800; font-size:8.5pt; color:#0f172a;">
              Запись посещения № ${idx + 1} от ${escapeHtml(d.entryDate)} ${d.entryTime ? `в ${escapeHtml(d.entryTime)}` : ""}
              ${d.toothNumber ? `<span style="background:#e0f2fe; color:#0369a1; padding:1px 5px; border-radius:3px; margin-left:6px;">Зуб FDI: ${escapeHtml(d.toothNumber)}</span>` : ""}
            </div>
            <div style="font-size:7.5pt; color:#475569;">
              Врач: <strong>${escapeHtml(d.doctorFullName)}</strong> ${d.doctorSpecialty ? `(${escapeHtml(d.doctorSpecialty)})` : ""}
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:8pt; line-height:1.25;">
            <tr>
              <td style="width:22%; font-weight:bold; color:#0369a1; vertical-align:top;">I. Жалобы и анамнез:</td>
              <td style="width:78%; vertical-align:top;">${escapeHtml(d.subjectiveComplaints || "Жалоб на момент осмотра активно не предъявляет.")}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; color:#0369a1; vertical-align:top;">II. Status localis:</td>
              <td style="vertical-align:top;">
                ${escapeHtml(d.objectiveStatusLocalis)}
                ${d.eodMicroamperes !== null && d.eodMicroamperes !== undefined ? `<br/><em>ЭОД: ${d.eodMicroamperes} мкА.</em>` : ""}
                ${d.percussionVertical && d.percussionVertical !== "negative" ? `<em> Перкуссия верт.: ${d.percussionVertical === "positive_mild" ? "слабо болезненна" : "резко болезненна"}.</em>` : ""}
              </td>
            </tr>
            <tr>
              <td style="font-weight:bold; color:#0369a1; vertical-align:top;">III. Диагноз по МКБ-10:</td>
              <td style="vertical-align:top;">
                <span style="font-weight:800; color:#0f172a;">${escapeHtml(d.assessmentDiagnosisText)}</span>
                <span style="background:#f1f5f9; border:0.5pt solid #94a3b8; border-radius:3px; padding:0 4px; font-weight:bold; font-size:7.5pt; margin-left:4px;">
                  [${escapeHtml(d.assessmentIcd10Code)}]
                </span>
              </td>
            </tr>
            <tr>
              <td style="font-weight:bold; color:#0369a1; vertical-align:top;">IV. Дневник лечения:</td>
              <td style="vertical-align:top;">
                ${escapeHtml(d.procedureProtocol)}
                ${d.anesthesiaDetails ? `<br/><strong>Анестезия:</strong> ${escapeHtml(d.anesthesiaDetails)}` : ""}
                ${d.appliedMaterials ? `<br/><strong>Использованные материалы:</strong> ${escapeHtml(d.appliedMaterials)}` : ""}
                ${d.homeCareRecommendations ? `<br/><strong>Рекомендации / Назначения:</strong> ${escapeHtml(d.homeCareRecommendations)}` : ""}
                ${d.nextVisitDate ? `<br/><strong>Дата следующего визита:</strong> ${escapeHtml(d.nextVisitDate)}` : ""}
              </td>
            </tr>
          </table>
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px; padding-top:3px; border-top:0.5pt dashed #cbd5e1; font-size:7pt; color:#64748b;">
            <div>
              ${d.isSignedWithUkep ? `<span style="color:#059669; font-weight:bold;">[УКЭП] Подписано УКЭП (ГОСТ Р 34.10)</span> • Хэш: ${escapeHtml((d.digitalSignatureHash || "").slice(0, 18))}…` : "Подпись не заверена УКЭП"}
            </div>
            <div>
              Подпись лечащего врача: ___________________ / ${escapeHtml(d.doctorFullName)} /
            </div>
          </div>
        </div>
      `,
		)
		.join("");

	return `
    <div class="section-title">4. Дневник посещений и протоколы лечения</div>
    ${cardsHtml}`;
}
