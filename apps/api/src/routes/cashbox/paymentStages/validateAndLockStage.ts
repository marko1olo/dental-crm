/**
 * apps/api/src/routes/cashbox/paymentStages/validateAndLockStage.ts
 *
 * Stage 1: Validation, Sum Resolution, Advisory Locking & Idempotent Replay.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ & Clinical Autonomy).
 */

import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import {
	kopecksToRubles,
	normalizePaymentMethod,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
	validateLuhn16Certificate,
} from "@dental/shared";
import { familyGroups, patientInvoices, patients, payments } from "../../../db/schema.js";
import { normalizePatientAdministrativeProfile } from "../../../utils/patientAdministrativeProfile.js";
import { cashboxPaymentRequestSchema } from "../cashboxSchemas.js";
import type {
	CashboxPaymentOutcome,
	PaymentProcessingContext,
	StageStepResult,
	TenantTransaction,
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
						"Для проведения кассового платежа обязателен заголовок Idempotency-Key или поле clientMutationId (Мандат 8zp/8bo).",
				},
			},
		};
	}

	// Честная сумма: платеж без суммы невозможен, за исключением 100% гарантии врача (Мандаты 8e п. 7, 8n).
	const isWarrantyPayment =
		body.method === "warranty" ||
		body.isWarranty === true ||
		(body.method !== "family_wallet" &&
			body.method !== "deposit" &&
			Boolean(
				body.note &&
					/(гаранти|передел|скидк.*100%?|безвозмездн|warranty)/i.test(body.note) &&
					!/(оплат|депозит|предоплат|аванс|счет|счёт)/i.test(body.note),
			));

	let totalKopecks = 0n;
	if (body.amountKopecks !== undefined) {
		totalKopecks = BigInt(body.amountKopecks);
	} else if (body.amountRub !== undefined) {
		totalKopecks = BigInt(rublesToKopecks(body.amountRub));
	}
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
	const isBonusMethod =
		body.method === "loyalty" ||
		(body.method as string) === "bonus" ||
		(body.method as string) === "loyalty_points";
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
			body.depositAmountKopecks !== undefined || body.depositAmountRub !== undefined,
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
			if (body.depositAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.depositAmountKopecks);
			} else if (body.depositAmountRub !== undefined) {
				sumSplitKopecks += BigInt(rublesToKopecks(body.depositAmountRub));
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

		lockedBonusBalance: null,
		pointsToDeductKop: 0n,
		newActiveBonusKop: 0n,

		lockedCertificate: null,
		certAmountToDeductKop: 0n,
		newCertBalanceRub: "0.00",

		lockedDmsLetter: null,
		dmsAmountToDeductKop: 0n,
		newDmsUsedRub: 0,
		isDmsExhausted: false,
		isEmergencyLetterAlias: false,

		effectiveVisitId: body.visitId || null,
		lockedInvoice: null,

		resolvedCashKop: 0,
		resolvedElecKop: 0,
		splitTenderCount: 1,
		receiptNumber: null,
		issuedAt: null,

		enqueuedReceiptId: null,
		createdPaymentIds: [],
	};

	return { success: true, context };
}

