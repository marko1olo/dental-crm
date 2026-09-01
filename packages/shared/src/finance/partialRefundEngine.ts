/**
 * DENTE Dental CRM — Statutory 54-FZ Partial Service Refund & Doctor Commission Clawback Engine.
 *
 * Implements strict compliance with:
 * 1. Federal Law 54-FZ & FFD 1.2 (Tag 1054 = 2 "Возврат прихода").
 * 2. Order of Ministry of Health 804n (Nomenclature codes for returned services).
 * 3. Law of the Russian Federation No. 2300-1 "On Protection of Consumer Rights".
 * 4. Kopeck-exact ACID arithmetic for multi-item invoices (e.g., 1 tooth refund out of 5 services).
 * 5. Automatic clawback of doctor commission (deduction from piece-rate payroll).
 */

import {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
} from "../fiscal/ffd12Types.js";
import { kopecksToNumericString, kopecksToRub } from "../fiscal/kopecksArithmetic.js";

export type RefundReasonCategory =
	| "warranty_case" // Гарантийный случай (переделка/возврат)
	| "patient_refusal" // Отказ пациента от дальнейшего лечения
	| "billing_error" // Ошибка кассира / ошибочно пробитая услуга
	| "quality_claim" // Претензия по качеству работы
	| "clinical_contraindication"; // Выявленные противопоказания

export const REFUND_REASON_LABELS: Record<RefundReasonCategory, string> = {
	warranty_case: "Гарантийный случай (возврат/переделка)",
	patient_refusal: "Отказ пациента от услуги",
	billing_error: "Техническая/кассовая ошибка ввода",
	quality_claim: "Претензия по качеству лечения",
	clinical_contraindication: "Клинические противопоказания",
};

export interface RefundableInvoiceItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly unitPriceKop: number;
	readonly quantity: number;
	readonly discountKop?: number | undefined;
	readonly grossAmountKop: number;
	readonly netAmountKop: number;
	readonly doctorUserId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly commissionPct?: number | undefined;
	readonly materialCostKop?: number | undefined;
	readonly labCostKop?: number | undefined;
	readonly alreadyRefundedKop?: number | undefined;
}

export interface PartialRefundRequestItem {
	readonly itemId: string;
	readonly quantityToRefund: number;
	readonly customAmountKopToRefund?: number | undefined;
	readonly reasonRu?: string | undefined;
}

export interface PartialRefundCalculationInput {
	readonly invoiceId: string;
	readonly invoiceNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly paymentMethod: "cash" | "card" | "sbp" | "advance_deposit" | "bank_transfer";
	readonly items: readonly RefundableInvoiceItem[];
	readonly refundRequests: readonly PartialRefundRequestItem[];
	readonly defaultDoctorCommissionPct?: number | undefined;
	readonly reasonCategory: RefundReasonCategory;
	readonly customReasonDetailsRu?: string | undefined;
}

export interface RefundedPositionDetail {
	readonly itemId: string;
	readonly name: string;
	readonly code804n: string;
	readonly toothNumber?: number | undefined;
	readonly quantityRefunded: number;
	readonly unitPriceKop: number;
	readonly unitPriceRub: number;
	readonly refundedGrossKop: number;
	readonly refundedNetKop: number;
	readonly refundedNetRub: number;
	readonly tag1030_subjectName: string;
	readonly tag1212_subject: number;
	readonly tag1214_method: number;
	readonly tag1199_vat: number;
	readonly tag2108_measure: number;
	readonly doctorUserId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly commissionPct: number;
	readonly materialCostDeductionKop: number;
	readonly doctorClawbackKop: number;
	readonly doctorClawbackRub: number;
}

export interface DoctorRefundClawbackSummary {
	readonly doctorUserId?: string | undefined;
	readonly doctorName: string;
	readonly commissionPct: number;
	readonly totalRefundedServiceKop: number;
	readonly totalRefundedServiceRub: number;
	readonly materialAdjustmentKop: number;
	readonly clawbackKop: number;
	readonly clawbackRub: number;
	readonly clawbackRubFormatted: string;
}

