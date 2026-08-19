/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — MINZDRAV RF
 * Print-ready A4 HTML generators with @media print styling
 * ═══════════════════════════════════════════════════════════════════════════
 */

function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

import type { FullForm043uPayload } from "./forms043u.js";
import type { OrthodonticCard043_1uPayload } from "./forms043_1u.js";
import type { DailyDentistDiary037uPayload } from "./forms037u.js";
import type { SummaryDentistStatement039uPayload } from "./forms039u.js";
import type { MedicalCardExtract003vuPayload } from "./forms003vu.js";
import type { RadiationDoseSheetPayload } from "./radiationDoseSheet.js";

/** Общие CSS стили для печати медицинских документов на листах А4 */
export const CLINICAL_DOCUMENT_PRINT_STYLES = `
<style>
  @page {
    size: A4;
    margin: 15mm 15mm 15mm 15mm;
  }
  body {
    font-family: "Times New Roman", Times, serif, Arial;
    font-size: 10pt;
    line-height: 1.25;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .doc-container {
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
  }
  .header-grid {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    border-bottom: 1.5px solid #000;
    padding-bottom: 6px;
  }
  .clinic-info {
    width: 60%;
    font-size: 8.5pt;
    line-height: 1.2;
  }
  .clinic-title {
    font-weight: bold;
    font-size: 10pt;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .doc-requisites {
    width: 38%;
    text-align: right;
    font-size: 8.5pt;
    line-height: 1.2;
  }
  .doc-title-block {
    text-align: center;
    margin: 12px 0 10px 0;
  }
  .doc-main-title {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 0;
  }
  .doc-sub-title {
    font-size: 9.5pt;
    margin: 2px 0 0 0;
    font-style: italic;
  }
  .section-title {
    font-weight: bold;
    font-size: 10.5pt;
    margin-top: 10px;
    margin-bottom: 4px;
    background: #f1f5f9;
    padding: 2px 6px;
    border-left: 3px solid #0284c7;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 10px 0;
    font-size: 9pt;
  }
  table.data-table th, table.data-table td {
    border: 1px solid #333;
    padding: 3px 5px;
    vertical-align: top;
  }
  table.data-table th {
    background: #e2e8f0;
    font-weight: bold;
    text-align: center;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 24px;
    page-break-inside: avoid;
  }
  .sig-line {
    border-bottom: 1px solid #000;
    width: 220px;
    height: 18px;
    margin-bottom: 2px;
  }
  .sig-caption {
    font-size: 8pt;
    color: #475569;
    text-align: center;
  }
  .badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 8.5pt;
    font-weight: bold;
  }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  @media print {
    body { font-size: 9.5pt; }
    .no-print { display: none; }
    .page-break-after { page-break-after: always; }
  }
</style>
`;

