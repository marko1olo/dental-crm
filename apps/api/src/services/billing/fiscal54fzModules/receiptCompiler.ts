/**
 * fiscal54fzModules/receiptCompiler.ts — Pure Decimal/Kopeck Compilation & QR/OFD Builders.
 */

import { Decimal } from "decimal.js";
import {
	type AnatomicalCanalCount,
	calculateEndodonticCompositeTreatment,
	getAnatomicalRootCanalCount,
	getOrder804nEndoProcedureForTooth,
	isMultiRootedTooth,
	kopecksToNumericString,
} from "@dental/shared";
import {
	Fiscal54FzValidationError,
	MINZDRAV_804N_CODE_REGEX,
	type MultiTenderPaymentSplitInput,
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
