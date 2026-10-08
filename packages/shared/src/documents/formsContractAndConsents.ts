import { z } from "zod";
import { CLINICAL_DOCUMENT_PRINT_STYLES } from "./renderers/sharedStyles.js";
import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	PAID_CONTRACT_736_PRESET,
	WARRANTY_POLICY_PRESETS,
	type ProcedureSpecificConsentProcedure,
} from "../legal/legalContractsAndConsents.js";
import { integerToRussianWords } from "../sanpin/sanpinRegistryEngine.js";
import {
	DEFAULT_CLINIC_LICENSE_NUMBER,
	DEFAULT_CLINIC_LICENSE_DATE,
	DEFAULT_CLINIC_LICENSE_ISSUER,
} from "./informedConsent1051n.js";

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



function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatRublesWithKopecks(amountRub: number): string {
	return (Number(amountRub) || 0)
		.toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
		.replace(/[\u00A0\u202F]/g, " ");
}

function convertAmountToRussianWords(amount: number): string {
	const n = Math.max(0, Math.floor(amount));
	const kopecks = Math.round((Math.abs(amount) - n) * 100);
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);

	// Склонение рублей
	let rubWord = "рублей";
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) rubWord = "рубль";
	else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) rubWord = "рубля";

	// Склонение копеек
	let kopWord = "копеек";
	const kMod10 = kopecks % 10;
	const kMod100 = kopecks % 100;
	if (kMod10 === 1 && kMod100 !== 11) kopWord = "копейка";
	else if (kMod10 >= 2 && kMod10 <= 4 && (kMod100 < 10 || kMod100 >= 20)) kopWord = "копейки";

	return `${capitalized} ${rubWord} ${String(kopecks).padStart(2, "0")} ${kopWord}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ПРИКАЗ МЗ РФ № 1051н)
// Канонический модуль вынесен в ./informedConsent1051n.ts (Мандат 8s)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./informedConsent1051n.js";


// ─────────────────────────────────────────────────────────────────────────────
// 2. ДОГОВОР НА ПЛАТНЫЕ МЕДИЦИНСКИЕ УСЛУГИ (ПОСТАНОВЛЕНИЕ ПРАВИТЕЛЬСТВА РФ № 736)
// ─────────────────────────────────────────────────────────────────────────────

export const paidServiceContract736PayloadSchema = z.object({
	contractNumber: z.string().trim().min(1).max(64),
	contractDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
	clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
	clinicAddress: z.string().trim().max(240).default(""),
	clinicOgrn: z.string().trim().max(32).default("1234567890123"),
	clinicInn: z.string().trim().max(16).default(""),
	clinicKpp: z.string().trim().max(16).nullable().optional().default("770101001"),
	medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
	medicalLicenseDate: z.string().trim().max(32).default(DEFAULT_CLINIC_LICENSE_DATE),
	medicalLicenseIssuer: z.string().trim().max(160).default(DEFAULT_CLINIC_LICENSE_ISSUER),
	clinicPhone: z.string().trim().max(64).default(""),
	clinicWebsite: z.string().trim().max(120).default("https://dente-clinic.ru"),
	clinicCity: z.string().trim().max(120).optional().default(""),
	patientFullName: z.string().trim().max(160).default(""),
	patientBirthDate: z.string().trim().max(32).default(""),
	patientPassport: z.string().trim().max(120).default(""),
	patientAddress: z.string().trim().max(240).default(""),
	patientPhone: z.string().trim().max(64).default(""),
	patientSnils: z.string().trim().max(32).nullable().optional(),
	customerFullName: z.string().trim().max(160).nullable().optional(),
	customerPassport: z.string().trim().max(120).nullable().optional(),
	customerAddress: z.string().trim().max(240).nullable().optional(),
	customerPhone: z.string().trim().max(64).nullable().optional(),
	representativeBasis: z.string().trim().max(200).optional(),
	serviceScope: z.string().trim().min(1).max(500).default("Комплексное стоматологическое лечение в соответствии с утвержденным Планом лечения и сметой"),
	estimatedTotalRub: z.number().nonnegative().default(0),
	serviceStart: z.string().trim().max(32).nullable().optional(),
	serviceEnd: z.string().trim().max(32).nullable().optional(),
	doctorFullName: z.string().trim().max(160).default(""),
});
export type PaidServiceContract736Payload = z.infer<typeof paidServiceContract736PayloadSchema>;

/**
 * Рендерер Договора на оказание платных медицинских услуг по Постановлению Правительства РФ № 736
 */
export function renderPaidServiceContract736Html(payload: PaidServiceContract736Payload | any): string {
	const contractNum = payload.contractNumber || "ДОГ-2026/043";
	const contractDate = payload.contractDate || new Date().toISOString().slice(0, 10);
	const clinicName = payload.clinicLegalName || 'ООО "Денте Клиник"';
	const clinicAddress = payload.clinicAddress || "";
	const clinicOgrn = payload.clinicOgrn || "—";
	const clinicInn = payload.clinicInn || "_______________";
	const clinicKpp = payload.clinicKpp || "";
	const medLic = payload.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER;
	const medLicDate = payload.medicalLicenseDate || DEFAULT_CLINIC_LICENSE_DATE;
	const medLicIssuer = payload.medicalLicenseIssuer || DEFAULT_CLINIC_LICENSE_ISSUER;
	const clinicPhone = payload.clinicPhone || "";
	const clinicWebsite = payload.clinicWebsite || "";
	const clinicCity =
		payload.clinicCity?.trim() ||
		(payload.clinicAddress?.includes("г. ")
			? payload.clinicAddress.match(/г\.\s*[^,]+/)?.[0]
			: "") ||
		"г. ____________________";

	const patientName = payload.patientFullName?.trim() || "_________________________________";
	const patientBirth = payload.patientBirthDate?.trim() || "__.__.____";
	const patientPassport = payload.patientPassport?.trim() || "_________________________________";
	const patientAddress = payload.patientAddress?.trim() || "_________________________________";
	const patientPhone = payload.patientPhone?.trim() || "_______________";

	const customerName = payload.customerFullName?.trim() || patientName;
	const customerPassport = payload.customerPassport?.trim() || patientPassport;
	const customerAddress = payload.customerAddress?.trim() || patientAddress;
	const customerPhone = payload.customerPhone?.trim() || patientPhone;

	const scope = payload.serviceScope || "Оказание специализированной стоматологической помощи в соответствии с согласованным Планом лечения";
	const totalRub = Number(payload.estimatedTotalRub ?? payload.estimatedTotalAmountRub) || 0;
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
    <p class="doc-sub-title">${escapeHtml(clinicCity)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «${escapeHtml(contractDate)}» г.</p>
  </div>

  <p class="contract-p">
    <strong>${escapeHtml(clinicName)}</strong>, именуемое в дальнейшем «Исполнитель», в лице генерального директора / уполномоченного лица, действующего на основании Устава и лицензии на осуществление медицинской деятельности № ${escapeHtml(medLic)} от ${escapeHtml(medLicDate)} г., с одной стороны, и гражданин(ка) <strong>${escapeHtml(customerName)}</strong>, дата рождения: ${escapeHtml(patientBirth)}, паспорт: ${escapeHtml(customerPassport)}, адрес: ${escapeHtml(customerAddress)}, именуемый(ая) в дальнейшем «Заказчик» (он же «Пациент»${customerName !== patientName ? `, действующий в пользу Пациента: ${escapeHtml(patientName)}` : ""}), с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
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
    5.1. Государственный контроль качества и безопасности медицинской деятельности осуществляют: Территориальный орган Росздравнадзора (официальный сайт органа лицензирования: <strong>roszdravnadzor.gov.ru</strong>), территориальное Управление Роспотребнадзора и региональный орган исполнительной власти субъекта РФ в сфере охраны здоровья граждан.
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
        ___________________ / ${escapeHtml(payload.doctorFullName || "")} / <span class="stamp-seal">М.П.</span>
      </td>
      <td style="width:50%; vertical-align:top;">
        <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br>
        ФИО: <strong>${escapeHtml(customerName)}</strong><br>
        Дата рождения: ${escapeHtml(patientBirth)}<br>
        Паспорт: ${escapeHtml(customerPassport)}<br>
        Адрес: ${escapeHtml(customerAddress)}<br>
        Телефон: ${escapeHtml(customerPhone)}<br><br><br>
        Подпись Заказчика:<br><br>
        ___________________ / ${escapeHtml(customerName === "_________________________________" ? "____________________" : customerName)} /
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
export type ActOfCompletedWorksItem = z.infer<typeof actOfCompletedWorksItemSchema>;

export const actOfCompletedWorksPayloadSchema = z.object({
	actNumber: z.string().trim().min(1).max(64),
	actDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
	contractNumber: z.string().trim().min(1).max(64).default("ДОГ-2026/043"),
	contractDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
	clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
	clinicAddress: z.string().trim().max(240).default(""),
	clinicOgrn: z.string().trim().max(32).default(""),
	clinicInn: z.string().trim().max(16).default(""),
	medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
	customerFullName: z.string().trim().max(160).default(""),
	customerPassport: z.string().trim().max(120).default(""),
	patientFullName: z.string().trim().max(160).default(""),
	attendingDoctorFullName: z.string().trim().max(160).default(""),
	attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	items: z.array(actOfCompletedWorksItemSchema).min(1),
	totalAmountRub: z.number().nonnegative(),
	warrantyPeriodMonths: z.number().int().nonnegative().default(12),
	warrantyTermsText: z.string().trim().max(500).default("12 месяцев на композитные реставрации, 24 месяца на ортопедические конструкции при соблюдении графика контрольных осмотров 1 раз в 6 месяцев"),
});
export type ActOfCompletedWorksPayload = z.infer<typeof actOfCompletedWorksPayloadSchema>;

/**
 * Рендерер Акта выполненных работ по Номенклатуре медицинских услуг (Приказ № 804н)
 */
export function renderActOfCompletedWorksHtml(payload: ActOfCompletedWorksPayload | any): string {
	const actNum = payload.actNumber || "АКТ-2026/043";
	const actDate = payload.actDate || new Date().toISOString().slice(0, 10);
	const contractNum = payload.contractNumber || "ДОГ-2026/043";
	const contractDate = payload.contractDate || actDate;
	const clinicName = payload.clinicLegalName || 'ООО "Денте Клиник"';
	const clinicAddress = payload.clinicAddress || "";
	const clinicOgrn = payload.clinicOgrn || "—";
	const clinicInn = payload.clinicInn || "_______________";
	const medLic = payload.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER;

	const customerName = payload.customerFullName?.trim() || payload.patientFullName?.trim() || "_________________________________";
	const patientName = payload.patientFullName?.trim() || customerName;
	const doctorName = payload.attendingDoctorFullName?.trim() || "_________________________";
	const doctorSpecialty = payload.attendingDoctorSpecialty || "Врач-стоматолог";

	const items: ActOfCompletedWorksItem[] = payload.items || [];
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
      <div class="form-badge">АКТ ПРИЕМКИ</div>
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
        <th style="width:16%; text-align:center;">Код услуги</th>
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
        ___________________ / ${escapeHtml(doctorName === "_________________________" ? "____________________" : doctorName)} / <span class="stamp-seal">М.П.</span>
      </td>
      <td style="width:50%; vertical-align:top;">
        <strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br><br>
        Пациент / Заказчик:<br><br>
        ___________________ / ${escapeHtml(customerName === "_________________________________" ? "____________________" : customerName)} /
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// СТОМX И ПРОЦЕДУРНЫЕ СОГЛАСИЯ — ЕДИНЫЙ ВХОД (МАНДАТ 8za SSOT)
// ═══════════════════════════════════════════════════════════════════════════
export {
	generateStomxConsentHtml,
	type GenerateStomxConsentOptions,
} from "../legal/stomxConsentHtmlGenerator.js";
export {
	STOMX_SPECIALIZED_CONSENT_PRESETS,
	LEGACY_CONSENT_PRESETS,
} from "../legal/stomxConsentPresets.js";
export {
	STOMX_LEGAL_CONSENTS_CATALOG,
	getStomxTemplateMetadata,
	type StomxLegalConsentTemplateMetadata,
	type StomxVariableContext,
} from "../legal/stomxLegalConsentsCatalog.js";