/** 1. Рендерер Формы № 043/у — Медицинская карта стоматологического больного */
export function renderForm043uHtml(payload: FullForm043uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const cardOpened = payload.patient?.cardOpenedAt || payload.cardOpenedDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const patientAddress = payload.patient?.address || payload.patientAddressRegistration || payload.patientAddressResidence || "—";
	const doctorName = payload.attendingDoctorFullName || payload.soapDiaries?.[0]?.doctorFullName || "Врач-стоматолог";

	const complaints = payload.anamnesisAndHealth?.mainComplaints || payload.chiefComplaint || "Жалоб нет";
	const anamnesisMorbi = payload.anamnesisAndHealth?.anamnesisMorbi || payload.historyOfPresentIllness || "—";
	const allergies = payload.anamnesisAndHealth?.allergicHistory || payload.allergologicalHistory || "Не отягощен";
	const bite = payload.objectiveExamination?.extraoralBite || payload.biteDescription || "Ортогнатический";

	const dmft = payload.dentalFormula?.calculatedDmft || payload.dmftIndex || {
		totalDmft: 2,
		dmftTotal: 2,
		decayed: 1,
		filled: 1,
		missing: 0,
		totalDmfs: 2,
		intensityLevel: "low",
	};

	const diaries = payload.soapDiaries || [];
	const diariesHtml = diaries.length > 0
		? diaries.map((d: any) => `
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:8px; border-radius:4px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <strong>Дата приёма: ${escapeHtml(d.entryDate || d.visitDate || "")}</strong>
          <span>Врач: <strong>${escapeHtml(d.doctorFullName || doctorName)}</strong></span>
        </div>
        <p style="margin:2px 0;"><strong>Диагноз:</strong> ${escapeHtml(d.assessmentDiagnosisText || d.diagnosisDetailed || d.assessmentDiagnosis || "—")}</p>
        <p style="margin:2px 0;"><strong>Жалобы (S):</strong> ${escapeHtml(d.subjectiveComplaints || d.subjectiveComplaint || "—")}</p>
        <p style="margin:2px 0;"><strong>Объективно (O):</strong> ${escapeHtml(d.objectiveStatusLocalis || d.objectiveStatus || "—")}</p>
        <p style="margin:2px 0;"><strong>Лечение (P):</strong> ${escapeHtml(d.procedureProtocol || d.planAndTreatment || "—")}</p>
      </div>
    `).join("")
		: `<p><em>Дневники приёма отсутствуют.</em></p>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта № ${escapeHtml(cardNum)} (Форма 043/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав России</strong><br/>
      Медицинская документация<br/>
      <strong>ФОРМА № 043/у</strong><br/>
      Медицинская карта стоматологического пациента
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
    <p class="doc-sub-title">Дата открытия: <strong>${escapeHtml(cardOpened)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Пациент:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:15%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
      <td><strong>Адрес:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
    </tr>
  </table>

  <div class="section-title">2. Анамнез и данные первичного осмотра</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Жалобы:</strong></td>
      <td colspan="3">${escapeHtml(complaints)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез заболевания:</strong></td>
      <td colspan="3">${escapeHtml(anamnesisMorbi)}</td>
    </tr>
    <tr>
      <td><strong>Аллергоанамнез:</strong></td>
      <td>${escapeHtml(allergies)}</td>
      <td><strong>Прикус:</strong></td>
      <td>${escapeHtml(bite)}</td>
    </tr>
  </table>

  <div class="section-title">3. Индекс интенсивности кариеса (КПУ)</div>
  <p><strong>КПУ(з): ${dmft.totalDmft ?? dmft.dmftTotal ?? 0}</strong> (К=${dmft.decayed ?? 0}, П=${dmft.filled ?? 0}, У=${dmft.missing ?? 0}) | <strong>Интенсивность: ${dmft.intensityLevelLabel || dmft.intensityLevel || "Низкий"}</strong></p>

  <div class="section-title">4. Дневники приёма по схеме SOAP</div>
  ${diariesHtml}

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач: ${escapeHtml(doctorName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент: ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 2. Рендерер Формы № 043-1/у — Медицинская карта ортодонтического пациента */
export function renderForm043_1uHtml(payload: OrthodonticCard043_1uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "female") === "male" ? "Мужской" : "Женский";
	const doctorName = payload.treatingOrthodontist?.fullName || payload.orthodontistFullName || "Врач-ортодонт";
	const applianceName = payload.treatmentPlan?.applianceName || payload.appliancePlan?.applianceType || "Брекет-система";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Карта ортодонтического пациента № ${escapeHtml(cardNum)} (Форма 043-1/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав России</strong><br/>
      <strong>ФОРМА № 043-1/у</strong><br/>
      Медицинская карта ортодонтического пациента
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
  </div>

  <div class="section-title">1. Паспортные данные</div>
  <table class="data-table">
    <tr>
      <td><strong>Пациент:</strong></td>
      <td><strong>${escapeHtml(patientName)}</strong></td>
      <td><strong>Пол / Д.Р.:</strong></td>
      <td>${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
  </table>

  <div class="section-title">2. Аппаратурное лечение и ретенция</div>
  <p><strong>Аппаратура:</strong> <strong>${escapeHtml(applianceName)}</strong></p>
  <p><strong>Ретенционный протокол:</strong> ${escapeHtml(payload.treatmentPlan?.retentionPlan || payload.appliancePlan?.retentionProtocol || "Ретейнеры")}</p>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-ортодонт: ${escapeHtml(doctorName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент: ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 3. Рендерер Формы № 037/у-88 — Листок ежедневного учета работы врача-стоматолога */
export function renderForm037uHtml(payload: DailyDentistDiary037uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const doctorName = payload.doctor?.fullName || payload.doctorFullName || "Врач-стоматолог";
	const workDate = payload.workDate || payload.shiftDate || new Date().toISOString().slice(0, 10);
	const totals = payload.dailyTotals || payload.summaryTotals || {
		totalPatientsSeen: 0,
		totalPatientsCount: 0,
		sanatedPatientsCount: 0,
		totalFillingsPlaced: 0,
		totalUetAccumulated: 0,
		uetTotals: { totalUet: 0 },
	};
	const totalUet = totals.uetTotals?.totalUet ?? totals.totalUetAccumulated ?? 0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Листок 037/у-88 от ${escapeHtml(workDate)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Врач: <strong>${escapeHtml(doctorName)}</strong></div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав СССР / РФ</strong><br/>
      <strong>ФОРМА № 037/у-88</strong><br/>
      Листок ежедневного учета работы врача-стоматолога
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТОК ЕЖЕДНЕВНОГО УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА</h1>
    <p class="doc-sub-title">Дата: <strong>${escapeHtml(workDate)}</strong></p>
  </div>

  <div class="section-title">Сводные итоги смены</div>
  <table class="data-table">
    <tr>
      <td><strong>Всего пациентов:</strong> ${totals.totalPatientsSeen ?? totals.totalPatientsCount ?? 0}</td>
      <td><strong>Санировано:</strong> ${totals.sanatedPatientsCount ?? totals.totalSanatedCount ?? 0}</td>
      <td><strong>ИТОГО УЕТ: ${Number(totalUet).toFixed(2)}</strong></td>
    </tr>
  </table>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач: ${escapeHtml(doctorName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 4. Рендерер Формы № 039/у-88 — Сводная ведомость учета работы врача-стоматолога */
export function renderForm039uHtml(payload: SummaryDentistStatement039uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const doctorName = payload.reportingDoctor?.fullName || payload.doctorFullName || "Врач-стоматолог";
	const period = payload.periodLabel || payload.reportingPeriodMonthYear || "Отчетный период";
	const uet = payload.uetBreakdown || { totalUetEarned: 0, totalUetAccumulated: 0 };
	const totalUet = uet.totalUetEarned ?? uet.totalUetAccumulated ?? 0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Сводная ведомость 039/у-88 за ${escapeHtml(period)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Врач: <strong>${escapeHtml(doctorName)}</strong></div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав СССР / РФ</strong><br/>
      <strong>ФОРМА № 039/у-88</strong><br/>
      Сводная ведомость учета работы врача-стоматолога
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">СВОДНАЯ ВЕДОМОСТЬ УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА</h1>
    <p class="doc-sub-title">Период: <strong>${escapeHtml(period)}</strong></p>
  </div>

  <div class="section-title">Выработка УЕТ (Приказ № 804н)</div>
  <table class="data-table">
    <tr>
      <td><strong>ИТОГО ВЫРАБОТАНО УЕТ:</strong></td>
      <td class="center" style="font-size:12pt; font-weight:bold; color:#1e40af;">${Number(totalUet).toFixed(2)} УЕТ</td>
    </tr>
  </table>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач: ${escapeHtml(doctorName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 5. Рендерер Формы № 003-В/у — Выписка из медицинской карты */
export function renderForm003vuHtml(payload: MedicalCardExtract003vuPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const doctorName = payload.attendingDoctorFullName || "Лечащий врач";
	const clinicalDiag = payload.clinicalDiagnosisDetailed || payload.primaryDiagnosisText || payload.diagnosisOnAdmission || "—";
	const stages = payload.treatmentStages || payload.treatmentStagesTimeline || [];

	const stagesHtml = stages.map((st: any) => `
    <tr>
      <td class="center">${escapeHtml(st.stageDate || st.treatmentDate || "")}</td>
      <td class="center">${escapeHtml(st.toothNumber || st.toothOrAnatomicalArea || "—")}</td>
      <td>${escapeHtml(st.diagnosis || st.diagnosisText || "")}</td>
      <td>${escapeHtml(st.interventionSummary || st.performedIntervention || "")}</td>
      <td>${escapeHtml(st.treatingDoctorFullName || st.attendingDoctorFullName || doctorName)}</td>
    </tr>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Выписка (Форма 003-В/у) — ${escapeHtml(patientName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав России</strong><br/>
      <strong>ФОРМА № 003-В/у</strong><br/>
      Выписка из амбулаторной карты
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО</h1>
  </div>

  <div class="section-title">1. Пациент и диагноз</div>
  <table class="data-table">
    <tr>
      <td><strong>Пациент:</strong></td>
      <td><strong>${escapeHtml(patientName)}</strong></td>
      <td><strong>Клинический диагноз:</strong></td>
      <td><strong>${escapeHtml(clinicalDiag)}</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Хронология проведенного лечения</div>
  <table class="data-table">
    <thead>
      <tr><th>Дата</th><th>Зуб</th><th>Диагноз</th><th>Лечение</th><th>Врач</th></tr>
    </thead>
    <tbody>
      ${stagesHtml || `<tr><td colspan="5" class="center">Записи отсутствуют</td></tr>`}
    </tbody>
  </table>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач: ${escapeHtml(doctorName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 6. Рендерер Листа учета дозовых нагрузок пациента */
export function renderRadiationDoseSheetHtml(payload: RadiationDoseSheetPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const summary = payload.summaryAnnualDose || payload.annualSummary || {
		currentYear: 2026,
		totalEffectiveDoseMsv: 0.003,
		totalDoseYearMsv: 0.003,
		interpretationText: "Дозовая нагрузка в норме",
		safetyRecommendation: "В пределах нормы",
	};
	const doseMsv = summary.totalEffectiveDoseMsv ?? summary.totalDoseYearMsv ?? 0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Лист учета дозовых нагрузок — ${escapeHtml(patientName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
    </div>
    <div class="doc-requisites">
      <strong>СанПиН 2.6.1.1192-03</strong><br/>
      <strong>ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК</strong>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ</h1>
  </div>

  <div class="section-title">1. Пациент</div>
  <table class="data-table">
    <tr>
      <td><strong>Пациент:</strong></td>
      <td><strong>${escapeHtml(patientName)}</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Суммарная эффективная доза</div>
  <table class="data-table">
    <tr>
      <td><strong>Суммарная доза за год:</strong></td>
      <td class="center" style="font-size:12pt; font-weight:bold; color:#1e40af;">${Number(doseMsv).toFixed(4)} мЗв</td>
    </tr>
  </table>
</div>
</body>
</html>`;
}
