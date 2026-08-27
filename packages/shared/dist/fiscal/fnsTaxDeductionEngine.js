/**
 * DENTE Dental CRM — FNS Russia Tax Deduction Engine (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@).
 *
 * Implements:
 * 1. Форма по КНД 1151156 («Справка об оплате медицинских услуг для представления в налоговый орган»).
 * 2. Электронный формат по КНД 1184043 (Формат 5.01) для прямой отправки в ФНС через ТКС (Контур, СБИС, 1С, Такском).
 * 3. Контрольные суммы ИНН ЮЛ (10 знаков), ИНН ФЛ/ИП (12 знаков), КПП, ОГРН, СНИЛС, Паспорта РФ.
 * 4. Автоматическая классификация услуг по Номенклатуре Минздрава 804н и Постановлению Правительства № 458:
 *    - Код 01: Стандартное лечение (годовой лимит 150 000 ₽ по ст. 219 НК РФ с 01.01.2024).
 *    - Код 02: Дорогостоящее лечение (имплантация, синус-лифтинг, костная пластика) — без ограничений суммы.
 * 5. Степени родства: 1 — лично (пациент), 2 — супруг(а), 3 — родитель, 4 — ребенок (подопечный).
 * 6. Генерация динамического QR-кода верификации подлинности справки.
 */
import { generateFnsFormKnd1151156BarcodeSvg } from "./barcodeGenerator.js";
import { escapeXml } from "../cda/c14n.js";
import { rubToKopecks, kopecksToRub } from "./kopecksArithmetic.js";
import { amountToWordsRu, ANNUAL_TAX_DEDUCTION_LIMIT_RUB, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024, calculateTaxDeductionSummary, EXPENSIVE_TREATMENT_804N_CODES, FNS_FORMAT_VERSION_501, FNS_ORDER_824_NAME, generateFnsTaxDeductionBatchXml, generateFnsTaxDeductionXml, generateTaxCertificateQrDataUri, generateTaxCertificateQrPayload, generateTaxCertificateQrSvg, KND_CERTIFICATE_FORM, KND_REGISTRY_ELECTRONIC_FORMAT, resolveTaxDeductionCategoryShared, TAX_DEDUCTION_RELATIONSHIP_MAP, validateRussianInn, validateRussianKpp, validateRussianOgrn, validateRussianPassport, validateRussianSnils, } from "./taxDeduction.js";
export { amountToWordsRu, ANNUAL_TAX_DEDUCTION_LIMIT_RUB, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024, calculateTaxDeductionSummary, EXPENSIVE_TREATMENT_804N_CODES, FNS_FORMAT_VERSION_501, FNS_ORDER_824_NAME, generateFnsTaxDeductionBatchXml, generateFnsTaxDeductionXml, generateTaxCertificateQrDataUri, generateTaxCertificateQrPayload, generateTaxCertificateQrSvg, KND_CERTIFICATE_FORM, KND_REGISTRY_ELECTRONIC_FORMAT, resolveTaxDeductionCategoryShared, TAX_DEDUCTION_RELATIONSHIP_MAP, validateRussianInn, validateRussianKpp, validateRussianOgrn, validateRussianPassport, validateRussianSnils, };
/**
 * Валидация контрольных сумм 10-значного ИНН юридического лица.
 * Веса ФНС: [2, 4, 10, 3, 5, 9, 4, 6, 8]
 * Контрольная цифра = (sum % 11) % 10
 */
export function validateInnLegalEntity(inn) {
    if (!inn || typeof inn !== "string") {
        return { isValid: false, errorMessageRu: "ИНН организации не указан" };
    }
    const cleaned = inn.trim().replace(/[\s\-_]/g, "");
    if (!/^\d+$/.test(cleaned)) {
        return { isValid: false, errorMessageRu: "ИНН должен состоять только из цифр" };
    }
    if (cleaned.length !== 10) {
        return { isValid: false, errorMessageRu: "ИНН юридического лица должен содержать ровно 10 цифр" };
    }
    if (/^0+$/.test(cleaned)) {
        return { isValid: false, errorMessageRu: "ИНН не может состоять из одних нулей" };
    }
    const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum = weights.reduce((acc, w, i) => acc + w * Number.parseInt(cleaned[i], 10), 0);
    const checkDigit = (sum % 11) % 10;
    const isValid = checkDigit === Number.parseInt(cleaned[9], 10);
    return isValid
        ? { isValid: true }
        : { isValid: false, errorMessageRu: "Неверная контрольная сумма 10-значного ИНН организации" };
}
/**
 * Валидация контрольных сумм 12-значного ИНН физического лица или индивидуального предпринимателя.
 * 11-й знак: веса [7, 2, 4, 10, 3, 5, 9, 4, 6, 8] -> (sum % 11) % 10
 * 12-й знак: веса [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8] -> (sum % 11) % 10
 */
