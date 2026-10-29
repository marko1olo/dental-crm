import type { ClinicRequisites043, Form043PassportData } from "../../emr043Types";
import { escapeHtml, formatPatientAge } from "../../emr043Math";

/** Рендерер шапки клиники и реквизитов медицинской карты */
export function renderClinicHeaderHtml(clinic: ClinicRequisites043, formOrderName?: string): string {
	return `
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinic.clinicLegalName || clinic.clinicName)}</div>
      <div>${escapeHtml(clinic.clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinic.clinicOgrn)} | ИНН: ${escapeHtml(clinic.clinicInn)}${clinic.clinicKpp ? ` | КПП: ${escapeHtml(clinic.clinicKpp)}` : ""}</div>
      <div>Лицензия: № ${escapeHtml(clinic.licenseNumber)} от ${escapeHtml(clinic.licenseDate)} (${escapeHtml(clinic.licenseIssuer)})</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</div>
      <div>Медицинская карта приёма</div>
      <div><strong>МЕДИЦИНСКАЯ КАРТА ПРИЁМА</strong></div>
      <div>${escapeHtml(formOrderName || "Медицинская карта стоматологического пациента")}</div>
    </div>
  </div>`;
}

/** Рендерер заголовка документа и статуса подписания */
export function renderCardTitleBlockHtml(passport: Form043PassportData, isDocDraft: boolean, revisionCount = 0): string {
	const statusBadge = isDocDraft
		? '<span style="display:inline-block; border: 1pt dashed #d97706; background: #fffbeb; color: #b45309; font-weight: 800; font-size: 7.5pt; padding: 1.5pt 5pt; border-radius: 3pt; text-transform: uppercase; letter-spacing: 0.04em;">ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)</span>'
		: revisionCount > 0
			? `<span style="display:inline-block; border: 1pt solid #059669; background: #ecfdf5; color: #065f46; font-weight: 800; font-size: 7.5pt; padding: 1.5pt 5pt; border-radius: 3pt; text-transform: uppercase; letter-spacing: 0.04em;">ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + 1})</span>`
			: '<span style="display:inline-block; border: 1pt solid #059669; background: #ecfdf5; color: #065f46; font-weight: 800; font-size: 7.5pt; padding: 1.5pt 5pt; border-radius: 3pt; text-transform: uppercase; letter-spacing: 0.04em;">ПОДПИСАНО ВРАЧОМ</span>';

	return `
  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(passport.medicalCardNumber)}</h1>
    <div style="margin: 3px 0 2px 0;">${statusBadge}</div>
    <p class="doc-sub-title">Дата заведения карты: <strong>${escapeHtml(passport.cardOpenedDate)}</strong> | Лечащий врач: <strong>${escapeHtml(passport.attendingDoctorFullName)}</strong> (${escapeHtml(passport.attendingDoctorSpecialty)})</p>
  </div>`;
}

/** Рендерер 1-й секции: Паспортная часть */
export function renderPassportSectionHtml(passport: Form043PassportData): string {
	const ageFormatted = formatPatientAge(passport.patientBirthDate, passport.cardOpenedDate);

	return `
  <div class="section-title">1. Паспортная часть (Титульный лист)</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(passport.patientFullName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Возраст:</strong></td>
      <td style="width:20%;">${passport.patientSex === "male" ? "Мужской" : "Женский"} / ${escapeHtml(ageFormatted)} (${escapeHtml(passport.patientBirthDate)})</td>
    </tr>
    <tr>
      <td><strong>Документ (Паспорт):</strong></td>
      <td>${escapeHtml(passport.patientIdentityDocument || "Паспорт гражданина РФ")}</td>
      <td><strong>СНИЛС:</strong></td>
      <td>${escapeHtml(passport.patientSnils || "—")}</td>
    </tr>
    <tr>
      <td><strong>Полис ОМС / ДМС:</strong></td>
      <td>${escapeHtml(passport.patientInsurancePolicy || "—")} ${passport.patientInsuranceCompany ? `(${escapeHtml(passport.patientInsuranceCompany)})` : ""}</td>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(passport.patientPhone || "—")}</td>
    </tr>
    <tr>
      <td><strong>Адрес регистрации:</strong></td>
      <td colspan="3">${escapeHtml(passport.patientAddressRegistration)} ${passport.patientAddressResidence ? `(Проживание: ${escapeHtml(passport.patientAddressResidence)})` : ""}</td>
    </tr>
    <tr>
      <td><strong>Диагноз при обращении:</strong></td>
      <td colspan="3">
        <strong style="color:#0369a1;">${escapeHtml(passport.primaryDiagnosisText)}</strong>
        <span style="background:#f1f5f9; border:0.5pt solid #cbd5e1; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:7pt; margin-left:4px;">
          [МКБ-10: ${escapeHtml(passport.primaryDiagnosisIcd10)}]
        </span>
      </td>
    </tr>
  </table>`;
}
