/**
 * ============================================================================
 * DENTE Dental CRM — Family Tax Deduction Batch Engine (КНД 1151156 / 1184043)
 * Implements FNS Order № ЕА-7-11/824@ family batch processing:
 * - Multi-member tax period package (Patient, Spouse, Parents, Children).
 * - Exact kopeck aggregation per family member without floating point drift.
 * - Multi-page museum-grade A4 printable HTML document.
 * - FNS electronic registry batch generation (NO_MEDOPL 5.01 / UT_SVOPLMEDUSL 5.01).
 * ============================================================================
 */

import { escapeXml } from "../cda/c14n.js";
import { kopecksToRub } from "./kopecksArithmetic.js";
import {
	calculateTaxDeductionSummary,
	extractTaxYearFromDate,
	normalizePaymentsForTaxCertificate,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionBatchParams,
	type TaxDeductionCertificateParams,
	type TaxDeductionClinicParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionPersonParams,
	type TaxDeductionRelationship,
} from "../finance/taxDeduction.js";
import { renderOfficialTaxCertificateKnd1151156Html } from "./fnsTaxDeductionEngine.js";
import { generateFnsRegistryFileSuffix } from "../utils/idGenerators.js";
import {
	buildFnsKnd1151156Xml,
	mapCertificateParamsToFnsTaxPayload,
} from "../documents/ndflXmlGenerator.js";

export interface FamilyMemberPayerConfig {
	readonly id: string;
	readonly relationship: TaxDeductionRelationship;
	readonly person: TaxDeductionPersonParams;
}

export interface GenerateFamilyTaxDeductionBatchOptions {
	readonly clinic: TaxDeductionClinicParams;
	readonly taxYear: number;
	readonly taxOfficeCode?: string | undefined;
	readonly patient: TaxDeductionPersonParams;
	readonly familyMembers?: readonly FamilyMemberPayerConfig[] | undefined;
	readonly payments: readonly TaxDeductionPaymentItem[];
	readonly startCertificateNumber?: number | string | undefined;
	readonly issueDateIso?: string | undefined;
	readonly signer?: {
		readonly signerType?: "1" | "2" | undefined;
		readonly fullName?: string | undefined;
		readonly authorityDoc?: string | undefined;
	} | undefined;
}

export interface FamilyMemberBatchCertificateSummary {
	readonly relationship: TaxDeductionRelationship;
	readonly relationshipLabelRu: string;
	readonly payerFullName: string;
	readonly certificateNumber: string;
	readonly code01Rub: number;
	readonly code01Kopecks: number;
	readonly code02Rub: number;
	readonly code02Kopecks: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly refund13EstimateRub: number;
	readonly refund13EstimateKopecks: number;
	readonly receiptsCount: number;
	readonly certificate: TaxDeductionCertificateParams;
}

export interface FamilyTaxDeductionBatchResult {
	readonly batch: TaxDeductionBatchParams;
	readonly summaries: readonly FamilyMemberBatchCertificateSummary[];
	readonly grandTotalRub: number;
	readonly grandTotalKopecks: number;
	readonly grandTotalCode01Rub: number;
	readonly grandTotalCode01Kopecks: number;
	readonly grandTotalCode02Rub: number;
	readonly grandTotalCode02Kopecks: number;
	readonly grandTotalRefund13Rub: number;
	readonly grandTotalRefund13Kopecks: number;
	readonly grandTotalRefund15Rub: number;
	readonly grandTotalRefund15Kopecks: number;
	readonly certificatesCount: number;
	readonly totalPaymentsCount: number;
}

/**
 * Группировка платежей по членам семьи (пациент, супруг, родители, дети)
 * и автоматическое создание пакета справок за налоговый период с копеечной точностью.
 */
