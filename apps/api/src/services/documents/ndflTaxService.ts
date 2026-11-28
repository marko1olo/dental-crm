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
	formatDateKeyInTimeZone,
	type FnsFiscalReceiptItem,
	type FnsNdflPrintSigningOptions,
	type FnsNdflXmlResult,
	type FnsPreflightIssue,
	type FnsTaxPayload,
	generateFnsNdflPrintHtml,
	isDmsInsurancePayment,
	isNonMedicalGood,
	kopecksToNumericString,
	parseKopecks,
	resolveValidIanaTimeZone,
	rublesFromKopecks,
	rublesToKopecks,
	sumKopecks,
	validateFnsFiscalReceiptsChecksums,
	validateFnsNdflXmlStructure,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
} from "@dental/shared";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { getDocumentsByPatientId } from "../../db/documentQuery.js";
import { alreadyRefundedKopecksForPayment } from "../../documents/documentGuards/index.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { clinicTimeZone } from "../reports/managerReports/timezone.js";
export class TaxPayerRequisitesRequiredError extends Error {
	readonly statusCode = 422;
	readonly code = "TaxPayerRequisitesRequiredError";
	constructor(
		message = "Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
	) {
		super(message);
		this.name = "TaxPayerRequisitesRequiredError";
	}
}
export const TaxDeductionIdentificationRequiredError = TaxPayerRequisitesRequiredError;
export type TaxDeductionIdentificationRequiredError = TaxPayerRequisitesRequiredError;

export class NdflPatientNotFoundError extends Error {
	readonly statusCode = 404;
	readonly code = "PatientNotFoundError";
	constructor(message = "Пациент не найден в базе данных клиники.") {
		super(message);
		this.name = "NdflPatientNotFoundError";
	}
}

export class NdflInvalidDateRangeError extends Error {
	readonly statusCode = 400;
	readonly code = "InvalidDateRangeError";
	constructor(message = "Некорректный диапазон дат для расчета налогового вычета.") {
		super(message);
		this.name = "NdflInvalidDateRangeError";
	}
}

