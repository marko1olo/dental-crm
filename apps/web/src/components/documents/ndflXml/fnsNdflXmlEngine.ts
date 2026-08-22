/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML ENGINE (ПРИКАЗ ФНС № ЕД-7-11/755@)
 * KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL Version 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	type FnsKinshipCode,
	type FnsServiceDeductionCode,
	NDFL_LIMITS,
	type SupportedTaxYear,
	validateRussianInn,
	validateRussianSnils,
} from "./fnsNdflXmlPresets.js";

/** Перевод целых копеек в рубли (число с плавающей точкой) для вывода. */
export function rublesFromKopecks(kopecks: number): number {
	return kopecks / 100;
}

export interface FnsNdflClinicMetadata {
	inn: string;
	kpp?: string | undefined;
	ogrn: string;
	name: string;
	isIndividualEntrepreneur?: boolean | undefined;
	ipFullName?: {
		family: string;
		given: string;
		patronymic?: string | undefined;
	} | undefined;
	license?: {
		number: string;
		date: string;
	} | undefined;
	phone?: string | undefined;
	directorName?: string | undefined;
	directorSnils?: string | undefined;
}

export interface FnsNdflPayerMetadata {
	fullName: {
		family: string;
		given: string;
		patronymic?: string | undefined;
	};
	inn?: string | undefined;
	snils?: string | undefined;
	birthDate: string; // YYYY-MM-DD or DD.MM.YYYY
	identityDocument?: {
		docTypeCode?: string | undefined; // 21 = Russian Passport
		seriesAndNumber: string;
		issueDate?: string | undefined;
	} | undefined;
}

export interface FnsNdflPatientMetadata {
	kinshipCode: FnsKinshipCode; // 1 = Self, 2 = Spouse, 3 = Parent, 4 = Child, 5 = Ward
	fullName?: {
		family: string;
		given: string;
		patronymic?: string | undefined;
	} | undefined;
	inn?: string | undefined;
	snils?: string | undefined;
	birthDate?: string | undefined;
	identityDocument?: {
		docTypeCode?: string | undefined;
		seriesAndNumber: string;
		issueDate?: string | undefined;
	} | undefined;
}

export interface FnsNdflFiscalReceiptItem {
	id: string;
	receiptNumber: string;
	fiscalDocumentNumber?: string | undefined; // Номер ФД / ФПД (54-ФЗ)
	receiptDate: string; // YYYY-MM-DD
	serviceName: string;
	deductionCode: FnsServiceDeductionCode; // 1 = Regular, 2 = Expensive
	amountRub: number;
}

export interface FnsNdflXmlPayload {
	documentNumber: string;
	documentDate: string | Date;
	taxYear: SupportedTaxYear | number;
	taxInspectionCode?: string | undefined; // 4-digit code e.g. "7701"
	certificateKind?: "1" | "2" | "3" | undefined; // 1 = Primary, 2 = Corrective, 3 = Cancellation
	correctionNumber?: number | undefined;
	softwareVersion?: string | undefined;
	clinic: FnsNdflClinicMetadata;
	payer: FnsNdflPayerMetadata;
	patient: FnsNdflPatientMetadata;
	receipts: FnsNdflFiscalReceiptItem[];
	signatory?: {
		signatoryRole: "1" | "2"; // 1 = Head/IP, 2 = Authorized Representative
		fullName: {
			family: string;
			given: string;
			patronymic?: string | undefined;
		};
		snils?: string | undefined;
		powerOfAttorneyNumber?: string | undefined;
	} | undefined;
}

export interface FnsPreflightIssue {
	field: string;
	message: string;
	severity: "error" | "warning";
}

export interface FnsNdflXmlResult {
	xmlContent: string;
	fileName: string;
	fileId: string;
	code1Kopecks: number;
	code2Kopecks: number;
	totalKopecks: number;
	code1Rub: number;
	code2Rub: number;
	totalRub: number;
	estimatedTaxRefundRub: number;
	preflightIssues: FnsPreflightIssue[];
	isValidForSubmission: boolean;
}

/** Экранирование спецсимволов XML */
export function escapeXmlAttr(value: string | number | null | undefined): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

/** Очистка строки от нецифровых символов */
export function cleanDigits(str?: string | null): string {
	return str ? str.replace(/\D/g, "") : "";
}

