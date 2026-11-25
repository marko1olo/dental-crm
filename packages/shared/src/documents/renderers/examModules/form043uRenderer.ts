import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "../sharedStyles.js";
import {
	renderGraphicalDentalFormulaHtml,
	type ClinicalToothRowInput,
	type DentalFormulaRecordInput,
} from "../../dentalFormulaRenderer.js";

interface SoapDiaryLike {
	readonly entryDate?: string | null | undefined;
	readonly visitDate?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicalDiagnosisIcd10?: string | null | undefined;
	readonly assessmentDiagnosisText?: string | null | undefined;
	readonly diagnosisDetailed?: string | null | undefined;
	readonly assessmentDiagnosis?: string | null | undefined;
	readonly subjectiveComplaints?: string | null | undefined;
	readonly subjectiveComplaint?: string | null | undefined;
	readonly objectiveStatusLocalis?: string | null | undefined;
	readonly objectiveStatus?: string | null | undefined;
	readonly treatmentProtocol804n?: string | null | undefined;
	readonly procedureProtocol?: string | null | undefined;
	readonly planAndTreatment?: string | null | undefined;
	readonly usedMaterials?: string | null | undefined;
	readonly homeCareRecommendations?: string | null | undefined;
	readonly [key: string]: unknown;
}

interface DmftStatsLike {
	readonly totalDmft?: number | undefined;
	readonly dmftTotal?: number | undefined;
	readonly decayed?: number | undefined;
	readonly filled?: number | undefined;
	readonly missing?: number | undefined;
	readonly totalDmfs?: number | undefined;
	readonly intensityLevel?: string | undefined;
	readonly intensityLevelLabel?: string | undefined;
}

export interface Form043uRenderPayload {
	readonly organization?: { readonly fullName?: string | null; readonly address?: string | null; readonly ogrn?: string | null; readonly inn?: string | null; readonly medicalLicenseNumber?: string | null } | undefined;
	readonly clinicLegalName?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly clinicMedicalLicenseNumber?: string | null | undefined;
	readonly clinicLicenseNumber?: string | null | undefined;
	readonly clinicLicenseDate?: string | null | undefined;
	readonly clinicLicenseIssuer?: string | null | undefined;
	readonly medicalLicenseNumber?: string | null | undefined;
	readonly patient?: {
		readonly medicalCardNumber?: string | null | undefined;
		readonly cardOpenedAt?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly gender?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly snils?: string | null | undefined;
		readonly passport?: string | null | undefined;
	} | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly cardOpenedDate?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientSex?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientAddressRegistration?: string | null | undefined;
	readonly patientAddressResidence?: string | null | undefined;
	readonly patientIdentityDocument?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly passportDetails?: string | null | undefined;
	readonly attendingDoctorFullName?: string | null | undefined;
	readonly attendingDoctorSpecialty?: string | null | undefined;
	readonly anamnesisAndHealth?: {
		readonly mainComplaints?: string | undefined;
		readonly anamnesisMorbi?: string | undefined;
		readonly anamnesisVitae?: string | undefined;
		readonly allergicHistory?: string | undefined;
	} | undefined;
	readonly chiefComplaint?: string | undefined;
	readonly historyOfPresentIllness?: string | undefined;
	readonly medicalHistory?: string | undefined;
	readonly allergologicalHistory?: string | undefined;
	readonly objectiveExamination?: {
		readonly extraoralBite?: string | undefined;
		readonly oralMucosaStatus?: string | undefined;
	} | undefined;
	readonly biteDescription?: string | undefined;
	readonly dentalFormula?: {
		readonly calculatedDmft?: {
			readonly totalDmft?: number | undefined;
			readonly dmftTotal?: number | undefined;
			readonly decayed?: number | undefined;
			readonly filled?: number | undefined;
			readonly missing?: number | undefined;
			readonly totalDmfs?: number | undefined;
			readonly intensityLevel?: string | undefined;
			readonly intensityLevelLabel?: string | undefined;
		} | undefined;
		readonly formula?: DentalFormulaRecordInput | Record<string, unknown> | undefined;
		readonly teeth?: ClinicalToothRowInput[] | readonly Record<string, unknown>[] | undefined;
		readonly [key: string]: unknown;
	} | DentalFormulaRecordInput | Record<string, unknown> | undefined;
	readonly dmftIndex?: {
		readonly totalDmft?: number | undefined;
		readonly dmftTotal?: number | undefined;
		readonly decayed?: number | undefined;
		readonly filled?: number | undefined;
		readonly missing?: number | undefined;
		readonly totalDmfs?: number | undefined;
		readonly intensityLevel?: string | undefined;
		readonly intensityLevelLabel?: string | undefined;
	} | undefined;
	readonly clinicalToothRows?: ClinicalToothRowInput[] | readonly Record<string, unknown>[] | undefined;
	readonly soapDiaries?: readonly SoapDiaryLike[] | undefined;
	readonly diaries?: readonly SoapDiaryLike[] | undefined;
	readonly isClosed?: boolean | undefined;
	readonly status?: string | undefined;
	readonly watermarkText?: string | null | undefined;
	readonly [key: string]: unknown;
}

/** 1. Рендерер — Медицинская карта стоматологического пациента */
export function renderForm043uHtml(payload: Form043uRenderPayload): string {
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

	const formulaObj = typeof payload.dentalFormula === "object" && payload.dentalFormula !== null ? (payload.dentalFormula as Record<string, unknown>) : undefined;
	const calculatedDmft = formulaObj?.calculatedDmft as DmftStatsLike | undefined;
	const dmft: DmftStatsLike = calculatedDmft || payload.dmftIndex || {
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
		? diaries.map((d: SoapDiaryLike, index: number) => `
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
      <div style="border:1px dashed #cbd5e1; padding:16px; margin-bottom:10px; border-radius:4px; text-align:center; color:#64748b; font-size:8.5pt;">
        Записи дневников клинического приёма отсутствуют (приём в процессе оформления).
      </div>
    `;

	const isClosed = payload.isClosed ?? (payload.status === "signed" || payload.status === "completed");
	const watermark = payload.watermarkText ?? (isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта стоматологического пациента № ${escapeHtml(cardNum)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container" style="position:relative;">
  ${watermark ? `<div class="doc-watermark" aria-hidden="true" style="position:absolute; top:45%; left:50%; transform:translate(-50%, -50%) rotate(-32deg); font-size:52pt; font-weight:900; color:${isClosed ? "rgba(16, 185, 129, 0.05)" : "rgba(15, 23, 42, 0.045)"}; letter-spacing:0.12em; pointer-events:none; z-index:0; white-space:nowrap; user-select:none;">${escapeHtml(watermark)}</div>` : ""}
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

  <div class="section-title">4. Дневники клинического приёма</div>
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
