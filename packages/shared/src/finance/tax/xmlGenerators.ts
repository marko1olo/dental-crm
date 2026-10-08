/**
 * DENTE Dental CRM — Tax Deduction Engine (FNS XML 5.01 & QR Generators)
 * Compliant with FNS Russia Order EA-7-11/824@ (КНД 1151156 / 1184043, Формат 5.01).
 * Generates official XML registries, batch XML, NO_MEDOPL format & verification QR codes.
 */

import {
	FNS_FORMAT_VERSION_501,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
} from "./constants.js";
import type {
	TaxDeductionBatchParams,
	TaxDeductionCertificateParams,
} from "./types.js";
import { resolveTaxDeductionCategoryShared } from "./classification.js";
import {
	calculateTaxDeductionSummary,
	normalizePaymentsForTaxCertificate,
} from "./calculation.js";
import {
	generateQrCodeSvg,
	generateQrCodeDataUri,
	type QrSvgOptions,
} from "../../fiscal/qrGenerator.js";
import { escapeXml } from "../../cda/c14n.js";
import { generateFnsRegistryFileSuffix } from "../../utils/idGenerators.js";

export function formatDateToRussian(isoString: string): string {
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return isoString.slice(0, 10);
	const day = d.getDate().toString().padStart(2, "0");
	const month = (d.getMonth() + 1).toString().padStart(2, "0");
	const year = d.getFullYear().toString();
	return `${day}.${month}.${year}`;
}

/**
 * Генерация верификационного QR-кода для справки КНД 1151156 (Приказ 824@).
 * Содержит верификационный URL или структурированный payload для проверки налоговым инспектором.
 */
export function generateTaxCertificateQrPayload(params: TaxDeductionCertificateParams): string {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Kopecks: 0,
		code02Kopecks: 0,
		totalKopecks: 0,
	};

	const code01Str = (targetYear.code01Kopecks / 100).toFixed(2);
	const code02Str = (targetYear.code02Kopecks / 100).toFixed(2);
	const totalStr = (targetYear.totalKopecks / 100).toFixed(2);
	const issueDate = params.issueDateIso.slice(0, 10);

	// Официальный верификационный URI для налогового инспектора и ЛК ФНС
	return `https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=${encodeURIComponent(params.clinic.inn)}&cert=${encodeURIComponent(params.certificateNumber)}&date=${issueDate}&year=${params.taxYear}&payerInn=${encodeURIComponent(params.payer.inn || "")}&c1=${code01Str}&c2=${code02Str}&sum=${totalStr}`;
}

/**
 * Генерация SVG строки QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrSvg(
	params: TaxDeductionCertificateParams,
	options: QrSvgOptions = {}
): string {
	const payload = generateTaxCertificateQrPayload(params);
	return generateQrCodeSvg(payload, {
		size: options.size ?? 120,
		margin: options.margin ?? 2,
		title: options.title ?? `Справка КНД 1151156 № ${params.certificateNumber}`,
		...options,
	});
}

/**
 * Генерация base64 Data-URI QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrDataUri(
	params: TaxDeductionCertificateParams,
	options: QrSvgOptions = {}
): string {
	const payload = generateTaxCertificateQrPayload(params);
	return generateQrCodeDataUri(payload, {
		size: options.size ?? 120,
		margin: options.margin ?? 2,
		...options,
	});
}

/**
 * Генерация официального XML-файла реестра сведений для прямой отправки в ФНС по ТКС
 * (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, КНД 1184043, Формат 5.01).
 */
export function generateFnsTaxDeductionXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Rub: 0,
		code01Kopecks: 0,
		code02Rub: 0,
		code02Kopecks: 0,
		totalRub: 0,
		totalKopecks: 0,
	};

	const relationshipInfo = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	const samePatientFlag = relationshipInfo.samePatientFlag;
	const taxOfficeCode = (params.taxOfficeCode || "7701").trim();
	const now = new Date();
	const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
	// Формат ИдФайл по Приказу 824@: VO_SPRRECH_КодНО_ИНН_ГГГГММДД_GUID
	const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
	const clinicInnClean = String(params.clinic.inn || "").replace(/\D/g, "");
	const isIp = params.clinic.isSoleProprietor === true || clinicInnClean.length === 12;
	const clinicKppClean = isIp ? "" : (params.clinic.kpp ? params.clinic.kpp.replace(/\D/g, "") : "770101001");
	const clinicOgrnClean = params.clinic.ogrn ? params.clinic.ogrn.replace(/\D/g, "") : "";
	const safeKpp = !isIp && params.clinic.kpp ? `_${params.clinic.kpp.replace(/\D/g, "")}` : "";
	const clinicId = `${clinicInnClean}${safeKpp}`;
	const randomSuffix = generateFnsRegistryFileSuffix(
		8,
		`${safeTaxOffice}_${clinicId}_${dateStamp}_${params.taxYear}_${params.certificateNumber}`,
	);
	const fileId = `VO_SPRRECH_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
	const fileName = `${fileId}.xml`;

	const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
	const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
	const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);

	const issueDateFormatted = formatDateToRussian(params.issueDateIso);
	const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "";
	const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "";

	const signerType = params.signer?.signerType || "1";
	const signerName = params.signer?.fullName || params.clinic.chiefDoctorName || "Главный врач";

	// Чеки по 54-ФЗ за отчетный год с учетом нетто-оплат (вычет возвратов)
	const yearPayments = normalizePaymentsForTaxCertificate(
		params.payments,
		params.taxYear,
	);

	const licenseXml = params.clinic.licenseNumber
		? `\n      <Лицензия Номер="${escapeXml(params.clinic.licenseNumber)}"${params.clinic.licenseDate ? ` Дата="${escapeXml(params.clinic.licenseDate)}"` : ""} />`
		: "";

	const orgBlockXml = isIp
		? `    <СвНП ИННФЛ="${escapeXml(clinicInnClean)}" ОГРНИП="${escapeXml(clinicOgrnClean)}" НаимОрг="${escapeXml(params.clinic.legalName)}">${licenseXml}\n    </СвНП>`
		: `    <СвНП ИННЮЛ="${escapeXml(clinicInnClean)}" КПП="${escapeXml(clinicKppClean)}" НаимОрг="${escapeXml(params.clinic.legalName)}" ОГРН="${escapeXml(clinicOgrnClean)}">${licenseXml}\n    </СвНП>`;

	const payerDocSeriesNum = ((params.payer.identityDocumentSeries || "") + " " + (params.payer.identityDocumentNumber || "")).trim();
	const payerDocTag = payerDocSeriesNum
		? `\n        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml(payerDocSeriesNum)}" />`
		: "";

	const patientDocSeriesNum = ((params.patient.identityDocumentSeries || "") + " " + (params.patient.identityDocumentNumber || "")).trim();
	const patientDocTag = patientDocSeriesNum
		? `\n        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml(patientDocSeriesNum)}" />`
		: "";

	const sumAttrs = [
		targetYearSummary.code01Kopecks > 0 || targetYearSummary.code02Kopecks === 0 ? `СуммаКод1="${code01Str}"` : "",
		targetYearSummary.code02Kopecks > 0 ? `СуммаКод2="${code02Str}"` : "",
		`СуммаВсего="${totalStr}"`,
	].filter(Boolean).join(" ");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсПрог="DENTE Dental CRM 2.0" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}">
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" КодНО="${escapeXml(taxOfficeCode)}" ОтчГод="${escapeXml(String(params.taxYear))}" НомКорр="0" ПоПруч="1">
${orgBlockXml}
    <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${params.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(params.signer.authorityDoc)}"` : ""} />
    <СведРасхУсл НомерСвед="${escapeXml(params.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" НомКорр="0" ПрПациент="${escapeXml(samePatientFlag)}">
      <НППлатМедУсл ФИО="${escapeXml(params.payer.fullName)}"${params.payer.inn ? ` ИННФЛ="${escapeXml(params.payer.inn)}"` : ""}${payerBirthDateFormatted ? ` ДатаРожд="${escapeXml(payerBirthDateFormatted)}"` : ""}>${payerDocTag}
      </НППлатМедУсл>
      ${
				samePatientFlag === "0"
					? (patientDocTag
						? `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(relationshipInfo.code)}"${params.patient.snils ? ` СНИЛС="${escapeXml(params.patient.snils.replace(/\D/g, ""))}"` : ""}>${patientDocTag}\n      </Пациент>`
						: `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(relationshipInfo.code)}"${params.patient.snils ? ` СНИЛС="${escapeXml(params.patient.snils.replace(/\D/g, ""))}"` : ""} />`)
					: ""
			}
      <СуммаРасх ${sumAttrs}>
        ${yearPayments
					.map(
						(pay, idx) =>
							`<ТаблРасх НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаВремяЧек="${escapeXml(pay.dateIso.slice(0, 10))}" СуммаЧек="${pay.amountRub.toFixed(2)}" КодУсл="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`
					)
					.join("\n        ")}
      </СуммаРасх>
    </СведРасхУсл>
  </Документ>
