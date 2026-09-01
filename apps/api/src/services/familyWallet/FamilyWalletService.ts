/**
 * DENTE Dental CRM — Family Wallet Service (ACID & Statutory FNS Tax Engine)
 *
 * Implements ironclad financial invariants for pooled family deposit accounts:
 * 1. ACID Transactions & Row-Level Locking (`SELECT ... FOR UPDATE` on `family_groups`).
 * 2. Idempotency guarantees via `clientMutationId` against double-topup and double-debit.
 * 3. Kopeck-exact arithmetic without floating-point drift.
 * 4. Primary Payer (Главный плательщик) ID association for FNS Tax Deduction (КНД 1151156).
 * 5. Multi-tenant isolation by `organizationId`.
 */

import {
	kopecksToNumericString,
	kopecksToRub,
	parseKopecks,
	rubToKopecks,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	familyGroups,
	patients,
	payments,
	serviceCatalogItems,
} from "../../db/schema.js";
import {
	buildFnsKnd1151156Xml,
	type FnsClinicInfo,
	type FnsPatientInfo,
	type FnsPersonInfo,
	type FnsTaxPayload,
} from "../fns/fnsKnd1151156Builder.js";
import { wsBroker } from "../websocketBroker.js";

export type PatientRow = typeof patients.$inferSelect;
export type FamilyGroupRow = typeof familyGroups.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;

export class FamilyWalletError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number = 400,
		public readonly code: string = "FAMILY_WALLET_ERROR",
	) {
		super(message);
		this.name = "FamilyWalletError";
	}
}

export interface FamilyTopupParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly patientId?: string | undefined; // Payer / Head of family
	readonly payerPatientId?: string | undefined; // Payer / Head of family
	readonly amountRub: number;
	readonly method?: "cash" | "card" | "bank_transfer" | "online" | "other" | undefined;
	readonly clientMutationId: string;
	readonly notes?: string | undefined;
}

export interface FamilyTopupResult {
	readonly success: boolean;
	readonly payment: PaymentRow;
	readonly previousBalanceRub: number;
	readonly newBalanceRub: number;
	readonly creditedRub: number;
	readonly duplicate: boolean;
}

export interface FamilyDebitParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly patientId: string; // Patient receiving care (child, spouse, etc.)
	readonly amountRub: number;
	readonly serviceId?: string | undefined;
	readonly catalogItemId?: string | undefined;
	readonly discountRub?: number | undefined;
	readonly discountPercent?: number | undefined;
	readonly clientMutationId: string;
	readonly documentId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly taxCategory?: "1" | "2" | undefined; // 1 = Standard, 2 = Expensive
	readonly notes?: string | undefined;
}

export interface FamilyDebitResult {
	readonly success: boolean;
	readonly payment: PaymentRow;
	readonly previousBalanceRub: number;
	readonly newBalanceRub: number;
	readonly debitedRub: number;
	readonly duplicate: boolean;
}

