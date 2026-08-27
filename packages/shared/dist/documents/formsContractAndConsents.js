import { z } from "zod";
import { CLINICAL_DOCUMENT_PRINT_STYLES } from "./clinicalHtmlRenderers.js";
import { BASE_INFORMED_CONSENT_PRESET, CLINICAL_CONSENT_PRESETS, } from "../legal/legalContractsAndConsents.js";
import { integerToRussianWords } from "../sanpin/sanpinRegistryEngine.js";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * УНИФИЦИРОВАННЫЕ ДОКУМЕНТЫ МИНЗДРАВА РФ И ПРАВИТЕЛЬСТВА РФ
 * 1. Информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н, ст. 20 323-ФЗ)
 * 2. Договор на оказание платных медицинских услуг (ПП РФ № 736 от 11.05.2023)
 * 3. Акт сдачи-приемки оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)
 *
 * Лицензия клиники по умолчанию: № ЛО41-01137-77/00368421
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const DEFAULT_CLINIC_LICENSE_NUMBER = "ЛО41-01137-77/00368421";
export const DEFAULT_CLINIC_LICENSE_DATE = "12.10.2021";
export const DEFAULT_CLINIC_LICENSE_ISSUER = "Департамент здравоохранения города Москвы";
function escapeHtml(str) {
    if (str === null || str === undefined)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatRublesWithKopecks(amountRub) {
    return (Number(amountRub) || 0)
        .toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .replace(/[\u00A0\u202F]/g, " ");
}
function convertAmountToRussianWords(amount) {
    const n = Math.max(0, Math.floor(amount));
    const kopecks = Math.round((Math.abs(amount) - n) * 100);
    const words = integerToRussianWords(n);
    const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
    // Склонение рублей
    let rubWord = "рублей";
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11)
        rubWord = "рубль";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        rubWord = "рубля";
    // Склонение копеек
    let kopWord = "копеек";
    const kMod10 = kopecks % 10;
    const kMod100 = kopecks % 100;
    if (kMod10 === 1 && kMod100 !== 11)
        kopWord = "копейка";
    else if (kMod10 >= 2 && kMod10 <= 4 && (kMod100 < 10 || kMod100 >= 20))
        kopWord = "копейки";
    return `${capitalized} ${rubWord} ${String(kopecks).padStart(2, "0")} ${kopWord}`;
}
// ─────────────────────────────────────────────────────────────────────────────
// 1. ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ПРИКАЗ МЗ РФ № 1051н)
// ─────────────────────────────────────────────────────────────────────────────
export const informedConsentTypeSchema = z.enum([
    "general_primary",
    "local_anesthesia",
    "therapy_endo_restoration",
    "surgery_extraction",
    "implantation_bone_graft",
    "prosthetics",
    "orthodontics",
    "hygiene_whitening",
    "periodontology",
    "custom",
]);
export const informedConsent1051nPayloadSchema = z.object({
    consentType: informedConsentTypeSchema.default("general_primary"),
    consentTitle: z.string().trim().min(1).max(240).default("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО"),
    clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
    clinicAddress: z.string().trim().max(240).default("г. Москва, ул. Стоматологов, д. 10"),
    clinicOgrn: z.string().trim().max(32).default("1234567890123"),
    clinicInn: z.string().trim().max(16).default("7701234567"),
    medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
    medicalLicenseDate: z.string().trim().max(32).default(DEFAULT_CLINIC_LICENSE_DATE),
    patientFullName: z.string().trim().min(1).max(160),
    patientBirthDate: z.string().trim().min(10).max(32),
    patientPassport: z.string().trim().max(120).default("Паспорт гражданина РФ"),
    patientAddress: z.string().trim().max(240).default("г. Москва"),
    patientPhone: z.string().trim().max(64).default("+7 (999) 000-00-00"),
    patientSnils: z.string().trim().max(32).nullable().optional(),
    representativeFullName: z.string().trim().max(160).nullable().optional(),
    representativePassport: z.string().trim().max(120).nullable().optional(),
    representativeRelation: z.string().trim().max(80).nullable().optional(),
    attendingDoctorFullName: z.string().trim().min(1).max(160).default("Смирнова Анна Сергеевна"),
    attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог-терапевт"),
    diagnosisOrIndication: z.string().trim().min(1).max(300),
    interventionName: z.string().trim().min(1).max(300),
    plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
    materialsAndSystems: z.string().trim().max(500).nullable().optional(),
    explainedRisks: z.array(z.string().trim()).min(1),
    alternatives: z.array(z.string().trim()).min(1),
    aftercareRequirements: z.array(z.string().trim()).min(1),
    confirmedVoluntary: z.boolean().default(true),
    questionsAnswered: z.boolean().default(true),
    consentDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
});
/**
 * Генератор пресета ИДС по Приказу Минздрава РФ № 1051н для конкретной процедуры.
 */
