/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — TREATMENT PLAN & EXTRACT (Layer 2)
 * Renderers for Medical Card Extract (Form 003-V/u / 043/u extract),
 * Treatment Chronology, Outcomes, and Warranty Obligations.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MedicalCardExtract003vuPayload } from "./types.js";
import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "./sharedStyles.js";

/**
 * 5. Рендерер выписки из медицинской карты стоматологического пациента (Форма 043/у)
 * Порядок выдачи медицинских выписок (Приказ Минздрава России № 834н / Форма 043/у)
 * Formal medical extract with clinic angular stamp, patient info, ICD-10 diagnosis, chronologic treatment stages, recommendations, Chief Physician signature and seal
 */
export function renderForm003vuHtml(payload: MedicalCardExtract003vuPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "г. Москва";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const licenseNumber = payload.clinicLicenseNumber || "ЛО-77-01-012345";
	const licenseDate = payload.clinicLicenseDate || "01.01.2022";
	const licenseIssuer = payload.clinicLicenseIssuer || "Департамент здравоохранения г. Москвы";

	const regNumber = payload.extractRegistrationNumber || "ВЫП-2026/001";
	const issueDate = payload.extractIssueDate || new Date().toISOString().slice(0, 10);
	const destination = payload.extractDestinationInstitution || "По месту требования";

	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const patientAddress = payload.patient?.address || payload.patientAddress || "—";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const periodStart = payload.treatmentPeriodStartDate || payload.treatmentPeriod?.slice(0, 10) || "—";
	const periodEnd = payload.treatmentPeriodEndDate || payload.treatmentPeriod?.slice(-10) || issueDate;

	const primaryDiagCode = payload.primaryDiagnosisIcd10 || "K02.1";
	const primaryDiagText = payload.primaryDiagnosisText || payload.clinicalDiagnosisDetailed || payload.diagnosis || "Кариес дентина";
	const concomitantDiagCode = payload.concomitantDiagnosisIcd10 || "";
	const concomitantDiagText = payload.concomitantDiagnosisText || "";

	const anamnesis = payload.briefAnamnesisAndClinicalCourse || "Пациент обратился в клинику в плановом порядке с жалобами на эстетический и функциональный дефект, кратковременные боли от температурных раздражителей.";
	const diagnosticStudies = payload.diagnosticStudiesSummary || "Прицельная радиовизиография, ортопантомограмма (ОПТГ): периапикальные ткани интактны, деструктивных изменений костной ткани не обнаружено, каналы проходимы.";

	const stages: any[] = payload.treatmentStagesTimeline || payload.treatmentStages || payload.chronology || [];
	const stagesRows = stages.map((st: any, idx: number) => {
		const d = st.treatmentDate || st.date || st.stageDate || issueDate;
		const tooth = st.toothOrAnatomicalArea || st.toothNumber || "—";
		const diag = st.diagnosisIcd10 ? `${st.diagnosisIcd10} ${st.diagnosisText || ""}` : (st.diagnosis || st.diagnosisText || "—");
		const interv = st.performedIntervention || st.intervention || st.interventionSummary || "—";
		const anesth = st.anesthesiaUsed ? `Анестезия: ${st.anesthesiaUsed}` : "";
		const fullInterv = anesth ? `${interv}<br/><span style="color:#64748b; font-size:7pt;">${anesth}</span>` : interv;
		const doc = st.attendingDoctorFullName || st.doctorName || payload.attendingDoctorFullName || "Лечащий врач";

		return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(d)}</td>
        <td class="center"><strong>${escapeHtml(String(tooth))}</strong></td>
        <td>${escapeHtml(diag)}</td>
        <td>${fullInterv}</td>
        <td>${escapeHtml(doc)}</td>
      </tr>
    `;
	}).join("");

	const discharge = payload.treatmentOutcomeStatus || payload.conditionAtDischarge || "Лечение завершено в полном объеме. Жалоб нет. Анатомическая форма и жевательная функция зубов полностью восстановлены. Слизистая оболочка полости рта бледно-розовая, без признаков воспаления. Прикус стабильный.";
	const recommendations = payload.followUpRecommendations || "1. Соблюдение индивидуальной гигиены полости рта (щетка средней жесткости, зубная нить/ершики, ирригатор).\n2. Контрольный диспансерный осмотр через 6 месяцев.\n3. Проведение профессиональной гигиены полости рта не реже 2 раз в год.";
	const warranty = payload.warrantyConditions || "Гарантийный срок на терапевтические пломбы и реставрации — 12 месяцев со дня постановки при условии регулярной гигиены и контрольных осмотров.";

	const attendingDoc = payload.attendingDoctorFullName || payload.attendingDoctor || "Врач-стоматолог";
	const attendingSpec = payload.attendingDoctorSpecialty || "Врач-стоматолог-терапевт";
	const headDoc = payload.headOfDepartmentFullName || payload.headOfDepartment || "Главный врач";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Выписка № ${escapeHtml(regNumber)} (Форма 043/у) — ${escapeHtml(patientName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
    <div class="stamp-angular">
      <div style="font-weight:bold; text-transform:uppercase;">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
      <div>Лицензия: № ${escapeHtml(licenseNumber)} от ${escapeHtml(licenseDate)}</div>
      <div>Выдана: ${escapeHtml(licenseIssuer)}</div>
    </div>
    <div class="doc-requisites" style="width:38%;">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043/у</strong></div>
      <div>Выписка из медицинской карты стоматологического пациента</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</h1>
    <p class="doc-sub-title">Регистрационный № <strong>${escapeHtml(regNumber)}</strong> от <strong>${escapeHtml(issueDate)}</strong></p>
    <p style="font-size:8pt; margin:3px 0 0 0; color:#334155;">Направляется в: <strong>${escapeHtml(destination)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть и реквизиты амбулаторной карты</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Адрес проживания:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
    </tr>
    <tr>
      <td><strong>Медицинская карта №:</strong></td>
      <td><strong>${escapeHtml(cardNum)}</strong> (Форма № 043/у)</td>
      <td><strong>Период лечения:</strong></td>
      <td>с <strong>${escapeHtml(periodStart)}</strong> по <strong>${escapeHtml(periodEnd)}</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Клинический диагноз (по МКБ-10)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Основное заболевание:</strong></td>
      <td colspan="3"><strong style="color:#0369a1;">[${escapeHtml(primaryDiagCode)}]</strong> ${escapeHtml(primaryDiagText)}</td>
    </tr>
    ${concomitantDiagText ? `
    <tr>
      <td><strong>Сопутствующая патология:</strong></td>
      <td colspan="3"><strong>[${escapeHtml(concomitantDiagCode || "—")}]</strong> ${escapeHtml(concomitantDiagText)}</td>
    </tr>
    ` : ""}
  </table>

  <div class="section-title">3. Анамнез заболевания и данные диагностических исследований</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Краткий анамнез и течение:</strong></td>
      <td>${escapeHtml(anamnesis)}</td>
    </tr>
    <tr>
      <td><strong>Рентген и диагностика:</strong></td>
      <td>${escapeHtml(diagnosticStudies)}</td>
    </tr>
  </table>

  <div class="section-title">4. Хронология проведенного стоматологического лечения</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:4%;">№</th>
        <th style="width:12%;">Дата</th>
        <th style="width:8%;">Зуб</th>
        <th style="width:22%;">Диагноз (МКБ-10)</th>
        <th style="width:36%;">Проведенное вмешательство и материалы</th>
        <th style="width:18%;">Лечащий врач</th>
      </tr>
    </thead>
    <tbody>
      ${stagesRows || `
      <tr>
        <td class="center">1</td>
        <td class="center">${escapeHtml(periodStart)}</td>
        <td class="center">1.6</td>
        <td>K02.1 Кариес дентина</td>
        <td>Препарирование кариозной полости, медикаментозная обработка, пломбирование нанокомпозитом светового отверждения Ceram.x Spectra ST. Шлифовка, полировка.</td>
        <td>${escapeHtml(attendingDoc)}</td>
      </tr>
      `}
    </tbody>
  </table>

  <div class="section-title">5. Клинический исход лечения / состояние при завершении курса</div>
  <p style="margin:4px 0 6px 0; font-size:8.5pt;">${escapeHtml(discharge)}</p>

  <div class="section-title">6. Рекомендации и гарантийные обязательства</div>
  <div style="font-size:8pt; line-height:1.3; margin:4px 0 6px 0;">
    <div style="white-space:pre-line;">${escapeHtml(recommendations)}</div>
    <div style="margin-top:4px; font-style:italic; color:#475569;">${escapeHtml(warranty)}</div>
  </div>

  <div class="signature-row" style="margin-top:16px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач: <strong>${escapeHtml(attendingDoc)}</strong> (${escapeHtml(attendingSpec)})</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Главный врач / Заведующий: <strong>${escapeHtml(headDoc)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
  </div>
</div>
</body>
</html>`;
}
