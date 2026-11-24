/**
 * fiscal54fzModules/receiptCompiler.ts — Pure Decimal/Kopeck Compilation & QR/OFD Builders.
 */

import { Decimal } from "decimal.js";
import {
	type AnatomicalCanalCount,
	buildFfd12Tag2000MarkingPayload,
	calculateEndodonticCompositeTreatment,
	FFD12_TAG_1173_CORRECTION_CODES,
	getAnatomicalRootCanalCount,
	getOrder804nEndoProcedureForTooth,
	isMultiRootedTooth,
	kopecksToNumericString,
	type Kopecks,
	multiplyKopecks,
	multiplyKopecksFractional,
	parseChestnyZnakDataMatrix,
} from "@dental/shared";
import { FiscalReceiptFactory } from "../../kkt/FiscalReceiptFactory.js";
import {
	type BuildFiscalReceiptInput,
	type CompiledFiscal54FzReceipt,
	Fiscal54FzValidationError,
	MINZDRAV_804N_CODE_REGEX,
	MINZDRAV_804N_COMMON_CATALOG,
	type MultiTenderPaymentSplitInput,
	type NormalizedFiscalPosition,
	type NormalizedMultiTenderPayments,
} from "./typesAndCatalog.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function rubToKopecksDecimal(rub: number | Decimal): number {
	const dec = rub instanceof Decimal ? rub : new Decimal(rub);
	if (!dec.isFinite()) {
		throw new Fiscal54FzValidationError("InvalidAmount", "Сумма в рублях должна быть конечным числом.");
	}
	return dec.times(100).round().toNumber();
}

