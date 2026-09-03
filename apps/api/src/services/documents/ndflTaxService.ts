/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS TAX DEDUCTION & XML EDO SERVICE (КНД 1151156 / КНД 1184043)
 * Form KND 1151156 / Electronic Format UT_SVOPLMEDUSL / NO_MEDOPL 5.01
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements:
 * - Feature #33 (документы::выгрузка_справки_ндфл_в_xml_для_эдо)
 * - Feature #5 (документы::калькулятор_ндфл_с_блокировкой)
 *
 * Statutory references:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
 * - XSD-схема ФНС: UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd (Версия 5.01)
 * - Ст. 219 НК РФ (социальный налоговый вычет за медицинские услуги)
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Дорогостоящее лечение — Код 02)
 */

import {
	buildFnsKnd1151156Xml,
	classifyNdflServiceCode,
	generateFnsNdflPrintHtml,
	isDmsInsurancePayment,
	isNonMedicalGood,
	kopecksToNumericString,
	parseKopecks,
	rublesFromKopecks,
	sumKopecks,
	validateFnsFiscalReceiptsChecksums,
	validateFnsNdflXmlStructure,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
	type FnsFiscalReceiptItem,
	type FnsNdflPrintSigningOptions,
	type FnsNdflXmlResult,
	type FnsPreflightIssue,
	type FnsTaxPayload,
} from "@dental/shared";
import { Decimal } from "decimal.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
export class Decree659TaxDeductionForbiddenError extends Error {
	readonly statusCode = 422;
	readonly code = "Decree659TaxDeductionForbiddenError";
	constructor(message: string) {
		super(message);
		this.name = "Decree659TaxDeductionForbiddenError";
	}
}

export interface NdflTaxPreviewOptions {
	taxYear?: number | undefined;
	startDate?: string | undefined;
	endDate?: string | undefined;
	payerInn?: string | undefined;
	payerFullName?: string | undefined;
	payerRelationship?: string | undefined;
}

export interface NdflTaxPreviewReceipt {
	id: string;
	receiptNumber: string;
	fiscalDocumentNumber?: string | null | undefined;
	receiptDate: string;
	serviceName: string;
	deductionCode: "1" | "2";
	amountRub: number;
	isExcluded: boolean;
	exclusionReason?: string | null | undefined;
}

export interface NdflTaxPreviewResult {
	patientId: string;
	patientFullName: string;
	taxYear: number;
	startDate: string;
	endDate: string;
	isBlocked: boolean;
	blockReason: string | null;
	debtRub: number;
	code1TotalRub: number;
	code2TotalRub: number;
	totalEligibleRub: number;
	code1LimitRub: number;
	code1EligibleRub: number;
	estimatedRefund13Rub: number;
	estimatedRefund15Rub: number;
	excludedNonMedicalGoodsRub: number;
	excludedNonMedicalCount: number;
	excludedDmsInsuranceRub: number;
	excludedDmsCount: number;
	receipts: NdflTaxPreviewReceipt[];
	validationIssues: FnsPreflightIssue[];
}