/** Форматирование даты в стандартный вид ФНС: ДД.ММ.ГГГГ */
export function formatFnsRuDate(dateStrOrObj?: string | Date | null): string {
	if (!dateStrOrObj) {
		const now = new Date();
		const dd = now.getDate().toString().padStart(2, "0");
		const mm = (now.getMonth() + 1).toString().padStart(2, "0");
		const yyyy = now.getFullYear();
		return `${dd}.${mm}.${yyyy}`;
	}
	if (typeof dateStrOrObj === "string") {
		const trimmed = dateStrOrObj.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
			return trimmed;
		}
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const datePart = trimmed.split("T")[0] ?? "";
			const parts = datePart.split("-");
			if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
				return `${parts[2]}.${parts[1]}.${parts[0]}`;
			}
		}
		if (/^\d{8}$/.test(trimmed)) {
			return `${trimmed.slice(6, 8)}.${trimmed.slice(4, 6)}.${trimmed.slice(0, 4)}`;
		}
	}
	const date = new Date(dateStrOrObj);
	if (Number.isNaN(date.getTime())) return "01.01.2026";
	const dd = date.getDate().toString().padStart(2, "0");
	const mm = (date.getMonth() + 1).toString().padStart(2, "0");
	const yyyy = date.getFullYear();
	return `${dd}.${mm}.${yyyy}`;
}

/**
 * Генерация уникального ИдФайл и имени файла по стандарту ФНС РФ:
 * UT_SVOPLMEDUSL_<КодНО>_<КодНО>_<ИдОтпр>_<ДатаДокГГГГММДД>_<UUID>
 */
export function generateFnsFileName(
	taxOfficeCode: string,
	senderInn: string,
	senderKpp: string | undefined,
	documentDate: string,
	customUuid?: string,
): { fileName: string; fileId: string; uuid: string } {
	const cleanOffice = (taxOfficeCode || "7701").padStart(4, "0").slice(0, 4);
	const cleanInn = cleanDigits(senderInn) || "7701234567";
	const cleanKpp = senderKpp ? cleanDigits(senderKpp) : "";
	const senderId = cleanInn.length === 12 ? cleanInn : `${cleanInn}${cleanKpp || "770101001"}`;

	let rawDate = "20260818";
	if (documentDate.includes(".")) {
		const parts = documentDate.split(".");
		if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
			rawDate = `${parts[2]}${parts[1]}${parts[0]}`;
		}
	} else if (documentDate.includes("-")) {
		rawDate = documentDate.replace(/-/g, "").slice(0, 8);
	} else {
		rawDate = cleanDigits(documentDate).slice(0, 8) || "20260818";
	}

	const uuid =
		customUuid ||
		(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6");

	const fileId = `UT_SVOPLMEDUSL_${cleanOffice}_${cleanOffice}_${senderId}_${rawDate}_${uuid}`;
	const fileName = `${fileId}.xml`;

	return { fileName, fileId, uuid };
}

/** Разделение полного ФИО на Фамилию, Имя, Отчество */
export function parseFio(fullNameStr: string): {
	family: string;
	given: string;
	patronymic?: string | undefined;
} {
	const parts = fullNameStr.trim().split(/\s+/).filter(Boolean);
	return {
		family: parts[0] || "Иванов",
		given: parts[1] || "Иван",
		patronymic: parts.slice(2).join(" ") || undefined,
	};
}

/**
 * Валидация входных данных перед генерацией XML.
 */