export function generateStatutoryConsent1051nPayload(params) {
    const c = params.clinic;
    const p = params.patient;
    const d = params.doctor;
    const rep = params.representative;
    let title = "ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО (ПРИКАЗ МЗ РФ № 1051н)";
    let intervention = BASE_INFORMED_CONSENT_PRESET.intervention;
    let diagnosis = BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication;
    let anesthesia = BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia;
    let materials = BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes;
    let risks = BASE_INFORMED_CONSENT_PRESET.explainedRisks;
    let alternatives = BASE_INFORMED_CONSENT_PRESET.alternatives;
    let aftercare = BASE_INFORMED_CONSENT_PRESET.aftercareRequirements;
    if (params.consentType in CLINICAL_CONSENT_PRESETS) {
        const preset = CLINICAL_CONSENT_PRESETS[params.consentType];
        if (preset) {
            title = `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ: ${preset.procedureName.toUpperCase()}`;
            intervention = preset.procedureName;
            diagnosis = preset.diagnosisOrIndication;
            anesthesia = preset.plannedAnesthesia;
            materials = preset.materialsAndSystems;
            risks = preset.procedureSpecificRisks;
            alternatives = preset.alternatives;
            aftercare = preset.aftercareAndLimits;
        }
    }
    return {
        consentType: params.consentType,
        consentTitle: title,
        clinicLegalName: c?.legalName || 'ООО "Денте Клиник"',
        clinicAddress: c?.address || "г. Москва, ул. Стоматологов, д. 10",
        clinicOgrn: c?.ogrn || "1234567890123",
        clinicInn: c?.inn || "7701234567",
        medicalLicenseNumber: c?.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER,
        medicalLicenseDate: DEFAULT_CLINIC_LICENSE_DATE,
        patientFullName: p.fullName,
        patientBirthDate: p.birthDate,
        patientPassport: p.passport || "Паспорт гражданина РФ",
        patientAddress: p.address || "г. Москва",
        patientPhone: p.phone || "+7 (999) 000-00-00",
        patientSnils: p.snils || null,
        representativeFullName: rep?.fullName || null,
        representativePassport: rep?.passport || null,
        representativeRelation: rep?.relation || null,
        attendingDoctorFullName: d.fullName,
        attendingDoctorSpecialty: d.specialty || "Врач-стоматолог",
        diagnosisOrIndication: diagnosis,
        interventionName: intervention,
        plannedAnesthesia: anesthesia,
        materialsAndSystems: materials,
        explainedRisks: [...risks],
        alternatives: [...alternatives],
        aftercareRequirements: [...aftercare],
        confirmedVoluntary: true,
        questionsAnswered: true,
        consentDate: new Date().toISOString().slice(0, 10),
    };
}
/**
 * Рендерер Информированного добровольного согласия (ИДС) по Приказу Минздрава № 1051н
 */