export interface PartialRefundCalculationResult {
	readonly invoiceId: string;
	readonly invoiceNumber: string;
	readonly refundOperationNumber: string;
	readonly dateIso: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly cashierFullName: string;
	readonly reasonCategory: RefundReasonCategory;
	readonly reasonLabelRu: string;
	readonly reasonDetailsRu: string;
	readonly paymentMethod: "cash" | "card" | "sbp" | "advance_deposit" | "bank_transfer";
	readonly totalOriginalInvoiceKop: number;
	readonly totalOriginalInvoiceRub: number;
	readonly totalRefundKop: number;
	readonly totalRefundRub: number;
	readonly totalRefundRubFormatted: string;
	readonly totalRemainingInvoiceKop: number;
	readonly totalRemainingInvoiceRub: number;
	readonly isFullRefund: boolean;
	readonly refundedItems: readonly RefundedPositionDetail[];
	readonly remainingActiveItemsCount: number;
	readonly vatSummary: {
		readonly vatRateCode: number;
		readonly vatRateLabelRu: string;
		readonly vatKop: number;
		readonly vatRub: number;
		readonly baseKop: number;
		readonly baseRub: number;
	};
	readonly doctorClawbacks: readonly DoctorRefundClawbackSummary[];
	readonly totalDoctorClawbackKop: number;
	readonly totalDoctorClawbackRub: number;
	readonly fiscal54FzPayload: {
		readonly tag1054_operationType: number; // 2 = income_return
		readonly operationLabelRu: string;
		readonly totalKopecks: number;
		readonly totalRub: number;
		readonly totalRubString: string;
		readonly tag1031_cashRub: number;
		readonly tag1081_electronicRub: number;
		readonly tag1215_advanceOffsetRub: number;
		readonly positions: readonly {
			readonly tag1030_name: string;
			readonly priceRub: number;
			readonly quantity: number;
			readonly amountRub: number;
			readonly vatRateCode: number;
			readonly code804n?: string | undefined;
			readonly toothNumber?: number | undefined;
		}[];
	};
	readonly validationErrors: readonly string[];
	readonly isValid: boolean;
}

/**
 * Calculates a kopeck-exact partial refund for one or more services from a dental invoice,
 * formatting 54-FZ "Возврат прихода" tags and computing doctor commission clawbacks.
 */