</Файл>`;

	return { fileName, fileId, xmlContent };
}

/**
 * Генерация пакетного XML-реестра сведений по нескольким справкам для прямой загрузки через ТКС
 * (Контур.Экстерн, СБИС, 1С-Отчетность, Такском, Калуга Астрал).
 */
export function generateFnsTaxDeductionBatchXml(batch: TaxDeductionBatchParams): {
	fileName: string;
	fileId: string;
	certificatesCount: number;
	xmlContent: string;
} {
	const taxOfficeCode = (batch.taxOfficeCode || "7701").trim();
	const now = new Date();
	const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
	const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
	const clinicInnClean = String(batch.clinic.inn || "").replace(/\D/g, "");
	const isIp = batch.clinic.isSoleProprietor === true || clinicInnClean.length === 12;
	const clinicKppClean = isIp ? "" : (batch.clinic.kpp ? batch.clinic.kpp.replace(/\D/g, "") : "770101001");
	const clinicOgrnClean = batch.clinic.ogrn ? batch.clinic.ogrn.replace(/\D/g, "") : "";
	const safeKpp = !isIp && batch.clinic.kpp ? `_${batch.clinic.kpp.replace(/\D/g, "")}` : "";
	const clinicId = `${clinicInnClean}${safeKpp}`;
	const randomSuffix = generateFnsRegistryFileSuffix(
		8,
		`${safeTaxOffice}_${clinicId}_${dateStamp}_${batch.taxYear}_${batch.certificates.length}`,
	);
	const fileId = `VO_SPRRECH_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
	const fileName = `${fileId}.xml`;

	const signerType = batch.signer?.signerType || "1";
	const signerName = batch.signer?.fullName || batch.clinic.chiefDoctorName || "Главный врач";

	const recordsXml = batch.certificates
		.map((cert) => {
			const summary = calculateTaxDeductionSummary(cert.payments);
			const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === batch.taxYear) || {
				code01Rub: 0,
				code01Kopecks: 0,
				code02Rub: 0,
				code02Kopecks: 0,
				totalRub: 0,
				totalKopecks: 0,
			};

			const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[cert.payer.relationship];
			const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
			const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
			const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);

			const issueDateFormatted = formatDateToRussian(cert.issueDateIso);
			const payerBday = cert.payer.birthDate ? formatDateToRussian(cert.payer.birthDate) : "";
			const patientBday = cert.patient.birthDate ? formatDateToRussian(cert.patient.birthDate) : "";

			const yearPayments = normalizePaymentsForTaxCertificate(
				cert.payments,
				batch.taxYear,
			);

			const payerDocSeriesNum = ((cert.payer.identityDocumentSeries || "") + " " + (cert.payer.identityDocumentNumber || "")).trim();
			const payerDocTag = payerDocSeriesNum
				? `\n        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml(payerDocSeriesNum)}" />`
				: "";

			const patientDocSeriesNum = ((cert.patient.identityDocumentSeries || "") + " " + (cert.patient.identityDocumentNumber || "")).trim();
			const patientDocTag = patientDocSeriesNum
				? `\n        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml(patientDocSeriesNum)}" />`
				: "";

			const sumAttrs = [
				targetYearSummary.code01Kopecks > 0 || targetYearSummary.code02Kopecks === 0 ? `СуммаКод1="${code01Str}"` : "",
				targetYearSummary.code02Kopecks > 0 ? `СуммаКод2="${code02Str}"` : "",
				`СуммаВсего="${totalStr}"`,
			].filter(Boolean).join(" ");

			return `    <СведРасхУсл НомерСвед="${escapeXml(cert.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" НомКорр="0" ПрПациент="${escapeXml(rel.samePatientFlag)}">
      <НППлатМедУсл ФИО="${escapeXml(cert.payer.fullName)}"${cert.payer.inn ? ` ИННФЛ="${escapeXml(cert.payer.inn)}"` : ""}${payerBday ? ` ДатаРожд="${escapeXml(payerBday)}"` : ""}>${payerDocTag}
      </НППлатМедУсл>
      ${
				rel.samePatientFlag === "0"
					? (patientDocTag
						? `<Пациент ФИО="${escapeXml(cert.patient.fullName)}"${patientBday ? ` ДатаРожд="${escapeXml(patientBday)}"` : ""}${cert.patient.inn ? ` ИННФЛ="${escapeXml(cert.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}"${cert.patient.snils ? ` СНИЛС="${escapeXml(cert.patient.snils.replace(/\D/g, ""))}"` : ""}>${patientDocTag}\n      </Пациент>`
						: `<Пациент ФИО="${escapeXml(cert.patient.fullName)}"${patientBday ? ` ДатаРожд="${escapeXml(patientBday)}"` : ""}${cert.patient.inn ? ` ИННФЛ="${escapeXml(cert.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}"${cert.patient.snils ? ` СНИЛС="${escapeXml(cert.patient.snils.replace(/\D/g, ""))}"` : ""} />`)
					: ""
			}
      <СуммаРасх ${sumAttrs}>
        ${yearPayments
					.map(
						(pay, idx) =>
							`<ТаблРасх НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаВремяЧек="${escapeXml(pay.dateIso.slice(0, 10))}" СуммаЧек="${pay.amountRub.toFixed(2)}" КодУсл="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`
					)
					.join("\n        ")}
      </СуммаРасх>
    </СведРасхУсл>`;
		})
		.join("\n");

	const licenseXml = batch.clinic.licenseNumber
		? `\n      <Лицензия Номер="${escapeXml(batch.clinic.licenseNumber)}"${batch.clinic.licenseDate ? ` Дата="${escapeXml(batch.clinic.licenseDate)}"` : ""} />`
		: "";

	const orgBlockXml = isIp
		? `    <СвНП ИННФЛ="${escapeXml(clinicInnClean)}" ОГРНИП="${escapeXml(clinicOgrnClean)}" НаимОрг="${escapeXml(batch.clinic.legalName)}">${licenseXml}\n    </СвНП>`
		: `    <СвНП ИННЮЛ="${escapeXml(clinicInnClean)}" КПП="${escapeXml(clinicKppClean)}" НаимОрг="${escapeXml(batch.clinic.legalName)}" ОГРН="${escapeXml(clinicOgrnClean)}">${licenseXml}\n    </СвНП>`;

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсПрог="DENTE Dental CRM 2.0" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}">
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" КодНО="${escapeXml(taxOfficeCode)}" ОтчГод="${escapeXml(String(batch.taxYear))}" НомКорр="0" ПоПруч="1">
${orgBlockXml}
    <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${batch.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(batch.signer.authorityDoc)}"` : ""} />