export function renderInformedConsent1051nHtml(payload) {
    const clinicName = payload.clinicLegalName || payload.organization?.fullName || 'ООО "Денте Клиник"';
    const clinicAddress = payload.clinicAddress || payload.organization?.address || "г. Москва";
    const clinicOgrn = payload.clinicOgrn || payload.organization?.ogrn || "—";
    const clinicInn = payload.clinicInn || payload.organization?.inn || "—";
    const medLic = payload.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER;
    const medLicDate = payload.medicalLicenseDate || DEFAULT_CLINIC_LICENSE_DATE;
    const patientName = payload.patientFullName || payload.patient?.fullName || "—";
    const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
    const patientPassport = payload.patientPassport || payload.patient?.passport || "Паспорт гражданина РФ";
    const patientAddress = payload.patientAddress || payload.patient?.address || "—";
    const patientPhone = payload.patientPhone || payload.patient?.phone || "—";
    const patientSnils = payload.patientSnils || payload.patient?.snils || "—";
    const repName = payload.representativeFullName;
    const repPassport = payload.representativePassport;
    const repRelation = payload.representativeRelation;
    const doctorName = payload.attendingDoctorFullName || "Врач-стоматолог";
    const doctorSpecialty = payload.attendingDoctorSpecialty || "Врач-стоматолог";
    const consentDate = payload.consentDate || new Date().toISOString().slice(0, 10);
    const title = payload.consentTitle || "ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО";
    const diagnosis = payload.diagnosisOrIndication || "Стоматологическое обследование и лечение";
    const intervention = payload.interventionName || "Стоматологическое вмешательство";
    const anesthesia = payload.plannedAnesthesia || "Местная инфильтрационная / проводниковая анестезия";
    const materials = payload.materialsAndSystems || "Сертифицированные стоматологические материалы";
    const risks = payload.explainedRisks || [];
    const alternatives = payload.alternatives || [];
    const aftercare = payload.aftercareRequirements || [];
    const risksList = risks.map((r) => `<li style="margin-bottom:3px;">${escapeHtml(r)}</li>`).join("");
    const alternativesList = alternatives.map((a) => `<li style="margin-bottom:3px;">${escapeHtml(a)}</li>`).join("");
    const aftercareList = aftercare.map((ac) => `<li style="margin-bottom:3px;">${escapeHtml(ac)}</li>`).join("");
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .consent-block {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 6px 8px;
    margin-bottom: 6px;
    background: #ffffff;
    font-size: 8.5pt;
    line-height: 1.35;
  }
  .consent-subtitle {
    font-weight: bold;
    font-size: 9pt;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  ul.consent-list {
    margin: 3px 0 3px 18px;
    padding: 0;
  }
</style>
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
      <div>Лицензия на осуществление медицинской деятельности: <strong>№ ${escapeHtml(medLic)}</strong> от ${escapeHtml(medLicDate)} г.</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Приказ МЗ РФ от 12.11.2021 № 1051н</div>
      <div>ст. 20 Федерального закона № 323-ФЗ</div>
      <div style="font-weight:bold; color:#0f172a;">ИДС на медвмешательство</div>
    </div>
  </div>

  <div class="doc-title-block" style="margin: 6px 0;">
    <h1 class="doc-main-title" style="font-size:10.5pt; line-height:1.2;">${escapeHtml(title)}</h1>
    <p class="doc-sub-title">Дата оформления: <strong>${escapeHtml(consentDate)}</strong> | Лечащий врач: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">1. Сведения о пациенте и законном представителе</div>
    <div>Я, гражданин(ка) <strong>${escapeHtml(repName ? `${repName} (законный представитель)` : patientName)}</strong>,
    ${repName ? `действующий(ая) в интересах пациента <strong>${escapeHtml(patientName)}</strong> (дата рождения: ${escapeHtml(patientBirth)}), документ: ${escapeHtml(repPassport || "—")}, отношение: ${escapeHtml(repRelation || "родитель / опекун")},` : `дата рождения: <strong>${escapeHtml(patientBirth)}</strong>, документ: <strong>${escapeHtml(patientPassport)}</strong>,`}
    зарегистрированный(ая) по адресу: <strong>${escapeHtml(patientAddress)}</strong>, тел: <strong>${escapeHtml(patientPhone)}</strong>, СНИЛС: <strong>${escapeHtml(patientSnils)}</strong>,
    настоящим даю информированное добровольное согласие на медицинское вмешательство в клинике <strong>${escapeHtml(clinicName)}</strong>.</div>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">2. Клинический диагноз, цели и характер вмешательства</div>
    <div><strong>Клинический диагноз / показания:</strong> <span style="color:#0369a1; font-weight:bold;">${escapeHtml(diagnosis)}</span></div>
    <div style="margin-top:2px;"><strong>Планируемое медицинское вмешательство:</strong> <strong>${escapeHtml(intervention)}</strong></div>
    <div style="margin-top:2px;"><strong>Вид планируемого обезболивания:</strong> ${escapeHtml(anesthesia)}</div>
    ${materials ? `<div style="margin-top:2px;"><strong>Применяемые материалы, препараты и системы:</strong> ${escapeHtml(materials)}</div>` : ""}
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">3. Возможные риски, клинические осложнения и последствия вмешательства</div>
    <div style="font-size:8pt; color:#334155; margin-bottom:2px;">Мне в доступной и понятной форме разъяснено, что любое медицинское вмешательство сопряжено с вероятностью развития непредвиденных реакций организма:</div>
    <ul class="consent-list" style="font-size:8pt;">
      ${risksList}
    </ul>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">4. Альтернативные методы лечения и последствия отказа</div>
    <ul class="consent-list" style="font-size:8pt;">
      ${alternativesList}
    </ul>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">5. Режим после вмешательства и обязанности пациента</div>
    <ul class="consent-list" style="font-size:8pt;">
      ${aftercareList}
    </ul>
  </div>

  <div class="consent-block" style="background:#f8fafc;">
    <div style="font-size:8pt; line-height:1.3;">
      ✔ Я подтверждаю, что сообщил(а) врачу все достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях, аллергических реакциях и принимаемых препаратах.<br>
      ✔ Мне предоставлена возможность задать все интересующие меня вопросы, на которые я получил(а) исчерпывающие и понятные ответы.<br>
      ✔ Решение о проведении медицинского вмешательства принято мною добровольно и осознанно.
    </div>
  </div>

  <div class="signature-row" style="margin-top:12px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Законный представитель): <strong>${escapeHtml(repName || patientName)}</strong></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
  </div>
</div>
</body>
</html>`;
}
// ─────────────────────────────────────────────────────────────────────────────
// 2. ДОГОВОР НА ПЛАТНЫЕ МЕДИЦИНСКИЕ УСЛУГИ (ПОСТАНОВЛЕНИЕ ПРАВИТЕЛЬСТВА РФ № 736)
// ─────────────────────────────────────────────────────────────────────────────
export const paidServiceContract736PayloadSchema = z.object({
    contractNumber: z.string().trim().min(1).max(64),
    contractDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
    clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
    clinicAddress: z.string().trim().max(240).default("г. Москва, ул. Стоматологов, д. 10"),
    clinicOgrn: z.string().trim().max(32).default("1234567890123"),
    clinicInn: z.string().trim().max(16).default("7701234567"),
    clinicKpp: z.string().trim().max(16).nullable().optional().default("770101001"),
    medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
    medicalLicenseDate: z.string().trim().max(32).default(DEFAULT_CLINIC_LICENSE_DATE),
    medicalLicenseIssuer: z.string().trim().max(160).default(DEFAULT_CLINIC_LICENSE_ISSUER),
    clinicPhone: z.string().trim().max(64).default("+7 (495) 123-45-67"),
    clinicWebsite: z.string().trim().max(120).default("https://dente-clinic.ru"),
    patientFullName: z.string().trim().min(1).max(160),
    patientBirthDate: z.string().trim().min(10).max(32),
    patientPassport: z.string().trim().max(120).default("Паспорт гражданина РФ"),
    patientAddress: z.string().trim().max(240).default("г. Москва"),
    patientPhone: z.string().trim().max(64).default("+7 (999) 000-00-00"),
    patientSnils: z.string().trim().max(32).nullable().optional(),
    customerFullName: z.string().trim().max(160).nullable().optional(),
    customerPassport: z.string().trim().max(120).nullable().optional(),
    customerAddress: z.string().trim().max(240).nullable().optional(),
    customerPhone: z.string().trim().max(64).nullable().optional(),
    serviceScope: z.string().trim().min(1).max(500).default("Комплексное стоматологическое лечение в соответствии с утвержденным Планом лечения и сметой"),
    estimatedTotalRub: z.number().nonnegative().default(0),
    serviceStart: z.string().trim().max(32).nullable().optional(),
    serviceEnd: z.string().trim().max(32).nullable().optional(),
    doctorFullName: z.string().trim().max(160).default("Смирнова Анна Сергеевна"),
});
/**
 * Рендерер Договора на оказание платных медицинских услуг по Постановлению Правительства РФ № 736
 */
export function renderPaidServiceContract736Html(payload) {
    const contractNum = payload.contractNumber || "ДОГ-2026/043";
    const contractDate = payload.contractDate || new Date().toISOString().slice(0, 10);
    const clinicName = payload.clinicLegalName || 'ООО "Денте Клиник"';
    const clinicAddress = payload.clinicAddress || "г. Москва, ул. Стоматологов, д. 10";
    const clinicOgrn = payload.clinicOgrn || "1234567890123";
    const clinicInn = payload.clinicInn || "7701234567";
    const clinicKpp = payload.clinicKpp || "770101001";
    const medLic = payload.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER;
    const medLicDate = payload.medicalLicenseDate || DEFAULT_CLINIC_LICENSE_DATE;
    const medLicIssuer = payload.medicalLicenseIssuer || DEFAULT_CLINIC_LICENSE_ISSUER;
    const clinicPhone = payload.clinicPhone || "+7 (495) 123-45-67";
    const clinicWebsite = payload.clinicWebsite || "https://dente-clinic.ru";
    const patientName = payload.patientFullName || "Иванов Иван Иванович";
    const patientBirth = payload.patientBirthDate || "01.01.1990";
    const patientPassport = payload.patientPassport || "Паспорт гражданина РФ";
    const patientAddress = payload.patientAddress || "г. Москва";
    const patientPhone = payload.patientPhone || "+7 (999) 000-00-00";
    const customerName = payload.customerFullName || patientName;
    const customerPassport = payload.customerPassport || patientPassport;
    const customerAddress = payload.customerAddress || patientAddress;
    const customerPhone = payload.customerPhone || patientPhone;
    const scope = payload.serviceScope || "Оказание специализированной стоматологической помощи в соответствии с согласованным Планом лечения";
    const totalRub = Number(payload.estimatedTotalRub) || 0;
    const totalRubFormatted = formatRublesWithKopecks(totalRub);
    const totalInWords = convertAmountToRussianWords(totalRub);
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор на оказание платных медицинских услуг № ${escapeHtml(contractNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .contract-p {
    margin: 4px 0;
    text-align: justify;
    font-size: 8.5pt;
    line-height: 1.35;
  }
  .contract-section-title {
    font-weight: 800;
    font-size: 9pt;
    margin: 8px 0 3px;
    text-transform: uppercase;
    color: #0f172a;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 2px;
  }
</style>
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | Тел: ${escapeHtml(clinicPhone)} | Сайт: ${escapeHtml(clinicWebsite)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} | КПП: ${escapeHtml(clinicKpp)}</div>
      <div>Лицензия на медицинскую деятельность: <strong>№ ${escapeHtml(medLic)}</strong> от ${escapeHtml(medLicDate)} г., выданная: ${escapeHtml(medLicIssuer)}.</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">ПП РФ № 736</div>
      <div>Постановление Правительства РФ</div>
      <div>от 11.05.2023 г. № 736</div>
      <div style="font-weight:bold; color:#0f172a;">Договор платных услуг</div>
    </div>
  </div>

  <div class="doc-title-block" style="margin: 6px 0;">
    <h1 class="doc-main-title">ДОГОВОР № ${escapeHtml(contractNum)}<br>НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ</h1>
    <p class="doc-sub-title">г. Москва &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «${escapeHtml(contractDate)}» г.</p>
  </div>

  <p class="contract-p">
    <strong>${escapeHtml(clinicName)}</strong>, именуемое в дальнейшем «Исполнитель», в лице генерального директора / уполномоченного лица, действующего на основании Устава и лицензии на осуществление медицинской деятельности № ${escapeHtml(medLic)} от ${escapeHtml(medLicDate)} г., с одной стороны, и гражданин(ка) <strong>${escapeHtml(customerName)}</strong>, паспорт: ${escapeHtml(customerPassport)}, адрес: ${escapeHtml(customerAddress)}, именуемый(ая) в дальнейшем «Заказчик» (он же «Пациент»${customerName !== patientName ? `, действующий в пользу Пациента: ${escapeHtml(patientName)}` : ""}), с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
  </p>

  <div class="contract-section-title">1. Предмет договора и уведомление о государственных гарантиях</div>
  <p class="contract-p">
    1.1. Исполнитель обязуется по поручению Заказчика оказать Пациенту платные медицинские (стоматологические) услуги надлежащего качества: <strong>${escapeHtml(scope)}</strong> в соответствии с согласованным Планом лечения, а Заказчик обязуется своевременно принять и оплатить оказанные услуги в соответствии с условиями настоящего Договора.
  </p>
  <p class="contract-p">
    1.2. <strong>УВЕДОМЛЕНИЕ О ГОСГАРАНТИЯХ:</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Заказчика (Пациента) о возможности получения бесплатной медицинской помощи в рамках Программы государственных гарантий бесплатного оказания гражданам медицинской помощи и Территориальной программы госгарантий (по полису ОМС) в государственных и муниципальных учреждениях здравоохранения. Заказчик добровольно согласился на получение медицинских услуг в клинике Исполнителя на платной основе.
  </p>

  <div class="contract-section-title">2. Условия и сроки предоставления медицинских услуг</div>
  <p class="contract-p">
    2.1. Медицинские услуги предоставляются при наличии оформленного информированного добровольного согласия (ИДС) Пациента в соответствии с Приказом Минздрава России № 1051н и ст. 20 Федерального закона № 323-ФЗ.
  </p>
  <p class="contract-p">
    2.2. Сроки оказания услуг определяются планом лечения, графиком приемов и клинической ситуацией.
  </p>

  <div class="contract-section-title">3. Стоимость услуг и порядок расчетов</div>
  <p class="contract-p">
    3.1. Предварительная ориентировочная стоимость услуг по настоящему Договору составляет: <strong>${totalRubFormatted} руб. (${escapeHtml(totalInWords)})</strong> согласно смете / Плану лечения.
  </p>
  <p class="contract-p">
    3.2. Оплата производится Заказчиком в рублях РФ наличными денежными средствами, банковской картой или безналичным расчетом с обязательной выдачей фискального кассового чека (по 54-ФЗ).
  </p>
  <p class="contract-p">
    3.3. <strong>ЗАПРЕТ НА ОДНОСТОРОННЕЕ ИЗМЕНЕНИЕ СМЕТЫ:</strong> В случае необходимости оказания дополнительных услуг по медицинским показаниям, их стоимость согласуется с Заказчиком ДО начала их выполнения путем подписания дополнительного соглашения или скорректированной сметы. Оказание дополнительных платных услуг без письменного согласия Заказчика не допускается.
  </p>

  <div class="contract-section-title">4. Права и обязанности сторон и гарантийные обязательства</div>
  <p class="contract-p">
    4.1. <strong>Пациент обязан:</strong> соблюдать назначения и рекомендации лечащего врача, правила внутреннего распорядка, гигиену полости рта, являться на контрольные профилактические осмотры не реже 1 раза в 6 месяцев. Несоблюдение указаний врача может снизить качество услуги и повлечь прекращение гарантийных обязательств.
  </p>
  <p class="contract-p">
    4.2. <strong>Гарантии:</strong> Исполнитель устанавливает гарантийные сроки на результат стоматологических работ (пломбы, коронки, имплантаты) в соответствии с Положением о гарантиях клиники при соблюдении Пациентом условий эксплуатации и гигиены.
  </p>

  <div class="contract-section-title">5. Контролирующие органы и порядок разрешения споров</div>
  <p class="contract-p">
    5.1. Сведения о надзорных органах: Территориальный орган Росздравнадзора по г. Москве и Московской области, Управление Роспотребнадзора по г. Москве, Департамент здравоохранения г. Москвы (тел. единой справочной службы: +7 (495) 777-77-77).
  </p>

  <div class="contract-section-title">6. Адреса, реквизиты и подписи сторон</div>
  <table class="data-table" style="margin-top:6px; font-size:8pt;">
    <tr>
      <td style="width:50%; vertical-align:top;">
        <strong>ИСПОЛНИТЕЛЬ:</strong><br>
        <strong>${escapeHtml(clinicName)}</strong><br>
        Юр. адрес: ${escapeHtml(clinicAddress)}<br>
        ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} | КПП: ${escapeHtml(clinicKpp)}<br>
        Лицензия: № ${escapeHtml(medLic)}<br>
        Тел: ${escapeHtml(clinicPhone)}<br><br>
        Руководитель клиники / Врач:<br><br>
        ___________________ / ${escapeHtml(payload.doctorFullName || "Смирнова А.С.")} / <span class="stamp-seal">М.П.</span>
      </td>
      <td style="width:50%; vertical-align:top;">
        <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br>
        ФИО: <strong>${escapeHtml(customerName)}</strong><br>
        Паспорт: ${escapeHtml(customerPassport)}<br>
        Адрес: ${escapeHtml(customerAddress)}<br>
        Телефон: ${escapeHtml(customerPhone)}<br><br><br>
        Подпись Заказчика:<br><br>
        ___________________ / ${escapeHtml(customerName)} /
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}
// ─────────────────────────────────────────────────────────────────────────────
// 3. АКТ ВЫПОЛНЕННЫХ РАБОТ / ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ (ПРИКАЗ МЗ РФ № 804н)
// ─────────────────────────────────────────────────────────────────────────────
export const actOfCompletedWorksItemSchema = z.object({
    id: z.string().trim().optional(),
    code804n: z.string().trim().min(1).max(32).default("A16.07.002.001"),
    serviceName: z.string().trim().min(1).max(240),
    toothNumber: z.union([z.number().int().min(11).max(85), z.string().trim()]).nullable().optional(),
    quantity: z.number().int().positive().default(1),
    unitPriceRub: z.number().nonnegative(),
    totalRub: z.number().nonnegative(),
});
export const actOfCompletedWorksPayloadSchema = z.object({
    actNumber: z.string().trim().min(1).max(64),
    actDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
    contractNumber: z.string().trim().min(1).max(64).default("ДОГ-2026/043"),
    contractDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
    clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
    clinicAddress: z.string().trim().max(240).default("г. Москва, ул. Стоматологов, д. 10"),
    clinicOgrn: z.string().trim().max(32).default("1234567890123"),
    clinicInn: z.string().trim().max(16).default("7701234567"),
    medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
    customerFullName: z.string().trim().min(1).max(160),
    customerPassport: z.string().trim().max(120).default("Паспорт гражданина РФ"),
    patientFullName: z.string().trim().min(1).max(160),
    attendingDoctorFullName: z.string().trim().min(1).max(160).default("Смирнова Анна Сергеевна"),
    attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
    items: z.array(actOfCompletedWorksItemSchema).min(1),
    totalAmountRub: z.number().nonnegative(),
    warrantyPeriodMonths: z.number().int().nonnegative().default(12),
    warrantyTermsText: z.string().trim().max(500).default("12 месяцев на композитные реставрации, 24 месяца на ортопедические конструкции при соблюдении графика контрольных осмотров 1 раз в 6 месяцев"),
});
/**
 * Рендерер Акта выполненных работ по Номенклатуре медицинских услуг (Приказ № 804н)
 */
export function renderActOfCompletedWorksHtml(payload) {
    const actNum = payload.actNumber || "АКТ-2026/043";
    const actDate = payload.actDate || new Date().toISOString().slice(0, 10);
    const contractNum = payload.contractNumber || "ДОГ-2026/043";
    const contractDate = payload.contractDate || actDate;
    const clinicName = payload.clinicLegalName || 'ООО "Денте Клиник"';
    const clinicAddress = payload.clinicAddress || "г. Москва, ул. Стоматологов, д. 10";
    const clinicOgrn = payload.clinicOgrn || "1234567890123";
    const clinicInn = payload.clinicInn || "7701234567";
    const medLic = payload.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER;
    const customerName = payload.customerFullName || payload.patientFullName || "Иванов Иван Иванович";
    const patientName = payload.patientFullName || customerName;
    const doctorName = payload.attendingDoctorFullName || "Смирнова Анна Сергеевна";
    const doctorSpecialty = payload.attendingDoctorSpecialty || "Врач-стоматолог";
    const items = payload.items || [];
    let computedTotal = 0;
    const tableRows = items.map((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.unitPriceRub || 0;
        const sum = item.totalRub != null ? item.totalRub : qty * price;
        computedTotal += sum;
        return `<tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td style="font-family:'Courier New', monospace; font-weight:bold; font-size:7.5pt;">${escapeHtml(item.code804n || "A16.07.002")}</td>
      <td>${escapeHtml(item.serviceName)} ${item.toothNumber ? `(зуб ${escapeHtml(item.toothNumber)})` : ""}</td>
      <td style="text-align:center;">${qty}</td>
      <td style="text-align:right;">${formatRublesWithKopecks(price)}</td>
      <td style="text-align:right; font-weight:bold;">${formatRublesWithKopecks(sum)}</td>
    </tr>`;
    }).join("");
    const finalTotal = payload.totalAmountRub != null ? Number(payload.totalAmountRub) : computedTotal;
    const totalFormatted = formatRublesWithKopecks(finalTotal);
    const totalInWords = convertAmountToRussianWords(finalTotal);
    const warrantyText = payload.warrantyTermsText || "12 месяцев при соблюдении рекомендаций врача и гигиены";
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт сдачи-приемки оказанных медицинских услуг № ${escapeHtml(actNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
      <div>Лицензия на медицинскую деятельность: <strong>№ ${escapeHtml(medLic)}</strong></div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">ПРИКАЗ МЗ РФ № 804н</div>
      <div>Медицинская номенклатура</div>
      <div>К Договору № ${escapeHtml(contractNum)}</div>
      <div style="font-weight:bold; color:#0f172a;">АКТ ВЫПОЛНЕННЫХ РАБОТ</div>
    </div>
  </div>

  <div class="doc-title-block" style="margin: 6px 0;">
    <h1 class="doc-main-title">АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ (МЕДИЦИНСКИХ УСЛУГ) № ${escapeHtml(actNum)}</h1>
    <p class="doc-sub-title">к Договору на оказание платных медицинских услуг № <strong>${escapeHtml(contractNum)}</strong> от ${escapeHtml(contractDate)} г.<br>Дата составления Акта: <strong>${escapeHtml(actDate)}</strong> г.</p>
  </div>

  <table class="data-table" style="margin-bottom:6px; font-size:8.5pt;">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f8fafc;">Исполнитель:</td>
      <td style="width:75%;">${escapeHtml(clinicName)} (Лицензия: № ${escapeHtml(medLic)})</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f8fafc;">Заказчик / Пациент:</td>
      <td><strong>${escapeHtml(customerName)}</strong> ${customerName !== patientName ? `(Пациент: ${escapeHtml(patientName)})` : ""}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f8fafc;">Лечащий врач:</td>
      <td><strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</td>
    </tr>
  </table>

  <div class="section-title">Перечень оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)</div>
  <table class="data-table" style="margin-bottom:8px; font-size:8pt;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="width:5%; text-align:center;">№</th>
        <th style="width:16%; text-align:center;">Код (804н)</th>
        <th style="width:47%;">Наименование медицинской услуги</th>
        <th style="width:8%; text-align:center;">Кол-во</th>
        <th style="width:12%; text-align:right;">Цена (руб.)</th>
        <th style="width:12%; text-align:right;">Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr style="font-weight:bold; background:#f8fafc; font-size:8.5pt;">
        <td colspan="5" style="text-align:right;">ИТОГО К ОПЛАТЕ:</td>
        <td style="text-align:right; color:#0369a1; font-size:9.5pt;">${totalFormatted}</td>
      </tr>
    </tfoot>
  </table>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin-bottom:8px; background:#f8fafc; font-size:8pt; line-height:1.35;">
    <div><strong>Всего оказано услуг на сумму:</strong> <span style="font-weight:bold; color:#0f172a;">${totalFormatted} руб.</span> (${escapeHtml(totalInWords)})</div>
    <div style="margin-top:3px;"><strong>Гарантийные обязательства:</strong> ${escapeHtml(warrantyText)}.</div>
    <div style="margin-top:3px; color:#334155;">
      Вышеперечисленные медицинские услуги оказаны Исполнителем в полном объеме, своевременно и с надлежащим качеством в строгом соответствии с клиническими рекомендациями Минздрава РФ и требованиями нормативных правовых актов. Заказчик претензий по объему, качеству и срокам оказания медицинских услуг не имеет.
    </div>
  </div>

  <table class="data-table" style="margin-top:10px; font-size:8pt;">
    <tr>
      <td style="width:50%; vertical-align:top;">
        <strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong><br><br>
        Врач-стоматолог:<br><br>
        ___________________ / ${escapeHtml(doctorName)} / <span class="stamp-seal">М.П.</span>
      </td>
      <td style="width:50%; vertical-align:top;">
        <strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br><br>
        Пациент / Заказчик:<br><br>
        ___________________ / ${escapeHtml(customerName)} /
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}