export class NdflTaxService {
	/**
	 * Расчет предварительных сумм по Коду 1 vs Коду 2 с анти-аномальным контролем (Фича №5).
	 */
	static async calculatePreview(
		organizationId: string,
		patientId: string,
		options: NdflTaxPreviewOptions = {},
	): Promise<NdflTaxPreviewResult> {
		const patient = await getPatientByIdFromDb(organizationId, patientId);
		if (!patient) {
			throw new Error("Пациент не найден в базе данных клиники.");
		}

		const isPatientAnonymous =
			Boolean((patient as unknown as { isAnonymous?: boolean }).isAnonymous) ||
			Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
			Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
			Boolean((patient.administrativeProfile as Record<string, unknown> | undefined)?.["isAnonymous"]);

		if (isPatientAnonymous) {
			throw new Decree659TaxDeductionForbiddenError(
				"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 219 НК РФ: формирование справки для налогового вычета (КНД 1151156 / 3-НДФЛ) для анонимных карт (UUID_ANON / isAnonymous) категорически запрещено.",
			);
		}

		const currentYear = new Date().getFullYear();
		const targetYear = options.taxYear || currentYear;

		let start: Date;
		let end: Date;

		if (options.startDate && options.endDate) {
			start = new Date(options.startDate);
			end = new Date(options.endDate);
			if (
				end.getUTCHours() === 0 &&
				end.getUTCMinutes() === 0 &&
				end.getUTCSeconds() === 0
			) {
				end = new Date(end.getTime() + 86_399_999);
			}
		} else {
			start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
			end = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
		}

		// 1. Проверка блокировки по долгу (Фича №5) (ст. 219 НК РФ)
		const debtRub = patient.balanceRub < 0 ? Math.abs(patient.balanceRub) : 0;
		let isBlocked = debtRub > 0;
		let blockReason = isBlocked
			? `Имеется непогашенная задолженность пациента в размере ${debtRub.toFixed(2)} ₽. Выдача справки для налогового вычета блокируется до полной оплаты оказанных услуг.`
			: null;

		if (isPatientAnonymous) {
			isBlocked = true;
			blockReason =
				"Формирование справки для налогового вычета по форме КНД 1151156 для анонимных карт (UUID_ANON / isAnonymous) категорически запрещено по ст. 219 НК РФ, Приказу ФНС от 08.11.2023 № ЕА-7-11/824@ и ПП РФ №659 (отсутствуют обязательные паспортные данные и ИНН налогоплательщика).";
		}

		// 2. Получение оплат пациента
		const allPayments = await getPaymentsByPatientIdInDb(organizationId, patientId);

		const periodPayments = allPayments.filter((p) => {
			if (p.status !== "paid" || !p.paidAt) return false;
			const paidTime = new Date(p.paidAt).getTime();
			return paidTime >= start.getTime() && paidTime <= end.getTime();
		});

		let code1Kopecks = 0;
		let code2Kopecks = 0;
		let excludedNonMedicalKopecks = 0;
		let excludedNonMedicalCount = 0;
		let excludedDmsKopecks = 0;
		let excludedDmsCount = 0;

		const receipts: NdflTaxPreviewReceipt[] = [];

		for (const pay of periodPayments) {
			const payAny = pay as unknown as {
				serviceName?: string;
				category?: string;
				code804n?: string;
			};

			const amountKop = parseKopecks(pay.amountRub);
			const serviceName = payAny.serviceName || "Стоматологические медицинские услуги";
			const note = pay.note || "";
			const method = pay.method || "";
			const receiptDate = pay.paidAt ? new Date(pay.paidAt).toISOString().split("T")[0] || "" : "";
			const fiscalDocNum = (pay as Record<string, any>).fiscalReceipt?.fd || (pay as Record<string, any>).fiscalReceiptNumber || null;


			// Проверка на ДМС
			if (isDmsInsurancePayment(method, note)) {
				excludedDmsKopecks += amountKop;
				excludedDmsCount += 1;
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName,
					deductionCode: "1",
					amountRub: pay.amountRub,
					isExcluded: true,
					exclusionReason: "Оплата по договору ДМС со стороны страховой компании",
				});
				continue;
			}