export function validateInnIndividual(inn) {
    if (!inn || typeof inn !== "string") {
        return { isValid: false, errorMessageRu: "ИНН физического лица не указан" };
    }
    const cleaned = inn.trim().replace(/[\s\-_]/g, "");
    if (!/^\d+$/.test(cleaned)) {
        return { isValid: false, errorMessageRu: "ИНН должен состоять только из цифр" };
    }
    if (cleaned.length !== 12) {
        return { isValid: false, errorMessageRu: "ИНН физического лица должен содержать ровно 12 цифр" };
    }
    if (/^0+$/.test(cleaned)) {
        return { isValid: false, errorMessageRu: "ИНН не может состоять из одних нулей" };
    }
    const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum11 = weights11.reduce((acc, w, i) => acc + w * Number.parseInt(cleaned[i], 10), 0);
    const check11 = (sum11 % 11) % 10;
    const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum12 = weights12.reduce((acc, w, i) => acc + w * Number.parseInt(cleaned[i], 10), 0);
    const check12 = (sum12 % 11) % 10;
    const isValid = check11 === Number.parseInt(cleaned[10], 10) &&
        check12 === Number.parseInt(cleaned[11], 10);
    return isValid
        ? { isValid: true }
        : { isValid: false, errorMessageRu: "Неверная контрольная сумма 12-значного ИНН налогоплательщика" };
}
/**
 * Классификация стоматологической услуги по Номенклатуре 804н и ст. 219 НК РФ:
 * Код 02: Дорогостоящее лечение (имплантация, синус-лифтинг, костная пластика, мембранная регенерация)
 * Код 01: Стандартное лечение (терапия кариеса, эндодонтия, удаление, ортопедия, гигиена).
 */
export function classifyTaxDeduction804n(code804n, serviceName) {
    const code = resolveTaxDeductionCategoryShared(code804n, serviceName);
    if (code === "2") {
        return {
            categoryCode: "2",
            categoryNameRu: "Дорогостоящее лечение (дентальная имплантация, синус-лифтинг, костная пластика)",
            isExpensiveTreatment: true,
            hasAnnualLimit: false,
            statutoryLimitRub: Number.POSITIVE_INFINITY,
        };
    }
    return {
        categoryCode: "1",
        categoryNameRu: "Медицинские услуги (терапия кариеса, пульпит, ортодонтия, гигиена)",
        isExpensiveTreatment: false,
        hasAnnualLimit: true,
        statutoryLimitRub: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
    };
}
/**
 * Генерация официального XML-файла реестра сведений в формате NO_MEDOPL 5.01 / КНД 1184043
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ для прямой отправки по ТКС.
 */
