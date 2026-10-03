/**
 * DENTE Dental CRM — Family Wallet Service (ACID & Statutory FNS Tax Engine)
 *
 * Implements ironclad financial invariants for pooled family deposit accounts:
 * 1. ACID Transactions & Row-Level Locking (`SELECT ... FOR UPDATE` on `family_groups`).
 * 2. Idempotency guarantees via `clientMutationId` against double-topup, double-debit, and double-refund.
 * 3. Kopeck-exact arithmetic without floating-point drift.
 * 4. Authorization via RF Legal Guardianship & patient relationships (`validateFamilyWalletSpend`).
 * 5. Advance deposit refund workflow with cash box expense tracking.
 * 6. Primary Payer (Главный плательщик) ID association for FNS Tax Deduction (КНД 1151156).
 * 7. Multi-tenant isolation by `organizationId`.
 */

import {
	invertRelationshipKind,
	kopecksToNumericString,
	kopecksToRub,
	parseKopecks,
	rubToKopecks,
	validateFamilyWalletSpend,
	type PatientRelationshipKind,
} from "@dental/shared";
import { Decimal } from "decimal.js";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashOperations,
	familyGroups,
	patientRelationships,
	patients,
	payments,
	serviceCatalogItems,
} from "../../db/schema.js";
import type {
	FnsClinicInfo,
	FnsTaxPayload,
} from "../fns/fnsKnd1151156Builder.js";
import { wsBroker } from "../websocketBroker.js";
import { generateFnsTaxCertificatesForFamilyLogic } from "./familyFnsTaxService.js";
import {
	FamilyWalletError,
	type FamilyDebitParams,
	type FamilyDebitResult,
	type FamilyGroupRow,
	type FamilyRefundParams,
	type FamilyRefundResult,
	type FamilyTopupParams,
	type FamilyTopupResult,
	type FnsTaxCertificateSummary,
	type PatientRow,
	type PaymentRow,
} from "./familyWalletTypes.js";

// Re-export all domain types and errors for seamless backwards compatibility
export {
	FamilyWalletError,
	type FamilyDebitParams,
	type FamilyDebitResult,
	type FamilyGroupRow,
	type FamilyRefundParams,
	type FamilyRefundResult,
	type FamilyTopupParams,
	type FamilyTopupResult,
	type FnsTaxCertificateSummary,
	type PatientRow,
	type PaymentRow,
};

export class FamilyWalletService {
	/**
	 * Top-up family deposit account with ACID row-lock and idempotency check.
	 */
	public async topup(params: FamilyTopupParams): Promise<FamilyTopupResult> {
		const {
			organizationId,
			familyGroupId,
			amountRub,
			method = "cash",
			clientMutationId,
		} = params;

		const targetPatientId = params.payerPatientId || params.patientId;

		if (!organizationId) {
			throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
		}
		if (!familyGroupId) {
			throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
		}
		if (!targetPatientId) {
			throw new FamilyWalletError("Не указан ID плательщика", 400, "MISSING_PATIENT_ID");
		}
		if (!clientMutationId || !clientMutationId.trim()) {
			throw new FamilyWalletError(
				"Ключ операции (clientMutationId) обязателен для защиты от повторных зачислений",
				400,
				"MISSING_IDEMPOTENCY_KEY",
			);
		}

		const creditKopecks = parseKopecks(amountRub);
		if (creditKopecks <= 0) {
			throw new FamilyWalletError("Сумма пополнения должна быть больше 0 ₽", 400, "INVALID_AMOUNT");
		}
		if (creditKopecks > 10_000_000_00) {
			throw new FamilyWalletError(
				"Сумма одного пополнения не может превышать 10 000 000 ₽",
				400,
				"AMOUNT_EXCEEDS_LIMIT",
			);
		}

		return await db.transaction(async (tx) => {
			// 1. Verify payer patient belongs to this clinic and family
			const [patient] = await tx
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, targetPatientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!patient || patient.familyGroupId !== familyGroupId) {
				throw new FamilyWalletError(
					"Плательщик не найден в семейной группе клиники",
					404,
					"PATIENT_NOT_IN_FAMILY",
				);
			}

			// 2. Lock Family Group row with SELECT ... FOR UPDATE
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, familyGroupId),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!family) {
				throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");
			}

