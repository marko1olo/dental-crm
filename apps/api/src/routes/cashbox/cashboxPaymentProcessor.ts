/**
 * apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts
 *
 * Dedicated Cashbox Payment Transaction Processor (54-FZ & Clinical Autonomy).
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (100% warranty discounts, no hard blocks).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Integer Kopeck Math: Strict integer kopecks (amountKopecks: bigint).
 * - Idempotency & Financial Resilience: clientMutationId & idempotencyKey.
 */

import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { kopecksToRub, normalizePaymentMethod, rubToKopecks, validateLuhn16Certificate } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import {
	advanceDepositTaggings,
	bonusTransactions,
	cashBoxes,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	giftCertificates,
	patientBonusBalances,
	patientInvoices,
	patientRelationships,
	payments,
	patients,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import { buildPatientLedger, clinicOwesPatientKopecks } from "../../money/patientDebt.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { normalizePatientAdministrativeProfile } from "../../utils/patientAdministrativeProfile.js";
import { deductUnspentPointsFifo, processPatientExpiredBonuses } from "../loyaltyModules/bonusBalanceService.js";
import { cashboxPaymentRequestSchema } from "./cashboxSchemas.js";

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

export async function processCashboxPayment(
	orgId: string,
	rawBody: unknown,
	headerIdemp?: string,
): Promise<CashboxPaymentOutcome> {
	const parsed = cashboxPaymentRequestSchema.safeParse(rawBody || {});
	if (!parsed.success) {
		return {
			statusCode: 400,
			body: {
				error: "ValidationError",
				message: "Некорректные параметры платежа",
				details: parsed.error.issues,
			},
		};
	}

	const body = parsed.data;
	const effectiveMutationId =
		body.clientMutationId?.trim() ||
		body.idempotencyKey?.trim() ||
		headerIdemp?.trim() ||
		`cbx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	// Честная сумма: платеж без суммы невозможен, за исключением 100% гарантии врача (Мандаты 8e п. 7, 8n).
	// Гарантийный расчёт оформляется закрытием счёта без фискального чека.
	const isWarrantyPayment =
		body.method === "warranty" ||
		body.isWarranty === true ||
		Boolean(
			body.note &&
				/(гаранти|передел|скидк.*100|100%|безвозмездн|warranty)/i.test(body.note),
		);

	let totalKopecks = 0n;
	if (body.amountKopecks !== undefined) {
		totalKopecks = BigInt(body.amountKopecks);
	} else if (body.amountRub !== undefined) {
		totalKopecks = BigInt(Math.round(body.amountRub * 100));
	}
	if (totalKopecks <= 0n && !isWarrantyPayment) {
		return {
			statusCode: 400,
			body: {
				error: "ZeroAmountPayment",
				message:
					"Сумма платежа обязана быть больше нуля. Для гарантийной переделки со скидкой 100% укажите метод «warranty» или передайте флаг isWarranty.",
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
		requiredDepositKopecks = BigInt(Math.round(body.depositAmountRub * 100));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const norm = normalizePaymentMethod(tender.method);
			const rawMethod = tender.method?.trim().toLowerCase();
			if (norm === "family_wallet" || rawMethod === "deposit") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(Math.round((tender.amountRub ?? 0) * 100));
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
		requiredBonusKopecks = BigInt(Math.round(body.bonusAmountRub * 100));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const rawMethod = tender.method?.trim().toLowerCase();
			if (rawMethod === "loyalty" || rawMethod === "bonus" || rawMethod === "loyalty_points") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(Math.round((tender.amountRub ?? 0) * 100));
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
		requiredCertificateKopecks = BigInt(Math.round(body.certificateAmountRub * 100));
	} else if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const rawMethod = tender.method?.trim().toLowerCase();
			if (rawMethod === "certificate" || rawMethod === "gift_certificate") {
				const tk =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: BigInt(Math.round((tender.amountRub ?? 0) * 100));
				requiredCertificateKopecks += tk;
				if (!certificateNumber && tender.certificateNumber) {
					certificateNumber = tender.certificateNumber.trim();
				}
			}
		}
	}

	// [DEF-CASH-04] Проверка равенства суммы сплит-частей итогу счета (54-ФЗ и Мандат 8e)
	const isSplitMethod = body.method === "split";
	const hasExplicitSplitTenders = Boolean(body.splitTenders && body.splitTenders.length > 0);
	const hasMultipleTenderFields = [
		body.cashAmountKopecks !== undefined || body.cashAmountRub !== undefined,
		body.electronicAmountKopecks !== undefined || body.electronicAmountRub !== undefined,
		body.depositAmountKopecks !== undefined || body.depositAmountRub !== undefined,
		body.bonusAmountKopecks !== undefined || body.bonusAmountRub !== undefined,
		body.certificateAmountKopecks !== undefined || body.certificateAmountRub !== undefined,
	].filter(Boolean).length >= 2;

	if (isSplitMethod || hasExplicitSplitTenders || hasMultipleTenderFields) {
		let sumSplitKopecks = 0n;
		if (body.splitTenders && body.splitTenders.length > 0) {
			for (const tender of body.splitTenders) {
				const tenderKop =
					tender.amountKopecks !== undefined
						? BigInt(tender.amountKopecks)
						: tender.amountRub !== undefined
							? BigInt(Math.round(tender.amountRub * 100))
							: 0n;
				sumSplitKopecks += tenderKop;
			}
		} else {
			if (body.cashAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.cashAmountKopecks);
			} else if (body.cashAmountRub !== undefined) {
				sumSplitKopecks += BigInt(Math.round(body.cashAmountRub * 100));
			}
			if (body.electronicAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.electronicAmountKopecks);
			} else if (body.electronicAmountRub !== undefined) {
				sumSplitKopecks += BigInt(Math.round(body.electronicAmountRub * 100));
			}
			if (body.depositAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.depositAmountKopecks);
			} else if (body.depositAmountRub !== undefined) {
				sumSplitKopecks += BigInt(Math.round(body.depositAmountRub * 100));
			}
			if (body.bonusAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.bonusAmountKopecks);
			} else if (body.bonusAmountRub !== undefined) {
				sumSplitKopecks += BigInt(Math.round(body.bonusAmountRub * 100));
			}
			if (body.certificateAmountKopecks !== undefined) {
				sumSplitKopecks += BigInt(body.certificateAmountKopecks);
			} else if (body.certificateAmountRub !== undefined) {
				sumSplitKopecks += BigInt(Math.round(body.certificateAmountRub * 100));
			}
		}

		if (sumSplitKopecks !== totalKopecks) {
			return {
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
			};
		}
	}

	if (requiredCertificateKopecks > 0n && !isWarrantyPayment) {
		if (!certificateNumber) {
			return {
				statusCode: 400,
				body: {
					error: "CertificateNumberRequired",
					message: "Для оплаты подарочным сертификатом укажите номер сертификата.",
				},
			};
		}
		if (!validateLuhn16Certificate(certificateNumber)) {
			return {
				statusCode: 400,
				body: {
					error: "InvalidCertificateNumber",
					message: "Номер подарочного сертификата не прошел проверку контрольной суммы Луна (16 цифр).",
				},
			};
		}
	}

	// Честная атрибуция: при розничной продаже (Walk-In payment) по ст. 1.2 и 4.7 54-ФЗ
	// кассовый чек для физлица не требует обязательного заведения карты пациента или ИНН.
	if (!body.patientId && requiredDepositKopecks > 0n && !isWarrantyPayment) {
		return {
			statusCode: 400,
			body: {
				error: "DepositRequiresPatient",
				message:
					"Списание с депозита или семейного баланса возможно только для зарегистрированного пациента.",
			},
		};
	}
	if (!body.patientId && requiredBonusKopecks > 0n && !isWarrantyPayment) {
		return {
			statusCode: 400,
			body: {
				error: "BonusRequiresPatient",
				message:
					"Списание бонусов лояльности возможно только для зарегистрированного пациента.",
			},
		};
	}
	const requestedPatientId: string | undefined = body.patientId ?? undefined;
	const amountRubNumber = Number(totalKopecks) / 100;

	const result = await withTenantCtx(orgId, async (tx) => {
		// ACID pg_advisory_xact_lock на clientMutationId для защиты от состояния гонки
		if (effectiveMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cashbox_payment:' || ${effectiveMutationId}))`,
			);
		}

		// Проверка идемпотентности
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.clientMutationId, effectiveMutationId),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				id: existingPayment.id,
				amountKopecks: Math.round(Number(existingPayment.amountRub) * 100),
				amountRub: Number(existingPayment.amountRub),
				method: existingPayment.method,
				status: existingPayment.status,
				fiscalReceiptNumber: existingPayment.fiscalReceiptNumber,
				clientMutationId: existingPayment.clientMutationId,
				isReplay: true,
			};
		}

		// Проверка существования пациента или обеспечение системного розничного покупателя (54-ФЗ ст. 1.2, 4.7)
		let resolvedPatientId = "";
		let patientName = "Розничный покупатель";
		let patientRow: { id: string; fullName: string | null; familyGroupId: string | null } | null = null;

		if (requestedPatientId) {
			const [found] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					familyGroupId: patients.familyGroupId,
				})
				.from(patients)
				.where(and(eq(patients.id, requestedPatientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!found) {
				return {
					kind: "patient_not_found" as const,
				};
			}
			patientRow = found;
			resolvedPatientId = found.id;
			patientName = found.fullName || "Пациент клиники";
		} else {
			// Розничная продажа / свободный чек (Walk-In payment) по ст. 1.2 и 4.7 54-ФЗ.
			// По закону кассовый чек для физлица при розничной продаже не требует ФИО/ИНН.
			// Обеспечиваем системную запись покупателя для внешнего ключа payments.patientId.
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
				resolvedPatientId = existingRetail.id;
				patientName = existingRetail.fullName || "Розничный покупатель";
				patientRow = existingRetail;
			} else {
				const [createdRetail] = await tx
					.insert(patients)
					.values({
						organizationId: orgId,
						fullName: "Розничный покупатель",
						notes: "Системная запись для свободных кассовых чеков и розничных продаж (54-ФЗ ст. 1.2, 4.7)",
						administrativeProfile: normalizePatientAdministrativeProfile({ isAnonymous: true }),
					})
					.returning({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId });
				resolvedPatientId = createdRetail?.id ?? "";
				patientName = createdRetail?.fullName || "Розничный покупатель";
				patientRow = createdRetail ?? null;
			}
		}

		// [FIN-05] Проверка и блокировка несанкционированного списания с несуществующего депозита
		let lockedFamilyGroup: typeof familyGroups.$inferSelect | null = null;
		let advanceRows: (typeof advanceDepositTaggings.$inferSelect)[] = [];
		let familyBalanceKop = 0n;

		if (requiredDepositKopecks > 0n && !isWarrantyPayment && patientRow) {
			// 1. Поиск и блокировка семейного баланса familyGroups
			let targetFamilyGroupId = body.familyGroupId || patientRow.familyGroupId || null;
			if (!targetFamilyGroupId) {
				const [headFamily] = await tx
					.select({ id: familyGroups.id })
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.headPatientId, resolvedPatientId),
							eq(familyGroups.organizationId, orgId),
						),
					)
					.limit(1);
				if (headFamily) {
					targetFamilyGroupId = headFamily.id;
				}
			}

			if (targetFamilyGroupId) {
				const [fg] = await tx
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, targetFamilyGroupId),
							eq(familyGroups.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);
				lockedFamilyGroup = fg ?? null;
			}
			familyBalanceKop = lockedFamilyGroup
				? BigInt(rubToKopecks(Number(lockedFamilyGroup.balance || 0)))
				: 0n;

			// 2. Поиск и блокировка целевых авансов advanceDepositTaggings (реляционная привязка по patientId с fallback по patientName)
			advanceRows = await tx
				.select()
				.from(advanceDepositTaggings)
				.where(
					and(
						eq(advanceDepositTaggings.organizationId, orgId),
						or(
							eq(advanceDepositTaggings.patientId, resolvedPatientId),
							and(
								isNull(advanceDepositTaggings.patientId),
								eq(advanceDepositTaggings.patientName, patientRow.fullName || ""),
							),
						),
						inArray(advanceDepositTaggings.allocationStatus, [
							"unallocated",
							"pinned",
							"active",
						]),
					),
				)
				.for("update");

			let advanceTotalKop = 0n;
			for (const adv of advanceRows) {
				advanceTotalKop += BigInt(rubToKopecks(Number(adv.depositAmountRub || 0)));
			}

			// 3. Расчёт фактического сальдо лицевого счета (переплата / авансы по леджеру)
			const [patientCharges, patientPayments] = await Promise.all([
				tx
					.select({
						patientId: treatmentItems.patientId,
						status: treatmentItems.status,
						unitPriceRub: treatmentItems.unitPriceRub,
						quantity: treatmentItems.quantity,
						discountRub: treatmentItems.discountRub,
					})
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, orgId),
							eq(treatmentItems.patientId, resolvedPatientId),
						),
					),
				tx
					.select({
						patientId: payments.patientId,
						status: payments.status,
						amountRub: payments.amountRub,
					})
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.patientId, resolvedPatientId),
						),
					),
			]);
			const ledger = buildPatientLedger(
				resolvedPatientId,
				patientCharges,
				patientPayments,
				{
					organizationId: orgId,
				},
			);
			const ledgerOverpaidKop = BigInt(clinicOwesPatientKopecks(ledger));

			const personalAvailableKop =
				advanceTotalKop > ledgerOverpaidKop ? advanceTotalKop : ledgerOverpaidKop;
			const totalAvailableDepositKop = personalAvailableKop + familyBalanceKop;

			if (totalAvailableDepositKop < requiredDepositKopecks) {
				const availableRub = (Number(totalAvailableDepositKop) / 100).toFixed(2);
				const requiredRub = (Number(requiredDepositKopecks) / 100).toFixed(2);
				return {
					kind: "insufficient_deposit" as const,
					availableRub,
					requiredRub,
				};
			}

			// Списание с депозита: сначала с размеченных авансов
			let remainingToDeductKop = requiredDepositKopecks;
			for (const adv of advanceRows) {
				if (remainingToDeductKop <= 0n) break;
				const advKop = BigInt(rubToKopecks(Number(adv.depositAmountRub || 0)));
				if (advKop <= remainingToDeductKop) {
					remainingToDeductKop -= advKop;
					await tx
						.update(advanceDepositTaggings)
						.set({ allocationStatus: "spent" })
						.where(eq(advanceDepositTaggings.id, adv.id));
				} else {
					const nextAdvKop = advKop - remainingToDeductKop;
					remainingToDeductKop = 0n;
					await tx
						.update(advanceDepositTaggings)
						.set({ depositAmountRub: (Number(nextAdvKop) / 100).toFixed(2) })
						.where(eq(advanceDepositTaggings.id, adv.id));
				}
			}

			// [DEF-DEP-01] Если аванс списывался по леджеру соло-пациента без предварительного тегирования:
			// фиксируем списание аванса через advanceDepositTaggings со статусом spent для защиты от Double-Spend
			if (remainingToDeductKop > 0n && !lockedFamilyGroup) {
				await tx.insert(advanceDepositTaggings).values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					patientName: patientRow?.fullName || "Пациент клиники",
					depositAmountRub: (Number(remainingToDeductKop) / 100).toFixed(2),
					taggedTargetType: "treatment_plan",
					taggedTargetName: `Зачёт аванса по леджеру (счёт ${body.invoiceId || "б/н"})`,
					allocationStatus: "spent",
				});
				remainingToDeductKop = 0n;
			}

			// Если осталась сумма для списания, списываем из семейного баланса familyGroups
			if (remainingToDeductKop > 0n && lockedFamilyGroup) {
				const walletOwnerId = lockedFamilyGroup.headPatientId || lockedFamilyGroup.primaryPatientId;
				if (walletOwnerId && resolvedPatientId !== walletOwnerId) {
					// DEF-FAM-01: Проверка полномочий списания семейного депозита (BOLA guard)
					const [rel] = await tx
						.select()
						.from(patientRelationships)
						.where(
							and(
								eq(patientRelationships.organizationId, orgId),
								or(
									and(
										eq(patientRelationships.patientId, walletOwnerId),
										eq(patientRelationships.relatedPatientId, resolvedPatientId),
									),
									and(
										eq(patientRelationships.patientId, resolvedPatientId),
										eq(patientRelationships.relatedPatientId, walletOwnerId),
									),
								),
							),
						)
						.limit(1);

					// 1. Явный запрет на списание семейного депозита
					if (rel && rel.canSpendFamilyWallet === false) {
						return {
							kind: "unauthorized_family_spend" as const,
							reason: "Пациент не имеет полномочий на списание средств с семейного депозита (canSpendFamilyWallet = false).",
						};
					}

					// 2. Если нет родственной связи в patientRelationships, проверяем подтвержденное членство в группе
					const isFamilyMember = patientRow.familyGroupId === lockedFamilyGroup.id;
					if (!rel && !isFamilyMember) {
						return {
							kind: "unauthorized_family_spend" as const,
							reason: "Пациент не связан подтвержденным родством или семейной группой с владельцем семейного депозита.",
						};
					}

					// 3. Проверка установленного лимита списания spendLimitKopecks
					let spendLimitKop: number | undefined;
					if ((rel as Record<string, unknown> | undefined)?.["spendLimitKopecks"] !== undefined) {
						spendLimitKop = Number((rel as Record<string, unknown>)["spendLimitKopecks"]);
					} else if (rel?.notes) {
						try {
							const parsed = JSON.parse(rel.notes);
							if (typeof parsed?.spendLimitKopecks === "number") {
								spendLimitKop = parsed.spendLimitKopecks;
							}
						} catch {
							// plain text note
						}
					}
					if (spendLimitKop !== undefined && spendLimitKop >= 0 && Number(remainingToDeductKop) > spendLimitKop) {
						return {
							kind: "unauthorized_family_spend" as const,
							reason: `Превышен установленный лимит списания с семейного депозита (лимит: ${(spendLimitKop / 100).toFixed(2)} ₽, запрошено: ${(Number(remainingToDeductKop) / 100).toFixed(2)} ₽).`,
						};
					}
				}

				const deductFromFamilyKop =
					remainingToDeductKop <= familyBalanceKop
						? remainingToDeductKop
						: familyBalanceKop;
				const newFamilyBalKop = familyBalanceKop - deductFromFamilyKop;
				remainingToDeductKop -= deductFromFamilyKop;
				await tx
					.update(familyGroups)
					.set({
						balance: (Number(newFamilyBalKop) / 100).toFixed(2),
						updatedAt: new Date(),
					})
					.where(eq(familyGroups.id, lockedFamilyGroup.id));
			}
		}

		// [FIN-06] Проверка и блокировка списания бонусов лояльности
		let lockedBonusBalance: typeof patientBonusBalances.$inferSelect | null = null;
		let pointsToDeduct = 0;
		let newActiveBonusPoints = 0;

		if (requiredBonusKopecks > 0n && !isWarrantyPayment && resolvedPatientId) {
			await processPatientExpiredBonuses(tx, orgId, resolvedPatientId);

			const [bonusBalance] = await tx
				.select()
				.from(patientBonusBalances)
				.where(
					and(
						eq(patientBonusBalances.organizationId, orgId),
						eq(patientBonusBalances.patientId, resolvedPatientId),
					),
				)
				.for("update")
				.limit(1);

			const currentActivePoints = Number(bonusBalance?.activePoints ?? 0);
			const currentActiveKop = BigInt(rubToKopecks(currentActivePoints));

			if (currentActiveKop < requiredBonusKopecks) {
				const availableRub = (Number(currentActiveKop) / 100).toFixed(2);
				const requiredRub = (Number(requiredBonusKopecks) / 100).toFixed(2);
				return {
					kind: "insufficient_bonus" as const,
					availableRub,
					requiredRub,
				};
			}

			lockedBonusBalance = bonusBalance ?? null;
			pointsToDeduct = Number((Number(requiredBonusKopecks) / 100).toFixed(2));
			newActiveBonusPoints = Math.max(0, Number((currentActivePoints - pointsToDeduct).toFixed(2)));
		}

		// [FIN-07] Проверка и блокировка списания подарочного сертификата
		let lockedCertificate: typeof giftCertificates.$inferSelect | null = null;
		let certAmountToDeductKop = 0n;
		let newCertBalanceRub = "0.00";

		if (requiredCertificateKopecks > 0n && !isWarrantyPayment && certificateNumber) {
			const cleanCertNumber = certificateNumber.replace(/[\s-]/g, "");
			const [cert] = await tx
				.select()
				.from(giftCertificates)
				.where(
					and(
						eq(giftCertificates.organizationId, orgId),
						or(
							eq(giftCertificates.serialNumber, certificateNumber),
							sql`REPLACE(REPLACE(${giftCertificates.serialNumber}, '-', ''), ' ', '') = ${cleanCertNumber}`,
						),
					),
				)
				.for("update")
				.limit(1);

			if (!cert) {
				return {
					kind: "certificate_not_found" as const,
					certificateNumber,
				};
			}

			if (cert.status === "depleted") {
				return {
					kind: "certificate_depleted" as const,
					certificateNumber,
				};
			}

			if (cert.status === "cancelled") {
				return {
					kind: "certificate_cancelled" as const,
					certificateNumber,
				};
			}

			const now = new Date();
			if (cert.expiresAt && new Date(cert.expiresAt) < now) {
				return {
					kind: "certificate_expired" as const,
					certificateNumber,
					expiresAt: cert.expiresAt.toISOString(),
				};
			}

			const currentBalRub = Number(cert.currentBalanceRub ?? 0);
			const currentBalKop = BigInt(rubToKopecks(currentBalRub));

			if (currentBalKop < requiredCertificateKopecks) {
				return {
					kind: "insufficient_certificate" as const,
					certificateNumber,
					availableRub: (Number(currentBalKop) / 100).toFixed(2),
					requiredRub: (Number(requiredCertificateKopecks) / 100).toFixed(2),
				};
			}

			lockedCertificate = cert;
			certAmountToDeductKop = requiredCertificateKopecks;
			const newBalKop = currentBalKop - certAmountToDeductKop;
			newCertBalanceRub = (Number(newBalKop) / 100).toFixed(2);
		}

		// [FIN-02] Пессимистическая блокировка инвойса от двойной оплаты и связывание с приёмом
		let effectiveVisitId = body.visitId || null;
		let lockedInvoice: typeof patientInvoices.$inferSelect | null = null;
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
				return { kind: "invoice_not_found" as const, invoiceId: body.invoiceId };
			}
			if (inv.status === "paid" || inv.status === "paid_warranty") {
				return {
					kind: "invoice_already_paid" as const,
					invoiceId: inv.id,
					status: inv.status,
				};
			}
			lockedInvoice = inv;
			if (!effectiveVisitId && inv.visitId) {
				effectiveVisitId = inv.visitId;
			}
		}

		if (!effectiveVisitId && resolvedPatientId) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const [latestVisit] = await tx
				.select({ id: visits.id })
				.from(visits)
				.where(
					and(
						eq(visits.patientId, resolvedPatientId),
						eq(visits.organizationId, orgId),
						gte(visits.createdAt, today),
					),
				)
				.orderBy(desc(visits.createdAt))
				.limit(1);
			if (latestVisit?.id) {
				effectiveVisitId = latestVisit.id;
			}
		}

		// До подтверждения от ККТ сохраняем null: реальный номер ФД присваивается только после фактической печати чека
		const receiptNumber = null;
		const issuedAt = null;

		// 1. Фиксация платежа в таблице payments с обязательным visitId и documentId
		const [newPayment] = await tx
			.insert(payments)
			.values({
				organizationId: orgId,
				patientId: resolvedPatientId,
				visitId: effectiveVisitId,
				documentId: body.invoiceId || null,
				clientMutationId: effectiveMutationId,
				amountRub: amountRubNumber,
				method: normalizePaymentMethod(body.method),
				status: "paid",
				paidAt: new Date(),
				fiscalReceiptNumber: receiptNumber,
				fiscalReceiptIssuedAt: issuedAt,
				payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
				payerInn: body.buyerInn || null,
				note:
					body.note ||
					(isWarrantyPayment
						? "Гарантийный расчёт (скидка 100%)"
						: `Оплата через кассу (${body.method || "card"})`),
			})
			.returning();

		if (!newPayment) {
			throw new Error("Не удалось зафиксировать платёж в базе данных");
		}

		// 2. Списание счетов и визита в статус paid_warranty при гарантийном закрытии
		if (isWarrantyPayment) {
			if (body.invoiceId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid_warranty",
						paidAt: new Date(),
					})
					.where(
						and(
							eq(patientInvoices.id, body.invoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					);
			}
			if (effectiveVisitId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid_warranty",
						paidAt: new Date(),
					})
					.where(
						and(
							eq(patientInvoices.visitId, effectiveVisitId),
							eq(patientInvoices.organizationId, orgId),
						),
					);

				await tx
					.update(visits)
					.set({ updatedAt: new Date() })
					.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)));
			}

			return {
				id: newPayment.id,
				amountKopecks: 0,
				amountRub: 0,
				method: "warranty",
				status: "paid_warranty",
				isWarranty: true,
				fiscalReceiptNumber: null,
				clientMutationId: effectiveMutationId,
				note: newPayment.note,
			};
		}

		// Если передан invoiceId или visitId для обычного платежа — обновляем счёт с проверкой полного или частичного покрытия
		if (body.invoiceId) {
			const [invoicePayments] = await tx
				.select({
					totalPaidRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.documentId, body.invoiceId),
						eq(payments.status, "paid"),
					),
				);
			const invoiceTotalRub = Number(lockedInvoice?.totalAmountRub || lockedInvoice?.totalRub || 0);
			const totalPaidRub = Number(invoicePayments?.totalPaidRub || 0);
			const nextStatus = totalPaidRub >= invoiceTotalRub ? "paid" : "partially_paid";

			await tx
				.update(patientInvoices)
				.set({
					status: nextStatus,
					paidAt: nextStatus === "paid" ? new Date() : null,
				})
				.where(
					and(
						eq(patientInvoices.id, body.invoiceId),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}
		if (effectiveVisitId) {
			const visitInvoices = await tx
				.select({ id: patientInvoices.id, status: patientInvoices.status, totalRub: patientInvoices.totalAmountRub })
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.visitId, effectiveVisitId),
						eq(patientInvoices.organizationId, orgId),
					),
				);

			for (const inv of visitInvoices) {
				const [invPaid] = await tx
					.select({ totalPaidRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)` })
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.documentId, inv.id),
							eq(payments.status, "paid"),
						),
					);
				const totalDue = Number(inv.totalRub || 0);
				const totalPaid = Number(invPaid?.totalPaidRub || 0);
				const invStatus = totalPaid >= totalDue ? "paid" : totalPaid > 0 ? "partially_paid" : inv.status;
				await tx
					.update(patientInvoices)
					.set({
						status: invStatus,
						paidAt: invStatus === "paid" ? new Date() : null,
					})
					.where(eq(patientInvoices.id, inv.id));
			}

			await tx
				.update(visits)
				.set({ updatedAt: new Date() })
				.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)));
		}

		// 2.1. Списание бонусов лояльности (FIFO)
		if (requiredBonusKopecks > 0n && lockedBonusBalance) {
			const currentSpent = Number(lockedBonusBalance.lifetimeSpentPoints ?? 0);
			const newLifetimeSpent = Number((currentSpent + pointsToDeduct).toFixed(2));

			await tx
				.update(patientBonusBalances)
				.set({
					activePoints: String(newActiveBonusPoints),
					lifetimeSpentPoints: String(newLifetimeSpent),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patientBonusBalances.organizationId, orgId),
						eq(patientBonusBalances.patientId, resolvedPatientId),
					),
				);

			await tx.insert(bonusTransactions).values({
				organizationId: orgId,
				patientId: resolvedPatientId,
				amountPoints: String(-pointsToDeduct),
				balanceAfterPoints: String(newActiveBonusPoints),
				type: "redemption_payment",
				relatedPaymentId: newPayment.id,
				relatedInvoiceId: body.invoiceId || null,
				clientMutationId: effectiveMutationId ? `${effectiveMutationId}:bonus` : null,
				description:
					body.note ||
					`Списание бонусов лояльности в кассе (${pointsToDeduct} б.)`,
			});

			await deductUnspentPointsFifo(tx, {
				orgId,
				patientId: resolvedPatientId,
				pointsToDeduct,
			});
		}

		// 2.2. Списание номинала с подарочного сертификата
		if (lockedCertificate && certAmountToDeductKop > 0n) {
			const isDepleted = Number(newCertBalanceRub) <= 0;
			await tx
				.update(giftCertificates)
				.set({
					currentBalanceRub: newCertBalanceRub,
					status: isDepleted ? "depleted" : "active",
					notes: body.invoiceId
						? `${lockedCertificate.notes || ""}; Оплата счета ${body.invoiceId}`.trim().slice(0, 500)
						: lockedCertificate.notes,
					updatedAt: new Date(),
				})
				.where(eq(giftCertificates.id, lockedCertificate.id));
		}

		// 3. Инициализируем и находим кассовые счета клиники с упорядоченной блокировкой строк
		await ensureOrganizationCashBoxes(tx, orgId);
		const boxes = await tx
			.select()
			.from(cashBoxes)
			.where(eq(cashBoxes.organizationId, orgId))
			.orderBy(cashBoxes.id)
			.for("update");

		const cashDeskBox =
			boxes.find((b) => b.type === "main" || b.type === "cash_desk") ||
			boxes.find((b) => b.isMain && !b.isCashless) ||
			boxes.find((b) => !b.isCashless) ||
			boxes[0];
		const cashlessBox =
			boxes.find((b) => b.type === "cashless" || b.type === "bank_account") ||
			boxes.find((b) => b.isCashless) ||
			boxes[1] ||
			cashDeskBox;

		// 4. Кассовые проводки в cashOperations
		let resolvedCashKop = 0;
		let resolvedElecKop = 0;

		if (body.splitTenders && body.splitTenders.length > 0) {
			for (const tender of body.splitTenders) {
				const tk = tender.amountKopecks ?? Math.round((tender.amountRub ?? 0) * 100);
				const norm = normalizePaymentMethod(tender.method);
				if (norm === "cash") {
					resolvedCashKop += tk;
				} else if (["card", "sbp", "online"].includes(norm)) {
					resolvedElecKop += tk;
				}
			}
		} else {
			resolvedCashKop =
				body.cashAmountKopecks ??
				(body.cashAmountRub !== undefined ? Math.round(body.cashAmountRub * 100) : undefined) ??
				(body.method === "cash" ? Number(totalKopecks) : 0);
			resolvedElecKop =
				body.electronicAmountKopecks ??
				(body.electronicAmountRub !== undefined ? Math.round(body.electronicAmountRub * 100) : undefined) ??
				(["card", "sbp", "online"].includes(body.method || "")
					? Number(totalKopecks)
					: 0);
		}

		if (resolvedCashKop > 0 && cashDeskBox) {
			const curBalKop =
				cashDeskBox.balanceKopecks !== undefined && cashDeskBox.balanceKopecks !== null
					? Number(cashDeskBox.balanceKopecks)
					: rubToKopecks(cashDeskBox.balanceRub || 0);
			const newBalKop = curBalKop + resolvedCashKop;
			const curBal = kopecksToRub(curBalKop);
			const addRub = kopecksToRub(resolvedCashKop);
			const newBal = kopecksToRub(newBalKop);

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: addRub,
				balanceBeforeRub: curBal,
				balanceAfterRub: newBal,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: receiptNumber
					? `Приход наличных в кассу: оплата стоматологических услуг (${receiptNumber})`
					: "Приход наличных в кассу: оплата стоматологических услуг",
				operatorName: body.cashierFullName || "Кассир",
			});

			await tx
				.update(cashBoxes)
				.set({
					balanceRub: newBal,
					balanceKopecks: newBalKop,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, cashDeskBox.id));
		}

		if (resolvedElecKop > 0 && cashlessBox) {
			const curBalKop =
				cashlessBox.balanceKopecks !== undefined && cashlessBox.balanceKopecks !== null
					? Number(cashlessBox.balanceKopecks)
					: rubToKopecks(cashlessBox.balanceRub || 0);
			const newBalKop = curBalKop + resolvedElecKop;
			const curBal = kopecksToRub(curBalKop);
			const addRub = kopecksToRub(resolvedElecKop);
			const newBal = kopecksToRub(newBalKop);

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashlessBox.id,
				operationType: "income",
				amountRub: addRub,
				balanceBeforeRub: curBal,
				balanceAfterRub: newBal,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: receiptNumber
					? `Безналичное поступление: оплата стоматологических услуг (${receiptNumber})`
					: "Безналичное поступление: оплата стоматологических услуг",
				operatorName: body.cashierFullName || "Кассир",
			});

			await tx
				.update(cashBoxes)
				.set({
					balanceRub: newBal,
					balanceKopecks: newBalKop,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, cashlessBox.id));
		}

		if (requiredDepositKopecks > 0n && cashDeskBox) {
			const depositRub = Number(requiredDepositKopecks) / 100;
			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: depositRub,
				balanceBeforeRub: cashDeskBox.balanceRub || 0,
				balanceAfterRub: cashDeskBox.balanceRub || 0,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Зачёт аванса/депозита пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
				operatorName: body.cashierFullName || "Кассир",
			});
		}

		if (requiredBonusKopecks > 0n && cashDeskBox) {
			const bonusRub = Number(requiredBonusKopecks) / 100;
			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: bonusRub,
				balanceBeforeRub: cashDeskBox.balanceRub || 0,
				balanceAfterRub: cashDeskBox.balanceRub || 0,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Зачёт бонусов лояльности пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
				operatorName: body.cashierFullName || "Кассир",
			});
		}

		if (requiredCertificateKopecks > 0n && cashDeskBox) {
			const certRub = Number(requiredCertificateKopecks) / 100;
			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: certRub,
				balanceBeforeRub: cashDeskBox.balanceRub || 0,
				balanceAfterRub: cashDeskBox.balanceRub || 0,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Зачёт аванса (сертификат №${certificateNumber}): оплата стоматологических услуг (${receiptNumber || "б/н"})`,
				operatorName: body.cashierFullName || "Кассир",
			});
		}

		// 5. Постановка чека в очередь фискализации (physical KKT printer spooler)
		let enqueuedReceiptId: string | null = null;
		if (!isWarrantyPayment && totalKopecks > 0n) {
			const totalAdvanceOffsetKop = requiredDepositKopecks + requiredCertificateKopecks;
			const [enqueued] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					paymentId: newPayment.id,
					visitId: effectiveVisitId,
					receiptType: "income",
					status: "pending_print",
					payloadJson: {
						clientMutationId: effectiveMutationId,
						amountRub: amountRubNumber,
						amountKopecks: Number(totalKopecks),
						method: normalizePaymentMethod(body.method),
						cashRub: kopecksToRub(resolvedCashKop),
						electronicRub: kopecksToRub(resolvedElecKop),
						advanceOffsetRub: kopecksToRub(Number(totalAdvanceOffsetKop)),
						certificateOffsetRub: kopecksToRub(Number(requiredCertificateKopecks)),
						certificateNumber: certificateNumber || null,
						bonusOffsetRub: kopecksToRub(Number(requiredBonusKopecks)),
						fiscalReceiptNumber: receiptNumber,
						patientId: resolvedPatientId,
						patientName: patientRow?.fullName || patientName,
						cashierFullName: body.cashierFullName || "Кассир",
						invoiceId: body.invoiceId || null,
						note: newPayment.note,
						splitTenders: body.splitTenders ?? null,
					},
					retryCount: 0,
				})
				.returning({ id: fiscalReceiptQueue.id });
			if (enqueued) {
				enqueuedReceiptId = enqueued.id;
			}
		}

		return {
			id: newPayment.id,
			amountKopecks: Number(totalKopecks),
			amountRub: amountRubNumber,
			bonusAmountKopecks: Number(requiredBonusKopecks),
			certificateAmountKopecks: Number(requiredCertificateKopecks),
			method: newPayment.method,
			status: "paid",
			fiscalReceiptNumber: receiptNumber,
			fiscalReceiptQueueId: enqueuedReceiptId,
			clientMutationId: effectiveMutationId,
		};
	});

	if ("kind" in result && result.kind === "patient_not_found") {
		return {
			statusCode: 400,
			body: {
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике — платёж не проведён.",
			},
		};
	}

	if ("kind" in result && result.kind === "invoice_not_found") {
		return {
			statusCode: 404,
			body: {
				error: "InvoiceNotFound",
				message: `Счёт с идентификатором ${result.invoiceId} не найден в данной клинике.`,
				invoiceId: result.invoiceId,
			},
		};
	}

	if ("kind" in result && result.kind === "invoice_already_paid") {
		return {
			statusCode: 409,
			body: {
				error: "InvoiceAlreadyPaidConflict",
				message: `Счёт ${result.invoiceId} уже был полностью оплачен. Повторное списание средств отклонено для исключения задвоения чеков.`,
				invoiceId: result.invoiceId,
			},
		};
	}

	if ("kind" in result && result.kind === "unauthorized_family_spend") {
		return {
			statusCode: 403,
			body: {
				error: "UnauthorizedFamilySpend",
				message: result.reason,
			},
		};
	}

	if ("kind" in result && result.kind === "insufficient_deposit") {
		return {
			statusCode: 400,
			body: {
				error: "InsufficientDepositBalance",
				message: `Недостаточно средств на депозите пациента. Доступно: ${result.availableRub} ₽, требуется: ${result.requiredRub} ₽`,
			},
		};
	}

	if ("kind" in result && result.kind === "insufficient_bonus") {
		return {
			statusCode: 400,
			body: {
				error: "InsufficientBonusBalance",
				message: `Недостаточно бонусов на счете пациента. Доступно: ${result.availableRub} б., требуется: ${result.requiredRub} б.`,
			},
		};
	}

	if ("kind" in result && result.kind === "certificate_not_found") {
		return {
			statusCode: 404,
			body: {
				error: "CertificateNotFound",
				message: `Подарочный сертификат с номером «${result.certificateNumber}» не найден в клинике.`,
			},
		};
	}

	if ("kind" in result && result.kind === "certificate_depleted") {
		return {
			statusCode: 400,
			body: {
				error: "CertificateDepleted",
				message: `Баланс подарочного сертификата «${result.certificateNumber}» полностью исчерпан.`,
			},
		};
	}

	if ("kind" in result && result.kind === "certificate_cancelled") {
		return {
			statusCode: 400,
			body: {
				error: "CertificateCancelled",
				message: `Подарочный сертификат «${result.certificateNumber}» аннулирован администрацией клиники.`,
			},
		};
	}

	if ("kind" in result && result.kind === "certificate_expired") {
		return {
			statusCode: 400,
			body: {
				error: "CertificateExpired",
				message: `Срок действия подарочного сертификата «${result.certificateNumber}» истек (${result.expiresAt.slice(0, 10)}).`,
			},
		};
	}

	if ("kind" in result && result.kind === "insufficient_certificate") {
		return {
			statusCode: 400,
			body: {
				error: "InsufficientCertificateBalance",
				message: `Недостаточно средств на сертификате «${result.certificateNumber}». Доступно: ${result.availableRub} ₽, требуется: ${result.requiredRub} ₽`,
			},
		};
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			data: result,
		},
	};
}