export function kopecksToRubDecimal(kopecks: number): number {
	if (!Number.isFinite(kopecks)) {
		throw new Fiscal54FzValidationError("InvalidKopecks", "Сумма в копейках должна быть конечным целым числом.");
	}
	return new Decimal(kopecks).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function formatTag1030SubjectName(name: string, medicalServiceCode804n?: string | null): string {
	let clean = name.replace(/[\x00-\x1F\x7F]/g, " ").trim();
	if (!clean) {
		clean = "Медицинская стоматологическая услуга";
	}

	if (medicalServiceCode804n && MINZDRAV_804N_CODE_REGEX.test(medicalServiceCode804n.trim())) {
		const prefix = `[${medicalServiceCode804n.trim()}] `;
		if (!clean.startsWith(prefix) && !clean.includes(medicalServiceCode804n.trim())) {
			clean = `${prefix}${clean}`;
		}
	}

	if (clean.length > 128) {
		clean = clean.slice(0, 125).trimEnd() + "...";
	}

	return clean;
}

export function resolveEndodonticOrder804nItem(
	fdiNumber: number,
	canalCountOverride?: AnatomicalCanalCount | null,
) {
	const canals = (canalCountOverride ?? getAnatomicalRootCanalCount(fdiNumber)) as AnatomicalCanalCount;
	const composite = calculateEndodonticCompositeTreatment(fdiNumber, {
		clinicalCanalCount: canals,
	});
	const pkg = getOrder804nEndoProcedureForTooth(fdiNumber, canals);

	return {
		fdiNumber,
		canalCount: canals,
		isMultiRooted: isMultiRootedTooth(fdiNumber) || canals >= 2,
		packageItem: pkg,
		compositeDetails: composite,
	};
}

export function compileMultiTenderPayments(
	tenderSplits: MultiTenderPaymentSplitInput,
): NormalizedMultiTenderPayments {
	const cashKopecks = tenderSplits.cashRub !== undefined ? rubToKopecksDecimal(tenderSplits.cashRub) : 0;
	const sberCardKopecks = tenderSplits.electronicCardRub !== undefined ? rubToKopecksDecimal(tenderSplits.electronicCardRub) : 0;
	const sberPayQrKopecks = tenderSplits.sberPayQrRub !== undefined ? rubToKopecksDecimal(tenderSplits.sberPayQrRub) : 0;
	const advanceOffsetKopecks = tenderSplits.advanceOffsetRub !== undefined ? rubToKopecksDecimal(tenderSplits.advanceOffsetRub) : 0;
	const creditPostpaymentKopecks = tenderSplits.creditPostpaymentRub !== undefined ? rubToKopecksDecimal(tenderSplits.creditPostpaymentRub) : 0;
	const counterProvisionKopecks = tenderSplits.counterProvisionRub !== undefined ? rubToKopecksDecimal(tenderSplits.counterProvisionRub) : 0;

	if (
		cashKopecks < 0 ||
		sberCardKopecks < 0 ||
		sberPayQrKopecks < 0 ||
		advanceOffsetKopecks < 0 ||
		creditPostpaymentKopecks < 0 ||
		counterProvisionKopecks < 0
	) {
		throw new Fiscal54FzValidationError(
			"NegativePaymentTender",
			"Суммы видов оплат не могут быть отрицательными.",
		);
	}

	const electronicKopecks = sberCardKopecks + sberPayQrKopecks;
	const totalPaymentsKopecks =
		cashKopecks +
		electronicKopecks +
		advanceOffsetKopecks +
		creditPostpaymentKopecks +
		counterProvisionKopecks;

	return {
		tag1031_cashKopecks: cashKopecks,
		tag1031_cashRub: kopecksToRubDecimal(cashKopecks),
		tag1031_cashRubString: kopecksToNumericString(cashKopecks),
		tag1081_electronicKopecks: electronicKopecks,
		tag1081_electronicRub: kopecksToRubDecimal(electronicKopecks),
		tag1081_electronicRubString: kopecksToNumericString(electronicKopecks),
		sberCardKopecks,
		sberPayQrKopecks,
		tag1215_advanceOffsetKopecks: advanceOffsetKopecks,
		tag1215_advanceOffsetRub: kopecksToRubDecimal(advanceOffsetKopecks),
		tag1215_advanceOffsetRubString: kopecksToNumericString(advanceOffsetKopecks),
		tag1216_creditPostpaymentKopecks: creditPostpaymentKopecks,
		tag1216_creditPostpaymentRub: kopecksToRubDecimal(creditPostpaymentKopecks),
		tag1217_counterProvisionKopecks: counterProvisionKopecks,
		tag1217_counterProvisionRub: kopecksToRubDecimal(counterProvisionKopecks),
		totalPaymentsKopecks,
		totalPaymentsRub: kopecksToRubDecimal(totalPaymentsKopecks),
		totalPaymentsRubString: kopecksToNumericString(totalPaymentsKopecks),
	};
}

export function buildStatutoryFiscalReceipt(
	input: BuildFiscalReceiptInput,
): CompiledFiscal54FzReceipt {
	if (!input.positions || input.positions.length === 0) {
		throw new Fiscal54FzValidationError(
			"EmptyPositions",
			"Чек по 54-ФЗ должен содержать как минимум одну позицию номенклатуры.",
		);
	}

	const defaultMethod = input.defaultCalculationMethod ?? "full_payment";
	const operationType = input.operationType ?? "income";
	const taxationSystem = input.taxationSystem ?? "usn_income";

	let totalItemsKopecks = 0;
	let hasCode2ExpensiveTreatment = false;

	const normalizedItems: NormalizedFiscalPosition[] = input.positions.map((pos, index) => {
		if (!pos.name || pos.name.trim().length === 0) {
			throw new Fiscal54FzValidationError(
				"InvalidPositionName",
				`Позиция №${index + 1} не имеет наименования.`,
			);
		}
		if (pos.quantity <= 0) {
			throw new Fiscal54FzValidationError(
				"InvalidQuantity",
				`Количество позиции «${pos.name}» должно быть строго больше нуля.`,
			);
		}
		const priceKopecks = rubToKopecksDecimal(pos.priceRub);
		if (priceKopecks <= 0) {
			throw new Fiscal54FzValidationError(
				"InvalidPrice",
				`Цена позиции «${pos.name}» должна быть строго больше нуля.`,
			);
		}

		const amountKopecks = Number.isInteger(pos.quantity)
			? multiplyKopecks(priceKopecks as Kopecks, pos.quantity)
			: multiplyKopecksFractional(priceKopecks as Kopecks, pos.quantity);
		totalItemsKopecks += amountKopecks;

		const subject =
			pos.subject ??
			(pos.markingCode ? "goods_with_marking" : pos.name.toLowerCase().includes("аванс") ? "payment" : "service");
		const method = pos.method ?? defaultMethod;
		const vatRate = pos.vatRate ?? "vat_none";
		const measure = pos.measure ?? "piece";

		let code804n = pos.medicalServiceCode804n ?? null;
		if (!code804n && pos.toothFdiNumber) {
			const endo = resolveEndodonticOrder804nItem(pos.toothFdiNumber, pos.canalCount);
			code804n = endo.packageItem.code;
		}

		const tag1030 = formatTag1030SubjectName(pos.name, code804n);

		let taxCat: "1" | "2" = pos.taxDeductionCategory ?? "1";
		if (
			pos.name.toLowerCase().includes("имплантац") ||
			pos.name.toLowerCase().includes("синус-лифтинг") ||
			pos.name.toLowerCase().includes("костная пластика") ||
			(code804n && MINZDRAV_804N_COMMON_CATALOG[code804n]?.expensiveCode2)
		) {
			taxCat = "2";
			hasCode2ExpensiveTreatment = true;
		}

		let markingPayload: NormalizedFiscalPosition["tag2000_markingPayload"] = null;
		if (pos.markingCode && pos.markingCode.trim().length > 0) {
			const parsedMarking = parseChestnyZnakDataMatrix(pos.markingCode);
			if (!parsedMarking.isValid || !parsedMarking.gtin || !parsedMarking.serialNumber) {
				throw new Fiscal54FzValidationError(
					"InvalidMarkingCode",
					`Некорректный код маркировки Честный ЗНАК для позиции «${pos.name}»: ${parsedMarking.errorMessage || "ошибка валидации"}`,
				);
			}
			markingPayload = buildFfd12Tag2000MarkingPayload({
				rawDataMatrix: pos.markingCode,
				gtin: parsedMarking.gtin,
				serialNumber: parsedMarking.serialNumber,
				cryptoKey: parsedMarking.cryptoKey,
				cryptoTail: parsedMarking.cryptoTail,
			});
		}

		return {
			tag1030_subjectName: tag1030,
			priceKopecks,
			quantity: pos.quantity,
			amountKopecks,
			priceRub: kopecksToRubDecimal(priceKopecks),
			amountRub: kopecksToRubDecimal(amountKopecks),
			tag1079_unitPriceRub: kopecksToNumericString(priceKopecks),
			tag1043_amountRub: kopecksToNumericString(amountKopecks),
			tag1212_paymentSubject: FiscalReceiptFactory.resolveTag1212(subject),
			tag1214_paymentMethod: FiscalReceiptFactory.resolveTag1214(method),
			tag1199_vatRate: FiscalReceiptFactory.resolveTag1199(vatRate),
			tag2108_quantityMeasure: FiscalReceiptFactory.resolveTag2108(measure),
			tag1222_agentSign: FiscalReceiptFactory.resolveTag1222(pos.agentSign),
			medicalServiceCode804n: code804n,
			taxDeductionCategory: taxCat,
			markingCode: pos.markingCode ?? null,
			tag2000_markingPayload: markingPayload,
		};
	});

	const payments = compileMultiTenderPayments(input.tenderSplits);

	if (totalItemsKopecks !== payments.totalPaymentsKopecks) {
		throw new Fiscal54FzValidationError(
			"ReceiptBalanceMismatch",
			`Сумма позиций чека (${totalItemsKopecks} коп. / ${kopecksToRubDecimal(totalItemsKopecks)} руб.) ` +
				`не совпадает с суммой оплат по чеку (${payments.totalPaymentsKopecks} коп. / ${payments.totalPaymentsRub} руб.).`,
			{
				totalItemsKopecks,
				totalPaymentsKopecks: payments.totalPaymentsKopecks,
			},
		);
	}

	return {
		organizationId: input.organizationId,
		patientId: input.patientId,
		tag1054_operationType: FiscalReceiptFactory.resolveTag1054(operationType),
		tag1055_taxationSystem: FiscalReceiptFactory.resolveTag1055(taxationSystem),
		tag1057_agentSign: FiscalReceiptFactory.resolveTag1057(input.agentSign),
		tag1021_cashierName: input.cashierFullName.trim() || "Кассир-администратор",
		tag1203_cashierInn: input.cashierInn?.trim() || null,
		tag1008_customerContact: input.customerContact.trim(),
		tag1227_customerName: input.customerName?.trim() || null,
		tag1228_customerInn: input.customerInn?.trim() || null,
		tag1009_paymentAddress: input.paymentAddress?.trim() || null,
		tag1187_paymentPlace: input.paymentPlace?.trim() || null,
		tag1020_totalKopecks: totalItemsKopecks,
		tag1020_totalRub: kopecksToRubDecimal(totalItemsKopecks),
		tag1020_totalRubString: kopecksToNumericString(totalItemsKopecks),
		totalRub: kopecksToRubDecimal(totalItemsKopecks),
		payments,
		items: normalizedItems,
		overallTaxDeductionCategory: hasCode2ExpensiveTreatment ? "2" : "1",
		isCorrection: Boolean(input.isCorrectionReceipt),
		tag1173_correctionType: input.correctionBase
			? FFD12_TAG_1173_CORRECTION_CODES[input.correctionBase.type]
			: undefined,
		tag1178_correctionDocDate: input.correctionBase?.documentDate,
		tag1179_correctionDocNumber: input.correctionBase?.documentNumber,
		visitId: input.visitId || null,
		documentId: input.documentId || null,
		invoiceId: input.invoiceId || null,
		clientMutationId: input.clientMutationId || null,
	};
}

export function generate54FzQrString(params: {
	issuedAt: Date;
	totalRub: number;
	fnSerial: string;
	fiscalDocNumber: string | number;
	fiscalSign: string | number;
	operationType: number;
}): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const yyyy = params.issuedAt.getFullYear();
	const MM = pad(params.issuedAt.getMonth() + 1);
	const dd = pad(params.issuedAt.getDate());
	const HH = pad(params.issuedAt.getHours());
	const mm = pad(params.issuedAt.getMinutes());

	const timeStr = `${yyyy}${MM}${dd}T${HH}${mm}`;
	const sumStr = new Decimal(params.totalRub).toFixed(2);
	const fn = encodeURIComponent(String(params.fnSerial).trim());
	const fd = encodeURIComponent(String(params.fiscalDocNumber).trim());
	const fpd = encodeURIComponent(String(params.fiscalSign).trim());
	const n = params.operationType;

	return `t=${timeStr}&s=${sumStr}&fn=${fn}&i=${fd}&fp=${fpd}&n=${n}`;
}

export function generateOfdVerificationUrl(params: {
	fnSerial: string;
	fiscalDocNumber: string | number;
	fiscalSign: string | number;
	totalRub: number;
	operationType: number;
}): string {
	const sumStr = new Decimal(params.totalRub).toFixed(2);
	const fn = encodeURIComponent(String(params.fnSerial).trim());
	const fd = encodeURIComponent(String(params.fiscalDocNumber).trim());
	const fpd = encodeURIComponent(String(params.fiscalSign).trim());
	return `https://ofd.ru/check?fn=${fn}&fd=${fd}&fpd=${fpd}&s=${sumStr}&n=${params.operationType}`;
}
