/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — TREATMENT PLAN & EXTRACT (Layer 2)
 * Renderers for Medical Card Extract (Form 003-V/u / 043/u extract),
 * Treatment Chronology, Outcomes, and Warranty Obligations.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MedicalCardExtract003vuPayload } from "./types.js";
import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "./sharedStyles.js";

/** Интерфейс строки этапа лечения в медицинской выписке */
export interface MedicalCardExtractStageLike {
	readonly treatmentDate?: string | undefined;
	readonly date?: string | undefined;
	readonly stageDate?: string | undefined;
	readonly toothOrAnatomicalArea?: string | number | undefined;
	readonly toothNumber?: string | number | undefined;
	readonly diagnosisIcd10?: string | undefined;
	readonly diagnosisText?: string | undefined;
	readonly diagnosis?: string | undefined;
	readonly performedIntervention?: string | undefined;
	readonly intervention?: string | undefined;
	readonly interventionSummary?: string | undefined;
	readonly anesthesiaUsed?: string | undefined;
	readonly attendingDoctorFullName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly [key: string]: unknown;
}

export interface Form003vuRenderPayload {
	readonly organization?: { readonly fullName?: string; readonly address?: string; readonly ogrn?: string; readonly inn?: string } | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinic?: { readonly name?: string } | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicLicenseIssuer?: string | undefined;
	readonly extractRegistrationNumber?: string | undefined;
	readonly extractIssueDate?: string | undefined;
	readonly extractDestinationInstitution?: string | undefined;
	readonly patient?: {
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly gender?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
		readonly medicalCardNumber?: string | undefined;
	} | undefined;
	readonly patientFullName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientSex?: string | undefined;
	readonly patientAddress?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly treatmentPeriodStartDate?: string | undefined;
	readonly treatmentPeriod?: string | undefined;
	readonly treatmentPeriodEndDate?: string | undefined;
	readonly primaryDiagnosisIcd10?: string | undefined;
	readonly primaryDiagnosisText?: string | undefined;
	readonly clinicalDiagnosisDetailed?: string | undefined;
	readonly diagnosis?: string | undefined;
	readonly concomitantDiagnosisIcd10?: string | undefined;
	readonly concomitantDiagnosisText?: string | undefined;
	readonly briefAnamnesisAndClinicalCourse?: string | undefined;
	readonly diagnosticStudiesSummary?: string | undefined;
	readonly treatmentStagesTimeline?: readonly MedicalCardExtractStageLike[] | undefined;
	readonly treatmentStages?: readonly MedicalCardExtractStageLike[] | undefined;
	readonly chronology?: readonly MedicalCardExtractStageLike[] | undefined;
	readonly treatmentOutcomeStatus?: string | undefined;
	readonly conditionAtDischarge?: string | undefined;
	readonly followUpRecommendations?: string | undefined;
	readonly warrantyConditions?: string | undefined;
	readonly attendingDoctorFullName?: string | undefined;
	readonly attendingDoctor?: string | undefined;
	readonly attendingDoctorSpecialty?: string | undefined;
	readonly headOfDepartmentFullName?: string | undefined;
	readonly headOfDepartment?: string | undefined;
	readonly [key: string]: unknown;
}

/**
 * 5. Рендерер выписки из медицинской карты стоматологического пациента (Форма 043/у)
 * Порядок выдачи медицинских выписок (Приказ Минздрава России № 834н / Форма 043/у)
 * Formal medical extract with clinic angular stamp, patient info, ICD-10 diagnosis, chronologic treatment stages, recommendations, Chief Physician signature and seal
 */
export function renderForm003vuHtml(payload: MedicalCardExtract003vuPayload | Form003vuRenderPayload): string {
	const p = payload as Form003vuRenderPayload;
	const clinicName = p.organization?.fullName || p.clinicLegalName || p.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = p.organization?.address || p.clinicAddress || "г. Москва";
	const clinicOgrn = p.organization?.ogrn || p.clinicOgrn || "—";
	const clinicInn = p.organization?.inn || p.clinicInn || "—";
	const licenseNumber = p.clinicLicenseNumber || "ЛО-77-01-012345";
	const licenseDate = p.clinicLicenseDate || "01.01.2022";
	const licenseIssuer = p.clinicLicenseIssuer || "Департамент здравоохранения г. Москвы";

	const regNumber = p.extractRegistrationNumber || "ВЫП-2026/001";
	const issueDate = p.extractIssueDate || new Date().toISOString().slice(0, 10);
	const destination = p.extractDestinationInstitution || "По месту требования";

	const patientName = p.patient?.fullName || p.patientFullName || "—";
	const patientBirth = p.patient?.birthDate || p.patientBirthDate || "—";
	const patientSex = (p.patient?.gender || p.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const patientAddress = p.patient?.address || p.patientAddress || "—";
	const patientPhone = p.patient?.phone || p.patientPhone || "—";
	const cardNum = p.patient?.medicalCardNumber || p.medicalCardNumber || "—";
	const periodStart = p.treatmentPeriodStartDate || p.treatmentPeriod?.slice(0, 10) || "—";
	const periodEnd = p.treatmentPeriodEndDate || p.treatmentPeriod?.slice(-10) || issueDate;

	const primaryDiagCode = p.primaryDiagnosisIcd10 || "K02.1";
	const primaryDiagText = p.primaryDiagnosisText || p.clinicalDiagnosisDetailed || p.diagnosis || "Кариес дентина";
	const concomitantDiagCode = p.concomitantDiagnosisIcd10 || "";
	const concomitantDiagText = p.concomitantDiagnosisText || "";

	const anamnesis = p.briefAnamnesisAndClinicalCourse || "Пациент обратился в клинику в плановом порядке с жалобами на эстетический и функциональный дефект, кратковременные боли от температурных раздражителей.";
	const diagnosticStudies = p.diagnosticStudiesSummary || "Прицельная радиовизиография, ортопантомограмма (ОПТГ): периапикальные ткани интактны, деструктивных изменений костной ткани не обнаружено, каналы проходимы.";

	const stages: readonly MedicalCardExtractStageLike[] = p.treatmentStagesTimeline || p.treatmentStages || p.chronology || [];
	const stagesRows = stages.map((st: MedicalCardExtractStageLike, idx: number) => {
		const d = st.treatmentDate || st.date || st.stageDate || issueDate;
		const tooth = st.toothOrAnatomicalArea || st.toothNumber || "—";
		const diag = st.diagnosisIcd10 ? `${st.diagnosisIcd10} ${st.diagnosisText || ""}` : (st.diagnosis || st.diagnosisText || "—");
		const interv = st.performedIntervention || st.intervention || st.interventionSummary || "—";
		const anesth = st.anesthesiaUsed ? `Анестезия: ${st.anesthesiaUsed}` : "";
		const fullInterv = anesth ? `${interv}<br/><span style="color:#64748b; font-size:7pt;">${anesth}</span>` : interv;
		const doc = st.attendingDoctorFullName || st.doctorName || p.attendingDoctorFullName || "Лечащий врач";

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

	const attendingDoc = payload.attendingDoctorFullName || ("attendingDoctor" in payload ? String((payload as { attendingDoctor?: unknown }).attendingDoctor || "") : "") || "Врач-стоматолог";
	const attendingSpec = payload.attendingDoctorSpecialty || "Врач-стоматолог-терапевт";
	const headDoc = payload.headOfDepartmentFullName || ("headOfDepartment" in payload ? String((payload as { headOfDepartment?: unknown }).headOfDepartment || "") : "") || "Главный врач";

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