export function preflightValidatePayload(payload: FnsNdflXmlPayload): FnsPreflightIssue[] {
	const issues: FnsPreflightIssue[] = [];

	// 1. Проверка клиники
	const clinicInnValidation = validateRussianInn(payload.clinic.inn);
	if (!clinicInnValidation.isValid) {
		issues.push({
			field: "clinic.inn",
			message: `ИНН клиники некорректен: ${clinicInnValidation.error}`,
			severity: "error",
		});
	}

	if (!payload.clinic.isIndividualEntrepreneur && !payload.clinic.kpp) {
		issues.push({
			field: "clinic.kpp",
			message: "Для юридического лица обязателен КПП (9 цифр)",
			severity: "warning",
		});
	}

	if (!payload.clinic.ogrn) {
		issues.push({
			field: "clinic.ogrn",
			message: "Укажите ОГРН клиники",
			severity: "error",
		});
	}

	// 2. Проверка налогоплательщика (плательщика)
	if (payload.payer.inn) {
		const payerInnVal = validateRussianInn(payload.payer.inn);
		if (!payerInnVal.isValid || payerInnVal.type !== "individual") {
			issues.push({
				field: "payer.inn",
				message: `ИНН налогоплательщика некорректен: ${payerInnVal.error || "требуется 12 цифр ФЛ"}`,
				severity: "error",
			});
		}
	} else if (!payload.payer.identityDocument?.seriesAndNumber) {
		issues.push({
			field: "payer.identityDocument",
			message: "Если у налогоплательщика нет ИНН, обязательно укажите паспортные данные (серия и номер)",
			severity: "error",
		});
	}

	if (!payload.payer.fullName.family || !payload.payer.fullName.given) {
		issues.push({
			field: "payer.fullName",
			message: "Укажите Фамилию и Имя налогоплательщика",
			severity: "error",
		});
	}

	// 3. Проверка сведений о пациенте (если не сам пациент)
	if (payload.patient.kinshipCode !== "1") {
		if (!payload.patient.fullName?.family || !payload.patient.fullName?.given) {
			issues.push({
				field: "patient.fullName",
				message: "Пациент отличается от плательщика: необходимо указать ФИО пациента",
				severity: "error",
			});
		}
		if (!payload.patient.birthDate) {
			issues.push({
				field: "patient.birthDate",
				message: "Для пациента-родственника укажите дату рождения",
				severity: "error",
			});
		}
	}

	// 4. Проверка чеков и сумм
	if (!payload.receipts || payload.receipts.length === 0) {
		issues.push({
			field: "receipts",
			message: "Добавьте хотя бы один фискальный чек об оплате за налоговый год",
			severity: "error",
		});
	}

	return issues;
}

/**
 * Основной генератор XML по Приказу ФНС России № ЕД-7-11/755@ (КНД 1184043).
 */