export async function acquireLockAndResolvePatient(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	const { orgId, effectiveMutationId, body } = ctx;

	// ACID pg_advisory_xact_lock на clientMutationId для защиты от состояния гонки
	if (effectiveMutationId) {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cashbox_payment:' || ${effectiveMutationId}))`,
		);
	}

	// Проверка идемпотентности
	const matchedExistingPayments = await tx
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				or(
					eq(payments.clientMutationId, effectiveMutationId),
					eq(payments.clientMutationId, `${effectiveMutationId}:card`),
					eq(payments.clientMutationId, `${effectiveMutationId}:electronic`),
					eq(payments.clientMutationId, `${effectiveMutationId}:cash`),
					eq(payments.clientMutationId, `${effectiveMutationId}:deposit`),
					eq(payments.clientMutationId, `${effectiveMutationId}:bonus`),
					eq(payments.clientMutationId, `${effectiveMutationId}:certificate`),
					eq(payments.clientMutationId, `${effectiveMutationId}:dms`),
				),
			),
		);

	if (matchedExistingPayments.length > 0) {
		const existingPayment = matchedExistingPayments[0]!;
		const isSplitReplay = matchedExistingPayments.length > 1;
		const totalExistingKop = isSplitReplay
			? sumKopecks(
					matchedExistingPayments.map((p) =>
						p.amountKopecks !== null && p.amountKopecks !== undefined
							? Number(p.amountKopecks)
							: parseKopecks(p.amountRub ?? 0),
					),
				)
			: existingPayment.amountKopecks !== null && existingPayment.amountKopecks !== undefined
				? Number(existingPayment.amountKopecks)
				: parseKopecks(existingPayment.amountRub ?? 0);
		const totalExistingRub = kopecksToRubles(totalExistingKop);

		let replayFamilyPrevBal = 0;
		let replayFamilyNewBal = 0;
		if (body.familyGroupId || existingPayment.documentId) {
			const targetFgId = body.familyGroupId || existingPayment.documentId;
			const [fg] = await tx
				.select({ balance: familyGroups.balance, balanceKopecks: familyGroups.balanceKopecks })
				.from(familyGroups)
				.where(and(eq(familyGroups.id, targetFgId!), eq(familyGroups.organizationId, orgId)))
				.limit(1);
			if (fg) {
				replayFamilyPrevBal =
					fg.balanceKopecks !== null && fg.balanceKopecks !== undefined
						? Number(fg.balanceKopecks)
						: parseKopecks(fg.balance ?? 0);
				replayFamilyNewBal = replayFamilyPrevBal;
			}
		}

		return {
			outcome: {
				statusCode: 200,
				body: {
					success: true,
					data: {
						id: existingPayment.id,
						paymentId: existingPayment.id,
						organizationId: existingPayment.organizationId,
						patientId: existingPayment.patientId,
						visitId: existingPayment.visitId,
						documentId: existingPayment.documentId,
						amountKopecks: totalExistingKop,
						amountRub: totalExistingRub,
						method: isSplitReplay ? "split" : existingPayment.method,
						status: existingPayment.status,
						paidAt: existingPayment.paidAt ? existingPayment.paidAt.toISOString() : new Date().toISOString(),
						fiscalReceiptNumber: existingPayment.fiscalReceiptNumber,
						clientMutationId: effectiveMutationId,
						isReplay: true,
						previousFamilyBalanceRub: kopecksToRubles(replayFamilyPrevBal),
						newFamilyBalanceRub: kopecksToRubles(replayFamilyNewBal),
						previousFamilyBalanceKopecks: replayFamilyPrevBal,
						newFamilyBalanceKopecks: replayFamilyNewBal,
					},
				},
			},
		};
	}

	// Разрешение пациента или создание системного розничного покупателя (54-ФЗ ст. 1.2, 4.7)
	const requestedPatientId = body.patientId ?? undefined;
	if (requestedPatientId) {
		const [found] = await tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				familyGroupId: patients.familyGroupId,
			})
			.from(patients)
			.where(and(eq(patients.id, requestedPatientId), eq(patients.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (!found) {
			return {
				failure: {
					kind: "patient_not_found",
					requestedPatientId,
				},
			};
		}
		ctx.patientRow = found;
		ctx.resolvedPatientId = found.id;
		ctx.patientName = found.fullName || "Пациент клиники";
	} else {
		const [existingRetail] = await tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				familyGroupId: patients.familyGroupId,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					eq(patients.fullName, "Розничный покупатель"),
				),
			)
			.limit(1);

		if (existingRetail) {
			ctx.resolvedPatientId = existingRetail.id;
			ctx.patientName = existingRetail.fullName || "Розничный покупатель";
			ctx.patientRow = existingRetail;
		} else {
			const [createdRetail] = await tx
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: "Розничный покупатель",
					notes:
						"Системная запись для свободных кассовых чеков и розничных продаж (54-ФЗ ст. 1.2, 4.7)",
					administrativeProfile: normalizePatientAdministrativeProfile({
						isAnonymous: true,
					}),
				})
				.returning({
					id: patients.id,
					fullName: patients.fullName,
					familyGroupId: patients.familyGroupId,
				});
			ctx.resolvedPatientId = createdRetail?.id ?? "";
			ctx.patientName = createdRetail?.fullName || "Розничный покупатель";
			ctx.patientRow = createdRetail ?? null;
		}
	}

	// [FIN-02] Пессимистическая блокировка инвойса от двойной оплаты и связывание с приёмом
	if (body.invoiceId) {
		const [inv] = await tx
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.id, body.invoiceId),
					eq(patientInvoices.organizationId, orgId),
				),
			)
			.for("update")
			.limit(1);

		if (!inv) {
			return { failure: { kind: "invoice_not_found", invoiceId: body.invoiceId } };
		}
		if (inv.status === "paid" || inv.status === "paid_warranty") {
			return {
				failure: {
					kind: "invoice_already_paid",
					invoiceId: inv.id,
					status: inv.status,
				},
			};
		}
		ctx.lockedInvoice = inv;
		if (!ctx.effectiveVisitId && inv.visitId) {
			ctx.effectiveVisitId = inv.visitId;
		}
	}

	return { success: true };
}