export function generateFamilyTaxDeductionBatch(
	options: GenerateFamilyTaxDeductionBatchOptions
): FamilyTaxDeductionBatchResult {
	const issueDateIso = options.issueDateIso || new Date().toISOString();
	const taxOfficeCode = options.taxOfficeCode || "7701";
	const yearPayments = options.payments.filter((p) => {
		const year = extractTaxYearFromDate(p.dateIso);
		return year === options.taxYear;
	});

	// Группировка платежей по степени родства плательщика
	const paymentsByRel = new Map<TaxDeductionRelationship, TaxDeductionPaymentItem[]>();
	for (const p of yearPayments) {
		const rel: TaxDeductionRelationship = p.payerRelationship || "patient";
		const list = paymentsByRel.get(rel) || [];
		list.push(p);
		paymentsByRel.set(rel, list);
	}

	// Если платежей нет вообще, создаем пустую запись для пациента
	if (paymentsByRel.size === 0) {
		paymentsByRel.set("patient", []);
	}

	const orderOfRelationships: TaxDeductionRelationship[] = ["patient", "spouse", "parent", "child"];
	const certificates: TaxDeductionCertificateParams[] = [];
	const summaries: FamilyMemberBatchCertificateSummary[] = [];

	let certCounter = typeof options.startCertificateNumber === "number"
		? options.startCertificateNumber
		: typeof options.startCertificateNumber === "string" && /^\d+$/.test(options.startCertificateNumber)
			? parseInt(options.startCertificateNumber, 10)
			: 1;

	let grandTotalCode01Kop = 0;
	let grandTotalCode02Kop = 0;
	let grandTotalRefund13Kop = 0;
	let grandTotalRefund15Kop = 0;
	let totalPaymentsCount = 0;

	for (const rel of orderOfRelationships) {
		const relPayments = paymentsByRel.get(rel);
		if (!relPayments || (relPayments.length === 0 && paymentsByRel.size > 1)) {
			continue;
		}

		// Поиск плательщика в переданном списке членов семьи
		const memberConfig = options.familyMembers?.find((m) => m.relationship === rel);
		const payerPerson: TaxDeductionPersonParams =
			rel === "patient"
				? options.patient
				: memberConfig?.person || {
						fullName: `Плательщик (${TAX_DEDUCTION_RELATIONSHIP_MAP[rel].shortLabelRu})`,
					};

		const certNum = String(certCounter++);
		const normalizedPayments = normalizePaymentsForTaxCertificate(relPayments, options.taxYear);
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: certNum,
			issueDateIso,
			taxYear: options.taxYear,
			taxOfficeCode,
			clinic: options.clinic,
			payer: {
				...payerPerson,
				relationship: rel,
			},
			patient: options.patient,
			payments: normalizedPayments,
			signer: options.signer,
		};

		certificates.push(certParams);

		const summary = calculateTaxDeductionSummary(normalizedPayments);
		const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === options.taxYear) || {
			code01Kopecks: 0,
			code01Rub: 0,
			code02Kopecks: 0,
			code02Rub: 0,
			totalKopecks: 0,
			totalRub: 0,
			refund13EstimateKopecks: 0,
			refund13EstimateRub: 0,
			refund15EstimateKopecks: 0,
			refund15EstimateRub: 0,
			receiptsCount: 0,
		};

		grandTotalCode01Kop += targetYearSummary.code01Kopecks;
		grandTotalCode02Kop += targetYearSummary.code02Kopecks;
		grandTotalRefund13Kop += targetYearSummary.refund13EstimateKopecks;
		grandTotalRefund15Kop += targetYearSummary.refund15EstimateKopecks;
		totalPaymentsCount += relPayments.length;

		summaries.push({
			relationship: rel,
			relationshipLabelRu: TAX_DEDUCTION_RELATIONSHIP_MAP[rel].labelRu,
			payerFullName: payerPerson.fullName,
			certificateNumber: certNum,
			code01Rub: targetYearSummary.code01Rub,
			code01Kopecks: targetYearSummary.code01Kopecks,
			code02Rub: targetYearSummary.code02Rub,
			code02Kopecks: targetYearSummary.code02Kopecks,
			totalRub: targetYearSummary.totalRub,
			totalKopecks: targetYearSummary.totalKopecks,
			refund13EstimateRub: targetYearSummary.refund13EstimateRub,
			refund13EstimateKopecks: targetYearSummary.refund13EstimateKopecks,
			receiptsCount: relPayments.length,
			certificate: certParams,
		});
	}

	const grandTotalKop = grandTotalCode01Kop + grandTotalCode02Kop;

	const batch: TaxDeductionBatchParams = {
		taxYear: options.taxYear,
		taxOfficeCode,
		clinic: options.clinic,
		certificates,
		signer: options.signer,
	};

	return {
		batch,
		summaries,
		grandTotalRub: kopecksToRub(grandTotalKop),
		grandTotalKopecks: grandTotalKop,
		grandTotalCode01Rub: kopecksToRub(grandTotalCode01Kop),
		grandTotalCode01Kopecks: grandTotalCode01Kop,
		grandTotalCode02Rub: kopecksToRub(grandTotalCode02Kop),
		grandTotalCode02Kopecks: grandTotalCode02Kop,
		grandTotalRefund13Rub: kopecksToRub(grandTotalRefund13Kop),
		grandTotalRefund13Kopecks: grandTotalRefund13Kop,
		grandTotalRefund15Rub: kopecksToRub(grandTotalRefund15Kop),
		grandTotalRefund15Kopecks: grandTotalRefund15Kop,
		certificatesCount: certificates.length,
		totalPaymentsCount,
	};
}

