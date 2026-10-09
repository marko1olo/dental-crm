/**
 * FNS Statutory XML Builder & Printable HTML Engine (Layer 3)
 * Compliance with Order of the FNS of Russia № ЕА-7-11/824@ (КНД 1184043 Версия 5.01 / КНД 1151156)
 */

import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "../../money.js";
import {
	FNS_KINSHIP_PRESETS,
	NDFL_LIMITS,
	type FnsTaxPayload,
} from "../fnsSchema1151156.js";
import {
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
} from "../../crypto/visualSignatureStamp.js";
import type {
	FnsNdflPrintSigningOptions,
	FnsNdflXmlResult,
} from "./types.js";
import {
	cleanDigits,
	escapeXmlAttr,
	formatFnsRuDate,
	generateFnsFileNameAndId,
	parseFio,
	preflightValidatePayload,
	rublesFromKopecks,
} from "./taxpayerValidator.js";

/**
 * Основной генератор XML по Приказу ФНС России № ЕА-7-11/824@ (КНД 1184043 Версия 5.01).
 * Полностью типизированный, с точным расчетом в целочисленных копейках.
 */
export function buildFnsKnd1151156Xml(
	payload: FnsTaxPayload,
	customUuid?: string,
): FnsNdflXmlResult {
	const preflightIssues = preflightValidatePayload(payload);
	const isValidForSubmission = !preflightIssues.some((issue) => issue.severity === "error");

	const taxOffice = (payload.taxInspectionCode || "7701").padStart(4, "0").slice(0, 4);
	const docDateFormatted = formatFnsRuDate(payload.documentDate);
	const taxYear = String(payload.taxYear || new Date().getFullYear()).slice(0, 4);
	const certKind = payload.certificateKind || "1";
	const corrNumber = payload.correctionNumber ?? (certKind === "1" ? 0 : 1);
	const progVersion = payload.softwareVersion || "DentalMIS_FNS_Gateway_v2.4.0";

	const clinicInn = cleanDigits(payload.clinic.inn);
	const clinicKpp = payload.clinic.kpp ? cleanDigits(payload.clinic.kpp) : undefined;
	const clinicOgrn = cleanDigits(payload.clinic.ogrn);

	const { fileName, fileId } = generateFnsFileNameAndId(
		taxOffice,
		clinicInn,
		clinicKpp,
		docDateFormatted,
		customUuid,
		payload.filePrefix || "NO_MEDOPL",
	);

	// 1. Блок медицинской организации / ИП (<СвОргМ>)
	let orgBlockXml = "";
	if (payload.clinic.isIndividualEntrepreneur || clinicInn.length === 12) {
		if (
			!payload.clinic.ipFullName ||
			!payload.clinic.ipFullName.family?.trim() ||
			!payload.clinic.ipFullName.given?.trim()
		) {
			throw new Error(
				"Не указано ФИО индивидуального предпринимателя в реквизитах клиники для справки ФНС",
			);
		}
		const ipFio = payload.clinic.ipFullName;
		const patronymicAttr = ipFio.patronymic
			? ` Отчество="${escapeXmlAttr(ipFio.patronymic)}"`
			: "";
		const licenseIssuerAttr = payload.clinic.license?.issuer
			? ` КемВыд="${escapeXmlAttr(payload.clinic.license.issuer)}"`
			: "";
		const licenseXml = payload.clinic.license
			? `\n        <Лицензия НомЛиц="${escapeXmlAttr(payload.clinic.license.number)}" ДатаЛиц="${formatFnsRuDate(payload.clinic.license.date)}"${licenseIssuerAttr}/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвИП ИННФЛ="${clinicInn}" ОГРНИП="${clinicOgrn}">
        <ФИО Фамилия="${escapeXmlAttr(ipFio.family)}" Имя="${escapeXmlAttr(ipFio.given)}"${patronymicAttr}/>${licenseXml}
      </СвИП>
    </СвОргМ>`;
	} else {
		const licenseIssuerAttr = payload.clinic.license?.issuer
			? ` КемВыд="${escapeXmlAttr(payload.clinic.license.issuer)}"`
			: "";
		const licenseXml = payload.clinic.license
			? `\n        <Лицензия НомЛиц="${escapeXmlAttr(payload.clinic.license.number)}" ДатаЛиц="${formatFnsRuDate(payload.clinic.license.date)}"${licenseIssuerAttr}/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвОргЮЛ НаимОрг="${escapeXmlAttr(payload.clinic.name || "ООО СТОМАТОЛОГИЯ ДЕНТЕ")}" 
                ИННЮЛ="${clinicInn}" 
                КПП="${clinicKpp || "770101001"}" 
                ОГРН="${clinicOgrn}">${licenseXml}
      </СвОргЮЛ>
    </СвОргМ>`;
	}

	// 2. Блок налогоплательщика (<СвФЛ>)
	const payer = payload.payer;
	const payerInnClean = cleanDigits(payer.inn);
	const payerSnilsClean = cleanDigits(payer.snils);
	const payerBirthFormatted = formatFnsRuDate(payer.birthDate);

	let payerAttrs = `ДатаРожд="${payerBirthFormatted}"`;
	if (payerInnClean && payerInnClean.length === 12) {
		payerAttrs = `ИННФЛ="${payerInnClean}" ${payerAttrs}`;
	}
	if (payerSnilsClean && payerSnilsClean.length === 11) {
		payerAttrs = `СНИЛС="${payerSnilsClean}" ${payerAttrs}`;
	}

	const payerPatronymicAttr = payer.fullName.patronymic
		? ` Отчество="${escapeXmlAttr(payer.fullName.patronymic)}"`
		: "";

	let payerDocXml = "";
	if (payer.identityDocument && payer.identityDocument.seriesAndNumber) {
		const docDateAttr = payer.identityDocument.issueDate
			? ` ДатаДок="${formatFnsRuDate(payer.identityDocument.issueDate)}"`
			: "";
		const docIssuerAttr = payer.identityDocument.issuedBy
			? ` КемВыд="${escapeXmlAttr(payer.identityDocument.issuedBy)}"`
			: "";
		payerDocXml = `\n      <УдЛичнФЛ КодВидДок="${escapeXmlAttr(payer.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXmlAttr(payer.identityDocument.seriesAndNumber)}"${docDateAttr}${docIssuerAttr}/>`;
	}

	const payerBlockXml = `    <СвФЛ ${payerAttrs}>
      <ФИО Фамилия="${escapeXmlAttr(payer.fullName.family)}" Имя="${escapeXmlAttr(payer.fullName.given)}"${payerPatronymicAttr}/>${payerDocXml}
    </СвФЛ>`;

	// 3. Блок сведений о пациенте (<СвПациент>)
	const patient = payload.patient;
	let patientBlockXml = "";
	if (patient.patientKinshipCode === "1") {
		patientBlockXml = '    <СвПациент ПризнПац="1"/>';
	} else {
		let patientAttrs = `ПризнПац="${patient.patientKinshipCode}"`;
		const patInn = cleanDigits(patient.inn);
		const patSnils = cleanDigits(patient.snils);
		if (patInn && patInn.length === 12) patientAttrs += ` ИННФЛ="${patInn}"`;
		if (patSnils && patSnils.length === 11) patientAttrs += ` СНИЛС="${patSnils}"`;
		if (patient.birthDate) {
			patientAttrs += ` ДатаРожд="${formatFnsRuDate(patient.birthDate)}"`;
		}

		let patientFioXml = "";
		if (patient.fullName) {
			const patPatrAttr = patient.fullName.patronymic
				? ` Отчество="${escapeXmlAttr(patient.fullName.patronymic)}"`
				: "";
			patientFioXml = `\n      <ФИО Фамилия="${escapeXmlAttr(patient.fullName.family)}" Имя="${escapeXmlAttr(patient.fullName.given)}"${patPatrAttr}/>`;
		}

		let patientDocXml = "";
		if (patient.identityDocument && patient.identityDocument.seriesAndNumber) {
			const docDateAttr = patient.identityDocument.issueDate
				? ` ДатаДок="${formatFnsRuDate(patient.identityDocument.issueDate)}"`
				: "";
			const docIssuerAttr = patient.identityDocument.issuedBy
				? ` КемВыд="${escapeXmlAttr(patient.identityDocument.issuedBy)}"`
				: "";
			patientDocXml = `\n      <УдЛичнФЛ КодВидДок="${escapeXmlAttr(patient.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXmlAttr(patient.identityDocument.seriesAndNumber)}"${docDateAttr}${docIssuerAttr}/>`;
		}

		patientBlockXml = `    <СвПациент ${patientAttrs}>${patientFioXml}${patientDocXml}
    </СвПациент>`;
	}

	// 4. Блок расходов (<СведРасхУсл>) — копеечный подсчет
	let code1Kopecks = 0;
	let code2Kopecks = 0;

	if (payload.receipts && payload.receipts.length > 0) {
		const code1Receipts = payload.receipts.filter((r) => r.deductionCode === "1");
		const code2Receipts = payload.receipts.filter((r) => r.deductionCode === "2");
		code1Kopecks = sumKopecks(
			code1Receipts.map((r) => r.amountKopecks ?? parseKopecks(r.amountRub)),
		);
		code2Kopecks = sumKopecks(
			code2Receipts.map((r) => r.amountKopecks ?? parseKopecks(r.amountRub)),
		);
	} else {
		code1Kopecks =
			payload.expenses.code1AmountKopecks ??
			(payload.expenses.code1AmountRub != null
				? parseKopecks(payload.expenses.code1AmountRub)
				: 0);
		code2Kopecks =
			payload.expenses.code2AmountKopecks ??
			(payload.expenses.code2AmountRub != null
				? parseKopecks(payload.expenses.code2AmountRub)
				: 0);
	}

	const totalKopecks = code1Kopecks + code2Kopecks;
	const expenseNodes: string[] = [];

	if (code1Kopecks > 0) {
		expenseNodes.push(
			`    <СведРасхУсл КодУслуг="1" СумОпл="${kopecksToNumericString(code1Kopecks)}"/>`,
		);
	}
	if (code2Kopecks > 0) {
		expenseNodes.push(
			`    <СведРасхУсл КодУслуг="2" СумОпл="${kopecksToNumericString(code2Kopecks)}"/>`,
		);
	}
	if (expenseNodes.length === 0) {
		expenseNodes.push('    <СведРасхУсл КодУслуг="1" СумОпл="0.00"/>');
	}

	// 5. Блок подписанта (<Подписант>)
	const signatory = payload.signatory || {
		signatoryRole: "1" as const,
		fullName: parseFio(payload.clinic.directorName || "Смирнов Алексей Владимирович"),
		snils: payload.clinic.directorSnils,
	};
	const signSnils = cleanDigits(signatory.snils);
	const signSnilsAttr = signSnils && signSnils.length === 11 ? ` СНИЛС="${signSnils}"` : "";
	const signPatronymicAttr = signatory.fullName.patronymic
		? ` Отчество="${escapeXmlAttr(signatory.fullName.patronymic)}"`
		: "";
	const signRepXml =
		signatory.signatoryRole === "2" && signatory.powerOfAttorneyNumber
			? `\n      <СвПред НомДовер="${escapeXmlAttr(signatory.powerOfAttorneyNumber)}"/>`
			: "";

	const signatoryBlockXml = `    <Подписант ПрПодп="${signatory.signatoryRole}"${signSnilsAttr}>
      <ФИО Фамилия="${escapeXmlAttr(signatory.fullName.family)}" Имя="${escapeXmlAttr(signatory.fullName.given)}"${signPatronymicAttr}/>${signRepXml}
    </Подписант>`;

	// Сборка XML
	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${fileId}" 
      ВерсПрог="${escapeXmlAttr(progVersion)}" 
      ВерсФорм="5.01">
  <Документ КНД="1184043" 
            ДатаДок="${docDateFormatted}" 
            НомСпр="${escapeXmlAttr(payload.documentNumber || "1")}" 
            ГодУсл="${taxYear}" 
            ПризнСпр="${certKind}" 
            НомКорр="${corrNumber}">
${orgBlockXml}
${payerBlockXml}
${patientBlockXml}
${expenseNodes.join("\n")}
${signatoryBlockXml}
  </Документ>
</Файл>`;

	// Расчет 13% и 15% вычетов
	const code1Rub = rublesFromKopecks(code1Kopecks);
	const code2Rub = rublesFromKopecks(code2Kopecks);
	const totalRub = rublesFromKopecks(totalKopecks);

	const taxYearNum = Number(taxYear);
	const code1Limit =
		taxYearNum >= 2024
			? NDFL_LIMITS.CODE_1_MAX_EXPENSE_FROM_2024
			: NDFL_LIMITS.CODE_1_MAX_EXPENSE_LEGACY;

	const code1EligibleRub = Math.min(code1Rub, code1Limit);
	const refundCode1 = code1EligibleRub * NDFL_LIMITS.TAX_RATE;
	const refundCode2 = code2Rub * NDFL_LIMITS.TAX_RATE;
	const estimatedTaxRefundRub = Math.round((refundCode1 + refundCode2) * 100) / 100;

	const refundCode1_15 = code1EligibleRub * NDFL_LIMITS.HIGH_INCOME_TAX_RATE;
	const refundCode2_15 = code2Rub * NDFL_LIMITS.HIGH_INCOME_TAX_RATE;
	const estimatedTaxRefund15Rub = Math.round((refundCode1_15 + refundCode2_15) * 100) / 100;

	return {
		xmlContent,
		fileName,
		fileId,
		code1Kopecks,
		code2Kopecks,
		totalKopecks,
		code1Rub,
		code2Rub,
		totalRub,
		estimatedTaxRefundRub,
		estimatedTaxRefund15Rub,
		preflightIssues,
		isValidForSubmission,
	};
}

/** Алиас для совместимости с существующими компонентами */
export const generateFnsNdflXml = buildFnsKnd1151156Xml;

/**
 * Валидация сформированного XML по базовым инвариантам XSD ФНС (5.01).
 */
export function validateFnsNdflXmlStructure(xmlContent: string): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	if (!xmlContent || !xmlContent.trim()) {
		return { isValid: false, errors: ["XML контент пуст"] };
	}

	if (!xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
		errors.push("Отсутствует стандартный XML-пролог UTF-8");
	}
	if (!xmlContent.includes("<Файл") || !xmlContent.includes("</Файл>")) {
		errors.push("Отсутствует корневой тег <Файл>");
	}
	if (!xmlContent.includes('ВерсФорм="5.01"')) {
		errors.push("Версия формата должна быть 5.01");
	}
	if (!xmlContent.includes("<Документ") || !xmlContent.includes("</Документ>")) {
		errors.push("Отсутствует секция <Документ>");
	}
	if (!xmlContent.includes('КНД="1184043"')) {
		errors.push('Отсутствует атрибут КНД="1184043"');
	}
	if (!xmlContent.includes("<СвОргМ>")) {
		errors.push("Отсутствует блок медицинской организации (<СвОргМ>)");
	}
	if (!xmlContent.includes("<СвФЛ")) {
		errors.push("Отсутствует блок сведений о налогоплательщике (<СвФЛ>)");
	}
	if (!xmlContent.includes("<СвПациент")) {
		errors.push("Отсутствует блок сведений о пациенте (<СвПациент>)");
	}
	if (!xmlContent.includes("<СведРасхУсл")) {
		errors.push("Отсутствует блок сведений о расходах (<СведРасхУсл>)");
	}
	if (!xmlContent.includes("<Подписант")) {
		errors.push("Отсутствует блок сведений о подписанте (<Подписант>)");
	}

	for (const token of ["undefined", "NaN", "Infinity", "[object Object]"]) {
		if (xmlContent.includes(token)) {
			errors.push(`XML содержит некорректное техническое значение "${token}"`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Генерация официальной печатной формы A4 "Справка об оплате медицинских услуг"
 * (Приложение № 1 к приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ / форма по КНД 1151156).
 */
export function generateFnsNdflPrintHtml(
	payload: FnsTaxPayload,
	signingOptions?: FnsNdflPrintSigningOptions | boolean | undefined,
): string {
	const calculation = buildFnsKnd1151156Xml(payload);
	const docDate = formatFnsRuDate(payload.documentDate);
	const payer = payload.payer;
	const patient = payload.patient;
	const clinic = payload.clinic;

	const payerFio = `${payer.fullName.family} ${payer.fullName.given} ${payer.fullName.patronymic || ""}`.trim();
	const patientFio =
		patient.patientKinshipCode === "1"
			? payerFio
			: `${patient.fullName?.family || ""} ${patient.fullName?.given || ""} ${patient.fullName?.patronymic || ""}`.trim();

	const kinshipLabel =
		FNS_KINSHIP_PRESETS[patient.patientKinshipCode]?.label || "Лично (пациент)";

	const receiptsRows = (payload.receipts || [])
		.map(
			(r, idx) => `
      <tr>
        <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${formatFnsRuDate(r.receiptDate)}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${escapeXmlAttr(r.receiptNumber)}${r.fiscalDocumentNumber ? ` (ФД ${escapeXmlAttr(r.fiscalDocumentNumber)})` : ""}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${escapeXmlAttr(r.serviceName)}</td>
        <td style="text-align: center; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1;">${r.deductionCode}</td>
        <td style="text-align: right; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1;">${formatKopecksRu(parseKopecks(r.amountRub))}</td>
      </tr>`,
		)
		.join("");

	let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Справка об оплате медицинских услуг (КНД 1151156) — ${escapeXmlAttr(payload.documentNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #0f172a; margin: 0; padding: 20px; }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
    .knd-badge { font-family: monospace; font-size: 13pt; font-weight: bold; background: #f1f5f9; padding: 4px 10px; border: 1px solid #94a3b8; border-radius: 4px; }
    .title-box { text-align: center; margin: 16px 0; }
    .title-box h1 { font-size: 13pt; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; }
    .title-box h2 { font-size: 9.5pt; font-weight: normal; margin: 0; color: #475569; }
    .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; background: #f8fafc; padding: 4px 8px; border-left: 4px solid #0d9488; margin-top: 14px; margin-bottom: 6px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt; }
    .grid-table td { padding: 4px 6px; vertical-align: top; }
    .grid-table td.label { width: 35%; color: #475569; font-weight: 500; }
    .grid-table td.value { width: 65%; font-weight: 600; }
    .receipts-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; font-size: 9pt; }
    .receipts-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-weight: bold; }
    .summary-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; }
    .summary-card .sum-num { font-size: 13pt; font-weight: bold; color: #166534; }
    .signatures { display: flex; justify-content: space-between; margin-top: 28px; padding-top: 14px; }
    .sign-col { width: 45%; }
    .sign-line { border-bottom: 1px solid #000; height: 32px; margin-bottom: 4px; }
    .sign-caption { font-size: 8pt; color: #64748b; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div style="font-weight: bold; font-size: 11pt;">${escapeXmlAttr(clinic.name)}</div>
      <div style="font-size: 8.5pt; color: #64748b;">Лицензия: № ${escapeXmlAttr(clinic.license?.number || "ЛО-77-01-019842")} от ${formatFnsRuDate(clinic.license?.date || "2021-04-12")}</div>
    </div>
    <div style="text-align: right;">
      <div class="knd-badge">КНД 1151156</div>
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Приказ ФНС № ЕА-7-11/824@</div>
    </div>
  </div>

  <div class="title-box">
    <h1>СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ</h1>
    <h2>для представления в налоговые органы Российской Федерации</h2>
    <div style="margin-top: 6px; font-weight: bold; font-size: 10.5pt;">
      № ${escapeXmlAttr(payload.documentNumber || "1")} от ${docDate} г. (за ${payload.taxYear} год)
    </div>
  </div>

  <div class="section-title">1. Сведения о медицинской организации / индивидуальном предпринимателе</div>
  <table class="grid-table">
    <tr>
      <td class="label">Полное наименование:</td>
      <td class="value">${escapeXmlAttr(clinic.name)}</td>
    </tr>
    <tr>
      <td class="label">ИНН / КПП:</td>
      <td class="value">${clinic.inn} ${clinic.kpp ? `/ ${clinic.kpp}` : ""}</td>
    </tr>
    <tr>
      <td class="label">ОГРН / ОГРНИП:</td>
      <td class="value">${clinic.ogrn}</td>
    </tr>
  </table>

  <div class="section-title">2. Сведения о физическом лице, оплатившем медицинские услуги (налогоплательщике)</div>
  <table class="grid-table">
    <tr>
      <td class="label">ФИО налогоплательщика:</td>
      <td class="value">${escapeXmlAttr(payerFio)}</td>
    </tr>
    <tr>
      <td class="label">ИНН налогоплательщика:</td>
      <td class="value">${payer.inn || "Не указан (идентификация по паспорту)"}</td>
    </tr>
    <tr>
      <td class="label">Дата рождения:</td>
      <td class="value">${formatFnsRuDate(payer.birthDate)}</td>
    </tr>
    ${
			payer.identityDocument
				? `<tr>
      <td class="label">Документ (паспорт):</td>
      <td class="value">Серия и номер: ${escapeXmlAttr(payer.identityDocument.seriesAndNumber)}${payer.identityDocument.issueDate ? `, выдан ${formatFnsRuDate(payer.identityDocument.issueDate)}` : ""}</td>
    </tr>`
				: ""
		}
  </table>

  <div class="section-title">3. Сведения о пациенте</div>
  <table class="grid-table">
    <tr>
      <td class="label">Отношение к налогоплательщику:</td>
      <td class="value"><strong>${escapeXmlAttr(kinshipLabel)}</strong></td>
    </tr>
    ${
			patient.patientKinshipCode !== "1"
				? `<tr>
      <td class="label">ФИО пациента:</td>
      <td class="value">${escapeXmlAttr(patientFio)}</td>
    </tr>
    <tr>
      <td class="label">Дата рождения пациента:</td>
      <td class="value">${formatFnsRuDate(patient.birthDate)}</td>
    </tr>`
				: ""
		}
  </table>

  <div class="section-title">4. Стоимость оказанных медицинских услуг по кодам вычета</div>
  <table class="grid-table" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
    <tr>
      <td class="label">Код 1 (Обычное лечение):</td>
      <td class="value" style="font-size: 11pt; color: #0d9488;"><strong>${formatKopecksRu(calculation.code1Kopecks)}</strong></td>
    </tr>
    <tr>
      <td class="label">Код 2 (Дорогостоящее лечение):</td>
      <td class="value" style="font-size: 11pt; color: #0d9488;"><strong>${formatKopecksRu(calculation.code2Kopecks)}</strong></td>
    </tr>
    <tr style="border-top: 1px solid #cbd5e1;">
      <td class="label">ИТОГО ОПЛАЧЕНО:</td>
      <td class="value" style="font-size: 12pt; color: #0f172a;"><strong>${formatKopecksRu(calculation.totalKopecks)}</strong></td>
    </tr>
  </table>

  <div class="summary-card">
    <div>
      <div style="font-weight: bold; font-size: 10pt; color: #166534;">Расчетный социальный налоговый вычет 13% к возврату:</div>
      <div style="font-size: 8.5pt; color: #15803d;">По ст. 219 Налогового кодекса РФ (с учетом лимита 150 000 ₽ по коду 1 и без лимита по коду 2)</div>
    </div>
    <div class="sum-num">${formatKopecksRu(parseKopecks(calculation.estimatedTaxRefundRub))}</div>
  </div>

  <div class="section-title">5. Реестр фискальных чеков (54-ФЗ)</div>
  <table class="receipts-table">
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">№</th>
        <th style="width: 80px;">Дата</th>
        <th style="width: 140px;">Чек / ФД</th>
        <th>Наименование стоматологической услуги</th>
        <th style="width: 50px; text-align: center;">Код</th>
        <th style="width: 100px; text-align: right;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${receiptsRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">Нет чеков</td></tr>'}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sign-col">
      <div>Руководитель организации / уполномоченное лицо:</div>
      <div class="sign-line"></div>
      <div class="sign-caption">(подпись, расшифровка: ${escapeXmlAttr(clinic.directorName || "Смирнов А.В.")})</div>
    </div>
    <div class="sign-col">
      <div style="text-align: right;">М.П. (при наличии печати)</div>
      <div class="sign-line"></div>
      <div class="sign-caption">Дата выдачи: ${docDate} г.</div>
    </div>
  </div>
</body>
</html>`;

	if (signingOptions) {
		const opts: FnsNdflPrintSigningOptions =
			typeof signingOptions === "object" && signingOptions !== null
				? signingOptions
				: {};

		if (opts.certificateSerialNumber) {
			const certSerial = opts.certificateSerialNumber;
			const certSubject =
				opts.certificateSubject ||
				clinic.name ||
				clinic.directorName ||
				"ООО СТОМАТОЛОГИЯ ДЕНТЕ";
			const validFrom =
				opts.validFrom ||
				(typeof payload.documentDate === "string"
					? payload.documentDate
					: new Date().toISOString());
			const validToDate = new Date(validFrom);
			validToDate.setFullYear(validToDate.getFullYear() + 1);

			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: certSerial,
				certificateSubject: certSubject,
				certificateIssuer:
					opts.certificateIssuer || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
				validFrom,
				validTo: opts.validTo || validToDate.toISOString(),
				signedAt: opts.signedAt || validFrom,
				signatureType: opts.signatureType || "ukep",
				documentId: payload.documentNumber,
			});

			html = injectVisualSignatureStampIntoHtml(html, stampHtml);
		}
	}

	return html;
}