export interface FnsTaxCertificateSummary {
	readonly certificateNumber: string;
	readonly taxYear: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly kinshipCode: "1" | "2" | "3" | "4" | "5";
	readonly kinshipNameRu: string;
	readonly code01AmountRub: number;
	readonly code02AmountRub: number;
	readonly grandTotalRub: number;
	readonly estimated13PercentRefundRub: number;
	readonly xmlPayload: string;
	readonly xmlFileName: string;
}

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
			const newBalanceKop = prevBalanceKop + creditKopecks;
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
	 * Debit medical treatment costs from shared family deposit with ACID row-lock and idempotency check.
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
					discountKopecks = Math.trunc(
						(catalogPriceKopecks * Math.round(params.discountPercent * 100)) / 10000,
					);
				}

				const verifiedAmountKopecks = Math.max(0, catalogPriceKopecks - discountKopecks);
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
			const newBalanceKop = currentBalanceKop - debitKopecks;
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
	 * Resolves the primary payer (head of household / father) and generates
	 * statutory FNS Form KND 1151156 tax deduction certificates for all treated family members.
	 */
	public async generateFnsTaxCertificatesForFamily(params: {
		readonly organizationId: string;
		readonly familyGroupId: string;
		readonly taxYear: string;
		readonly clinic: FnsClinicInfo;
		readonly signatory: FnsTaxPayload["signatory"];
		readonly customPayerPatientId?: string | undefined;
	}): Promise<readonly FnsTaxCertificateSummary[]> {
		const { organizationId, familyGroupId, taxYear, clinic, signatory, customPayerPatientId } = params;

		// 1. Fetch family group
		const [family] = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, familyGroupId),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!family) {
			throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");
		}

		// 2. Identify Primary Payer (Father / Head of Household)
		const payerId = customPayerPatientId || family.headPatientId;
		if (!payerId) {
			throw new FamilyWalletError(
				"В семейной группе не назначен главный плательщик (глава семьи)",
				400,
				"NO_PRIMARY_PAYER",
			);
		}

		const [payerPatient] = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.id, payerId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!payerPatient) {
			throw new FamilyWalletError("Главный плательщик не найден в базе пациентов", 404, "PAYER_NOT_FOUND");
		}

		// 3. Fetch all family members
		const members = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.familyGroupId, familyGroupId),
					eq(patients.organizationId, organizationId),
				),
			);

		// 4. Fetch all family_wallet payments in the given tax year
		const startOfYear = new Date(`${taxYear}-01-01T00:00:00.000Z`);
		const endOfYear = new Date(`${taxYear}-12-31T23:59:59.999Z`);

		const familyPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.method, "family_wallet"),
					eq(payments.status, "paid"),
					sql`${payments.createdAt} >= ${startOfYear} AND ${payments.createdAt} <= ${endOfYear}`,
				),
			);

		// Format Payer Info for FNS
		const payerFioParts = payerPatient.fullName.trim().split(/\s+/);
		const payerFio: { family: string; given: string; patronymic?: string } = {
			family: payerFioParts[0] || "Иванов",
			given: payerFioParts[1] || "Иван",
		};
		if (payerFioParts.length > 2) {
			payerFio.patronymic = payerFioParts.slice(2).join(" ");
		}

		const payerPerson: FnsPersonInfo = {
			fullName: payerFio,
		};
		if (payerPatient.administrativeProfile?.taxpayerInn) {
			payerPerson.inn = payerPatient.administrativeProfile.taxpayerInn;
		}
		if (payerPatient.administrativeProfile?.snils) {
			payerPerson.snils = payerPatient.administrativeProfile.snils;
		}
		if (payerPatient.birthDate) {
			payerPerson.birthDate = payerPatient.birthDate;
		}
		if (payerPatient.administrativeProfile?.identityDocument) {
			payerPerson.identityDocument = {
				docTypeCode: "21",
				seriesAndNumber: payerPatient.administrativeProfile.identityDocument,
			};
		}

		const certificates: FnsTaxCertificateSummary[] = [];

		// 5. Generate certificates per treated family member
		for (const member of members) {
			const memberPayments = familyPayments.filter((p) => p.patientId === member.id);
			if (memberPayments.length === 0) continue;

			let code1Kopecks = 0;
			let code2Kopecks = 0;
			for (const p of memberPayments) {
				const kopecks = parseKopecks(p.amountRub);
				if (p.taxDeductionCode === "2") {
					code2Kopecks += kopecks;
				} else {
					code1Kopecks += kopecks;
				}
			}
			const totalKopecks = code1Kopecks + code2Kopecks;
			if (totalKopecks <= 0) continue;

			// Kinship code: 1 = Self, 2 = Spouse, 3 = Parent, 4 = Child
			let kinshipCode: "1" | "2" | "3" | "4" | "5" = "1";
			let kinshipNameRu = "Лично";

			if (member.id === payerId) {
				kinshipCode = "1";
				kinshipNameRu = "Лично (налогоплательщик)";
			} else {
				const memberBirthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : null;
				const isChild =
					memberBirthYear !== null &&
					!Number.isNaN(memberBirthYear) &&
					new Date().getFullYear() - memberBirthYear < 24;

				if (isChild) {
					kinshipCode = "4";
					kinshipNameRu = "Ребенок";
				} else {
					kinshipCode = "2";
					kinshipNameRu = "Супруг(а)";
				}
			}

			const memberFioParts = member.fullName.trim().split(/\s+/);
			const patientFio: { family: string; given: string; patronymic?: string } = {
				family: memberFioParts[0] || "Иванова",
				given: memberFioParts[1] || "Ольга",
			};
			if (memberFioParts.length > 2) {
				patientFio.patronymic = memberFioParts.slice(2).join(" ");
			}

			const patientInfo: FnsPatientInfo = {
				patientKinshipCode: kinshipCode,
				fullName: patientFio,
			};
			if (member.administrativeProfile?.taxpayerInn) {
				patientInfo.inn = member.administrativeProfile.taxpayerInn;
			}
			if (member.administrativeProfile?.snils) {
				patientInfo.snils = member.administrativeProfile.snils;
			}
			if (member.birthDate) {
				patientInfo.birthDate = member.birthDate;
			}
			if (member.administrativeProfile?.identityDocument) {
				patientInfo.identityDocument = {
					docTypeCode: "21",
					seriesAndNumber: member.administrativeProfile.identityDocument,
				};
			}

			const certNumber = `FNS-${taxYear}-${member.id.slice(0, 8).toUpperCase()}`;

			const fnsPayload: FnsTaxPayload = {
				documentNumber: certNumber,
				documentDate: new Date(),
				taxYear,
				certificateKind: "1", // Первичная справка
				clinic,
				payer: payerPerson,
				patient: patientInfo,
				expenses: {
					code1AmountKopecks: code1Kopecks,
					code2AmountKopecks: code2Kopecks,
				},
				signatory,
			};

			const { xmlContent, fileName } = buildFnsKnd1151156Xml(fnsPayload);
			const code01AmountRub = kopecksToRub(code1Kopecks);
			const code02AmountRub = kopecksToRub(code2Kopecks);
			const grandTotalRub = kopecksToRub(totalKopecks);

			certificates.push({
				certificateNumber: certNumber,
				taxYear,
				payerPatientId: payerId,
				payerFullName: payerPatient.fullName,
				payerInn: payerPatient.administrativeProfile?.taxpayerInn || undefined,
				patientId: member.id,
				patientFullName: member.fullName,
				kinshipCode,
				kinshipNameRu,
				code01AmountRub,
				code02AmountRub,
				grandTotalRub,
				estimated13PercentRefundRub: Math.round(grandTotalRub * 0.13),
				xmlPayload: xmlContent,
				xmlFileName: fileName,
			});
		}

		return certificates;
	}
}

export const familyWalletService = new FamilyWalletService();
