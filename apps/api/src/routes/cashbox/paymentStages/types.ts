/**
 * apps/api/src/routes/cashbox/paymentStages/types.ts
 *
 * Core Contracts, Context, and Failure Mappers for Cashbox Payment Processing.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ & Clinical Autonomy).
 */

import type { FastifyBaseLogger } from "fastify";
import type { TenantDb } from "../../../db/client.js";
export type TenantTransaction = TenantDb;
export type { TenantDb };
import type {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	dmsGuaranteeLetters,
	familyGroups,
	giftCertificates,
	patientBonusBalances,
	patientInvoices,
	payments,
	patients,
} from "../../../db/schema.js";
import type { CashboxPaymentRequest } from "../cashboxSchemas.js";

export type CashboxPaymentOutcome =
	| {
			statusCode: 200;
			body: {
				success: true;
				data: Record<string, unknown>;
			};
	  }
	| {
			statusCode: 400;
			body: {
				error: string;
				message: string;
				details?: unknown;
			};
	  }
	| {
			statusCode: 402;
			body: {
				error: string;
				message: string;
				details?: unknown;
			};
	  }
	| {
			statusCode: 403;
			body: {
				error: string;
				message: string;
				details?: unknown;
			};
	  }
	| {
			statusCode: 404;
			body: {
				error: string;
				message: string;
				invoiceId?: string;
			};
	  }
	| {
			statusCode: 409;
			body: {
				error: string;
				message: string;
				invoiceId?: string;
			};
	  };

export type StageFailure =
	| { kind: "patient_not_found"; requestedPatientId?: string }
	| { kind: "invoice_not_found"; invoiceId: string }
	| { kind: "invoice_already_paid"; invoiceId: string; status: string }
	| { kind: "family_wallet_not_found" }
	| { kind: "unauthorized_family_spend"; reason: string }
	| { kind: "insufficient_deposit"; availableRub: string; requiredRub: string; isFamilyWallet?: boolean }
	| { kind: "insufficient_bonus"; availableRub: string; requiredRub: string }
	| { kind: "certificate_not_found"; certificateNumber: string }
	| { kind: "certificate_depleted"; certificateNumber: string }
	| { kind: "certificate_cancelled"; certificateNumber: string }
	| { kind: "certificate_expired"; certificateNumber: string; expiresAt: string }
	| { kind: "insufficient_certificate"; certificateNumber: string; availableRub: string; requiredRub: string }
	| { kind: "dms_letter_not_found"; guaranteeLetterId: string }
	| { kind: "insufficient_dms_coverage"; letterNumber?: string | null; availableRub: string; requiredRub: string }
	| { kind: "shift_expired"; shiftNumber?: number | null; openedAt?: Date | null };

export type StageStepResult =
	| { success: true }
	| { failure: StageFailure }
	| { outcome: CashboxPaymentOutcome };

export function stageFailureToOutcome(failure: StageFailure): CashboxPaymentOutcome {
	switch (failure.kind) {
		case "patient_not_found":
			return {
				statusCode: 400,
				body: {
					error: "PatientNotFound",
					message: `Пациент ${failure.requestedPatientId || ""} не найден или заблокирован в клинике — платёж не проведён.`,
				},
			};
		case "invoice_not_found":
			return {
				statusCode: 404,
				body: {
					error: "InvoiceNotFound",
					message: `Счёт с идентификатором ${failure.invoiceId} не найден в данной клинике.`,
					invoiceId: failure.invoiceId,
				},
			};
		case "invoice_already_paid":
			return {
				statusCode: 409,
				body: {
					error: "InvoiceAlreadyPaidConflict",
					message: `Счёт ${failure.invoiceId} уже был полностью оплачен. Повторное списание средств отклонено для исключения задвоения чеков.`,
					invoiceId: failure.invoiceId,
				},
			};
		case "family_wallet_not_found":
			return {
				statusCode: 400,
				body: {
					error: "FamilyWalletNotFound",
					message: "Пациент не состоит в семейной группе.",
				},
			};
		case "unauthorized_family_spend":
			return {
				statusCode: 403,
				body: {
					error: "UnauthorizedFamilySpend",
					message: failure.reason,
				},
			};
		case "insufficient_deposit": {
			const isFamily = Boolean(failure.isFamilyWallet);
			return {
				statusCode: isFamily ? 402 : 400,
				body: {
					error: isFamily ? "InsufficientFamilyBalance" : "InsufficientDepositBalance",
					message: isFamily
						? `Недостаточно средств на семейном кошельке. Доступно: ${failure.availableRub} ₽, требуется: ${failure.requiredRub} ₽`
						: `Недостаточно средств на депозите пациента. Доступно: ${failure.availableRub} ₽, требуется: ${failure.requiredRub} ₽`,
				},
			};
		}
		case "insufficient_bonus":
			return {
				statusCode: 400,
				body: {
					error: "InsufficientBonusBalance",
					message: `Недостаточно бонусов на счете пациента. Доступно: ${failure.availableRub} б., требуется: ${failure.requiredRub} б.`,
				},
			};
		case "certificate_not_found":
			return {
				statusCode: 404,
				body: {
					error: "CertificateNotFound",
					message: `Подарочный сертификат с номером «${failure.certificateNumber}» не найден в клинике.`,
				},
			};
		case "certificate_depleted":
			return {
				statusCode: 400,
				body: {
					error: "CertificateDepleted",
					message: `Баланс подарочного сертификата «${failure.certificateNumber}» полностью исчерпан.`,
				},
			};
		case "certificate_cancelled":
			return {
				statusCode: 400,
				body: {
					error: "CertificateCancelled",
					message: `Подарочный сертификат «${failure.certificateNumber}» аннулирован администрацией клиники.`,
				},
			};
		case "certificate_expired":
			return {
				statusCode: 400,
				body: {
					error: "CertificateExpired",
					message: `Срок действия подарочного сертификата «${failure.certificateNumber}» истек (${failure.expiresAt.slice(0, 10)}).`,
				},
			};
		case "insufficient_certificate":
			return {
				statusCode: 400,
				body: {
					error: "InsufficientCertificateBalance",
					message: `Недостаточно средств на сертификате «${failure.certificateNumber}». Доступно: ${failure.availableRub} ₽, требуется: ${failure.requiredRub} ₽`,
				},
			};
		case "dms_letter_not_found":
			return {
				statusCode: 404,
				body: {
					error: "DmsLetterNotFound",
					message: `Гарантийное письмо ДМС («${failure.guaranteeLetterId}») не найдено для пациента в данной клинике.`,
				},
			};
		case "insufficient_dms_coverage":
			return {
				statusCode: 400,
				body: {
					error: "InsufficientDmsCoverage",
					message: `Превышен лимит покрытия по гарантийному письму ДМС «${failure.letterNumber || "б/н"}». Доступно: ${failure.availableRub} ₽, требуется: ${failure.requiredRub} ₽`,
				},
			};
		case "shift_expired":
			return {
				statusCode: 400,
				body: {
					error: "ShiftExpiredError",
					message: `Кассовая смена №${failure.shiftNumber ?? ""} длится более 24 часов. Закройте смену и снимите Z-отчёт перед проведением новых платежей.`,
				},
			};
	}
}