export function generateFnsNoMedoplXml(params) {
    const summary = calculateTaxDeductionSummary(params.payments);
    const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
        code01Rub: 0,
        code01Kopecks: 0,
        code02Rub: 0,
        code02Kopecks: 0,
        totalRub: 0,
        totalKopecks: 0,
    };
    const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
    const taxOfficeCode = (params.taxOfficeCode || "7701").trim();
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();
    // Каноническое имя файла ФНС: NO_MEDOPL_КодНО_ИННЮЛ+КПП_ГГГГММДД_N (санитизация для валидного имени файла)
    const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
    const safeInn = String(params.clinic.inn || "").replace(/[^0-9]/g, "");
    const safeKpp = params.clinic.kpp ? `_${String(params.clinic.kpp).replace(/[^A-Za-z0-9]/g, "")}` : "";
    const clinicId = `${safeInn}${safeKpp}`;
    const fileId = `NO_MEDOPL_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
    const fileName = `${fileId}.xml`;
    const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
    const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
    const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);
    const issueDateFormatted = formatDateToRussian(params.issueDateIso);
    const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "";
    const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "";
    const signerType = params.signer?.signerType || "1";
    const signerName = params.signer?.fullName || params.clinic.chiefDoctorName || "Главный врач";
    const yearPayments = params.payments.filter((p) => new Date(p.dateIso).getFullYear() === params.taxYear);
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}" ВерсПрог="DenteCRM 1.0">
  <СвНО КодНО="${escapeXml(taxOfficeCode)}" />
  <СвМО ИННЮЛ="${escapeXml(params.clinic.inn)}" КПП="${escapeXml(params.clinic.kpp || "770101001")}" НаимОрг="${escapeXml(params.clinic.legalName)}" ОГРН="${escapeXml(params.clinic.ogrn || "")}">
    <Лицензия Номер="${escapeXml(params.clinic.licenseNumber || "")}" Дата="${escapeXml(params.clinic.licenseDate || "")}" />
  </СвМО>
  <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${params.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(params.signer.authorityDoc)}"` : ""} />
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" ОтчГод="${escapeXml(String(params.taxYear))}" НомКорр="0">
    <СведСправка НомерСвед="${escapeXml(params.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" ПрПациент="${escapeXml(rel.samePatientFlag)}">
      <СвФЛ ФИО="${escapeXml(params.payer.fullName)}"${params.payer.inn ? ` ИННФЛ="${escapeXml(params.payer.inn)}"` : ""}${payerBirthDateFormatted ? ` ДатаРожд="${escapeXml(payerBirthDateFormatted)}"` : ""}>
        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml((params.payer.identityDocumentSeries || "") + " " + (params.payer.identityDocumentNumber || "")).trim()}" />
      </СвФЛ>
      ${rel.samePatientFlag === "0"
        ? `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}" />`
        : ""}
      <РасчетСумм>
        ${targetYearSummary.code01Kopecks > 0 ? `<СумОплМедУсл КодУслуги="1" СумОпл="${code01Str}" />` : ""}
        ${targetYearSummary.code02Kopecks > 0 ? `<СумОплМедУсл КодУслуги="2" СумОпл="${code02Str}" />` : ""}
        <СумОплВсего СумОпл="${totalStr}" />
      </РасчетСумм>
      <ДетализацияЧеков>
        ${yearPayments
        .map((pay, idx) => `<Чек НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаЧек="${escapeXml(pay.dateIso.slice(0, 10))}" Сумма="${pay.amountRub.toFixed(2)}" КодУслуги="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`)
        .join("\n        ")}
      </ДетализацияЧеков>
    </СведСправка>
  </Документ>