${recordsXml}
  </Документ>
</Файл>`;

	return {
		fileName,
		fileId,
		certificatesCount: batch.certificates.length,
		xmlContent,
	};
}

/**
 * Генерация официального XML-файла реестра сведений в формате NO_MEDOPL 5.01 / КНД 1184043
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ для прямой отправки по ТКС.
 */
export function generateFnsNoMedoplXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
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
	const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
	const clinicInnClean = String(params.clinic.inn || "").replace(/\D/g, "");
	const isIp = params.clinic.isSoleProprietor === true || clinicInnClean.length === 12;
	const clinicKppClean = isIp ? "" : (params.clinic.kpp ? params.clinic.kpp.replace(/\D/g, "") : "770101001");
	const clinicOgrnClean = params.clinic.ogrn ? params.clinic.ogrn.replace(/\D/g, "") : "";
	const safeKpp = !isIp && params.clinic.kpp ? `_${params.clinic.kpp.replace(/\D/g, "")}` : "";
	const clinicId = `${clinicInnClean}${safeKpp}`;
	const randomSuffix = generateFnsRegistryFileSuffix(
		8,
		`${safeTaxOffice}_${clinicId}_${dateStamp}_${params.taxYear}_${params.certificateNumber}`,
	);
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

	const yearPayments = normalizePaymentsForTaxCertificate(
		params.payments,
		params.taxYear,
	);

	const licenseXml = params.clinic.licenseNumber
		? `\n    <Лицензия Номер="${escapeXml(params.clinic.licenseNumber)}"${params.clinic.licenseDate ? ` Дата="${escapeXml(params.clinic.licenseDate)}"` : ""} />`
		: "";

	const orgBlockXml = isIp
		? `  <СвМО ИННФЛ="${escapeXml(clinicInnClean)}" ОГРНИП="${escapeXml(clinicOgrnClean)}" НаимОрг="${escapeXml(params.clinic.legalName)}">${licenseXml}\n  </СвМО>`
		: `  <СвМО ИННЮЛ="${escapeXml(clinicInnClean)}" КПП="${escapeXml(clinicKppClean)}" НаимОрг="${escapeXml(params.clinic.legalName)}" ОГРН="${escapeXml(clinicOgrnClean)}">${licenseXml}\n  </СвМО>`;

	const payerDocSeriesNum = ((params.payer.identityDocumentSeries || "") + " " + (params.payer.identityDocumentNumber || "")).trim();
	const payerDocTag = payerDocSeriesNum
		? `\n        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml(payerDocSeriesNum)}" />`
		: "";

	const patientDocSeriesNum = ((params.patient.identityDocumentSeries || "") + " " + (params.patient.identityDocumentNumber || "")).trim();
	const patientDocTag = patientDocSeriesNum
		? `\n        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml(patientDocSeriesNum)}" />`
		: "";

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}" ВерсПрог="DenteCRM 1.0">
  <СвНО КодНО="${escapeXml(taxOfficeCode)}" />
