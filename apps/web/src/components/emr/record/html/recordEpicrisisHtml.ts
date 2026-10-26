import type { Form043EpicrisisData, Form043PassportData, Form043PrintConfig } from "../../emr043Types";
import { escapeHtml } from "../../emr043Math";

/** Рендерер 5-й секции: Эпикриз, план наблюдения, УКЭП и подписи */
export function renderEpicrisisAndSignaturesHtml(
	epicrisis: Form043EpicrisisData,
	passport: Form043PassportData,
	generalTreatmentPlan: string,
	cfg: Form043PrintConfig,
): string {
	return `
  <!-- Общий план лечения -->
  <div class="section-title">План обследования и комплексного лечения</div>
  <div style="border: 0.5pt solid #94a3b8; padding: 4px 6px; font-size: 7.5pt; line-height: 1.25; background: #ffffff; margin-bottom: 5px;">
    ${escapeHtml(generalTreatmentPlan || "Комплексная санация полости рта согласно клиническим рекомендациям СтАР.")}
  </div>

  <!-- 5. Эпикриз и контрольное наблюдение -->
  <div class="section-title">5. Эпикриз, результаты лечения и план контрольного наблюдения</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Сводка лечения (Эпикриз):</strong></td>
      <td colspan="3">${escapeHtml(epicrisis.treatmentSummary)}</td>
    </tr>
    <tr>
      <td><strong>Исход лечения:</strong></td>
      <td><strong>${escapeHtml(epicrisis.treatmentOutcomeLabel || "Полное выздоровление / стойкая ремиссия")}</strong></td>
      <td style="width:20%;"><strong>Группа контрольного наблюдения:</strong></td>
      <td><strong>${escapeHtml(epicrisis.dispensaryGroupLabel || "Д-I (Практически здоров)")}</strong></td>
    </tr>
    <tr>
      <td><strong>Контрольный осмотр через:</strong></td>
      <td><strong>${epicrisis.plannedRecallIntervalMonths} мес.</strong></td>
      <td><strong>Дата завершения:</strong></td>
      <td>${escapeHtml(epicrisis.dateCompleted || passport.cardOpenedDate)}</td>
    </tr>
    <tr>
      <td><strong>Профилактический план:</strong></td>
      <td colspan="3">${escapeHtml(epicrisis.preventivePlanRecommendations)}</td>
    </tr>
  </table>

  <!-- Электронная цифровая подпись УКЭП / ЕГИСЗ отметка -->
  ${
		cfg.includeUkepStamp
			? `
    <div class="ukep-stamp-card">
      <div style="font-weight:800; text-transform:uppercase; letter-spacing:0.02em; margin-bottom:2px;">
        ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (УКЭП)
      </div>
      <div>Сертификат: <strong>00E103503B8F2026DENTE043U834N</strong> | Владелец: <strong>${escapeHtml(passport.attendingDoctorFullName)}</strong></div>
      <div>Действителен: с 01.01.2026 по 01.01.2027 | Аккредитованный УЦ: АО «ИнфоТеКС» / Федеральное казначейство РФ</div>
    </div>
  `
			: ""
	}

  <!-- Блок подписей сторон -->
  <div class="signature-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">
        Лечащий врач: <strong>${escapeHtml(passport.attendingDoctorFullName)}</strong>
        ${cfg.includeDoctorStampSeal ? '<span class="stamp-seal">М.П.</span>' : ""}
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">
        Пациент: <strong>${escapeHtml(passport.patientFullName)}</strong> (с планом и лечением ознакомлен)
      </div>
    </div>
  </div>`;
}