			// Проверка на немедицинский товар
			if (isNonMedicalGood(serviceName, payAny.category)) {
				excludedNonMedicalKopecks += amountKop;
				excludedNonMedicalCount += 1;
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName,
					deductionCode: "1",
					amountRub: pay.amountRub,
					isExcluded: true,
					exclusionReason: "Сопутствующий товар (не является медицинской услугой по ст. 219 НК РФ)",
				});
				continue;
			}

			// Классификация Код 1 vs Код 2
			const deductionCode =
				pay.taxDeductionCode === "2" ||
				classifyNdflServiceCode(serviceName, payAny.code804n) === "2"
					? "2"
					: "1";

			if (deductionCode === "2") {
				code2Kopecks += amountKop;
			} else {
				code1Kopecks += amountKop;
			}

			receipts.push({
				id: pay.id,
				receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
				fiscalDocumentNumber: fiscalDocNum,
				receiptDate,
				serviceName,
				deductionCode,
				amountRub: pay.amountRub,
				isExcluded: false,
			});
		}


		const code1TotalRub = rublesFromKopecks(code1Kopecks);
		const code2TotalRub = rublesFromKopecks(code2Kopecks);
		const totalEligibleRub = new Decimal(code1TotalRub).plus(code2TotalRub).toNumber();

		const code1LimitRub = targetYear >= 2024 ? 150000 : 120000;
		const code1EligibleRub = Math.min(code1TotalRub, code1LimitRub);

		const refund13 = new Decimal(code1EligibleRub)
			.times(0.13)
			.plus(new Decimal(code2TotalRub).times(0.13))
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
			.toNumber();

		const refund15 = new Decimal(code1EligibleRub)
			.times(0.15)
			.plus(new Decimal(code2TotalRub).times(0.15))
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
			.toNumber();

		const validationIssues: FnsPreflightIssue[] = [];

		if (isBlocked && blockReason) {
			validationIssues.push({
				field: "patient.debt",
				message: blockReason,
				severity: "error",
			});
		}

		if (receipts.filter((r) => !r.isExcluded).length === 0) {
			validationIssues.push({
				field: "receipts",
				message: "За указанный период нет оплаченных медицинских услуг для вычета",
				severity: "warning",
			});
		}

		return {
			patientId,
			patientFullName: patient.fullName,
			taxYear: targetYear,
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			isBlocked,
			blockReason,
			debtRub,
			code1TotalRub,
			code2TotalRub,
			totalEligibleRub,
			code1LimitRub,
			code1EligibleRub,
			estimatedRefund13Rub: refund13,
			estimatedRefund15Rub: refund15,
			excludedNonMedicalGoodsRub: rublesFromKopecks(excludedNonMedicalKopecks),
			excludedNonMedicalCount,
			excludedDmsInsuranceRub: rublesFromKopecks(excludedDmsKopecks),
			excludedDmsCount,
			receipts,
			validationIssues,
		};
	}

	/**
	 * Генерация XML-справки КНД 1184043 / 1151156 для ЭДО (Фича №33).
	 */
	static generateXml(payload: FnsTaxPayload, customUuid?: string): FnsNdflXmlResult {
		const payerName = payload.payer?.fullName?.family || "";
		const patientName = payload.patient?.fullName?.family || "";
		const isAnonymous =
			payerName.startsWith("UUID_ANON") ||
			payerName.toLowerCase().includes("аноним") ||
			patientName.startsWith("UUID_ANON") ||
			patientName.toLowerCase().includes("аноним") ||
			Boolean((payload.patient as unknown as { isAnonymous?: boolean })?.isAnonymous) ||
			Boolean((payload.payer as unknown as { isAnonymous?: boolean })?.isAnonymous);

		if (isAnonymous) {
			throw new Decree659TaxDeductionForbiddenError(
				"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 219 НК РФ: формирование справок для налогового вычета по форме КНД 1151156 (и XML КНД 1184043) для анонимных карт (UUID_ANON / isAnonymous) категорически запрещено.",
			);
		}

		const result = buildFnsKnd1151156Xml(payload, customUuid);
		const validation = validateFnsNdflXmlStructure(result.xmlContent);

		if (!validation.isValid) {
			result.isValidForSubmission = false;
			for (const err of validation.errors) {
				result.preflightIssues.push({
					field: "xml.structure",
					message: err,
					severity: "error",
				});
			}
		}

		// Валидация контрольных сумм и целостности фискальных чеков
		const checksumValidation = validateFnsFiscalReceiptsChecksums(payload);
		if (!checksumValidation.isValid) {
			result.isValidForSubmission = false;
			for (const err of checksumValidation.errors) {
				result.preflightIssues.push({
					field: "receipts.checksum",
					message: err,
					severity: "error",
				});
			}
		}

		return result;
	}

	/**
	 * Рендеринг официальной печатной формы КНД 1151156 с автоматическим нанесением синего штампа УКЭП.
	 */
	static renderCertificatePrintHtml(
		payload: FnsTaxPayload,
		signingOptions?: FnsNdflPrintSigningOptions | boolean | undefined,
	): string {
		return generateFnsNdflPrintHtml(payload, signingOptions);
	}
}