			// 3. Idempotency check: verify if payment with same mutationId was already committed
			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, organizationId),
						eq(payments.clientMutationId, clientMutationId.trim()),
					),
				)
				.limit(1);

			if (existingPayment) {
				if (
					parseKopecks(existingPayment.amountRub) !== creditKopecks ||
					(targetPatientId && existingPayment.patientId !== targetPatientId) ||
					(method && existingPayment.method !== method)
				) {
					throw new FamilyWalletError(
						"Клиентская операция уже записала другое пополнение.",
						409,
						"IDEMPOTENCY_CONFLICT",
					);
				}
				const prevBalanceKop = parseKopecks(family.balance);
				return {
					success: true,
					payment: existingPayment,
					previousBalanceRub: kopecksToRub(prevBalanceKop),
					newBalanceRub: kopecksToRub(prevBalanceKop),
					creditedRub: kopecksToRub(parseKopecks(existingPayment.amountRub)),
					duplicate: true,
				};
			}

			// 4. Calculate exact kopecks new balance
			const prevBalanceKop = parseKopecks(family.balance);
			const newBalanceKop = new Decimal(prevBalanceKop)
				.plus(creditKopecks)
				.toNumber();
			const newBalanceStr = kopecksToNumericString(newBalanceKop);

			// 5. Update family group balance
			const [updatedFamily] = await tx
				.update(familyGroups)
				.set({
					balance: newBalanceStr,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(familyGroups.id, familyGroupId),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.returning();

			if (!updatedFamily) {
				throw new FamilyWalletError(
					"Не удалось обновить баланс семейной группы",
					500,
					"UPDATE_FAILED",
				);
			}

			// 6. Create payment record in planned status (advance deposit)
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId,
					patientId: targetPatientId,
					amountRub: kopecksToRub(creditKopecks),
					method,
					status: "planned",
					clientMutationId: clientMutationId.trim(),
				})
				.returning();

			if (!payment) {
				throw new FamilyWalletError("Не удалось создать запись платежа", 500, "PAYMENT_CREATION_FAILED");
			}

			// 7. Broadcast real-time WebSocket events
			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_BALANCE_UPDATED",
				payload: {
					organizationId,
					familyGroupId,
					balance: newBalanceStr,
				},
			});
			wsBroker.broadcastToOrganization(organizationId, {
				type: "PAYMENT_CREATED",
				payload: payment,
			});

			return {
				success: true,
				payment,
				previousBalanceRub: kopecksToRub(prevBalanceKop),
				newBalanceRub: kopecksToRub(newBalanceKop),
				creditedRub: kopecksToRub(creditKopecks),
				duplicate: false,
			};
		});
	}

	/**
	 * Debit medical treatment costs from shared family deposit with ACID row-lock,
	 * statutory RF legal relationship spend authorization, and idempotency check.
	 */
	public async debit(params: FamilyDebitParams): Promise<FamilyDebitResult> {
		const {
			organizationId,
			familyGroupId,
			patientId,
			amountRub,
			clientMutationId,
			documentId,
			visitId,
		} = params;

		if (!organizationId) {
			throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
		}
		if (!familyGroupId) {
			throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
		}
		if (!patientId) {
			throw new FamilyWalletError("Не указан ID пациента", 400, "MISSING_PATIENT_ID");
		}
		if (!clientMutationId || !clientMutationId.trim()) {
			throw new FamilyWalletError(
				"Ключ операции (clientMutationId) обязателен для защиты от двойных списаний",
				400,
				"MISSING_IDEMPOTENCY_KEY",
			);
		}

		if (typeof amountRub !== "number" || !Number.isFinite(amountRub) || Number.isNaN(amountRub)) {
			throw new FamilyWalletError("Сумма списания должна быть числом", 400, "INVALID_AMOUNT");
		}

		const debitKopecks = parseKopecks(amountRub);
		if (debitKopecks <= 0) {
			throw new FamilyWalletError("Сумма списания должна быть больше 0 ₽", 400, "INVALID_AMOUNT");
		}

		return await db.transaction(async (tx) => {
			// 1. Verify patient belongs to this clinic and family
			const [patient] = await tx
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!patient || patient.familyGroupId !== familyGroupId) {
				throw new FamilyWalletError(
					"Пациент не найден в семейной группе клиники",
					404,
					"PATIENT_NOT_IN_FAMILY",
				);
			}

			// 1a. Защита от подмены прайса: если передан serviceId/catalogItemId, проверяем цену в каталоге
			const targetServiceId = params.serviceId || params.catalogItemId;
			if (targetServiceId) {
				const [serviceItem] = await tx
					.select()
					.from(serviceCatalogItems)
					.where(
						and(
							eq(serviceCatalogItems.id, targetServiceId),
							eq(serviceCatalogItems.organizationId, organizationId),
						),
					)
					.limit(1);

				if (!serviceItem) {
					throw new FamilyWalletError(
						`Услуга с ID «${targetServiceId}» не найдена в каталоге клиники`,
						404,
						"SERVICE_NOT_FOUND",
					);
				}

				const catalogPriceKopecks = parseKopecks(serviceItem.priceRub);
				let discountKopecks = 0;
				if (params.discountRub !== undefined && params.discountRub !== null) {
					discountKopecks = parseKopecks(params.discountRub);
				} else if (params.discountPercent !== undefined && params.discountPercent !== null) {
					discountKopecks = new Decimal(catalogPriceKopecks)
						.times(new Decimal(params.discountPercent))
						.div(100)
						.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
						.toNumber();
				}

				const verifiedAmountKopecks = Math.max(
					0,
					new Decimal(catalogPriceKopecks).minus(discountKopecks).toNumber(),
				);
				if (debitKopecks !== verifiedAmountKopecks) {
					throw new FamilyWalletError(
						`Попытка подмены стоимости услуги «${serviceItem.title}»: в каталоге клиники ${kopecksToRub(catalogPriceKopecks)} ₽ (к списанию с учетом скидки: ${kopecksToRub(verifiedAmountKopecks)} ₽), получено ${kopecksToRub(debitKopecks)} ₽`,
						400,
						"PRICE_SPOOFING_DETECTED",
					);
				}
			}

			// 2. Lock Family Group row with SELECT ... FOR UPDATE
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, familyGroupId),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!family) {
				throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");
			}

			// 2a. Проверка полномочий на списание семейных средств (ст. 64 СК РФ, ст. 185 ГК РФ)
			const walletOwnerId = family.headPatientId || family.primaryPatientId;
			const isAuthorizerPayer = params.payerPatientId && walletOwnerId && params.payerPatientId === walletOwnerId;

			if (walletOwnerId && patientId !== walletOwnerId && !isAuthorizerPayer) {
				const [rel] = await tx
					.select()
					.from(patientRelationships)
					.where(
						and(
							eq(patientRelationships.organizationId, organizationId),
							or(
								and(
									eq(patientRelationships.patientId, walletOwnerId),
									eq(patientRelationships.relatedPatientId, patientId),
								),
								and(
									eq(patientRelationships.patientId, patientId),
									eq(patientRelationships.relatedPatientId, walletOwnerId),
								),
							),
						),
					)
					.limit(1);

				const effectiveRel = rel
					? {
							canSpendFamilyWallet: rel.canSpendFamilyWallet || rel.isPrimaryPayer,
							isLegalRepresentative: rel.isLegalRepresentative,
							relationshipType: (rel.patientId === patientId
								? rel.relationshipType
								: invertRelationshipKind(rel.relationshipType as PatientRelationshipKind)) as PatientRelationshipKind,
						}
					: null;

				const currentBalKop = parseKopecks(family.balance);
				const spendValidation = validateFamilyWalletSpend({
					spenderPatientId: patientId,
					walletOwnerPatientId: walletOwnerId,
					requiredAmountKopecks: debitKopecks,
					currentBalanceKopecks: currentBalKop,
					relationship: effectiveRel,
				});

				if (!spendValidation.isAuthorized) {
					throw new FamilyWalletError(
						spendValidation.failureReason ||
							"Пациент не имеет полномочий на списание средств с семейного кошелька",
						403,
						"UNAUTHORIZED_FAMILY_SPEND",
					);
				}
			}

			// 3. Idempotency verification
			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, organizationId),
						eq(payments.clientMutationId, clientMutationId.trim()),
					),
				)
				.limit(1);

			if (existingPayment) {
				if (
					parseKopecks(existingPayment.amountRub) !== debitKopecks ||
					existingPayment.patientId !== patientId ||
					existingPayment.method !== "family_wallet"
				) {
					throw new FamilyWalletError(
						"Клиентская операция уже записала другую оплату.",
						409,
						"IDEMPOTENCY_CONFLICT",
					);
				}
				const currentBalKop = parseKopecks(family.balance);
				return {
					success: true,
					payment: existingPayment,
					previousBalanceRub: kopecksToRub(currentBalKop),
					newBalanceRub: kopecksToRub(currentBalKop),
					debitedRub: kopecksToRub(parseKopecks(existingPayment.amountRub)),
					duplicate: true,
				};
			}

			// 4. Verify sufficient balance in integer kopecks
			const currentBalanceKop = parseKopecks(family.balance);
			if (currentBalanceKop < debitKopecks) {
				throw new FamilyWalletError(
					`Недостаточно средств на семейном балансе. Доступно: ${kopecksToRub(currentBalanceKop)} ₽, требуется: ${kopecksToRub(debitKopecks)} ₽`,
					402,
					"INSUFFICIENT_FUNDS",
				);
			}

			// 5. Calculate new balance
			const newBalanceKop = new Decimal(currentBalanceKop)
				.minus(debitKopecks)
				.toNumber();
			const newBalanceStr = kopecksToNumericString(newBalanceKop);

			// 6. Update family group balance
			const [updatedFamily] = await tx
				.update(familyGroups)
				.set({
					balance: newBalanceStr,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(familyGroups.id, familyGroupId),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.returning();

			if (!updatedFamily) {
				throw new FamilyWalletError(
					"Не удалось списать средства с семейного счета",
					500,
					"DEBIT_FAILED",
				);
			}

			// 7. Insert payment record with method "family_wallet"
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId,
					patientId,
					amountRub: kopecksToRub(debitKopecks),
					method: "family_wallet",
					status: "paid",
					documentId: documentId ?? null,
					visitId: visitId ?? null,
					clientMutationId: clientMutationId.trim(),
				})
				.returning();

			if (!payment) {
				throw new FamilyWalletError("Не удалось создать запись платежа", 500, "PAYMENT_CREATION_FAILED");
			}

			// 8. Broadcast real-time WebSocket events
			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_BALANCE_UPDATED",
				payload: {
					organizationId,
					familyGroupId,
					balance: newBalanceStr,
				},
			});
			wsBroker.broadcastToOrganization(organizationId, {
				type: "PAYMENT_CREATED",
				payload: payment,
			});

			return {
				success: true,
				payment,
				previousBalanceRub: kopecksToRub(currentBalanceKop),
				newBalanceRub: kopecksToRub(newBalanceKop),
				debitedRub: kopecksToRub(debitKopecks),
				duplicate: false,
			};
		});
	}

	/**
	 * Refund unspent family deposit funds back to the patient and cash box with ACID safety.
	 */
	public async refund(params: FamilyRefundParams): Promise<FamilyRefundResult> {
		const {
			organizationId,
			familyGroupId,
			amountRub,
			cashBoxId,
			operatorId,
			method = "cash",
			clientMutationId,
			reasonText,
		} = params;

		if (!organizationId) {
			throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
		}
		if (!familyGroupId) {
			throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
		}
		if (!clientMutationId || !clientMutationId.trim()) {
			throw new FamilyWalletError(
				"Ключ операции (clientMutationId) обязателен для защиты от повторных возвратов",
				400,
				"MISSING_IDEMPOTENCY_KEY",
			);
		}

		if (typeof amountRub !== "number" || !Number.isFinite(amountRub) || Number.isNaN(amountRub)) {
			throw new FamilyWalletError("Сумма возврата должна быть числом", 400, "INVALID_AMOUNT");
		}

		const refundKopecks = parseKopecks(amountRub);
		if (refundKopecks <= 0) {
			throw new FamilyWalletError("Сумма возврата должна быть больше 0 ₽", 400, "INVALID_AMOUNT");
		}

		return await db.transaction(async (tx) => {
			// 1. Lock Family Group row with SELECT ... FOR UPDATE
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, familyGroupId),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!family) {
				throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");
			}

			const targetPatientId = params.patientId || family.headPatientId || family.primaryPatientId;
			if (!targetPatientId) {
				throw new FamilyWalletError("Не указан пациент-получатель возврата депозита", 400, "MISSING_PATIENT_ID");
			}

			// 2. Idempotency check
			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, organizationId),
						eq(payments.clientMutationId, clientMutationId.trim()),
					),
				)
				.limit(1);

			if (existingPayment) {
				if (
					parseKopecks(existingPayment.amountRub) !== refundKopecks ||
					existingPayment.status !== "refunded"
				) {
					throw new FamilyWalletError(
						"Клиентская операция уже записала другой возврат.",
						409,
						"IDEMPOTENCY_CONFLICT",
					);
				}
				const currentBalKop = parseKopecks(family.balance);
				return {
					success: true,
					payment: existingPayment,
					previousBalanceRub: kopecksToRub(currentBalKop),
					newBalanceRub: kopecksToRub(currentBalKop),
					refundedRub: kopecksToRub(parseKopecks(existingPayment.amountRub)),
					duplicate: true,
				};
			}

			// 3. Verify sufficient deposit balance
			const currentBalanceKop = parseKopecks(family.balance);
			if (currentBalanceKop < refundKopecks) {
				throw new FamilyWalletError(
					`Недостаточно средств на семейном балансе для возврата. Доступно: ${kopecksToRub(currentBalanceKop)} ₽, требуется вернуть: ${kopecksToRub(refundKopecks)} ₽`,
					400,
					"INSUFFICIENT_FUNDS",
				);
			}

			// 4. Update family group balance
			const newBalanceKop = new Decimal(currentBalanceKop)
				.minus(refundKopecks)
				.toNumber();
			const newBalanceStr = kopecksToNumericString(newBalanceKop);

			const [updatedFamily] = await tx
				.update(familyGroups)
				.set({
					balance: newBalanceStr,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(familyGroups.id, familyGroupId),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.returning();

			if (!updatedFamily) {
				throw new FamilyWalletError("Не удалось обновить баланс семейной группы", 500, "UPDATE_FAILED");
			}

			// 5. Update cash box if provided
			let cashOp: typeof cashOperations.$inferSelect | undefined;
			if (cashBoxId) {
				const [targetBox] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId)))
					.for("update")
					.limit(1);

				if (targetBox) {
					const boxBalKop = parseKopecks(targetBox.balanceRub);
					const refundRub = kopecksToRub(refundKopecks);
					const newBoxBalKop = Math.max(0, boxBalKop - refundKopecks);

					await tx
						.update(cashBoxes)
						.set({
							balanceRub: kopecksToRub(newBoxBalKop),
							updatedAt: new Date(),
						})
						.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));

					const [createdOp] = await tx
						.insert(cashOperations)
						.values({
							organizationId,
							cashBoxId: targetBox.id,
							operationType: "expense",
							amountRub: refundRub,
							balanceBeforeRub: targetBox.balanceRub,
							balanceAfterRub: kopecksToRub(newBoxBalKop),
							reasonText: reasonText || `Возврат неиспользованного семейного депозита: ${family.name || "Семья"}`,
							patientId: targetPatientId,
							operatorId: operatorId ?? null,
						})
						.returning();
					cashOp = createdOp;
				}
			}

			// 6. Record payment record with status "refund"
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId,
					patientId: targetPatientId,
					amountRub: kopecksToRub(refundKopecks),
					method,
					status: "refunded",
					clientMutationId: clientMutationId.trim(),
				})
				.returning();

			if (!payment) {
				throw new FamilyWalletError("Не удалось создать запись возврата", 500, "REFUND_PAYMENT_CREATION_FAILED");
			}

			// 7. Broadcast WebSocket events
			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_BALANCE_UPDATED",
				payload: {
					organizationId,
					familyGroupId,
					balance: newBalanceStr,
				},
			});
			wsBroker.broadcastToOrganization(organizationId, {
				type: "PAYMENT_CREATED",
				payload: payment,
			});

			return {
				success: true,
				payment,
				previousBalanceRub: kopecksToRub(currentBalanceKop),
				newBalanceRub: kopecksToRub(newBalanceKop),
				refundedRub: kopecksToRub(refundKopecks),
				duplicate: false,
				cashOperation: cashOp,
			};
		});
	}

	/**
	 * Generate official FNS Tax Certificates (КНД 1151156) for all family members.
	 */
	public async generateFnsTaxCertificatesForFamily(params: {
		readonly organizationId: string;
		readonly familyGroupId: string;
		readonly taxYear: string;
		readonly clinic: FnsClinicInfo;
		readonly signatory: FnsTaxPayload["signatory"];
		readonly customPayerPatientId?: string | undefined;
	}): Promise<readonly FnsTaxCertificateSummary[]> {
		return generateFnsTaxCertificatesForFamilyLogic(params);
	}
}

export const familyWalletService = new FamilyWalletService();