/**
 * Генерация объединенной печатной формы пакета справок КНД 1151156 (А4)
 * для пациента и членов его семьи (супруг, родители, дети).
 * Формирует чистый многостраничный HTML с постраничным разрывом.
 */
export function renderOfficialTaxCertificateBatchKnd1151156Html(
	batch: TaxDeductionBatchParams,
): string {
	const renderedPages = batch.certificates.map((cert) => {
		const fullHtml = renderOfficialTaxCertificateKnd1151156Html(cert);
		const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		const innerBody = bodyMatch ? bodyMatch[1] : fullHtml;
		return `<div class="cert-page">${innerBody}</div>`;
	});

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Пакет справок КНД 1151156 за ${batch.taxYear} год (${batch.certificates.length} шт.)</title>
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
			padding: 0;
			background: #fff;
		}
		.cert-page {
			padding: 10px 20px;
			page-break-after: always;
			box-sizing: border-box;
		}
		.cert-page:last-child {
			page-break-after: auto;
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
			.cert-page { padding: 0; }
		}
	</style>
</head>
<body>
	${renderedPages.join("\n")}
</body>
</html>`;
}

/**
 * Генерация электронного файла NO_MEDOPL (версия 5.01, КНД 1184043) для пакетной
 * отправки справок по нескольким налогоплательщикам/пациентам через ТКС.
 * Реализует официальный канонический формат ФНС (Приказ ЕА-7-11/824@).
 */
export function generateFnsBatchNoMedoplXml(batch: TaxDeductionBatchParams): {
	readonly fileName: string;
	readonly fileId: string;
	readonly xmlContent: string;
	readonly certificatesCount: number;
} {
	if (!batch.certificates || batch.certificates.length === 0) {
		throw new Error("Пакет налоговых справок пуст");
	}
	const primaryCert = batch.certificates[0]!;
	const primaryPayload = mapCertificateParamsToFnsTaxPayload(primaryCert, "NO_MEDOPL");
	const firstRes = buildFnsKnd1151156Xml(primaryPayload);

	if (batch.certificates.length === 1) {
		return {
			fileName: firstRes.fileName,
			fileId: firstRes.fileId,
			certificatesCount: 1,
			xmlContent: firstRes.xmlContent,
		};
	}

	const docBlocks: string[] = [];
	for (const cert of batch.certificates) {
		const payload = mapCertificateParamsToFnsTaxPayload(cert, "NO_MEDOPL");
		const res = buildFnsKnd1151156Xml(payload);
		const match = res.xmlContent.match(/<Документ[\s\S]*?<\/Документ>/);
		if (match) {
			docBlocks.push(match[0]);
		}
	}

	const batchXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Файл ИдФайл="${firstRes.fileId}" ВерсПрог="Dente_FNS_Gateway_v1.0.0" ВерсФорм="5.01">\n${docBlocks.join("\n")}\n</Файл>`;

	return {
		fileName: firstRes.fileName,
		fileId: firstRes.fileId,
		certificatesCount: batch.certificates.length,
		xmlContent: batchXml,
	};
}
