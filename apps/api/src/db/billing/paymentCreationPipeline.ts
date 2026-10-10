import {
	formatKopecksRu,
	type CreatePaymentInput,
	type Payment,
} from "@dental/shared";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { toKopecks } from "../../money/patientDebt.js";
import { deductMaterialsForVisit } from "../../services/inventory/materialDeduction.js";
import { withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import { validateVisitAndDocumentBalances } from "./billingTargetBalance.js";
import { validateDecree659AndPriceCompliance } from "./decree659Audit.js";
import { recordCashAndFiscalAccounting } from "./fiscalAccounting.js";
import { narrowTaxDeductionCode } from "./types.js";

export async function createPaymentInDb(
	organizationId: string,
	input: CreatePaymentInput,
): Promise<Payment> {
	const incomingPaymentKopecks = toKopecks(input.amountRub, "сумма оплаты");
	if (incomingPaymentKopecks < 0) {
		throw new Error("Сумма оплаты не может быть отрицательной.");
	}

	const rawCashKop =
		input.cashAmountKopecks ??
		(input.cashAmountRub != null ? Math.round(input.cashAmountRub * 100) : 0);
	const rawElectronicKop =
		input.electronicAmountKopecks ??
		(input.electronicAmountRub != null ? Math.round(input.electronicAmountRub * 100) : 0);
	const rawDmsKop =
		input.dmsAmountKopecks ??
		(input.dmsAmountRub != null ? Math.round(input.dmsAmountRub * 100) : 0);
	const rawDepositKop =
		input.depositAmountKopecks ??
		input.familyDepositAmountKopecks ??
		(input.depositAmountRub != null
			? Math.round(input.depositAmountRub * 100)
			: input.familyDepositAmountRub != null
				? Math.round(input.familyDepositAmountRub * 100)
				: 0);
	const isSplit =
		(rawCashKop > 0 && rawElectronicKop > 0) ||
		(rawDmsKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDepositKop > 0)) ||
		(rawDepositKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDmsKop > 0)) ||
		input.method === "split" ||
		input.method === "mixed";

	let resolvedCashKop = rawCashKop;
	let resolvedElectronicKop = rawElectronicKop;
	let resolvedDmsKop = rawDmsKop;
	let resolvedDepositKop = rawDepositKop;

	if (isSplit) {
		const nonCashElectronicKop = resolvedDmsKop + resolvedDepositKop;
		const netIncomingKop = incomingPaymentKopecks - nonCashElectronicKop;

		if (resolvedCashKop === 0 && resolvedElectronicKop > 0 && resolvedElectronicKop < netIncomingKop) {
			resolvedCashKop = netIncomingKop - resolvedElectronicKop;
		} else if (resolvedElectronicKop === 0 && resolvedCashKop > 0 && resolvedCashKop < netIncomingKop) {
			resolvedElectronicKop = netIncomingKop - resolvedCashKop;
		}

		if (resolvedCashKop + resolvedElectronicKop + resolvedDmsKop + resolvedDepositKop !== incomingPaymentKopecks) {
			const hasOtherMentionedTenders = Boolean(
				input.note && /(аванс|депозит|family|сертификат|бонус|дмс|dms)/i.test(input.note),
			);
			if (!hasOtherMentionedTenders) {
				throw new Error(
					`Сумма частей смешанной оплаты (${formatKopecksRu(resolvedCashKop + resolvedElectronicKop + resolvedDmsKop + resolvedDepositKop)}) не совпадает с общей суммой (${formatKopecksRu(incomingPaymentKopecks)}).`,
				);
			}
		}
		if (resolvedCashKop < 0 || resolvedElectronicKop < 0 || resolvedDmsKop < 0 || resolvedDepositKop < 0) {
			throw new Error("Части смешанной оплаты не могут быть отрицательными.");
		}
	}

	// Мандаты 8e п. 7 и 8n: Свобода скидок и переделок соло-врача (до 100%).
	// Если скидка 100% (гарантийная переделка, персонал, бесплатный прием), incomingPaymentKopecks === 0
	// НЕ выбрасывает ошибку, а фиксирует гарантийный платеж / акт со статусом 100% скидки.
	const isWarrantyOrFullDiscount =
		incomingPaymentKopecks === 0 &&
		(input.discountPercent === 100 ||
			input.amountRub === 0 ||
			Boolean(
				input.note &&
					/(гаранти|передел|скидк.*100|100%|безвозмездн|warranty|персонал|бесплатн)/i.test(
						input.note,
					),
			));

	if (incomingPaymentKopecks === 0 && !isWarrantyOrFullDiscount) {
		throw new Error("Сумма оплаты должна быть строго больше нуля.");
	}

	return await withTenantCtx(organizationId, async (tx) => {
		// ACID pg_advisory_xact_lock на clientMutationId для защиты от состояния гонки
		if (input.clientMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':payment_mutation:' || ${input.clientMutationId}))`,
			);
			const alreadyCreatedPayments = await tx
				.select()
				.from(schema.payments)
				.where(
					and(
						eq(schema.payments.organizationId, organizationId),
						or(
							eq(schema.payments.clientMutationId, input.clientMutationId),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:cash`),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:electronic`),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:deposit`),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:dms`),
						),
					),
				);
			const alreadyCreated = alreadyCreatedPayments[0];
			if (alreadyCreated) {
				return {
					id: alreadyCreated.id,
					organizationId: alreadyCreated.organizationId,
					patientId: alreadyCreated.patientId,
					visitId: alreadyCreated.visitId,
					documentId: alreadyCreated.documentId,
					amountRub: input.amountRub,
					method: (input.method === "split" || input.method === "mixed") ? "card" : alreadyCreated.method,
					clientMutationId: input.clientMutationId,
					fiscalReceiptNumber: alreadyCreated.fiscalReceiptNumber,
					fiscalReceiptIssuedAt: alreadyCreated.fiscalReceiptIssuedAt,
					fiscalReceiptUrl: alreadyCreated.fiscalReceiptUrl,
					fiscalReceipt: alreadyCreated.fiscalReceipt,
					payerFullName: alreadyCreated.payerFullName,
					payerInn: alreadyCreated.payerInn,
					payerBirthDate: alreadyCreated.payerBirthDate,
					payerIdentityDocument: alreadyCreated.payerIdentityDocument,
					payerRelationship: alreadyCreated.payerRelationship,
					taxDeductionCode: narrowTaxDeductionCode(alreadyCreated.taxDeductionCode),
					note: alreadyCreated.note,
					createdAt: alreadyCreated.createdAt.toISOString(),
					paidAt: alreadyCreated.paidAt.toISOString(),
					status: alreadyCreated.status,
				};
			}
		}

		// Pessimistic lock on the target patient to prevent concurrent balance race conditions
		const [lockedPatient] = await tx
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				administrativeProfile: schema.patients.administrativeProfile,
				familyGroupId: schema.patients.familyGroupId,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, input.patientId),
				),
			)
			.for("update")
			.limit(1);

		if (!lockedPatient) {
			throw new Error(
				`Пациент с идентификатором ${input.patientId} не найден или заблокирован другой операцией.`,
			);
		}

		// 1. Блокирующий гейт Постановления №659 и проверка цен каталога
		await validateDecree659AndPriceCompliance(tx, {
			organizationId,
			lockedPatient,
			input,
			incomingPaymentKopecks,
			isWarrantyOrFullDiscount,
		});

		// 2 & 3. Валидация остатков по визиту и документу
		const { lockedVisit, remainingVisitKopecks } =
			await validateVisitAndDocumentBalances(tx, {
				organizationId,
				input,
				incomingPaymentKopecks,
			});

		const toothSuffix = input.toothNumber ? ` [Зуб: ${input.toothNumber}]` : "";
		const rawNote = isWarrantyOrFullDiscount
			? (input.note || "Гарантийная переделка (скидка 100%)")
			: (input.note || null);
		const effectivePaymentNote = rawNote
			? (toothSuffix && !rawNote.includes("Зуб") ? `${rawNote}${toothSuffix}` : rawNote)
			: (toothSuffix ? `Оплата стоматологических услуг${toothSuffix}` : null);

		let primaryPayment: typeof schema.payments.$inferSelect;

		const tenderCount =
			(resolvedCashKop > 0 ? 1 : 0) +
			(resolvedElectronicKop > 0 ? 1 : 0) +
			(resolvedDmsKop > 0 ? 1 : 0) +
			(resolvedDepositKop > 0 ? 1 : 0);
		if (isSplit && tenderCount > 1) {
			let cashPayment: typeof schema.payments.$inferSelect | undefined;
			let electronicPayment: typeof schema.payments.$inferSelect | undefined;
			let dmsPayment: typeof schema.payments.$inferSelect | undefined;
			let depositPayment: typeof schema.payments.$inferSelect | undefined;

			if (resolvedCashKop > 0) {
				const cashAmountRub = Number((resolvedCashKop / 100).toFixed(2));
				const [cp] = await tx
					.insert(schema.payments)
					.values({
						organizationId,
						patientId: input.patientId,
						visitId: input.visitId || null,
						documentId: input.documentId || null,
						amountRub: cashAmountRub,
						method: "cash",
						fiscalReceiptNumber: input.fiscalReceiptNumber || null,
						fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
						fiscalReceiptUrl: input.fiscalReceiptUrl || null,
						fiscalReceipt: input.fiscalReceipt || null,
						clientMutationId: input.clientMutationId
							? `${input.clientMutationId}:cash`
							: null,
						payerFullName: input.payerFullName || null,
						payerInn: input.payerInn || null,
						payerBirthDate: input.payerBirthDate || null,
						payerIdentityDocument: input.payerIdentityDocument || null,
						payerRelationship: input.payerRelationship || null,
						taxDeductionCode: input.taxDeductionCode || null,
						note: effectivePaymentNote
							? `${effectivePaymentNote} (наличные: ${cashAmountRub} ₽)`
							: `Смешанная оплата (наличные: ${cashAmountRub} ₽)`,
						status: "paid",
					})
					.returning();
				cashPayment = cp;
			}

			if (resolvedElectronicKop > 0) {
				const electronicAmountRub = Number((resolvedElectronicKop / 100).toFixed(2));
				const [ep] = await tx
					.insert(schema.payments)
					.values({
						organizationId,
						patientId: input.patientId,
						visitId: input.visitId || null,
						documentId: input.documentId || null,
						amountRub: electronicAmountRub,
						method: "card",
						fiscalReceiptNumber: input.fiscalReceiptNumber || null,
						fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
						fiscalReceiptUrl: input.fiscalReceiptUrl || null,
						fiscalReceipt: input.fiscalReceipt || null,
						clientMutationId: input.clientMutationId
							? `${input.clientMutationId}:electronic`
							: null,
						payerFullName: input.payerFullName || null,
						payerInn: input.payerInn || null,
						payerBirthDate: input.payerBirthDate || null,
						payerIdentityDocument: input.payerIdentityDocument || null,
						payerRelationship: input.payerRelationship || null,
						taxDeductionCode: input.taxDeductionCode || null,
						note: effectivePaymentNote
							? `${effectivePaymentNote} (безналичные: ${electronicAmountRub} ₽)`
							: `Смешанная оплата (безналичные: ${electronicAmountRub} ₽)`,
						status: "paid",
					})
					.returning();
				electronicPayment = ep;
			}

			if (resolvedDmsKop > 0) {
				const dmsAmountRub = Number((resolvedDmsKop / 100).toFixed(2));
				const [dp] = await tx
					.insert(schema.payments)
					.values({
						organizationId,
						patientId: input.patientId,
						visitId: input.visitId || null,
						documentId: input.documentId || null,
						amountRub: dmsAmountRub,
						method: "insurance",
						fiscalReceiptNumber: input.fiscalReceiptNumber || null,
						fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
						fiscalReceiptUrl: input.fiscalReceiptUrl || null,
						fiscalReceipt: input.fiscalReceipt || null,
						clientMutationId: input.clientMutationId
							? `${input.clientMutationId}:dms`
							: null,
						payerFullName: input.payerFullName || null,
						payerInn: input.payerInn || null,
						payerBirthDate: input.payerBirthDate || null,
						payerIdentityDocument: input.payerIdentityDocument || null,
						payerRelationship: input.payerRelationship || null,
						taxDeductionCode: input.taxDeductionCode || null,
						note: effectivePaymentNote
							? `${effectivePaymentNote} (страховая часть ДМС: ${dmsAmountRub} ₽)`
							: `Смешанная оплата (страховая часть ДМС: ${dmsAmountRub} ₽)`,
						status: "paid",
					})
					.returning();
				dmsPayment = dp;

				if (input.guaranteeLetterId && input.guaranteeLetterId !== "emergency" && input.guaranteeLetterId !== "none") {
					const [letter] = await tx
						.select()
						.from(schema.dmsGuaranteeLetters)
						.where(
							and(
								eq(schema.dmsGuaranteeLetters.id, input.guaranteeLetterId),
								eq(schema.dmsGuaranteeLetters.organizationId, organizationId),
							),
						)
						.for("update")
						.limit(1);

					if (letter) {
						const nextUsed = Number(letter.usedAmountRub) + dmsAmountRub;
						const nextStatus = nextUsed >= Number(letter.maxCoverageRub) ? "exhausted" : letter.status;
						await tx
							.update(schema.dmsGuaranteeLetters)
							.set({
								usedAmountRub: nextUsed,
								status: nextStatus,
								updatedAt: new Date(),
							})
							.where(eq(schema.dmsGuaranteeLetters.id, letter.id));
					}
				}
			}

			if (resolvedDepositKop > 0) {
				const depositAmountRub = Number((resolvedDepositKop / 100).toFixed(2));
				const [depP] = await tx
					.insert(schema.payments)
					.values({
						organizationId,
						patientId: input.patientId,
						visitId: input.visitId || null,
						documentId: input.documentId || null,
						amountRub: depositAmountRub,
						method: "family_wallet",
						fiscalReceiptNumber: input.fiscalReceiptNumber || null,
						fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
						fiscalReceiptUrl: input.fiscalReceiptUrl || null,
						fiscalReceipt: input.fiscalReceipt || null,
						clientMutationId: input.clientMutationId
							? `${input.clientMutationId}:deposit`
							: null,
						payerFullName: input.payerFullName || null,
						payerInn: input.payerInn || null,
						payerBirthDate: input.payerBirthDate || null,
						payerIdentityDocument: input.payerIdentityDocument || null,
						payerRelationship: input.payerRelationship || null,
						taxDeductionCode: input.taxDeductionCode || null,
						note: effectivePaymentNote
							? `${effectivePaymentNote} (зачёт аванса / семейный депозит: ${depositAmountRub} ₽)`
							: `Смешанная оплата (зачёт аванса / семейный депозит: ${depositAmountRub} ₽)`,
						status: "paid",
					})
					.returning();
				depositPayment = depP;

				if (lockedPatient.familyGroupId) {
					const [famGroup] = await tx
						.select()
						.from(schema.familyGroups)
						.where(
							and(
								eq(schema.familyGroups.id, lockedPatient.familyGroupId),
								eq(schema.familyGroups.organizationId, organizationId),
							),
						)
						.for("update")
						.limit(1);

					if (famGroup) {
						const currentFamKop = Math.round(Number(famGroup.balance || 0) * 100);
						const newFamKop = Math.max(0, currentFamKop - resolvedDepositKop);
						const newFamRub = (newFamKop / 100).toFixed(2);
						await tx
							.update(schema.familyGroups)
							.set({
								balance: newFamRub,
							})
							.where(eq(schema.familyGroups.id, famGroup.id));
					}
				}
			}

			const chosenPrimary = electronicPayment ?? cashPayment ?? depositPayment ?? dmsPayment;
			if (!chosenPrimary) {
				throw new Error("Не удалось создать записи смешанной оплаты в базе данных.");
			}
			primaryPayment = chosenPrimary;
		} else {
			const effectiveMethod = (input.method === "split" || input.method === "mixed")
				? (resolvedDmsKop > 0 ? "insurance" : resolvedCashKop > 0 ? "cash" : resolvedDepositKop > 0 ? "family_wallet" : "card")
				: ((input.method as string) === "deposit" || (input.method as string) === "family_deposit")
				? "family_wallet"
				: input.method;

			const [singlePayment] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					amountRub: input.amountRub,
					method: effectiveMethod,
					fiscalReceiptNumber: input.fiscalReceiptNumber || null,
					fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
					fiscalReceiptUrl: input.fiscalReceiptUrl || null,
					fiscalReceipt: input.fiscalReceipt || null,
					clientMutationId: input.clientMutationId || null,
					payerFullName: input.payerFullName || null,
					payerInn: input.payerInn || null,
					payerBirthDate: input.payerBirthDate || null,
					payerIdentityDocument: input.payerIdentityDocument || null,
					payerRelationship: input.payerRelationship || null,
					taxDeductionCode: input.taxDeductionCode || null,
					note: effectivePaymentNote,
					status: "paid",
				})
				.returning();

			if (!singlePayment) {
				throw new Error("Не удалось создать запись платежа в базе данных.");
			}
			primaryPayment = singlePayment;

			if (
				effectiveMethod === "insurance" &&
				input.guaranteeLetterId &&
				input.guaranteeLetterId !== "emergency" &&
				input.guaranteeLetterId !== "none"
			) {
				const [letter] = await tx
					.select()
					.from(schema.dmsGuaranteeLetters)
					.where(
						and(
							eq(schema.dmsGuaranteeLetters.id, input.guaranteeLetterId),
							eq(schema.dmsGuaranteeLetters.organizationId, organizationId),
						),
					)
					.for("update")
					.limit(1);

				if (letter) {
					const nextUsed = Number(letter.usedAmountRub) + input.amountRub;
					const nextStatus = nextUsed >= Number(letter.maxCoverageRub) ? "exhausted" : letter.status;
					await tx
						.update(schema.dmsGuaranteeLetters)
						.set({
							usedAmountRub: nextUsed,
							status: nextStatus,
							updatedAt: new Date(),
						})
						.where(eq(schema.dmsGuaranteeLetters.id, letter.id));
				}
			}
		}

		if (input.documentId) {
			await tx
				.update(schema.generatedDocuments)
				.set({
					status: "issued",
					issuedAt: new Date(),
					...(isWarrantyOrFullDiscount ? { totalAmountRub: 0 } : {}),
				})
				.where(
					and(
						eq(schema.generatedDocuments.id, input.documentId),
						eq(schema.generatedDocuments.organizationId, organizationId),
						eq(schema.generatedDocuments.status, "draft"),
					),
				);
		}

		if (input.visitId && isWarrantyOrFullDiscount) {
			// Фиксируем закрытие актов выполненных работ визита по гарантии со 100% скидкой
			await tx
				.update(schema.generatedDocuments)
				.set({
					status: "issued",
					issuedAt: new Date(),
					totalAmountRub: 0,
				})
				.where(
					and(
						eq(schema.generatedDocuments.organizationId, organizationId),
						eq(schema.generatedDocuments.visitId, input.visitId),
						eq(schema.generatedDocuments.kind, "completed_works_act"),
						eq(schema.generatedDocuments.status, "draft"),
					),
				);
		}

		// Автоматический перевод визита в signed и связанной записи в completed при полной оплате или 100% гарантии
		if (input.visitId && lockedVisit) {
			const isVisitFullySettled =
				isWarrantyOrFullDiscount ||
				incomingPaymentKopecks >= remainingVisitKopecks;

			if (isVisitFullySettled) {
				if (lockedVisit.status === "draft") {
					await tx
						.update(schema.visits)
						.set({
							status: "signed",
							signedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(schema.visits.id, input.visitId),
								eq(schema.visits.organizationId, organizationId),
							),
						);
				}

				if (lockedVisit.appointmentId) {
					await tx
						.update(schema.appointments)
						.set({
							status: "completed",
						})
						.where(
							and(
								eq(schema.appointments.id, lockedVisit.appointmentId),
								eq(schema.appointments.organizationId, organizationId),
							),
						);
				}

				// Автоматическое списание расходных материалов со склада по техкартам процедур (BOM)
				try {
					await deductMaterialsForVisit(tx, {
						organizationId,
						visitId: input.visitId,
						userId: input.payerFullName || null,
						transactionType: "auto_deduct",
					});
				} catch (deductErr) {
					console.warn(
						`[billingQuery] Автоматическое списание материалов по визиту ${input.visitId} завершилось с предупреждением:`,
						deductErr,
					);
				}

				await tx
					.update(schema.treatmentItems)
					.set({
						status: "completed",
					})
					.where(
						and(
							eq(schema.treatmentItems.organizationId, organizationId),
							eq(schema.treatmentItems.visitId, input.visitId),
							ne(schema.treatmentItems.status, "completed"),
							ne(schema.treatmentItems.status, "cancelled"),
						),
					);
			}
		}

		const { effectiveFdNumber, effectiveReceiptIssuedAt, finalFiscalReceipt } =
			await recordCashAndFiscalAccounting(tx, {
				organizationId,
				input,
				primaryPayment,
				incomingPaymentKopecks,
				isWarrantyOrFullDiscount,
				isSplit,
				resolvedCashKop,
				resolvedElectronicKop,
				resolvedDmsKop,
				resolvedDepositKop,
			});

		return {
			id: primaryPayment.id,
			organizationId: primaryPayment.organizationId,
			patientId: primaryPayment.patientId,
			visitId: primaryPayment.visitId,
			documentId: primaryPayment.documentId,
			amountRub: input.amountRub,
			method: (input.method === "split" || input.method === "mixed") ? "card" : primaryPayment.method,
			clientMutationId: input.clientMutationId || primaryPayment.clientMutationId,
			fiscalReceiptNumber: effectiveFdNumber || primaryPayment.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: effectiveReceiptIssuedAt,
			fiscalReceiptUrl: primaryPayment.fiscalReceiptUrl,
			fiscalReceipt: finalFiscalReceipt,
			payerFullName: primaryPayment.payerFullName,
			payerInn: primaryPayment.payerInn,
			payerBirthDate: primaryPayment.payerBirthDate,
			payerIdentityDocument: primaryPayment.payerIdentityDocument,
			payerRelationship: primaryPayment.payerRelationship,
			taxDeductionCode: narrowTaxDeductionCode(primaryPayment.taxDeductionCode),
			note: primaryPayment.note,
			createdAt: primaryPayment.createdAt.toISOString(),
			paidAt: primaryPayment.paidAt.toISOString(),
			status: primaryPayment.status,
		};
	});
}
