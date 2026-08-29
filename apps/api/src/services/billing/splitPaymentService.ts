/**
 * DENTE Dental CRM — Statutory 54-FZ Split Payment Service (Backend ACID Execution).
 *
 * Implements strict integer-kopeck split settlements across:
 * - Cash (Tag 1031)
 * - Card / SBP (Tag 1081)
 * - Personal / Family Deposit Advance Offset (Tag 1215)
 * - Postpayment / Credit (Tag 1216)
 * - Counter Provision / Gift Certificate / DMS (Tag 1217)
 */

import {
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
	type NormalizedSplitTender,
	type SplitPaymentPositionItem,
	type SplitPaymentTenderInput,
	type SplitPaymentValidationResult,
	kopecksToNumericString,
	kopecksToRub,
	rubToKopecks,
	validateAndBalanceSplitPayment,
} from "@dental/shared";
import {
	Fiscal54FzService,
	Fiscal54FzValidationError,
	type FiscalReceiptPositionInput,
} from "./fiscal54fzService.js";

export interface ProcessSplitPaymentRequest {
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly customerContact: string; // Phone or Email for 54-FZ Tag 1008
	readonly cashierFullName: string;
	readonly cashierInn?: string | null | undefined;
	readonly invoiceId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly documentId?: string | null | undefined;
	readonly clientMutationId?: string | null | undefined;
	readonly actTotalRub?: number | undefined;
	readonly actTotalKopecks?: number | undefined;
	readonly tenders: SplitPaymentTenderInput;
	readonly positions: readonly FiscalReceiptPositionInput[];
	readonly taxationSystem?: Ffd12TaxationSystem | undefined;
}

export interface ProcessSplitPaymentResult {
	readonly success: boolean;
	readonly validation: SplitPaymentValidationResult;
	readonly fiscalReceiptPayload: ReturnType<typeof Fiscal54FzService.buildStatutoryFiscalReceipt>;
	readonly totalPaidRub: number;
	readonly totalPaidKopecks: number;
	readonly tendersBreakdown: readonly NormalizedSplitTender[];
}

export class SplitPaymentService {
	/**
	 * Validates a multi-tender split payment and compiles a 54-FZ FFD 1.2 fiscal receipt payload.
	 * Throws Fiscal54FzValidationError if tenders do not match the Act 804n total to the single kopeck.
	 */
	public static prepareAndValidateSplitPayment(
		input: ProcessSplitPaymentRequest,
	): ProcessSplitPaymentResult {
		// 1. Calculate positions total in integer kopecks
		let positionsTotalKopecks = 0;
		for (const pos of input.positions) {
			const unitKop = Fiscal54FzService.rubToKopecks(pos.priceRub);
			positionsTotalKopecks += Math.round(unitKop * pos.quantity);
		}

		const actKopecks = input.actTotalKopecks !== undefined
			? input.actTotalKopecks
			: input.actTotalRub !== undefined
			? Fiscal54FzService.rubToKopecks(input.actTotalRub)
			: positionsTotalKopecks;

		// 2. Validate split payment balance
		const validation = validateAndBalanceSplitPayment({
			actTotalKopecks: actKopecks,
			tenders: input.tenders,
			throwOnMismatch: true,
		});

		// 3. Verify positions sum equals act total
		if (positionsTotalKopecks !== actKopecks) {
			throw new Fiscal54FzValidationError(
				"PositionsTotalMismatch",
				`Сумма позиций спецификации (${positionsTotalKopecks} коп. / ${kopecksToRub(positionsTotalKopecks)} руб.) ` +
					`не совпадает с суммой акта (${actKopecks} коп. / ${kopecksToRub(actKopecks)} руб.).`,
				{
					positionsTotalKopecks,
					actTotalKopecks: actKopecks,
				},
			);
		}

		// 4. Build compliant 54-FZ FFD 1.2 fiscal receipt
		const fiscalReceiptPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
			organizationId: input.organizationId,
			patientId: input.patientId,
			customerContact: input.customerContact,
			cashierFullName: input.cashierFullName,
			cashierInn: input.cashierInn,
			taxationSystem: input.taxationSystem || "usn_income",
			visitId: input.visitId,
			documentId: input.documentId,
			invoiceId: input.invoiceId,
			clientMutationId: input.clientMutationId,
			positions: input.positions,
			tenderSplits: {
				cashRub: validation.ffd12Tags.tag1031_cashRub,
				electronicCardRub: kopecksToRub(
					resolveTenderKop(input.tenders.cardKopecks, input.tenders.cardRub),
				),
				sberPayQrRub: kopecksToRub(
					resolveTenderKop(input.tenders.sbpKopecks, input.tenders.sbpRub),
				),
				advanceOffsetRub: validation.ffd12Tags.tag1215_advanceOffsetRub,
				creditPostpaymentRub: validation.ffd12Tags.tag1216_creditRub,
				counterProvisionRub: validation.ffd12Tags.tag1217_counterProvisionRub,
			},
		});

		return {
			success: true,
			validation,
			fiscalReceiptPayload,
			totalPaidRub: validation.totalTendersRub,
			totalPaidKopecks: validation.totalTendersKopecks,
			tendersBreakdown: validation.tenders,
		};
	}
}

function resolveTenderKop(kop?: number, rub?: number): number {
	if (kop !== undefined && Number.isFinite(kop)) return Math.round(kop);
	if (rub !== undefined && Number.isFinite(rub)) return Fiscal54FzService.rubToKopecks(rub);
	return 0;
}
