/**
 * apps/api/src/routes/cashbox/paymentStages/validatePaymentInputStage.ts
 *
 * Stage 1A: Input Validation, Split Tender Verification & Context Initialization.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ & Clinical Autonomy).
 */

import type { FastifyBaseLogger } from "fastify";
import {
	kopecksToRubles,
	normalizePaymentMethod,
	rublesToKopecks,
	validateLuhn16Certificate,
} from "@dental/shared";
import { cashboxPaymentRequestSchema } from "../cashboxSchemas.js";
import type {
	CashboxPaymentOutcome,
	PaymentProcessingContext,
} from "./types.js";

export type ValidationResult =
	| { success: true; context: PaymentProcessingContext }
	| { outcome: CashboxPaymentOutcome };

export function validatePaymentInput(
	orgId: string,
	rawBody: unknown,
	headerIdemp?: string,
	logger?: FastifyBaseLogger,
): ValidationResult {
	const parsed = cashboxPaymentRequestSchema.safeParse(rawBody || {});
	if (!parsed.success) {
		return {
			outcome: {
				statusCode: 400,
				body: {
					error: "ValidationError",
					message: "Некорректные параметры платежа",
					details: parsed.error.issues,
				},
			},
		};
	}

	const body = parsed.data;
	const effectiveMutationId =
		body.clientMutationId?.trim() ||
		body.idempotencyKey?.trim() ||
		headerIdemp?.trim();

	if (!effectiveMutationId) {
		return {
			outcome: {
				statusCode: 400,
				body: {
					error: "IdempotencyKeyRequired",
					message:
						"Для проведения кассового платежа обязателен заголовок Idempotency-Key или поле clientMutationId.",
				},
			},
		};
	}

	let totalKopecks = 0n;
	if (body.amountKopecks !== undefined) {
		totalKopecks = BigInt(body.amountKopecks);
	} else if (body.amountRub !== undefined) {
		totalKopecks = BigInt(rublesToKopecks(body.amountRub));
	}

	// Гарантийный расчёт 0 ₽ срабатывает по явному методу/флагу или при нулевой сумме с описанием гарантии (не затирает реальные оплаты!)
	const isExplicitWarranty = body.method === "warranty" || body.isWarranty === true;
	const isNoteWarranty =
		totalKopecks <= 0n &&
		body.method !== "family_wallet" &&
		body.method !== "deposit" &&
		Boolean(
			body.note &&
				/(гаранти|передел|скидк.*100%?|безвозмездн|warranty)/i.test(body.note) &&
				!/(оплат|депозит|предоплат|аванс|счет|счёт)/i.test(body.note),
		);
	const isWarrantyPayment = isExplicitWarranty || isNoteWarranty;

	if (totalKopecks <= 0n && !isWarrantyPayment) {
		return {
			outcome: {
				statusCode: 400,
				body: {
					error: "ZeroAmountPayment",
					message:
						"Сумма платежа обязана быть больше нуля. Для гарантийной переделки со скидкой 100% укажите метод «warranty» или передайте флаг isWarranty.",
				},
			},
		};
	}
	if (isWarrantyPayment && totalKopecks <= 0n) {
		totalKopecks = 0n;
	}

	// [FIN-05] Вычисление требуемой суммы списания с депозита
	let requiredDepositKopecks = 0n;
	if (body.method === "deposit" || body.method === "family_wallet") {
		requiredDepositKopecks = totalKopecks;
	} else if (body.depositAmountKopecks !== undefined && body.depositAmountKopecks > 0) {
		requiredDepositKopecks = BigInt(body.depositAmountKopecks);
	} else if (body.depositAmountRub !== undefined && body.depositAmountRub > 0) {
		requiredDepositKopecks = BigInt(rublesToKopecks(body.depositAmountRub));
	} else if (body.familyDepositAmountKopecks !== undefined && body.familyDepositAmountKopecks > 0) {
		requiredDepositKopecks = BigInt(body.familyDepositAmountKopecks);
	} else if (body.familyDepositAmountRub !== undefined && body.familyDepositAmountRub > 0) {
		requiredDepositKopecks = BigInt(rublesToKopecks(body.familyDepositAmountRub));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const norm = normalizePaymentMethod(tender.method);
			const rawMethod = tender.method?.trim().toLowerCase();
			if (norm === "family_wallet" || rawMethod === "deposit") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(rublesToKopecks(tender.amountRub ?? 0));
				requiredDepositKopecks += tk;
			}
		}
	}

	// [FIN-06] Вычисление требуемой суммы списания бонусов лояльности
	let requiredBonusKopecks = 0n;
	const methodLower = body.method?.toLowerCase();
	const isBonusMethod =
		methodLower === "loyalty" ||
		methodLower === "bonus" ||
		methodLower === "loyalty_points";
	if (isBonusMethod) {
		requiredBonusKopecks = totalKopecks;
	} else if (body.bonusAmountKopecks !== undefined && body.bonusAmountKopecks > 0) {
		requiredBonusKopecks = BigInt(body.bonusAmountKopecks);
	} else if (body.bonusAmountRub !== undefined && body.bonusAmountRub > 0) {
		requiredBonusKopecks = BigInt(rublesToKopecks(body.bonusAmountRub));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const rawMethod = tender.method?.trim().toLowerCase();
			if (rawMethod === "loyalty" || rawMethod === "bonus" || rawMethod === "loyalty_points") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(rublesToKopecks(tender.amountRub ?? 0));
				requiredBonusKopecks += tk;
			}
		}
	}

	// [FIN-07] Вычисление требуемой суммы списания с подарочного сертификата
	let requiredCertificateKopecks = 0n;
	let certificateNumber: string | undefined = body.certificateNumber?.trim();
	const isCertificateMethod = body.method === "certificate";
	if (isCertificateMethod) {
		requiredCertificateKopecks = totalKopecks;
	} else if (body.certificateAmountKopecks !== undefined && body.certificateAmountKopecks > 0) {
		requiredCertificateKopecks = BigInt(body.certificateAmountKopecks);
	} else if (body.certificateAmountRub !== undefined && body.certificateAmountRub > 0) {
		requiredCertificateKopecks = BigInt(rublesToKopecks(body.certificateAmountRub));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const rawMethod = tender.method?.trim().toLowerCase();
			if (rawMethod === "certificate" || rawMethod === "gift_certificate") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(rublesToKopecks(tender.amountRub ?? 0));
				requiredCertificateKopecks += tk;
				if (!certificateNumber && tender.certificateNumber) {
					certificateNumber = tender.certificateNumber.trim();
				}
			}
		}
	}

	// [FIN-DMS] Вычисление требуемой суммы списания по ДМС (гарантийное письмо)
	let requiredDmsKopecks = 0n;
	let guaranteeLetterId: string | undefined = body.guaranteeLetterId?.trim();
	const isDmsMethod = body.method === "insurance";
	if (isDmsMethod) {
		requiredDmsKopecks = totalKopecks;
	} else if (body.dmsAmountKopecks !== undefined && body.dmsAmountKopecks > 0) {
		requiredDmsKopecks = BigInt(body.dmsAmountKopecks);
	} else if (body.dmsAmountRub !== undefined && body.dmsAmountRub > 0) {
		requiredDmsKopecks = BigInt(rublesToKopecks(body.dmsAmountRub));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const rawMethod = tender.method?.trim().toLowerCase();
			if (rawMethod === "insurance" || rawMethod === "dms") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(rublesToKopecks(tender.amountRub ?? 0));
				requiredDmsKopecks += tk;
				if (!guaranteeLetterId && tender.guaranteeLetterId) {
					guaranteeLetterId = tender.guaranteeLetterId.trim();
				}
			}
		}
	}

	// [DEF-CASH-04] Проверка равенства суммы сплит-частей итогу счета (54-ФЗ и Мандат 8e)
	const isSplitMethod = body.method === "split";
	const hasExplicitSplitTenders = Boolean(body.splitTenders && body.splitTenders.length > 0);
	const hasMultipleTenderFields =
		[
			body.cashAmountKopecks !== undefined || body.cashAmountRub !== undefined,
			body.electronicAmountKopecks !== undefined || body.electronicAmountRub !== undefined,
			body.sbpAmountKopecks !== undefined || body.sbpAmountRub !== undefined,
			body.depositAmountKopecks !== undefined || body.depositAmountRub !== undefined,
			body.familyDepositAmountKopecks !== undefined || body.familyDepositAmountRub !== undefined,
			body.bonusAmountKopecks !== undefined || body.bonusAmountRub !== undefined,
			body.certificateAmountKopecks !== undefined || body.certificateAmountRub !== undefined,
			body.dmsAmountKopecks !== undefined || body.dmsAmountRub !== undefined,
		].filter(Boolean).length >= 2;

	if (isSplitMethod || hasExplicitSplitTenders || hasMultipleTenderFields) {
		let sumSplitKopecks = 0n;
		if (body.splitTenders && body.splitTenders.length > 0) {
			for (const tender of body.splitTenders) {
				const tenderKop =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: tender.amountRub !== undefined
							? BigInt(rublesToKopecks(tender.amountRub))
							: 0n;
				sumSplitKopecks += tenderKop;
			}
		} else {
			if (body.cashAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.cashAmountKopecks);
			} else if (body.cashAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.cashAmountRub));
			}
			if (body.electronicAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.electronicAmountKopecks);
			} else if (body.electronicAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.electronicAmountRub));
			}
			if (body.sbpAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.sbpAmountKopecks);
			} else if (body.sbpAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.sbpAmountRub));
			}
			if (body.depositAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.depositAmountKopecks);
			} else if (body.depositAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.depositAmountRub));
			}
			if (body.familyDepositAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.familyDepositAmountKopecks);
			} else if (body.familyDepositAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.familyDepositAmountRub));
			}
			if (body.bonusAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.bonusAmountKopecks);
			} else if (body.bonusAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.bonusAmountRub));
			}
			if (body.certificateAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.certificateAmountKopecks);
			} else if (body.certificateAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.certificateAmountRub));
			}
			if (body.dmsAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.dmsAmountKopecks);
			} else if (body.dmsAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.dmsAmountRub));
			}
		}

		if (sumSplitKopecks !== totalKopecks) {
			return {
				outcome: {
					statusCode: 400,
					body: {
						error: "SplitTenderSumMismatch",
						message: "Сумма сплит-платежей не совпадает с суммой счета",
						details: {
							totalKopecks: Number(totalKopecks),
							sumSplitKopecks: Number(sumSplitKopecks),
							diffKopecks: Number(totalKopecks - sumSplitKopecks),
						},
					},
				},
			};
		}
	}

	if (requiredCertificateKopecks > 0n && !isWarrantyPayment) {
		if (!certificateNumber) {
			return {
				outcome: {
					statusCode: 400,
					body: {
						error: "CertificateNumberRequired",
						message: "Для оплаты подарочным сертификатом укажите номер сертификата.",
					},
				},
			};
		}
		if (!validateLuhn16Certificate(certificateNumber)) {
			return {
				outcome: {
					statusCode: 400,
					body: {
						error: "InvalidCertificateNumber",
						message:
							"Номер подарочного сертификата не прошел проверку контрольной суммы Луна (16 цифр).",
					},
				},
			};
		}
	}

	// Розничная продажа (Walk-In payment) по ст. 1.2 и 4.7 54-ФЗ
	if (!body.patientId && requiredDepositKopecks > 0n && !isWarrantyPayment) {
		return {
			outcome: {
				statusCode: 400,
				body: {
					error: "DepositRequiresPatient",
					message:
						"Списание с депозита или семейного баланса возможно только для зарегистрированного пациента.",
				},
			},
		};
	}
	if (!body.patientId && requiredBonusKopecks > 0n && !isWarrantyPayment) {
		return {
			outcome: {
				statusCode: 400,
				body: {
					error: "BonusRequiresPatient",
					message:
						"Списание бонусов лояльности возможно только для зарегистрированного пациента.",
				},
			},
		};
	}

	const rawTaxCode = body.taxDeductionCode || body.taxCategory;
	const effectiveTaxCode = rawTaxCode
		? rawTaxCode === "2" || rawTaxCode === "02"
			? "2"
			: "1"
		: null;

	const amountRubNumber = kopecksToRubles(Number(totalKopecks));

	const context: PaymentProcessingContext = {
		orgId,
		body,
		effectiveMutationId,
		isWarrantyPayment,
		logger,

		totalKopecks,
		amountRubNumber,
		requiredDepositKopecks,
		requiredBonusKopecks,
		requiredCertificateKopecks,
		certificateNumber,
		requiredDmsKopecks,
		guaranteeLetterId,
		effectiveTaxCode,

		resolvedPatientId: body.patientId || "",
		patientName: "Розничный покупатель",
		patientRow: null,

		lockedTopupFamilyGroup: null,
		topupPrevBalKop: 0n,
		topupNewBalKop: 0n,
		lockedFamilyGroup: null,
		advanceRows: [],
		familyBalanceKop: 0n,
		isPersonalDepositSpend: false,

		lockedBonusBalance: null,
		pointsToDeductKop: 0n,
		newActiveBonusKop: 0n,

		lockedCertificate: null,
		certAmountToDeductKop: 0n,
		newCertBalanceRub: "0.00",

		lockedDmsLetter: null,
		dmsAmountToDeductKop: 0n,
		newDmsUsedKopecks: 0n,
		newDmsUsedRub: 0,
		isDmsExhausted: false,
		isEmergencyLetterAlias: false,

		effectiveVisitId: body.visitId || null,
		lockedInvoice: null,

		resolvedCashKop: 0,
		resolvedCardKop: 0,
		resolvedSbpKop: 0,
		resolvedElecKop: 0,
		splitTenderCount: 1,
		receiptNumber: null,
		issuedAt: null,

		enqueuedReceiptId: null,
		createdPaymentIds: [],
	};

	return { success: true, context };
}