${orgBlockXml}
  <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${params.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(params.signer.authorityDoc)}"` : ""} />
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" ОтчГод="${escapeXml(String(params.taxYear))}" НомКорр="0">
    <СведСправка НомерСвед="${escapeXml(params.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" ПрПациент="${escapeXml(rel.samePatientFlag)}">
      <СвФЛ ФИО="${escapeXml(params.payer.fullName)}"${params.payer.inn ? ` ИННФЛ="${escapeXml(params.payer.inn)}"` : ""}${payerBirthDateFormatted ? ` ДатаРожд="${escapeXml(payerBirthDateFormatted)}"` : ""}>${payerDocTag}
      </СвФЛ>
      ${
				rel.samePatientFlag === "0"
					? (patientDocTag
						? `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}"${params.patient.snils ? ` СНИЛС="${escapeXml(params.patient.snils.replace(/\D/g, ""))}"` : ""}>${patientDocTag}\n      </Пациент>`
						: `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}"${params.patient.snils ? ` СНИЛС="${escapeXml(params.patient.snils.replace(/\D/g, ""))}"` : ""} />`)
					: ""
			}
      <РасчетСумм>
        ${targetYearSummary.code01Kopecks > 0 || targetYearSummary.code02Kopecks === 0 ? `<СумОплМедУсл КодУслуги="1" СумОпл="${code01Str}" />` : ""}
        ${targetYearSummary.code02Kopecks > 0 ? `<СумОплМедУсл КодУслуги="2" СумОпл="${code02Str}" />` : ""}
        <СумОплВсего СумОпл="${totalStr}" />
      </РасчетСумм>
      <ДетализацияЧеков>
        ${yearPayments
					.map(
						(pay, idx) =>
							`<Чек НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаЧек="${escapeXml(pay.dateIso.slice(0, 10))}" Сумма="${pay.amountRub.toFixed(2)}" КодУслуги="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`
					)
					.join("\n        ")}
      </ДетализацияЧеков>
    </СведСправка>
  </Документ>
</Файл>`;

	return { fileName, fileId, xmlContent };
}