</Файл>`;
    return { fileName, fileId, xmlContent };
}
/**
 * Генерация официальной печатной формы Справки КНД 1151156 (формат А4)
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ с верификационным QR-кодом.
 */
export function renderOfficialTaxCertificateKnd1151156Html(params) {
    const summary = calculateTaxDeductionSummary(params.payments);
    const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
        taxYear: params.taxYear,
        code01Rub: 0,
        code01Kopecks: 0,
        code02Rub: 0,
        code02Kopecks: 0,
        totalRub: 0,
        totalKopecks: 0,
        receiptsCount: 0,
        code01StatutoryLimitRub: 150000,
        code01EligibleRub: 0,
        refund13EstimateRub: 0,
        refund15EstimateRub: 0,
    };
    const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
    const isSelf = rel.samePatientFlag === "1";
    const qrSvg = generateTaxCertificateQrSvg(params, { size: 96, margin: 1 });
    const barcodeSvg = generateFnsFormKnd1151156BarcodeSvg({
        certificateNumber: params.certificateNumber,
        taxYear: params.taxYear,
        height: 38,
        width: 175,
    });
    const yearPayments = params.payments.filter((p) => new Date(p.dateIso).getFullYear() === params.taxYear);
    const issueDateFormatted = formatDateToRussian(params.issueDateIso);
    const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "—";
    const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "—";
    const totalInWords = amountToWordsRu(targetYear.totalKopecks);
    return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Справка об оплате медицинских услуг по КНД 1151156 № ${params.certificateNumber}</title>
	<style>
		@page {
			size: A4;
			margin: 12mm 15mm 12mm 15mm;
		}
		* {
			box-sizing: border-box;
		}
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 11pt;
			line-height: 1.25;
			color: #000;
			margin: 0;
			padding: 10px 20px;
			background: #fff;
		}
		.header-container {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 10px;
			padding-bottom: 8px;
			border-bottom: 1.5px solid #000;
		}
		.header-qr-block {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 2px;
		}
		.qr-box {
			width: 96px;
			height: 96px;
		}
		.qr-label {
			font-size: 7pt;
			font-weight: bold;
			letter-spacing: 0.5px;
			color: #1e293b;
			text-align: center;
		}
		.header-barcode-block {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 0 10px;
		}
		.barcode-svg-wrap {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.barcode-subtext {
			font-size: 7.5pt;
			font-weight: bold;
			letter-spacing: 0.5px;
			color: #334155;
			margin-top: 3px;
			text-align: center;
		}
		.header-right {
			text-align: right;
			font-size: 8.5pt;
			line-height: 1.25;
		}
		.knd-badge {
			font-weight: bold;
			font-size: 10.5pt;
			margin-top: 3px;
			font-family: 'Courier New', Courier, monospace;
		}
		.format-badge {
			font-size: 7.5pt;
			color: #64748b;
			margin-top: 2px;
		}
		.title {
			text-align: center;
			font-weight: bold;
			font-size: 13pt;
			margin: 5px 0 2px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.subtitle {
			text-align: center;
			font-size: 10pt;
			margin-bottom: 8px;
			font-style: italic;
		}
		.doc-number {
			text-align: center;
			font-weight: bold;
			font-size: 11.5pt;
			margin-bottom: 12px;
		}
		.section-line {
			margin-bottom: 5px;
			font-size: 10.5pt;
		}
		.label {
			font-weight: bold;
		}
		.underline-val {
			border-bottom: 1px solid #000;
			padding-bottom: 1px;
		}
		.table-summary {
			width: 100%;
			border-collapse: collapse;
			margin: 10px 0;
		}
		.table-summary th, .table-summary td {
			border: 1px solid #000;
			padding: 4px 6px;
			font-size: 10pt;
		}
		.table-summary th {
			background-color: #f2f2f2;
			text-align: center;
			font-weight: bold;
		}
		.table-checks {
			width: 100%;
			border-collapse: collapse;
			margin: 8px 0;
			font-size: 8.5pt;
		}
		.table-checks th, .table-checks td {
			border: 1px solid #666;
			padding: 3px 5px;
			text-align: left;
		}
		.table-checks th {
			background-color: #f8f8f8;
			text-align: center;
		}
		.num-cell {
			text-align: right;
			font-family: 'Courier New', Courier, monospace;
			font-weight: bold;
		}
		.signatures-row {
			margin-top: 25px;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			page-break-inside: avoid;
		}
		.stamp-container {
			display: flex;
			gap: 15px;
			align-items: center;
		}
		.stamp-circle {
			width: 100px;
			height: 100px;
			border: 1.5px dashed #444;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 9pt;
			color: #666;
			text-align: center;
		}
		.paid-stamp {
			border: 2.5px solid #047857;
			color: #047857;
			font-weight: 900;
			font-size: 11pt;
			padding: 4px 10px;
			border-radius: 4px;
			transform: rotate(-6deg);
			text-transform: uppercase;
			letter-spacing: 2px;
		}
		.footnote {
			font-size: 8pt;
			color: #555;
			margin-top: 8px;
			line-height: 1.2;
		}
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<div class="header-container">
		<div class="header-qr-block">
			<div class="qr-box" title="Проверка подлинности справки в ФНС России">
				${qrSvg}
			</div>
			<div class="qr-label">ФНС РОССИИ • КНД 1151156</div>
		</div>
		<div class="header-barcode-block">
			<div class="barcode-svg-wrap">
				${barcodeSvg}
			</div>
			<div class="barcode-subtext">ФОРМА ПО КНД 1151156 (ПРИКАЗ ФНС № ЕА-7-11/824@)</div>
		</div>
		<div class="header-right">
			Приложение № 1 к Приказу ФНС России<br>
			от 08.11.2023 № ЕА-7-11/824@<br>
			(в ред. 2024 г., Формат 5.01)<br>
			<div class="knd-badge">Форма по КНД 1151156</div>
			<div class="format-badge">Формат реестра: КНД 1184043</div>
		</div>
	</div>

	<div class="title">СПРАВКА</div>
	<div class="subtitle">об оплате медицинских услуг для представления в налоговые органы Российской Федерации</div>
	<div class="doc-number">№ ${escapeXml(params.certificateNumber)} от ${issueDateFormatted} г.</div>

	<div class="section-line">
		<span class="label">1. Медицинская организация / ИП:</span>
		<span class="underline-val">${escapeXml(params.clinic.legalName)}</span>
	</div>
	<div class="section-line">
		<span class="label">ИНН:</span> ${escapeXml(params.clinic.inn)} &nbsp;&nbsp;&nbsp;
		<span class="label">КПП:</span> ${escapeXml(params.clinic.kpp || "—")} &nbsp;&nbsp;&nbsp;
		<span class="label">ОГРН:</span> ${escapeXml(params.clinic.ogrn || "—")}
	</div>
	<div class="section-line">
		<span class="label">Лицензия на медицинскую деятельность:</span>
		№ ${escapeXml(params.clinic.licenseNumber || "ЛО41-01137-77/00368421")} от ${escapeXml(params.clinic.licenseDate || "12.10.2021")} г.
	</div>
	<div class="section-line">
		<span class="label">Адрес места нахождения:</span> ${escapeXml(params.clinic.address)}
	</div>

	<div style="border-top: 1px solid #000; margin: 6px 0 8px;"></div>

	<div class="section-line">
		<span class="label">2. Налогоплательщик (плательщик):</span>
		<span class="underline-val">${escapeXml(params.payer.fullName)}</span>
	</div>
	<div class="section-line">
		<span class="label">ИНН плательщика:</span> ${escapeXml(params.payer.inn || "не указан")} &nbsp;&nbsp;&nbsp;
		<span class="label">Дата рождения:</span> ${escapeXml(payerBirthDateFormatted)}
	</div>
	<div class="section-line">
		<span class="label">Документ, удостоверяющий личность:</span>
		Паспорт РФ серия ${escapeXml(params.payer.identityDocumentSeries || "—")} № ${escapeXml(params.payer.identityDocumentNumber || "—")}
		${params.payer.identityDocumentIssuedBy ? `, выдан: ${escapeXml(params.payer.identityDocumentIssuedBy)}` : ""}
	</div>

	<div class="section-line" style="margin-top: 6px;">
		<span class="label">3. Пациент:</span>
		<span class="underline-val">${isSelf ? "Он же (налогоплательщик)" : escapeXml(params.patient.fullName)}</span>
	</div>
	${!isSelf
        ? `
	<div class="section-line">
		<span class="label">Степень родства с налогоплательщиком:</span> ${escapeXml(rel.labelRu)} (Код ${escapeXml(rel.code)}) &nbsp;&nbsp;&nbsp;
		<span class="label">Дата рождения пациента:</span> ${escapeXml(patientBirthDateFormatted)}
	</div>`
        : ""}

	<div class="section-line" style="margin-top: 6px;">
		<span class="label">4. Налоговый период (отчетный год):</span>
		<strong>${escapeXml(String(params.taxYear))} год</strong>
	</div>

	<table class="table-summary">
		<thead>
			<tr>
				<th style="width: 15%;">Код услуги</th>
				<th style="width: 55%;">Вид оказанных медицинских услуг</th>
				<th style="width: 30%;">Сумма расходов (руб. коп.)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td style="text-align: center; font-weight: bold;">Код 01</td>
				<td>Медицинские услуги (терапевтическое, ортодонтическое, эндодонтическое лечение, гигиена)</td>
				<td class="num-cell">${(targetYear.code01Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr>
				<td style="text-align: center; font-weight: bold;">Код 02</td>
				<td>Дорогостоящие медицинские услуги (дентальная имплантация, костная пластика, синус-лифтинг)</td>
				<td class="num-cell">${(targetYear.code02Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr style="background-color: #f5f5f5; font-weight: bold;">
				<td colspan="2" style="text-align: right;">ИТОГО ОПЛАЧЕНО ЗА ${escapeXml(String(params.taxYear))} ГОД:</td>
				<td class="num-cell">${(targetYear.totalKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
		</tbody>
	</table>

	<div class="section-line">
		<span class="label">Сумма прописью:</span> <em>${escapeXml(totalInWords)}</em>
	</div>

	${yearPayments.length > 0
        ? `
	<div style="margin-top: 8px;">
		<div style="font-size: 9pt; font-weight: bold; margin-bottom: 2px;">Сведения о кассовых чеках (54-ФЗ):</div>
		<table class="table-checks">
			<thead>
				<tr>
					<th>№</th>
					<th>Дата чека</th>
					<th>Чек №</th>
					<th>ФД №</th>
					<th>ФПД</th>
					<th>Наименование услуги</th>
					<th>Код 804н</th>
					<th>Код вычета</th>
					<th>Сумма (руб.)</th>
				</tr>
			</thead>
			<tbody>
				${yearPayments
            .map((pay, i) => `
				<tr>
					<td style="text-align: center;">${i + 1}</td>
					<td>${escapeXml(pay.dateIso.slice(0, 10))}</td>
					<td>${escapeXml(pay.receiptNumber || String(i + 1))}</td>
					<td style="font-family: monospace;">${escapeXml(pay.fiscalDocumentNumber || "—")}</td>
					<td style="font-family: monospace;">${escapeXml(pay.fiscalSign || "—")}</td>
					<td>${escapeXml(pay.serviceName)}</td>
					<td style="font-family: monospace;">${escapeXml(pay.code804n || "—")}</td>
					<td style="text-align: center; font-weight: bold;">${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}</td>
					<td class="num-cell">${pay.amountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
				</tr>`)
            .join("")}
			</tbody>
		</table>
	</div>`
        : ""}

	<div class="footnote">
		* Примечание: Согласно ст. 219 НК РФ, вычет по Коду 01 предоставляется в пределах годового лимита 150 000 ₽ (возврат 13% до 19 500 ₽). По Коду 02 ограничение суммы не применяется (возврат 13% со всей суммы расходов). Расчетный возврат 13% НДФЛ: <strong>${targetYear.refund13EstimateRub.toLocaleString("ru-RU")} ₽</strong>.
	</div>

	<div class="signatures-row">
		<div style="flex: 1;">
			<div>Руководитель организации / Главный врач: ________________ / ${escapeXml(params.clinic.chiefDoctorName || "Иванов И.И.")} /</div>
			<div style="font-size: 8pt; color: #666; margin-top: 2px;">(подпись, расшифровка подписи)</div>
			<div style="margin-top: 12px;">Ответственное лицо (кассир/бухгалтер): ________________ /</div>
			<div style="font-size: 8pt; color: #666; margin-top: 2px;">(подпись, дата формирования: ${issueDateFormatted} г.)</div>
		</div>
		<div class="stamp-container">
			<div class="paid-stamp">
				ОПЛАЧЕНО
			</div>
			<div class="stamp-circle">
				[ М. П. ]<br>Клиники
			</div>
		</div>
	</div>
</body>
</html>`;
}
function formatDateToRussian(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime()))
        return isoString.slice(0, 10);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear().toString();
    return `${day}.${month}.${year}`;
}
/**
 * Точный расчет возврата 13% НДФЛ по плану лечения с разделением на Код 01 (до 150 000 ₽) и Код 02 (дорогостоящее без лимита).
 */
