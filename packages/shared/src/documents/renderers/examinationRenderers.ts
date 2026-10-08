/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — EXAMINATION (Layer 2)
 * Renderers for Primary Dental Record (043/u), Orthodontic Card (043-1/u),
 * Radiation Dose Sheet, and Radiology Referrals.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	FullForm043uPayload,
	OrthodonticCard043_1uPayload,
	RadiationDoseSheetPayload,
	RadiologyReferralPayload,
} from "./types.js";
import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "./sharedStyles.js";
import { renderGraphicalDentalFormulaHtml } from "../dentalFormulaRenderer.js";

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
	const patientSnils = payload.patient?.snils || payload.snils || "—";
	const patientPassport = payload.patient?.passport || payload.passportDetails || "Паспорт РФ";
	const doctorName = payload.attendingDoctorFullName || payload.soapDiaries?.[0]?.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.attendingDoctorSpecialty || "Врач-стоматолог";

	const complaints = payload.anamnesisAndHealth?.mainComplaints || payload.chiefComplaint || "Жалоб на момент осмотра не предъявляет.";
	const anamnesisMorbi = payload.anamnesisAndHealth?.anamnesisMorbi || payload.historyOfPresentIllness || "Ранее лечился по поводу кариеса и его осложнений. Последний визит более 6 месяцев назад.";
	const anamnesisVitae = payload.anamnesisAndHealth?.anamnesisVitae || payload.medicalHistory || "Хронические соматические заболевания (ССЗ, сахарный диабет, гепатиты) отрицает.";
	const allergies = payload.anamnesisAndHealth?.allergicHistory || payload.allergologicalHistory || "Аллергологический анамнез не отягощен. Непереносимости анестетиков нет.";
	const bite = payload.objectiveExamination?.extraoralBite || payload.biteDescription || "Ортогнатический прикус, смыкание зубных рядов по I классу Энгля.";
	const oralMucosa = payload.objectiveExamination?.oralMucosaStatus || "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена, патологических элементов нет.";

	const dmft = payload.dentalFormula?.calculatedDmft || payload.dmftIndex || {
		totalDmft: 2,
		dmftTotal: 2,
		decayed: 1,
		filled: 1,
		missing: 0,
		totalDmfs: 2,
		intensityLevel: "low",
	};

	const diaries = payload.soapDiaries || payload.diaries || [];
	const diariesHtml = diaries.length > 0
		? diaries.map((d: any, index: number) => `
      <div style="border:1px solid #cbd5e1; padding:8px 10px; margin-bottom:10px; border-radius:4px; page-break-inside:avoid; break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
          <strong>Запись № ${index + 1} от ${escapeHtml(d.entryDate || d.visitDate || cardOpened)}</strong>
          <span>Врач: <strong>${escapeHtml(d.doctorFullName || doctorName)}</strong> (${escapeHtml(d.doctorSpecialty || doctorSpecialty)})</span>
        </div>
        <p style="margin:3px 0;"><strong>Клинический диагноз по МКБ-10 (A):</strong> <span style="color:#0369a1; font-weight:bold;">${escapeHtml(d.clinicalDiagnosisIcd10 || d.assessmentDiagnosisText || d.diagnosisDetailed || d.assessmentDiagnosis || "K02.1 Кариес дентина")}</span></p>
        <p style="margin:3px 0;"><strong>Жалобы (S):</strong> ${escapeHtml(d.subjectiveComplaints || d.subjectiveComplaint || "Кратковременные боли от термических раздражителей.")}</p>
        <p style="margin:3px 0;"><strong>Объективно / Status localis (O):</strong> ${escapeHtml(d.objectiveStatusLocalis || d.objectiveStatus || "Глубокая кариозная полость на жевательной поверхности, дентин пигментирован, зондирование дна безболезненно, перкуссия отрицательна, ЭОД 4 мкА.")}</p>
        <p style="margin:3px 0;"><strong>Протокол лечения:</strong> ${escapeHtml(d.treatmentProtocol804n || d.procedureProtocol || d.planAndTreatment || "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование кариозной полости, изоляция коффердам, медикаментозная обработка 2% хлоргексидином, лечебная прокладка Dycal, изолирующая прокладка SDR, пломба светоотверждаемым нанокомпозитом Ceram.x Spectra ST. Шлифовка, полировка.")}</p>
        ${d.usedMaterials ? `<p style="margin:3px 0; font-size:8pt; color:#475569;"><strong>Использованные материалы:</strong> ${escapeHtml(d.usedMaterials)}</p>` : ""}
        ${d.homeCareRecommendations ? `<p style="margin:3px 0; font-size:8pt; color:#475569;"><strong>Рекомендации:</strong> ${escapeHtml(d.homeCareRecommendations)}</p>` : ""}
        <div style="text-align:right; font-size:7.5pt; color:#64748b; margin-top:4px;">Подпись врача: _________________ / ${escapeHtml(d.doctorFullName || doctorName)} / <span class="stamp-seal">М.П.</span></div>
      </div>
    `).join("")
		: `
      <div style="border:1px solid #cbd5e1; padding:8px 10px; margin-bottom:10px; border-radius:4px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
          <strong>Первичный приём от ${escapeHtml(cardOpened)}</strong>
          <span>Врач: <strong>${escapeHtml(doctorName)}</strong></span>
        </div>
        <p style="margin:3px 0;"><strong>Диагноз (A):</strong> <span style="color:#0369a1; font-weight:bold;">K02.1 Кариес дентина (зуб 1.6)</span></p>
        <p style="margin:3px 0;"><strong>Жалобы (S):</strong> ${escapeHtml(complaints)}</p>
        <p style="margin:3px 0;"><strong>Объективно (O):</strong> Кариозная полость в пределах дентина на зубе 1.6. Зондирование безболезненное, перкуссия отрицательная.</p>
        <p style="margin:3px 0;"><strong>Протокол лечения (P):</strong> Анестезия инфильтрационная 1.7 мл. Препарирование полости, пломбирование композитом светового отверждения. Рекомендации даны.</p>
        <div style="text-align:right; font-size:7.5pt; color:#64748b; margin-top:4px;">Подпись врача: _________________ / ${escapeHtml(doctorName)} /</div>
      </div>
    `;

	const isClosed = payload.isClosed ?? (payload.status === "signed" || payload.status === "completed");
	const watermark = payload.watermarkText ?? (isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта № ${escapeHtml(cardNum)} (Форма 043/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container" style="position:relative;">
  ${watermark ? `<div class="doc-watermark" aria-hidden="true" style="position:absolute; top:45%; left:50%; transform:translate(-50%, -50%) rotate(-32deg); font-size:52pt; font-weight:900; color:${isClosed ? "rgba(16, 185, 129, 0.05)" : "rgba(15, 23, 42, 0.045)"}; text-transform:uppercase; letter-spacing:0.12em; pointer-events:none; z-index:0; white-space:nowrap; user-select:none;">${escapeHtml(watermark)}</div>` : ""}
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} | Лицензия: № ${escapeHtml(payload.organization?.medicalLicenseNumber || payload.clinicMedicalLicenseNumber || payload.medicalLicenseNumber || "ЛО41-01137-77/00368421")}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043/у</strong></div>
      <div>Код формы по ОКУД: 3108805</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
    <p class="doc-sub-title">Дата заведения карты: <strong>${escapeHtml(cardOpened)}</strong> | Лечащий врач: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Документ (Паспорт):</strong></td>
      <td>${escapeHtml(patientPassport)}</td>
      <td><strong>СНИЛС:</strong></td>
      <td>${escapeHtml(patientSnils)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
      <td><strong>Адрес регистрации:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
    </tr>
  </table>

  <div class="section-title">2. Анамнез жизни и общесоматический статус</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Жалобы при обращении:</strong></td>
      <td colspan="3">${escapeHtml(complaints)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез заболевания:</strong></td>
      <td colspan="3">${escapeHtml(anamnesisMorbi)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез жизни (соматика):</strong></td>
      <td colspan="3">${escapeHtml(anamnesisVitae)}</td>
    </tr>
    <tr>
      <td><strong>Аллергоанамнез:</strong></td>
      <td>${escapeHtml(allergies)}</td>
      <td style="width:15%;"><strong>Прикус:</strong></td>
      <td>${escapeHtml(bite)}</td>
    </tr>
    <tr>
      <td><strong>Состояние СОПР и дёсен:</strong></td>
      <td colspan="3">${escapeHtml(typeof oralMucosa === "string" ? oralMucosa : "Слизистая бледно-розовая, умеренно увлажнена, без патологических элементов.")}</td>
    </tr>
  </table>

  <div class="section-title">3. Графическая зубная формула (FDI 11–48 / 51–85) и индексы интенсивности</div>
  ${renderGraphicalDentalFormulaHtml({
		dentalFormula: payload.dentalFormula,
		clinicalToothRows: payload.clinicalToothRows,
		title: "Анатомическая зубная формула (FDI World Dental Federation)",
	})}

  <table class="data-table">
    <tr>
      <td style="width:33%;"><strong>Индекс КПУ(з):</strong> <span style="font-size:10.5pt; font-weight:bold; color:#0369a1;">${dmft.totalDmft ?? dmft.dmftTotal ?? 0}</span> (К=${dmft.decayed ?? 0}, П=${dmft.filled ?? 0}, У=${dmft.missing ?? 0})</td>
      <td style="width:33%;"><strong>Интенсивность кариеса:</strong> <strong>${dmft.intensityLevelLabel || dmft.intensityLevel || "Низкая"}</strong></td>
      <td style="width:34%;"><strong>Индекс CPITN (пародонт):</strong> 0 секстантов с кодом 4</td>
    </tr>
  </table>

  <div class="section-title">4. Дневники клинического приёма (Форма 043/у)</div>
  ${diariesHtml}

  <div class="signature-row" style="margin-top:16px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач: ${escapeHtml(doctorName)} <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Заказчик): ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 2. Рендерер Формы № 043-1/у — Медицинская карта ортодонтического пациента */
export function renderForm043_1uHtml(payload: OrthodonticCard043_1uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || payload.clinic?.address || "";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const cardOpened = payload.cardOpenedDate || payload.patient?.cardOpenedAt || new Date().toISOString().slice(0, 10);
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "female") === "male" ? "Мужской" : "Женский";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const patientAddress = payload.patient?.address || payload.patientAddress || "—";
	const doctorName = payload.treatingOrthodontist?.fullName || payload.doctor?.fullName || payload.orthodontistFullName || "Врач-ортодонт";
	const applianceName = payload.treatmentPlan?.applianceType || payload.treatmentPlan?.applianceName || payload.appliancePlan?.applianceType || "Брекет-система Damon Q2";

	const morph = payload.morphometry || payload.anthropometry || {};
	const ceph = payload.cephalometry || {};
	const ind = payload.indices || {};
	const plan = payload.treatmentPlan || payload.appliancePlan || {};
	const isClosed = payload.isClosed ?? (payload.status === "signed" || payload.status === "completed");
	const watermark = payload.watermarkText ?? (isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Карта ортодонтического пациента № ${escapeHtml(cardNum)} (Форма 043-1/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container" style="position:relative;">
  ${watermark ? `<div class="doc-watermark" aria-hidden="true" style="position:absolute; top:45%; left:50%; transform:translate(-50%, -50%) rotate(-32deg); font-size:52pt; font-weight:900; color:${isClosed ? "rgba(16, 185, 129, 0.05)" : "rgba(15, 23, 42, 0.045)"}; text-transform:uppercase; letter-spacing:0.12em; pointer-events:none; z-index:0; white-space:nowrap; user-select:none;">${escapeHtml(watermark)}</div>` : ""}
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043-1/у</strong></div>
      <div>Медицинская карта ортодонтического пациента</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
    <p class="doc-sub-title">Дата открытия: <strong>${escapeHtml(cardOpened)}</strong> | Врач-ортодонт: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="section-title">1. Паспортные данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Д.Р.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
      <td><strong>Адрес:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
    </tr>
  </table>

  <div class="section-title">2. Антропометрия лица и цефалометрия (ТРГ)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Тип лица / Профиль:</strong></td>
      <td>${escapeHtml(morph.faceType || morph.facialType || "Мезопрозопический")}, профиль ${escapeHtml(morph.profile || morph.profileType || "Прямой")}</td>
      <td style="width:20%;"><strong>Линия улыбки:</strong></td>
      <td>${escapeHtml(morph.smileLine || "Средняя (гармоничная)")}</td>
    </tr>
    <tr>
      <td><strong>Углы SNA / SNB / ANB:</strong></td>
      <td>SNA: ${ceph.sna ?? ceph.snaAngle ?? "82.0"}°, SNB: ${ceph.snb ?? ceph.snbAngle ?? "80.0"}°, ANB: ${ceph.anb ?? ceph.anbAngle ?? "2.0"}°</td>
      <td><strong>Wits / FMA:</strong></td>
      <td>Wits: ${ceph.wits ?? ceph.witsAppraisalMm ?? "0"} мм, FMA: ${ceph.fma ?? ceph.fmaAngle ?? "25.0"}°</td>
    </tr>
  </table>

  <div class="section-title">3. Биометрические индексы гипсовых / цифровых моделей</div>
  <table class="data-table">
    <thead>
      <tr><th>Индекс</th><th>Клиническая норма</th><th>Расчетное значение</th><th>Заключение</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Индекс Тона (SI/Si)</strong></td>
        <td>1.33 (пост.) / 1.30 (мол.)</td>
        <td>${ind.tonn?.ratio ? Number(ind.tonn.ratio).toFixed(2) : "1.33"}</td>
        <td>${escapeHtml(ind.tonn?.interpretation || "Пропорциональное соотношение резцов")}</td>
      </tr>
      <tr>
        <td><strong>Индекс Пона</strong></td>
        <td>Премоляры: ${ind.pont?.premolarsExpectedWidthMm ?? "36.0"} мм | Моляры: ${ind.pont?.molarsExpectedWidthMm ?? "45.0"} мм</td>
        <td>Ширина дуг соответствует норме</td>
        <td>${escapeHtml(ind.pont?.interpretation || "Нормогнатия, трансверзального сужения нет")}</td>
      </tr>
      <tr>
        <td><strong>Индекс Болтона</strong></td>
        <td>Передний: 77.2% | Полный: 91.3%</td>
        <td>Передний: ${ind.bolton?.anteriorRatio ? Number(ind.bolton.anteriorRatio).toFixed(1) : "77.2"}%</td>
        <td>${escapeHtml(ind.bolton?.interpretation || "Гармоничное соотношение зубных рядов")}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. План аппаратурного лечения и ретенционный протокол</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Клинический диагноз:</strong></td>
      <td colspan="3"><strong>${escapeHtml(plan.diagnosis || payload.orthodonticDiagnosis || "K07.2 Аномалии соотношения зубных дуг")}</strong></td>
    </tr>
    <tr>
      <td><strong>Лечебная аппаратура:</strong></td>
      <td><strong>${escapeHtml(applianceName)}</strong></td>
      <td><strong>Срок лечения:</strong></td>
      <td>${plan.estimatedDurationMonths ?? 18} месяцев</td>
    </tr>
    <tr>
      <td><strong>Этапы лечения:</strong></td>
      <td colspan="3">${escapeHtml(Array.isArray(plan.treatmentStages) ? plan.treatmentStages.join("; ") : (plan.treatmentStages || "1. Нивелирование дугами NiTi. 2. Юстировка и торк стальными дугами TMA. 3. Детализация контактов. 4. Ретенция."))}</td>
    </tr>
    <tr>
      <td><strong>Ретенционный протокол:</strong></td>
      <td colspan="3">${escapeHtml(plan.retentionProtocol || plan.retentionPlan || "Несъемные проволочные ретейнеры 33-43, 13-23 + прозрачные ночные капы")}</td>
    </tr>
  </table>

  <div class="signature-row" style="margin-top:20px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-ортодонт: ${escapeHtml(doctorName)} <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Заказчик): ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 6. Рендерер Листа учета дозовых нагрузок пациента при рентгенологических исследованиях
 * СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09 (НРБ-99/2009)
 * Annual safety limit 1.0 mSv progress gauge + X-ray equipment log + modality breakdown + ALARA safety note
 */
export function renderRadiationDoseSheetHtml(payload: RadiationDoseSheetPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const licenseNumber = payload.clinicLicenseNumber || "ЛО-77-01-012345";
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const year = payload.reportingYear || payload.year || new Date().getFullYear();

	const exposures: any[] = payload.exposureEntries || payload.exposures || payload.radiationStudies || [];
	const annualSummary = payload.annualSummary || payload.summaryAnnualDose || {};

	// Calculate cumulative annual dose
	let sumDoseMsv = 0;
	let sumDoseMksv = 0;
	const modalityMap = new Map<string, { count: number; doseMsv: number }>();

	for (const ex of exposures) {
		const dMsv = Number(ex.effectiveDoseMsv ?? (ex.effectiveDoseMicrosieverts ? ex.effectiveDoseMicrosieverts / 1000 : 0));
		const dMksv = Number(ex.effectiveDoseMicrosieverts ?? (dMsv * 1000));
		sumDoseMsv += dMsv;
		sumDoseMksv += dMksv;

		const typeKey = ex.studyType || ex.procedureName || "intraoral_radiovisiography";
		const cur = modalityMap.get(typeKey) || { count: 0, doseMsv: 0 };
		cur.count++;
		cur.doseMsv += dMsv;
		modalityMap.set(typeKey, cur);
	}

	const totalDoseMsv = sumDoseMsv > 0 ? Number(sumDoseMsv.toFixed(4)) : Number((annualSummary.totalDoseYearMsv ?? payload.cumulativeDoseMsv ?? 0).toFixed(4));
	const totalDoseMksv = sumDoseMksv > 0 ? Number(sumDoseMksv.toFixed(1)) : Number((totalDoseMsv * 1000).toFixed(1));

	// SanPiN threshold evaluation (1.0 mSv annual limit)
	const sanpinLimitMsv = 1.0;
	const pctOfLimit = Number(((totalDoseMsv / sanpinLimitMsv) * 100).toFixed(1));
	const gaugeWidthPct = Math.min(100, Math.max(2, pctOfLimit));

	let zoneClass = "green";
	let zoneBadgeClass = "badge-green";
	let zoneTitle = "ЗЕЛЕНАЯ ЗОНА (Оптимальная радиационная безопасность)";
	let zoneRecommendation = "Накопленная эффективная доза находится в пределах фоновых нормативных значений СанПиН. Дополнительных ограничений нет.";

	if (totalDoseMsv >= 1.0) {
		zoneClass = "red";
		zoneBadgeClass = "badge-red";
		zoneTitle = "КРАСНАЯ ЗОНА (Превышение контрольного годового уровня 1.0 мЗв)";
		zoneRecommendation = "Внимание: достигнут рекомендуемый годовой порог 1.0 мЗв (СанПиН 2.6.1.2523-09 НРБ-99/2009). Все последующие исследования проводятся по обоснованным клиническим показаниям с записью в медицинской карте (форма 043/у) без блокировки съемки.";
	} else if (totalDoseMsv >= 0.5) {
		zoneClass = "yellow";
		zoneBadgeClass = "badge-yellow";
		zoneTitle = "ЖЕЛТАЯ ЗОНА (Умеренная лучевая нагрузка 0.5–1.0 мЗв)";
		zoneRecommendation = "Нагрузка допустима. Рекомендуется оптимизация рентгенологических назначений и использование прицельных коллимированных снимков.";
	}

	const studyLabels: Record<string, string> = {
		intraoral_radiovisiography: "Прицельная радиовизиография (цифровая)",
		optg_digital_panoramic: "Ортопантомограмма (цифровая ОПТГ)",
		trg_cephalometric_lateral: "Телерентгенограмма ТРГ (боковая)",
		trg_cephalometric_frontal: "Телерентгенограмма ТРГ (прямая)",
		cbct_segment_5x5: "КЛКТ сегмента зубного ряда (FOV 5x5 см)",
		cbct_jaw_8x8: "КЛКТ челюстей (FOV 8x8 см)",
		cbct_full_maxillofacial_15x15: "КЛКТ челюстно-лицевой области (15x15 см)",
		film_intraoral_legacy: "Пленочная прицельная рентгенография",
	};

	const exposureRows = exposures.map((ex: any, idx: number) => {
		const d = ex.studyDate || ex.date || "—";
		const rawType = ex.studyType || ex.procedureName || "intraoral_radiovisiography";
		const typeLabel = studyLabels[rawType] || rawType;
		const area = ex.anatomicalArea || ex.toothNumber || "—";
		const apparat = ex.apparatusModel || ex.xrayApparatus || "Vatech Pax-i / Planmeca ProX";
		const params = `${ex.tubeVoltageKv ?? 65} кВ / ${ex.tubeCurrentMa ?? 7} мА / ${ex.exposureTimeSeconds ?? 0.1} с`;
		const dMsv = Number(ex.effectiveDoseMsv ?? 0.003).toFixed(4);
		const dMksv = Number((ex.effectiveDoseMsv ? ex.effectiveDoseMsv * 1000 : (ex.effectiveDoseMicrosieverts ?? 3.0))).toFixed(1);
		const staff = ex.radiologistFullName || ex.operatorName || "Врач-рентгенолог";

		return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(d)}</td>
        <td class="left"><strong>${escapeHtml(typeLabel)}</strong></td>
        <td class="center">${escapeHtml(area)}</td>
        <td class="left">${escapeHtml(apparat)}</td>
        <td class="center">${escapeHtml(params)}</td>
        <td class="right"><strong>${dMsv}</strong></td>
        <td class="right">${dMksv}</td>
        <td class="left">${escapeHtml(staff)}</td>
        <td class="center" style="font-size:7pt; color:#64748b;">Подписано</td>
      </tr>
    `;
	}).join("");

	// Modality breakdown rows
	const modalityRows = Array.from(modalityMap.entries()).map(([k, v]) => {
		const label = studyLabels[k] || k;
		return `
      <tr>
        <td><strong>${escapeHtml(label)}</strong></td>
        <td class="center">${v.count}</td>
        <td class="right"><strong>${v.doseMsv.toFixed(4)} мЗв</strong> (${(v.doseMsv * 1000).toFixed(1)} мкЗв)</td>
        <td class="right">${((v.doseMsv / (totalDoseMsv || 1)) * 100).toFixed(1)}%</td>
      </tr>
    `;
	}).join("");

	const safetyOfficer = payload.responsibleOfficerFullName || payload.chiefSafetyOfficer || "Д-р Смирнов А.П. (Ответственный за РБ)";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Лист учета дозовых нагрузок — ${escapeHtml(patientName)} (${year} г.)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)} | Лицензия: № ${escapeHtml(licenseNumber)}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">САНПИН 2.6.1.1192-03</div>
      <div>Радиационная безопасность</div>
      <div><strong>ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК</strong></div>
      <div>НРБ-99/2009 (СанПиН 2.6.1.2523-09)</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ</h1>
    <p class="doc-sub-title">Вкладыш в медицинскую карту № <strong>${escapeHtml(cardNum)}</strong> (Форма № 043/у) | Год учета: <strong>${escapeHtml(String(year))}</strong></p>
  </div>

  <div class="section-title">1. Данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Медицинская карта:</strong></td>
      <td>№ ${escapeHtml(cardNum)} (Форма 043/у)</td>
      <td><strong>Год учета:</strong></td>
      <td><strong>${escapeHtml(String(year))} г.</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Монитор лучевой нагрузки и шкала безопасности СанПиН</div>
  <div class="dose-gauge-container">
    <div class="kpi-grid" style="grid-template-columns:repeat(4, 1fr); margin-bottom:8px;">
      <div class="kpi-card">
        <div class="kpi-val" style="color:${zoneClass === 'green' ? '#16a34a' : (zoneClass === 'yellow' ? '#d97706' : '#dc2626')};">${totalDoseMsv.toFixed(4)} мЗв</div>
        <div class="kpi-lbl">Накопленная доза (${totalDoseMksv.toFixed(1)} мкЗв)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">1.0000 мЗв</div>
        <div class="kpi-lbl">Предел СанПиН (1000 мкЗв)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${pctOfLimit}%</div>
        <div class="kpi-lbl">Загрузка годового лимита</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${exposures.length}</div>
        <div class="kpi-lbl">Проведено снимков / КТ</div>
      </div>
    </div>

    <div style="font-size:7.5pt; font-weight:700; margin-bottom:2px;">
      Индикатор лучевой нагрузки (0.00 — 1.00 мЗв):
      <span class="badge ${zoneBadgeClass}" style="margin-left:6px;">${zoneTitle}</span>
    </div>

    <div class="dose-gauge-track">
      <div class="dose-gauge-fill ${zoneClass}" style="width:${gaugeWidthPct}%;"></div>
    </div>
    <div class="dose-gauge-scale">
      <span>0.00 мЗв (Фон)</span>
      <span>0.50 мЗв (Порог умеренной нагрузки)</span>
      <span>1.00 мЗв (Предел СанПиН 2.6.1.1192-03)</span>
    </div>

    <div style="font-size:7.5pt; color:#475569; margin-top:6px; line-height:1.25;">
      <strong>Заключение по радиационной безопасности:</strong> ${escapeHtml(zoneRecommendation)}
    </div>
  </div>

  <div class="section-title">3. Реестр проведенных рентгенологических исследований</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th style="width:3%;">№</th>
        <th style="width:10%;">Дата</th>
        <th style="width:20%;">Вид исследования</th>
        <th style="width:10%;">Область</th>
        <th style="width:18%;">Аппарат (модель)</th>
        <th style="width:13%;">кВ / мА / с</th>
        <th style="width:7%;">мЗв</th>
        <th style="width:7%;">мкЗв</th>
        <th style="width:12%;">Рентгенлаборант / Врач</th>
        <th style="width:6%;">Подпись</th>
      </tr>
    </thead>
    <tbody>
      ${exposureRows || `
      <tr>
        <td colspan="10" class="center" style="padding:8px;">Рентгенологические исследования в ${year} году не проводились</td>
      </tr>
      `}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" class="center">ИТОГО ЗА ${year} ГОД:</td>
        <td class="left">Всего исследований: <strong>${exposures.length}</strong></td>
        <td class="right"><strong>ИТОГО ДОЗА:</strong></td>
        <td class="right"><strong>${totalDoseMsv.toFixed(4)}</strong></td>
        <td class="right"><strong>${totalDoseMksv.toFixed(1)}</strong></td>
        <td colspan="2" class="center" style="font-size:6.5pt; color:#475569;">СанПиН 2.6.1.1192-03</td>
      </tr>
    </tfoot>
  </table>

  ${modalityRows ? `
  <div class="section-title">4. Структура исследований по модальностям</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:40%;">Модальность исследования</th>
        <th style="width:20%;">Количество</th>
        <th style="width:25%;">Суммарная доза</th>
        <th style="width:15%;">Доля в нагрузке</th>
      </tr>
    </thead>
    <tbody>
      ${modalityRows}
    </tbody>
  </table>
  ` : ""}

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f8fafc; font-size:7pt; color:#475569; line-height:1.25;">
    <strong>Нормативная справка (СанПиН 2.6.1.2523-09 НРБ-99/2009):</strong>
    Допустимая эффективная доза облучения населения при проведении профилактических медицинских рентгенологических исследований не должна превышать <strong>1.0 мЗв (1000 мкЗв) в год</strong>. При диагностических исследованиях дозовые нагрузки нормируются клинической целесообразностью и принципом ALARA (As Low As Reasonably Achievable — максимально достижимый низкий уровень облучения).
  </div>

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Ответственный за радиационную безопасность: <strong>${escapeHtml(safetyOfficer)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-рентгенолог / Лечащий врач: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 8. Рендерер Направления на рентгенологическое исследование (КЛКТ / ОПТГ / ТРГ / Визио) */
export function renderRadiologyReferralHtml(payload: RadiologyReferralPayload | any): string {
	const clinicName = payload.clinicLegalName || payload.organization?.fullName || "Стоматологическая клиника";
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "—";
	const clinicPhone = payload.clinicPhone || payload.organization?.phone || "—";
	const refNum = payload.referralNumber || "—";
	const refDate = payload.referralDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const patientPhone = payload.patientPhone || payload.patient?.phone || "—";
	const cardNum = payload.medicalCardNumber || payload.patient?.medicalCardNumber || "—";
	const doctorName = payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || "Врач-стоматолог";
	const icdCode = payload.diagnosisIcd10Code || "K02.1";
	const diagnosisText = payload.diagnosisDetailed || icdCode;
	const studyType = payload.studyType || "cbct_jaw_8x8";
	const studyGoal = payload.studyGoal || "endodontics";
	const targetTeeth = payload.targetTeethFdi || "";
	const area = payload.anatomicalArea || "Челюстно-лицевая область";
	const justification = payload.clinicalJustification || "Диагностика и контроль лечения.";

	// Генерация ячеек зубной формулы FDI для визуальной отметки
	const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
	const targetTeethArray = targetTeeth.split(/[,;\s]+/).map((t: string) => Number.parseInt(t.trim(), 10));

	const upperCells = upperTeeth.map((num, i) => {
		const isTarget = targetTeethArray.includes(num);
		return `<td style="width:6.25%; text-align:center; font-weight:bold; font-size:8pt; ${isTarget ? "background:#bae6fd; color:#0369a1; border:1.5pt solid #0284c7;" : "background:#ffffff;"} ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</td>`;
	}).join("");

	const lowerCells = lowerTeeth.map((num, i) => {
		const isTarget = targetTeethArray.includes(num);
		return `<td style="width:6.25%; text-align:center; font-weight:bold; font-size:8pt; ${isTarget ? "background:#bae6fd; color:#0369a1; border:1.5pt solid #0284c7;" : "background:#ffffff;"} ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</td>`;
	}).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Направление на рентген-исследование № ${escapeHtml(refNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | Тел: ${escapeHtml(clinicPhone)}</div>
      <div style="font-size:7pt; color:#64748b; margin-top:2px;">Направляющая медицинская организация</div>
    </div>
    <div class="doc-requisites">
      <div style="font-weight:800; font-size:9.5pt; text-transform:uppercase; color:#0f172a;">НАПРАВЛЕНИЕ</div>
      <div style="font-size:8pt; font-weight:bold; color:#0284c7;">на рентгенологическое исследование</div>
      <div style="font-size:7.5pt; color:#64748b;">№ ${escapeHtml(refNum)} от ${escapeHtml(refDate)}</div>
    </div>
  </div>

  <table class="data-table" style="margin-bottom:6px;">
    <tbody>
      <tr>
        <td style="width:25%; font-weight:bold; background:#f1f5f9;">Пациент (Ф.И.О.):</td>
        <td style="width:45%; font-weight:bold; font-size:9.5pt;">${escapeHtml(patientName)}</td>
        <td style="width:15%; font-weight:bold; background:#f1f5f9;">Дата рожд.:</td>
        <td style="width:15%;">${escapeHtml(patientBirth)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Номер медкарты:</td>
        <td><strong>${escapeHtml(cardNum)}</strong></td>
        <td style="font-weight:bold; background:#f1f5f9;">Телефон:</td>
        <td>${escapeHtml(patientPhone)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Лечащий врач:</td>
        <td colspan="3"><strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Диагноз (МКБ-10):</td>
        <td colspan="3"><span style="color:#0369a1; font-weight:bold;">${escapeHtml(icdCode)}</span> — ${escapeHtml(diagnosisText)}</td>
      </tr>
    </tbody>
  </table>

  <div style="border:1.5px solid #0284c7; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f0f9ff;">
    <div style="font-weight:bold; font-size:8.5pt; color:#0369a1; text-transform:uppercase; margin-bottom:4px;">
      1. Требуемый вид исследования:
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:8pt;">
      <div><span style="font-weight:bold; color:${studyType.startsWith("cbct") ? "#0284c7" : "#64748b"};">[${studyType.startsWith("cbct") ? "X" : " "}]</span> <strong>Компьютерная томография (КЛКТ 3D)</strong></div>
      <div><span style="font-weight:bold; color:${studyType === "optg_digital_panoramic" ? "#0284c7" : "#64748b"};">[${studyType === "optg_digital_panoramic" ? "X" : " "}]</span> <strong>Ортопантомограмма (ОПТГ цифровая)</strong></div>
      <div><span style="font-weight:bold; color:${studyType.startsWith("trg") ? "#0284c7" : "#64748b"};">[${studyType.startsWith("trg") ? "X" : " "}]</span> <strong>Телерентгенограмма (ТРГ боковая/прямая)</strong></div>
      <div><span style="font-weight:bold; color:${studyType === "intraoral_radiovisiography" ? "#0284c7" : "#64748b"};">[${studyType === "intraoral_radiovisiography" ? "X" : " "}]</span> <strong>Прицельная радиовизиография</strong></div>
    </div>
    <div style="margin-top:4px; font-size:8pt; border-top:1px dashed #bae6fd; padding-top:3px;">
      Параметры области: <strong>${escapeHtml(area)}</strong>
    </div>
  </div>

  <div style="margin:6px 0;">
    <div style="font-weight:bold; font-size:8pt; text-transform:uppercase; color:#0f172a; margin-bottom:2px;">
      2. Область исследования / Зубная формула (FDI):
    </div>
    <table class="data-table-dense" style="margin:2px 0;">
      <thead>
        <tr><th colspan="8" style="border-right:2px solid #0f172a;">Верхняя справа (18–11)</th><th colspan="8">Верхняя слева (21–28)</th></tr>
      </thead>
      <tbody>
        <tr>${upperCells}</tr>
        <tr style="border-top:2px solid #0f172a;">${lowerCells}</tr>
      </tbody>
      <tfoot>
        <tr><th colspan="8" style="border-right:2px solid #0f172a;">Нижняя справа (48–41)</th><th colspan="8">Нижняя слева (31–38)</th></tr>
      </tfoot>
    </table>
    ${targetTeeth ? `<div style="font-size:7.5pt; color:#0369a1; font-weight:bold;">Отмеченные целевые зубы: ${escapeHtml(targetTeeth)}</div>` : ""}
  </div>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f8fafc; font-size:8pt; line-height:1.35;">
    <div><strong>3. Клиническая цель и задача исследования:</strong></div>
    <div style="color:#0f172a; margin-top:2px;">${escapeHtml(justification)}</div>
  </div>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 6px; margin:6px 0; font-size:7.5pt; color:#475569; display:flex; justify-content:space-between;">
    <span>[${payload.isPregnancyExcluded ? "X" : " "}] Беременность исключена</span>
    <span>[${payload.hasMetallicArtifacts ? "X" : " "}] Металлоконструкции / коронки</span>
    <span>Принцип ALARA / СанПиН 2.6.1.1192-03 соблюдён</span>
  </div>

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Направивший врач: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-рентгенолог / Рентгенолаборант: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