export function generateFnsNdflXml(
	payload: FnsNdflXmlPayload,
	customUuid?: string,
): FnsNdflXmlResult {
	const preflightIssues = preflightValidatePayload(payload);
	const isValidForSubmission = !preflightIssues.some((issue) => issue.severity === "error");

	const taxOffice = (payload.taxInspectionCode || "7701").padStart(4, "0").slice(0, 4);
	const docDateFormatted = formatFnsRuDate(payload.documentDate);
	const taxYear = String(payload.taxYear || new Date().getFullYear()).slice(0, 4);
	const certKind = payload.certificateKind || "1";
	const corrNumber = payload.correctionNumber ?? (certKind === "1" ? 0 : 1);
	const progVersion = payload.softwareVersion || "DentalMIS_FNS_Gateway_v2.4";

	const clinicInn = cleanDigits(payload.clinic.inn);
	const clinicKpp = payload.clinic.kpp ? cleanDigits(payload.clinic.kpp) : undefined;
	const clinicOgrn = cleanDigits(payload.clinic.ogrn);

	const { fileName, fileId } = generateFnsFileName(
		taxOffice,
		clinicInn,
		clinicKpp,
		docDateFormatted,
		customUuid,
	);

	// 1. Блок медицинской организации / ИП (<СвОргМ>)
	let orgBlockXml = "";
	if (payload.clinic.isIndividualEntrepreneur || clinicInn.length === 12) {
		const ipFio = payload.clinic.ipFullName || parseFio(payload.clinic.directorName || "Иванов Иван Иванович");
		const patronymicAttr = ipFio.patronymic
			? ` Отчество="${escapeXmlAttr(ipFio.patronymic)}"`
			: "";
		const licenseXml = payload.clinic.license
			? `\n        <Лицензия НомЛиц="${escapeXmlAttr(payload.clinic.license.number)}" ДатаЛиц="${formatFnsRuDate(payload.clinic.license.date)}"/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвИП ИННФЛ="${clinicInn}" ОГРНИП="${clinicOgrn}">
        <ФИО Фамилия="${escapeXmlAttr(ipFio.family)}" Имя="${escapeXmlAttr(ipFio.given)}"${patronymicAttr}/>${licenseXml}
      </СвИП>
    </СвОргМ>`;
	} else {
		const licenseXml = payload.clinic.license
			? `\n        <Лицензия НомЛиц="${escapeXmlAttr(payload.clinic.license.number)}" ДатаЛиц="${formatFnsRuDate(payload.clinic.license.date)}"/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвОргЮЛ НаимОрг="${escapeXmlAttr(payload.clinic.name || "ООО Стоматология")}" 
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
		payerDocXml = `\n      <УдЛичнФЛ КодВидДок="${escapeXmlAttr(payer.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXmlAttr(payer.identityDocument.seriesAndNumber)}"${docDateAttr}/>`;
	}

	const payerBlockXml = `    <СвФЛ ${payerAttrs}>
      <ФИО Фамилия="${escapeXmlAttr(payer.fullName.family)}" Имя="${escapeXmlAttr(payer.fullName.given)}"${payerPatronymicAttr}/>${payerDocXml}
    </СвФЛ>`;

	// 3. Блок пациента (<СвПациент>)
	const patient = payload.patient;
	let patientBlockXml = "";
	if (patient.kinshipCode === "1") {
		patientBlockXml = "    <СвПациент ПризнПац=\"1\"/>";
	} else {
		let patientAttrs = `ПризнПац="${patient.kinshipCode}"`;
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
			patientDocXml = `\n      <УдЛичнФЛ КодВидДок="${escapeXmlAttr(patient.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXmlAttr(patient.identityDocument.seriesAndNumber)}"${docDateAttr}/>`;
		}

		patientBlockXml = `    <СвПациент ${patientAttrs}>${patientFioXml}${patientDocXml}
    </СвПациент>`;
	}

	// 4. Блок расходов (<СведРасхУсл>) — копеечный подсчет
	const code1Receipts = (payload.receipts || []).filter((r) => r.deductionCode === "1");
	const code2Receipts = (payload.receipts || []).filter((r) => r.deductionCode === "2");

	const code1Kopecks = sumKopecks(code1Receipts.map((r) => parseKopecks(r.amountRub)));
	const code2Kopecks = sumKopecks(code2Receipts.map((r) => parseKopecks(r.amountRub)));
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
		// Дефолтный узел при пустых суммах (для предпросмотра)
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

	// Сборка XML документа
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

	// Расчет 13% вычета: Код 1 с лимитом 150к + Код 2 без лимита
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
		preflightIssues,
		isValidForSubmission,
	};
}

/**
 * Генерация печатного HTML документа "Справка об оплате медицинских услуг"
 * (Приложение № 1 к приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ / форма по КНД 1151156).
 */
export function generateFnsNdflPrintHtml(payload: FnsNdflXmlPayload): string {
	const calculation = generateFnsNdflXml(payload);
	const docDate = formatFnsRuDate(payload.documentDate);
	const payer = payload.payer;
	const patient = payload.patient;
	const clinic = payload.clinic;

	const payerFio = `${payer.fullName.family} ${payer.fullName.given} ${payer.fullName.patronymic || ""}`.trim();
	const patientFio =
		patient.kinshipCode === "1"
			? payerFio
			: `${patient.fullName?.family || ""} ${patient.fullName?.given || ""} ${patient.fullName?.patronymic || ""}`.trim();

	const kinshipLabel =
		patient.kinshipCode === "1"
			? "налогоплательщик и пациент — одно лицо"
			: patient.kinshipCode === "2"
				? "Супруг(а)"
				: patient.kinshipCode === "3"
					? "Родитель"
					: patient.kinshipCode === "4"
						? "Ребенок / Подопечный"
						: "Подопечный";

	const receiptsRows = (payload.receipts || [])
		.map(
			(r, idx) => `
      <tr>
        <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${formatFnsRuDate(r.receiptDate)}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${escapeXmlAttr(r.receiptNumber)}${r.fiscalDocumentNumber ? ` (ФД ${r.fiscalDocumentNumber})` : ""}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${escapeXmlAttr(r.serviceName)}</td>
        <td style="text-align: center; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1;">${r.deductionCode}</td>
        <td style="text-align: right; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1;">${formatKopecksRu(parseKopecks(r.amountRub))}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Справка об оплате медицинских услуг (КНД 1151156) — ${escapeXmlAttr(payload.documentNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #0f172a; margin: 0; padding: 20px; }
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
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Приказ ФНС № ЕА-7-11/824@ / № ЕД-7-11/755@</div>
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
      <td class="value"><strong>${kinshipLabel}</strong></td>
    </tr>
    ${
			patient.kinshipCode !== "1"
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
      ${receiptsRows || "<tr><td colspan=\"6\" style=\"text-align: center; padding: 12px; color: #64748b;\">Нет чеков</td></tr>"}
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
}