export function calculatePlanTaxDeductionBreakdown(items, statutoryLimitRub = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024) {
    let code01TotalKopecks = 0;
    let code02TotalKopecks = 0;
    const mappedItems = items.map((item) => {
        const rawName = item.serviceName || item.name || "Медицинская услуга";
        const catCode = item.taxCode || resolveTaxDeductionCategoryShared(item.code804n, rawName);
        const isExp = catCode === "2";
        const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
        const unitKopecks = typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)
            ? Math.max(0, Math.round(item.priceKopecks))
            : typeof item.priceRub === "number" && Number.isFinite(item.priceRub)
                ? Math.max(0, rubToKopecks(item.priceRub))
                : 0;
        const lineTotalKopecks = unitKopecks * qty;
        const lineTotalRub = kopecksToRub(lineTotalKopecks);
        if (isExp) {
            code02TotalKopecks += lineTotalKopecks;
        }
        else {
            code01TotalKopecks += lineTotalKopecks;
        }
        // Для отдельной строки расчетный возврат 13%
        const itemRefund13Kopecks = Math.round(lineTotalKopecks * 0.13);
        return {
            id: item.id,
            code804n: item.code804n,
            serviceName: rawName,
            categoryCode: catCode,
            isExpensive: isExp,
            totalRub: lineTotalRub,
            totalKopecks: lineTotalKopecks,
            eligibleRub: lineTotalRub,
            eligibleKopecks: lineTotalKopecks,
            refund13Rub: kopecksToRub(itemRefund13Kopecks),
            refund13Kopecks: itemRefund13Kopecks,
        };
    });
    const limitKopecks = Math.max(0, Math.round(statutoryLimitRub * 100));
    const code01EligibleKopecks = Math.min(code01TotalKopecks, limitKopecks);
    const isCode01Capped = code01TotalKopecks > limitKopecks;
    const code01Refund13Kopecks = Math.round(code01EligibleKopecks * 0.13);
    const code02EligibleKopecks = code02TotalKopecks;
    const code02Refund13Kopecks = Math.round(code02EligibleKopecks * 0.13);
    const grandTotalKopecks = code01TotalKopecks + code02TotalKopecks;
    const grandTotalRefund13Kopecks = code01Refund13Kopecks + code02Refund13Kopecks;
    const netPriceWithRefundKopecks = Math.max(0, grandTotalKopecks - grandTotalRefund13Kopecks);
    return {
        code01TotalRub: kopecksToRub(code01TotalKopecks),
        code01TotalKopecks,
        code01EligibleRub: kopecksToRub(code01EligibleKopecks),
        code01EligibleKopecks,
        code01Refund13Rub: kopecksToRub(code01Refund13Kopecks),
        code01Refund13Kopecks,
        code01StatutoryLimitRub: statutoryLimitRub,
        isCode01Capped,
        code02TotalRub: kopecksToRub(code02TotalKopecks),
        code02TotalKopecks,
        code02EligibleRub: kopecksToRub(code02EligibleKopecks),
        code02EligibleKopecks,
        code02Refund13Rub: kopecksToRub(code02Refund13Kopecks),
        code02Refund13Kopecks,
        grandTotalRub: kopecksToRub(grandTotalKopecks),
        grandTotalKopecks,
        grandTotalRefund13Rub: kopecksToRub(grandTotalRefund13Kopecks),
        grandTotalRefund13Kopecks,
        netPriceWithRefundRub: kopecksToRub(netPriceWithRefundKopecks),
        netPriceWithRefundKopecks,
        items: mappedItems,
        hasCode02ExpensiveServices: code02TotalKopecks > 0,
    };
}
/**
 * Расчет графика поэтапной оплаты (30% аванс/санация, 40% хирургия, 30% ортопедия) с точной балансировкой копеек.
 */