export interface PaymentProcessingContext {
	readonly orgId: string;
	readonly body: CashboxPaymentRequest;
	readonly effectiveMutationId: string;
	readonly isWarrantyPayment: boolean;
	readonly logger?: FastifyBaseLogger | undefined;

	// Суммы и тендеры
	totalKopecks: bigint;
	amountRubNumber: number;
	requiredDepositKopecks: bigint;
	requiredBonusKopecks: bigint;
	requiredCertificateKopecks: bigint;
	certificateNumber?: string | undefined;
	requiredDmsKopecks: bigint;
	guaranteeLetterId?: string | undefined;
	effectiveTaxCode: "1" | "2" | null;

	// Пациент
	resolvedPatientId: string;
	patientName: string;
	patientRow: { id: string; fullName: string | null; familyGroupId: string | null } | null;

	// Депозиты и семейный баланс
	lockedTopupFamilyGroup: typeof familyGroups.$inferSelect | null;
	topupPrevBalKop: bigint;
	topupNewBalKop: bigint;
	lockedFamilyGroup: typeof familyGroups.$inferSelect | null;
	advanceRows: (typeof advanceDepositTaggings.$inferSelect)[];
	familyBalanceKop: bigint;

	// Бонусы
	lockedBonusBalance: typeof patientBonusBalances.$inferSelect | null;
	pointsToDeductKop: bigint;
	newActiveBonusKop: bigint;

	// Сертификаты
	lockedCertificate: typeof giftCertificates.$inferSelect | null;
	certAmountToDeductKop: bigint;
	newCertBalanceRub: string;

	// ДМС
	lockedDmsLetter: typeof dmsGuaranteeLetters.$inferSelect | null;
	dmsAmountToDeductKop: bigint;
	newDmsUsedKopecks: bigint;
	newDmsUsedRub: number;
	isDmsExhausted: boolean;
	isEmergencyLetterAlias: boolean;
	patientCoPayKopecks?: bigint | undefined;

	// Инвойс и визит
	effectiveVisitId: string | null;
	lockedInvoice: typeof patientInvoices.$inferSelect | null;

	// Сплиты и чеки
	resolvedCashKop: number;
	resolvedCardKop: number;
	resolvedSbpKop: number;
	resolvedElecKop: number;
	splitTenderCount: number;
	receiptNumber: string | null;
	issuedAt: string | null;

	// Проводка платежа
	newPayment?: typeof payments.$inferSelect | undefined;
	createdPaymentIds: string[];

	// Кассы и смены
	cashDeskBox?: typeof cashBoxes.$inferSelect | undefined;
	cashlessBox?: typeof cashBoxes.$inferSelect | undefined;
	dmsBox?: typeof cashBoxes.$inferSelect | undefined;
	cashDeskShift?: typeof cashBoxShifts.$inferSelect | null | undefined;
	cashlessShift?: typeof cashBoxShifts.$inferSelect | null | undefined;
	dmsShift?: typeof cashBoxShifts.$inferSelect | null | undefined;

	// Фискальная очередь
	enqueuedReceiptId: string | null;
}