function isEntityAnonymous(entity: unknown): boolean {
	if (!entity || typeof entity !== "object") return false;
	return Boolean((entity as Record<string, unknown>).isAnonymous);
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
			throw new NdflPatientNotFoundError();
		}

		const isPatientAnonymous =
			isEntityAnonymous(patient) ||
			Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
			Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
			Boolean(
				(
					patient.administrativeProfile as Record<string, unknown> | undefined
				)?.["isAnonymous"],
			);

		if (isPatientAnonymous) {
			throw new TaxDeductionIdentificationRequiredError(
				"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
			);
		}

		const currentYear = new Date().getFullYear();
		const targetYear = options.taxYear || currentYear;

		let start: Date;
		let end: Date;

		if (options.startDate !== undefined || options.endDate !== undefined) {
			start = options.startDate
				? new Date(options.startDate)
				: new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
			end = options.endDate
				? new Date(options.endDate)
				: new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
			if (
				Number.isNaN(start.getTime()) ||
				Number.isNaN(end.getTime()) ||
				start.getTime() > end.getTime()
			) {
				throw new NdflInvalidDateRangeError();
			}
			if (
				options.endDate &&
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

		// 1. Проверка задолженности и анонимности (ст. 219 НК РФ, Приказ ФНС от 08.11.2023 № ЕА-7-11/824@)
		const patientBalanceKop = Reflect.get(patient, "balanceKopecks");
		const rawBalanceKop =
			typeof patientBalanceKop === "number"
				? patientBalanceKop
				: typeof patientBalanceKop === "bigint"
					? Number(patientBalanceKop)
					: parseKopecks(patient.balanceRub);
		const debtRub = rawBalanceKop < 0 ? rublesFromKopecks(Math.abs(rawBalanceKop)) : 0;
		let isBlocked = false;
		let blockReason: string | null = null;

		if (isPatientAnonymous) {
			isBlocked = true;
			blockReason =
				"Формирование справки для налогового вычета по форме КНД 1151156 для анонимных карт (UUID_ANON / isAnonymous) категорически запрещено по ст. 219 НК РФ и Приказу ФНС от 08.11.2023 № ЕА-7-11/824@ (отсутствуют обязательные паспортные данные и ИНН налогоплательщика).";
		}

		// 2. Получение оплат и выданных документов пациента (для учета частичных возвратов по ст. 219 НК РФ)
		const [allPayments, patientDocuments, rawClinicTimeZone] = await Promise.all([
			getPaymentsByPatientIdInDb(organizationId, patientId),
			getDocumentsByPatientId(organizationId, patientId),
			clinicTimeZone(organizationId),
		]);
		const resolvedClinicTimeZone = resolveValidIanaTimeZone(rawClinicTimeZone);

		const periodPayments = allPayments.filter((p) => {
			if (p.status !== "paid" && p.status !== "refunded") return false;
			const date = p.paidAt || p.createdAt;
			if (!date) return false;
			const paidTime = new Date(date).getTime();
			return paidTime >= start.getTime() && paidTime <= end.getTime();
		});

		let code1Kopecks = 0;
		let code2Kopecks = 0;
		let code1RefundKopecks = 0;
		let code2RefundKopecks = 0;
		let excludedNonMedicalKopecks = 0;
		let excludedNonMedicalCount = 0;
		let excludedDmsKopecks = 0;
		let excludedDmsCount = 0;

		const receipts: NdflTaxPreviewReceipt[] = [];

		for (const pay of periodPayments) {
			interface ReceiptItemLike {
				id?: string;
				name?: string;
				category?: string;
				code804n?: string;
				amountKopecks?: number;
				amountRub?: number | string;
				priceRub?: number;
				quantity?: number;
			}
			interface PaymentSplitMetadata {
				amountKopecks?: number | bigint | null;
				serviceName?: string;
				category?: string;
				code804n?: string;
				code1AmountKopecks?: number;
				code1AmountRub?: number;
				code2AmountKopecks?: number;
				code2AmountRub?: number;
				items?: ReceiptItemLike[];
				positions?: ReceiptItemLike[];
				serviceLines?: ReceiptItemLike[];
				fiscalReceipt?: { fd?: string; items?: ReceiptItemLike[] } | null;
			}
			const payMeta = pay as typeof pay & PaymentSplitMetadata;

			const serviceName =
				payMeta.serviceName || "Стоматологические медицинские услуги";
			const note = pay.note || "";
			const method = pay.method || "";
			let receiptDate = "";
			if (pay.paidAt) {
				const d = new Date(pay.paidAt);
				receiptDate = Number.isNaN(d.getTime()) ? "" : (d.toISOString().split("T")[0] || "");
			}
			const fiscalDocNum =
				pay.fiscalReceipt?.fd ||
				pay.fiscalReceiptNumber ||
				null;

			const rawAmountKop =
				typeof payMeta.amountKopecks === "bigint"
					? Number(payMeta.amountKopecks)
					: typeof payMeta.amountKopecks === "number"
						? Math.round(payMeta.amountKopecks)
						: parseKopecks(pay.amountRub);

			// Отрицательные кассовые возвраты (54-ФЗ возврат прихода) уменьшают сумму соответствующего кода вычета
			if (rawAmountKop < 0) {
				const absRefundKop = Math.abs(rawAmountKop);
				const deductionCode =
					pay.taxDeductionCode === "2" ||
					classifyNdflServiceCode(serviceName, payMeta.code804n) === "2"
						? "2"
						: "1";
				if (deductionCode === "2") {
					code2RefundKopecks += absRefundKop;
				} else {
					code1RefundKopecks += absRefundKop;
				}
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName: serviceName.toLowerCase().startsWith("возврат") ? serviceName : `Возврат средств: ${serviceName}`,
					deductionCode,
					amountRub: rublesFromKopecks(rawAmountKop),
					isExcluded: false,
				});
				continue;
			}

			// Положительные платежи со статусом 'refunded' всегда исключаются
			if (pay.status === "refunded") {
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName,
					deductionCode: "1",
					amountRub: rublesFromKopecks(rawAmountKop),
					isExcluded: true,
					exclusionReason: "Сумма по чеку полностью возвращена пациенту",
				});
				continue;
			}

			const alreadyRefundedKop = alreadyRefundedKopecksForPayment(
				pay.id,
				patientDocuments,
			);
			const amountKop = Math.max(0, rawAmountKop - alreadyRefundedKop);

			if (amountKop <= 0) {
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName,
					deductionCode: "1",
					amountRub: rublesFromKopecks(rawAmountKop),
					isExcluded: true,
					exclusionReason: "Сумма по чеку полностью возвращена пациенту (заявление на возврат)",
				});
				continue;
			}

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
					amountRub: rublesFromKopecks(amountKop),
					isExcluded: true,
					exclusionReason:
						"Оплата по договору ДМС со стороны страховой компании",
				});
				continue;
			}

			// Проверка на немедицинский товар
			if (isNonMedicalGood(serviceName, payMeta.category)) {
				excludedNonMedicalKopecks += amountKop;
				excludedNonMedicalCount += 1;
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName,
					deductionCode: "1",
					amountRub: rublesFromKopecks(amountKop),
					isExcluded: true,
					exclusionReason:
						"Сопутствующий товар (не является медицинской услугой по ст. 219 НК РФ)",
				});
				continue;
			}

			// [DOC-07 Fix]: Автоматическое разделение смешанного чека на Код 1 и Код 2 (ПП РФ №458)
			const c1Explicit = payMeta.code1AmountKopecks ?? (payMeta.code1AmountRub != null ? parseKopecks(payMeta.code1AmountRub) : undefined);
			const c2Explicit = payMeta.code2AmountKopecks ?? (payMeta.code2AmountRub != null ? parseKopecks(payMeta.code2AmountRub) : undefined);
			const items: ReceiptItemLike[] = payMeta.items || payMeta.positions || payMeta.serviceLines || payMeta.fiscalReceipt?.items || [];

			if (c1Explicit !== undefined || c2Explicit !== undefined) {
				// 1. Прямое указание сумм Код 1 и Код 2 с приведением к чистому оплаченному остатку amountKop
				const c1Raw = Math.max(0, c1Explicit ?? 0);
				const c2Raw = Math.max(0, c2Explicit ?? 0);
				let splitCode1Kop = 0;
				let splitCode2Kop = 0;
				if (c1Explicit !== undefined && c2Explicit !== undefined) {
					const explicitSum = c1Raw + c2Raw;
					if (explicitSum > amountKop && explicitSum > 0) {
						splitCode2Kop =
							c1Raw === 0
								? amountKop
								: Number((BigInt(c2Raw) * BigInt(amountKop)) / BigInt(explicitSum));
						splitCode1Kop = c1Raw > 0 ? amountKop - splitCode2Kop : 0;
					} else {
						splitCode1Kop = c1Raw;
						splitCode2Kop = c2Raw;
					}
				} else if (c1Explicit !== undefined) {
					splitCode1Kop = Math.min(c1Raw, amountKop);
					splitCode2Kop = Math.max(0, amountKop - splitCode1Kop);
				} else {
					splitCode2Kop = Math.min(c2Raw, amountKop);
					splitCode1Kop = Math.max(0, amountKop - splitCode2Kop);
				}

				if (splitCode1Kop > 0) {
					code1Kopecks += splitCode1Kop;
					receipts.push({
						id: `${pay.id}-code1`,
						receiptNumber: `${pay.fiscalReceiptNumber || pay.id.slice(0, 8)}/1`,
						fiscalDocumentNumber: fiscalDocNum,
						receiptDate,
						serviceName: `${serviceName} (Код 1: стандартное лечение)`,
						deductionCode: "1",
						amountRub: rublesFromKopecks(splitCode1Kop),
						isExcluded: false,
					});
				}
				if (splitCode2Kop > 0) {
					code2Kopecks += splitCode2Kop;
					receipts.push({
						id: `${pay.id}-code2`,
						receiptNumber: `${pay.fiscalReceiptNumber || pay.id.slice(0, 8)}/2`,
						fiscalDocumentNumber: fiscalDocNum,
						receiptDate,
						serviceName: `${serviceName} (Код 2: дорогостоящее лечение, ПП РФ №458)`,
						deductionCode: "2",
						amountRub: rublesFromKopecks(splitCode2Kop),
						isExcluded: false,
					});
				}
			} else if (items.length > 0) {
				// 2. Расщепление по детализированным позициям чека с исключением товаров и масштабированием при скидке/частичном возврате
				const medicalItems: Array<{
					idSuffix: string;
					name: string;
					code: "1" | "2";
					kop: number;
				}> = [];
				let medicalTotalKop = 0;

				for (const item of items) {
					const itemKop =
						typeof item.amountKopecks === "number"
							? item.amountKopecks
							: item.amountRub != null
								? parseKopecks(item.amountRub)
								: typeof item.priceRub === "number"
									? Number(
											(BigInt(parseKopecks(item.priceRub)) *
												BigInt(Math.round((item.quantity ?? 1) * 1000)) +
												500n) /
												1000n,
										)
									: 0;
					if (itemKop <= 0) continue;

					if (isNonMedicalGood(item.name, item.category)) {
						excludedNonMedicalKopecks += itemKop;
						excludedNonMedicalCount += 1;
						receipts.push({
							id: `${pay.id}-${item.id || item.name}`,
							receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
							fiscalDocumentNumber: fiscalDocNum,
							receiptDate,
							serviceName: item.name || "Сопутствующий товар",
							deductionCode: "1",
							amountRub: rublesFromKopecks(itemKop),
							isExcluded: true,
							exclusionReason: "Сопутствующий товар (ст. 219 НК РФ)",
						});
					} else {
						const itCode = classifyNdflServiceCode(item.name, item.code804n);
						medicalTotalKop += itemKop;
						medicalItems.push({
							idSuffix: item.id || item.name || "item",
							name: item.name || serviceName,
							code: itCode,
							kop: itemKop,
						});
					}
				}

				if (medicalItems.length > 0 && medicalTotalKop > 0) {
					let remainingTargetKop =
						medicalTotalKop > amountKop ? amountKop : medicalTotalKop;
					const shouldScale = medicalTotalKop > amountKop;
					for (let idx = 0; idx < medicalItems.length; idx++) {
						const entry = medicalItems[idx];
						if (!entry) continue;
						const scaledKop = shouldScale
							? idx === medicalItems.length - 1
								? Math.max(0, remainingTargetKop)
								: Number(
										(BigInt(entry.kop) * BigInt(amountKop)) /
											BigInt(medicalTotalKop),
									)
							: entry.kop;
						remainingTargetKop -= scaledKop;
						if (scaledKop <= 0) continue;
						if (entry.code === "2") {
							code2Kopecks += scaledKop;
						} else {
							code1Kopecks += scaledKop;
						}
						receipts.push({
							id: `${pay.id}-${entry.idSuffix}`,
							receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
							fiscalDocumentNumber: fiscalDocNum,
							receiptDate,
							serviceName: entry.name,
							deductionCode: entry.code,
							amountRub: rublesFromKopecks(scaledKop),
							isExcluded: false,
						});
					}
				}
			} else {
				// 3. Честная классификация чека целиком по номенклатуре и фискальным признакам (без syntax mining заметок)
				const deductionCode =
					pay.taxDeductionCode === "2" ||
					classifyNdflServiceCode(serviceName, payMeta.code804n) === "2"
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
					amountRub: rublesFromKopecks(amountKop),
					isExcluded: false,
				});
			}
		}

		const netCode1Kopecks = Math.max(0, code1Kopecks - code1RefundKopecks);
		const netCode2Kopecks = Math.max(0, code2Kopecks - code2RefundKopecks);
		const code1TotalRub = rublesFromKopecks(netCode1Kopecks);
		const code2TotalRub = rublesFromKopecks(netCode2Kopecks);
		const totalEligibleRub = rublesFromKopecks(
			netCode1Kopecks + netCode2Kopecks,
		);

		const code1LimitRub = targetYear >= 2024 ? 150000 : 120000;
		const code1LimitKopecks = rublesToKopecks(code1LimitRub);
		const code1EligibleKopecks = Math.min(netCode1Kopecks, code1LimitKopecks);
		const code1EligibleRub = rublesFromKopecks(code1EligibleKopecks);
		const totalTaxableKopecksBi =
			BigInt(code1EligibleKopecks) + BigInt(netCode2Kopecks);

		const refund13 = rublesFromKopecks(
			Number((totalTaxableKopecksBi * 13n + 50n) / 100n),
		);
		const refund15 = rublesFromKopecks(
			Number((totalTaxableKopecksBi * 15n + 50n) / 100n),
		);

		const validationIssues: FnsPreflightIssue[] = [];

		if (isBlocked && blockReason) {
			validationIssues.push({
				field: "patient.anonymous",
				message: blockReason,
				severity: "error",
			});
		}

		if (debtRub > 0) {
			validationIssues.push({
				field: "patient.debt",
				message: `У пациента имеется задолженность в размере ${debtRub.toFixed(2)} ₽. Справка для налогового вычета формируется исключительно на фактически оплаченные фискальные суммы за выбранный налоговый период.`,
				severity: "warning",
			});
		}

		if (receipts.filter((r) => !r.isExcluded).length === 0) {
			validationIssues.push({
				field: "receipts",
				message:
					"За указанный период нет оплаченных медицинских услуг для вычета",
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
	static generateXml(
		payload: FnsTaxPayload,
		customUuid?: string,
	): FnsNdflXmlResult {
		const payerName = payload.payer?.fullName?.family || "";
		const patientName = payload.patient?.fullName?.family || "";
		const isAnonymous =
			payerName.startsWith("UUID_ANON") ||
			payerName.toLowerCase().includes("аноним") ||
			patientName.startsWith("UUID_ANON") ||
			patientName.toLowerCase().includes("аноним") ||
			isEntityAnonymous(payload.patient) ||
			isEntityAnonymous(payload.payer);

		if (isAnonymous) {
			throw new TaxDeductionIdentificationRequiredError(
				"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
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