export function calculatePartialRefund(
	input: PartialRefundCalculationInput
): PartialRefundCalculationResult {
	const errors: string[] = [];
	const dateIso = new Date().toISOString();
	const refundOpNum = `ВЗВ-${dateIso.slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

	if (!input.invoiceId || input.invoiceId.trim().length === 0) {
		errors.push("Не указан ID исходного счета.");
	}

	if (!input.refundRequests || input.refundRequests.length === 0) {
		errors.push("Не выбрано ни одной позиции для возврата.");
	}

	const itemMap = new Map<string, RefundableInvoiceItem>();
	let totalOriginalKop = 0;

	for (const it of input.items) {
		itemMap.set(it.id, it);
		totalOriginalKop += it.netAmountKop;
	}

	const refundedPositions: RefundedPositionDetail[] = [];
	const doctorClawbackMap = new Map<string, {
		doctorUserId?: string | undefined;
		doctorName: string;
		commissionPct: number;
		refundedGrossKop: number;
		materialAdjustmentKop: number;
		clawbackKop: number;
	}>();

	let totalRefundKop = 0;

	for (const req of input.refundRequests) {
		const originalItem = itemMap.get(req.itemId);
		if (!originalItem) {
			errors.push(`Позиция счета с ID «${req.itemId}» не найдена в исходном счете.`);
			continue;
		}

		if (typeof req.quantityToRefund !== "number" || !Number.isFinite(req.quantityToRefund) || Number.isNaN(req.quantityToRefund) || req.quantityToRefund <= 0) {
			errors.push(`Количество к возврату для «${originalItem.name}» должно быть больше 0.`);
			continue;
		}

		if (req.quantityToRefund > originalItem.quantity) {
			errors.push(
				`Количество к возврату (${req.quantityToRefund}) превышает исходное количество (${originalItem.quantity}) для позиции «${originalItem.name}».`
			);
			continue;
		}

		// Calculate exact kopecks for this refund
		const alreadyRefunded = originalItem.alreadyRefundedKop ?? 0;
		const maxAvailableKop = Math.max(0, originalItem.netAmountKop - alreadyRefunded);

		let itemRefundKop = 0;
		if (req.customAmountKopToRefund !== undefined && req.customAmountKopToRefund > 0) {
			itemRefundKop = Math.min(req.customAmountKopToRefund, maxAvailableKop);
		} else {
			// Pro-rate based on quantity
			const unitNetKop = Math.round(originalItem.netAmountKop / originalItem.quantity);
			itemRefundKop = Math.min(unitNetKop * req.quantityToRefund, maxAvailableKop);
		}

		if (itemRefundKop <= 0) {
			errors.push(`Позиция «${originalItem.name}» уже была полностью возвращена ранее.`);
			continue;
		}

		totalRefundKop += itemRefundKop;

		// Minzdrav 804n code & tag 1030
		const code804n = originalItem.code804n || "A16.07.002";
		const toothPrefix = originalItem.toothNumber ? `Зуб ${originalItem.toothNumber}: ` : "";
		const tag1030 = `${toothPrefix}${originalItem.name} [${code804n}]`;

		// Doctor commission clawback calculation
		const docPct = originalItem.commissionPct ?? input.defaultDoctorCommissionPct ?? 25;
		const docId = originalItem.doctorUserId || "doc-universal";
		const docName = originalItem.doctorName || "Лечащий врач";

		// Pro-rate material cost deduction if any
		let materialAdjKop = 0;
		if (originalItem.materialCostKop && originalItem.materialCostKop > 0) {
			materialAdjKop = Math.round((originalItem.materialCostKop / originalItem.quantity) * req.quantityToRefund);
		}

		const baseForClawbackKop = Math.max(0, itemRefundKop - materialAdjKop);
		const clawbackKop = Math.round((baseForClawbackKop * docPct) / 100);

		// Aggregate doctor clawback
		const existingDoc = doctorClawbackMap.get(docId) ?? {
			...(originalItem.doctorUserId ? { doctorUserId: originalItem.doctorUserId } : {}),
			doctorName: docName,
			commissionPct: docPct,
			refundedGrossKop: 0,
			materialAdjustmentKop: 0,
			clawbackKop: 0,
		};

		existingDoc.refundedGrossKop += itemRefundKop;
		existingDoc.materialAdjustmentKop += materialAdjKop;
		existingDoc.clawbackKop += clawbackKop;
		doctorClawbackMap.set(docId, existingDoc);

		refundedPositions.push({
			itemId: originalItem.id,
			name: originalItem.name,
			code804n,
			toothNumber: originalItem.toothNumber,
			quantityRefunded: req.quantityToRefund,
			unitPriceKop: originalItem.unitPriceKop,
			unitPriceRub: kopecksToRub(originalItem.unitPriceKop),
			refundedGrossKop: itemRefundKop,
			refundedNetKop: itemRefundKop,
			refundedNetRub: kopecksToRub(itemRefundKop),
			tag1030_subjectName: tag1030,
			tag1212_subject: FFD12_TAG_1212_SUBJECT_CODES.service,
			tag1214_method: FFD12_TAG_1214_METHOD_CODES.full_payment,
			tag1199_vat: FFD12_TAG_1199_VAT_CODES.vat_none, // Без НДС (пп. 2 п. 2 ст. 149 НК РФ)
			tag2108_measure: FFD12_TAG_2108_MEASURE_CODES.piece,
			doctorUserId: originalItem.doctorUserId,
			doctorName: docName,
			commissionPct: docPct,
			materialCostDeductionKop: materialAdjKop,
			doctorClawbackKop: clawbackKop,
			doctorClawbackRub: kopecksToRub(clawbackKop),
		});
	}

	const totalRemainingInvoiceKop = Math.max(0, totalOriginalKop - totalRefundKop);
	const isFullRefund = totalRefundKop >= totalOriginalKop && totalOriginalKop > 0;
	const remainingActiveCount = Math.max(0, input.items.length - refundedPositions.length);

	// Tender breakdown for 54-FZ Return
	let cashRub = 0;
	let electronicRub = 0;
	let advanceOffsetRub = 0;
	const totalRefundRub = kopecksToRub(totalRefundKop);

	if (input.paymentMethod === "cash") {
		cashRub = totalRefundRub;
	} else if (input.paymentMethod === "advance_deposit") {
		advanceOffsetRub = totalRefundRub;
	} else {
		// card, sbp, bank_transfer -> electronic
		electronicRub = totalRefundRub;
	}

	// Doctor clawback summaries
	const doctorClawbackList: DoctorRefundClawbackSummary[] = Array.from(doctorClawbackMap.values()).map(
		(d) => ({
			doctorUserId: d.doctorUserId,
			doctorName: d.doctorName,
			commissionPct: d.commissionPct,
			totalRefundedServiceKop: d.refundedGrossKop,
			totalRefundedServiceRub: kopecksToRub(d.refundedGrossKop),
			materialAdjustmentKop: d.materialAdjustmentKop,
			clawbackKop: d.clawbackKop,
			clawbackRub: kopecksToRub(d.clawbackKop),
			clawbackRubFormatted: `${kopecksToRub(d.clawbackKop).toLocaleString("ru-RU")} ₽`,
		})
	);

	const totalDoctorClawbackKop = doctorClawbackList.reduce((acc, d) => acc + d.clawbackKop, 0);

	return {
		invoiceId: input.invoiceId,
		invoiceNumber: input.invoiceNumber,
		refundOperationNumber: refundOpNum,
		dateIso,
		patientId: input.patientId,
		patientName: input.patientName,
		cashierFullName: input.cashierFullName,
		reasonCategory: input.reasonCategory,
		reasonLabelRu: REFUND_REASON_LABELS[input.reasonCategory],
		reasonDetailsRu: input.customReasonDetailsRu || REFUND_REASON_LABELS[input.reasonCategory],
		paymentMethod: input.paymentMethod,
		totalOriginalInvoiceKop: totalOriginalKop,
		totalOriginalInvoiceRub: kopecksToRub(totalOriginalKop),
		totalRefundKop,
		totalRefundRub,
		totalRefundRubFormatted: `${totalRefundRub.toLocaleString("ru-RU")} ₽`,
		totalRemainingInvoiceKop,
		totalRemainingInvoiceRub: kopecksToRub(totalRemainingInvoiceKop),
		isFullRefund,
		refundedItems: refundedPositions,
		remainingActiveItemsCount: remainingActiveCount,
		vatSummary: {
			vatRateCode: FFD12_TAG_1199_VAT_CODES.vat_none,
			vatRateLabelRu: "Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
			vatKop: 0,
			vatRub: 0,
			baseKop: totalRefundKop,
			baseRub: totalRefundRub,
		},
		doctorClawbacks: doctorClawbackList,
		totalDoctorClawbackKop,
		totalDoctorClawbackRub: kopecksToRub(totalDoctorClawbackKop),
		fiscal54FzPayload: {
			tag1054_operationType: FFD12_TAG_1054_OPERATION_CODES.income_return, // 2 = Возврат прихода
			operationLabelRu: "Возврат прихода",
			totalKopecks: totalRefundKop,
			totalRub: totalRefundRub,
			totalRubString: kopecksToNumericString(totalRefundKop),
			tag1031_cashRub: cashRub,
			tag1081_electronicRub: electronicRub,
			tag1215_advanceOffsetRub: advanceOffsetRub,
			positions: refundedPositions.map((pos) => ({
				tag1030_name: pos.tag1030_subjectName,
				priceRub: pos.unitPriceRub,
				quantity: pos.quantityRefunded,
				amountRub: pos.refundedNetRub,
				vatRateCode: pos.tag1199_vat,
				code804n: pos.code804n,
				toothNumber: pos.toothNumber,
			})),
		},
		validationErrors: errors,
		isValid: errors.length === 0 && refundedPositions.length > 0 && totalRefundKop > 0,
	};
}

/**
 * Builds a statutory 54-FZ QR code string for "Возврат прихода" thermal receipt.
 */
export function generate54FzIncomeReturnQrPayload(params: {
	readonly result: PartialRefundCalculationResult;
	readonly fnSerial: string;
	readonly fdNumber: string | number;
	readonly fpdNumber: string | number;
	readonly issuedAt?: Date | undefined;
}): string {
	const issuedAt = params.issuedAt ?? new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const yyyy = issuedAt.getFullYear();
	const MM = pad(issuedAt.getMonth() + 1);
	const dd = pad(issuedAt.getDate());
	const HH = pad(issuedAt.getHours());
	const mm = pad(issuedAt.getMinutes());

	const timeStr = `${yyyy}${MM}${dd}T${HH}${mm}`;
	const sumStr = params.result.totalRefundRub.toFixed(2);
	const fn = encodeURIComponent(String(params.fnSerial).trim());
	const fd = encodeURIComponent(String(params.fdNumber).trim());
	const fpd = encodeURIComponent(String(params.fpdNumber).trim());
	const n = FFD12_TAG_1054_OPERATION_CODES.income_return; // 2

	return `t=${timeStr}&s=${sumStr}&fn=${fn}&i=${fd}&fp=${fpd}&n=${n}`;
}

/**
 * Generates thermal ASCII/text preview for 54-FZ "Возврат прихода" receipt.
 */
export function generateThermalRefundReceiptText(
	result: PartialRefundCalculationResult,
	clinic: {
		readonly name: string;
		readonly inn: string;
		readonly kpp?: string | undefined;
		readonly address?: string | undefined;
	}
): string {
	const lines: string[] = [];
	const divider = "----------------------------------------";
	const dblDivider = "========================================";

	lines.push(clinic.name.toUpperCase());
	lines.push(`ИНН ${clinic.inn}${clinic.kpp ? ` КПП ${clinic.kpp}` : ""}`);
	if (clinic.address) lines.push(clinic.address);
	lines.push(dblDivider);
	lines.push("КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА");
	lines.push(`Смена: 001   Чек №: ${result.refundOperationNumber.slice(-4)}`);
	lines.push(`Кассир: ${result.cashierFullName}`);
	lines.push(`Дата: ${new Date(result.dateIso).toLocaleString("ru-RU")}`);
	lines.push(`Пациент: ${result.patientName}`);
	lines.push(`Основание: ${result.reasonLabelRu}`);
	lines.push(divider);

	for (const pos of result.refundedItems) {
		lines.push(pos.tag1030_subjectName);
		lines.push(
			`  ${pos.quantityRefunded} шт x ${pos.unitPriceRub.toFixed(2)} = ${pos.refundedNetRub.toFixed(2)} ₽`
		);
		lines.push(`  НДС: ${result.vatSummary.vatRateLabelRu}`);
	}

	lines.push(divider);
	lines.push(`ИТОГО К ВОЗВРАТУ: ${result.totalRefundRub.toFixed(2)} ₽`);

	if (result.fiscal54FzPayload.tag1031_cashRub > 0) {
		lines.push(`  НАЛИЧНЫМИ: ${result.fiscal54FzPayload.tag1031_cashRub.toFixed(2)} ₽`);
	}
	if (result.fiscal54FzPayload.tag1081_electronicRub > 0) {
		lines.push(`  БЕЗНАЛИЧНЫМИ: ${result.fiscal54FzPayload.tag1081_electronicRub.toFixed(2)} ₽`);
	}
	if (result.fiscal54FzPayload.tag1215_advanceOffsetRub > 0) {
		lines.push(`  ЗАЧЕТ АВАНСА: ${result.fiscal54FzPayload.tag1215_advanceOffsetRub.toFixed(2)} ₽`);
	}

	lines.push(dblDivider);
	lines.push("ФФД 1.2 • ПРИЗНАК РАСЧЕТА = 2 (ВОЗВРАТ)");
	lines.push("СПАСИБО ЗА ОБРАЩЕНИЕ!");

	return lines.join("\n");
}