export function calculateStaged304030Schedule(totalRubOrKopecks, isKopecksInput = false) {
    const totalKopecks = Math.max(0, isKopecksInput
        ? Math.round(totalRubOrKopecks || 0)
        : rubToKopecks(totalRubOrKopecks || 0));
    if (totalKopecks === 0) {
        return {
            totalKopecks: 0,
            totalRub: 0,
            stage1AdvanceTherapyKopecks: 0,
            stage1AdvanceTherapyRub: 0,
            stage2SurgeryImplantKopecks: 0,
            stage2SurgeryImplantRub: 0,
            stage3OrthopedicsKopecks: 0,
            stage3OrthopedicsRub: 0,
            isBalanced: true,
            partsKopecks: [0, 0, 0],
        };
    }
    const stage1Kopecks = Math.round(totalKopecks * 0.3);
    const stage2Kopecks = Math.round(totalKopecks * 0.4);
    const stage3Kopecks = totalKopecks - stage1Kopecks - stage2Kopecks;
    return {
        totalKopecks,
        totalRub: kopecksToRub(totalKopecks),
        stage1AdvanceTherapyKopecks: stage1Kopecks,
        stage1AdvanceTherapyRub: kopecksToRub(stage1Kopecks),
        stage2SurgeryImplantKopecks: stage2Kopecks,
        stage2SurgeryImplantRub: kopecksToRub(stage2Kopecks),
        stage3OrthopedicsKopecks: stage3Kopecks,
        stage3OrthopedicsRub: kopecksToRub(stage3Kopecks),
        isBalanced: stage1Kopecks + stage2Kopecks + stage3Kopecks === totalKopecks,
        partsKopecks: [stage1Kopecks, stage2Kopecks, stage3Kopecks],
    };
}
