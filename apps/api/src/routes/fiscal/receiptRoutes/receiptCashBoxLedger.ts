/**
 * receiptCashBoxLedger.ts — Layer 2: Cash Register Ledger, Shift Inflow & Drawer Balance Mutation.
 *
 * Updates:
 * - Cash box balance (cashBoxes table with atomic numeric math)
 * - Active shift totals (cashBoxShifts table)
 * - Shift audit operations log (cashOperations table)
 */

import { kopecksToRub, parseKopecks } from "@dental/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	patients,
	payments,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import type { ApplyCashBoxReceiptParams, DbClientOrTransaction, PrintResultMetadata } from "./types.js";

function resolveSafeBoxBalanceKop(box: {
	balanceKopecks: number | null | undefined;
	balanceRub: number;
}): number {
	const kop = box.balanceKopecks ?? 0;
	const rub = Number(box.balanceRub || 0);
	return kop !== 0 || rub === 0 ? kop : parseKopecks(rub);
}

export interface ApplyCashBoxReceiptOptions {
	readonly skipDuplicatePaymentCheck?: boolean | undefined;
}

export async function applyCashBoxFiscalReceipt(
	tx: DbClientOrTransaction,
	orgId: string,
	data: ApplyCashBoxReceiptParams,
	printResult: PrintResultMetadata,
	options?: ApplyCashBoxReceiptOptions,
): Promise<void> {
	// ─────────────────────────────────────────────────────────────────────────
	// ANTI-DOUBLE-INFLOW GUARD (ROT-001):
	// Prevent 2x double counting when processCashboxPayment already recorded the payment.
	// When direct POST /api/fiscal/receipts creates its own payment row inside finalizeKktPrintAndBuffer,
	// `options.skipDuplicatePaymentCheck` is true so drawer & shift totals are updated once.
	// ─────────────────────────────────────────────────────────────────────────
	if (
		!options?.skipDuplicatePaymentCheck &&
		data.clientMutationId &&
		data.clientMutationId.trim().length > 0
	) {
		const mutationId = data.clientMutationId.trim();
		const baseMutationId = mutationId.split("#")[0]?.trim() || mutationId;
		const [existingPayment] = await tx
			.select({ id: payments.id })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					sql`(
						${payments.clientMutationId} = ${mutationId}
						OR ${payments.clientMutationId} = ${baseMutationId}
						OR starts_with(${payments.clientMutationId}, ${`${baseMutationId}#`})
						OR starts_with(${payments.clientMutationId}, ${`${baseMutationId}:`})
					)`,
				),
			)
			.limit(1);

		if (existingPayment) {
			return;
		}
	}

	await ensureOrganizationCashBoxes(tx, orgId);
	const allBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
		.orderBy(asc(cashBoxes.createdAt), asc(cashBoxes.id))
		.for("update");

	if (!allBoxes || allBoxes.length === 0) return;

	let validPatientId: string | null = null;
	if (data.patientId) {
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.patientId);
		if (isUuid) {
			const [p] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (p) {
				validPatientId = p.id;
			}
		}
	}

	const firstBox = allBoxes[0];
	if (!firstBox) return;

	const mainBox = allBoxes.find((b) => b.isMain || b.type === "main") ?? firstBox;
	const cashlessBox =
		allBoxes.find((b) => b.type === "cashless") ??
		allBoxes.find((b) => b.isCashless) ??
		mainBox;
	const chosenBox = data.cashBoxId
		? (allBoxes.find((b) => b.id === data.cashBoxId) ?? mainBox)
		: mainBox;

	const cashKop = data.cashKopecks || 0;
	const electronicKop = (data.electronicCardKopecks || 0) + (data.sbpKopecks || 0);
	const isChosenCashless = Boolean(
		chosenBox.isCashless || chosenBox.type === "cashless" || chosenBox.type === "sbp",
	);

	// When a specific cashBoxId is passed, route physical cash to chosenBox and card/SBP to cashlessBox (unless chosenBox itself is cashless).
	if (data.cashBoxId && !isChosenCashless) {
		if (cashKop > 0 || (cashKop === 0 && electronicKop === 0)) {
			const amountRub = kopecksToRub(cashKop);
			const balanceBeforeKop = resolveSafeBoxBalanceKop(chosenBox);
			const balanceAfterKop = balanceBeforeKop + cashKop;
			const balanceBefore = kopecksToRub(balanceBeforeKop);
			const balanceAfter = kopecksToRub(balanceAfterKop);

			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					balanceKopecks: balanceAfterKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, chosenBox.id), eq(cashBoxes.organizationId, orgId)));

			const [activeShift] = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.cashBoxId, chosenBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.for("update")
				.limit(1);

			if (activeShift && cashKop > 0) {
				const prevIncomeKop =
					activeShift.incomeTotalKopecks > 0 || Number(activeShift.incomeTotalRub || 0) === 0
						? activeShift.incomeTotalKopecks
						: parseKopecks(activeShift.incomeTotalRub);
				const nextIncomeKop = prevIncomeKop + cashKop;
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: kopecksToRub(nextIncomeKop),
						incomeTotalKopecks: nextIncomeKop,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: chosenBox.id,
				shiftId: activeShift?.id ?? null,
				operationType: "income",
				amountRub,
				amountKopecks: cashKop,
				balanceBeforeRub: balanceBefore,
				balanceBeforeKopecks: BigInt(balanceBeforeKop),
				balanceAfterRub: balanceAfter,
				balanceAfterKopecks: BigInt(balanceAfterKop),
				reasonText:
					data.totalKopecks === 0
						? "Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)"
						: `Фискальный чек 54-ФЗ (наличные) №${printResult.fiscalDocumentNumber || "б/н"}`,
				operatorName: data.cashierFullName || null,
				patientId: validPatientId,
				kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
				kkmReceiptUrl: printResult.ofdVerificationUrl || null,
				metadata: {
					cashKopecks: cashKop,
					prepaidKopecks: data.prepaidKopecks,
					creditKopecks: data.creditKopecks,
					totalKopecks: data.totalKopecks,
				},
			});
		}

		if (electronicKop > 0) {
			const amountRub = kopecksToRub(electronicKop);
			const balanceBeforeKop = resolveSafeBoxBalanceKop(cashlessBox);
			const balanceAfterKop = balanceBeforeKop + electronicKop;
			const balanceBefore = kopecksToRub(balanceBeforeKop);
			const balanceAfter = kopecksToRub(balanceAfterKop);

			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					balanceKopecks: balanceAfterKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, cashlessBox.id), eq(cashBoxes.organizationId, orgId)));

			const [activeShift] = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.cashBoxId, cashlessBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.for("update")
				.limit(1);

			if (activeShift && electronicKop > 0) {
				const prevIncomeKop =
					activeShift.incomeTotalKopecks > 0 || Number(activeShift.incomeTotalRub || 0) === 0
						? activeShift.incomeTotalKopecks
						: parseKopecks(activeShift.incomeTotalRub);
				const nextIncomeKop = prevIncomeKop + electronicKop;
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: kopecksToRub(nextIncomeKop),
						incomeTotalKopecks: nextIncomeKop,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashlessBox.id,
				shiftId: activeShift?.id ?? null,
				operationType: "income",
				amountRub,
				amountKopecks: electronicKop,
				balanceBeforeRub: balanceBefore,
				balanceBeforeKopecks: BigInt(balanceBeforeKop),
				balanceAfterRub: balanceAfter,
				balanceAfterKopecks: BigInt(balanceAfterKop),
				reasonText: `Фискальный чек 54-ФЗ (безналичные) №${printResult.fiscalDocumentNumber || "б/н"}`,
				operatorName: data.cashierFullName || null,
				patientId: validPatientId,
				kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
				kkmReceiptUrl: printResult.ofdVerificationUrl || null,
				metadata: {
					electronicCardKopecks: data.electronicCardKopecks,
					sbpKopecks: data.sbpKopecks,
					totalKopecks: data.totalKopecks,
				},
			});
		}
		return;
	}

	if (data.cashBoxId && isChosenCashless) {
		const totalInflowKop = cashKop + electronicKop;
		const amountRub = kopecksToRub(totalInflowKop);
		const balanceBeforeKop = resolveSafeBoxBalanceKop(chosenBox);
		const balanceAfterKop = balanceBeforeKop + totalInflowKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				balanceKopecks: balanceAfterKop,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, chosenBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, chosenBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && totalInflowKop > 0) {
			const prevIncomeKop =
				activeShift.incomeTotalKopecks > 0 || Number(activeShift.incomeTotalRub || 0) === 0
					? activeShift.incomeTotalKopecks
					: parseKopecks(activeShift.incomeTotalRub);
			const nextIncomeKop = prevIncomeKop + totalInflowKop;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: kopecksToRub(nextIncomeKop),
					incomeTotalKopecks: nextIncomeKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: chosenBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			amountKopecks: totalInflowKop,
			balanceBeforeRub: balanceBefore,
			balanceBeforeKopecks: BigInt(balanceBeforeKop),
			balanceAfterRub: balanceAfter,
			balanceAfterKopecks: BigInt(balanceAfterKop),
			reasonText:
				data.totalKopecks === 0
					? "Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)"
					: `Фискальный чек 54-ФЗ №${printResult.fiscalDocumentNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				cashKopecks: data.cashKopecks,
				electronicCardKopecks: data.electronicCardKopecks,
				sbpKopecks: data.sbpKopecks,
				prepaidKopecks: data.prepaidKopecks,
				creditKopecks: data.creditKopecks,
				totalKopecks: data.totalKopecks,
			},
		});
		return;
	}

	// Automatic routing: cash -> mainBox, card/sbp -> cashlessBox
	if (cashKop > 0 || (cashKop === 0 && electronicKop === 0)) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBeforeKop = resolveSafeBoxBalanceKop(mainBox);
		const balanceAfterKop = balanceBeforeKop + cashKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				balanceKopecks: balanceAfterKop,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, mainBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, mainBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && cashKop > 0) {
			const prevIncomeKop =
				activeShift.incomeTotalKopecks > 0 || Number(activeShift.incomeTotalRub || 0) === 0
					? activeShift.incomeTotalKopecks
					: parseKopecks(activeShift.incomeTotalRub);
			const nextIncomeKop = prevIncomeKop + cashKop;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: kopecksToRub(nextIncomeKop),
					incomeTotalKopecks: nextIncomeKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: mainBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			amountKopecks: cashKop,
			balanceBeforeRub: balanceBefore,
			balanceBeforeKopecks: BigInt(balanceBeforeKop),
			balanceAfterRub: balanceAfter,
			balanceAfterKopecks: BigInt(balanceAfterKop),
			reasonText: `Фискальный чек 54-ФЗ (наличные) №${printResult.fiscalDocumentNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				cashKopecks: cashKop,
				totalKopecks: data.totalKopecks,
			},
		});
	}

	if (electronicKop > 0) {
		const amountRub = kopecksToRub(electronicKop);
		const balanceBeforeKop = resolveSafeBoxBalanceKop(cashlessBox);
		const balanceAfterKop = balanceBeforeKop + electronicKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				balanceKopecks: balanceAfterKop,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, cashlessBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, cashlessBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && electronicKop > 0) {
			const prevIncomeKop =
				activeShift.incomeTotalKopecks > 0 || Number(activeShift.incomeTotalRub || 0) === 0
					? activeShift.incomeTotalKopecks
					: parseKopecks(activeShift.incomeTotalRub);
			const nextIncomeKop = prevIncomeKop + electronicKop;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: kopecksToRub(nextIncomeKop),
					incomeTotalKopecks: nextIncomeKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashlessBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			amountKopecks: electronicKop,
			balanceBeforeRub: balanceBefore,
			balanceBeforeKopecks: BigInt(balanceBeforeKop),
			balanceAfterRub: balanceAfter,
			balanceAfterKopecks: BigInt(balanceAfterKop),
			reasonText:
				data.totalKopecks === 0
					? "Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)"
					: `Фискальный чек 54-ФЗ (безналичные) №${printResult.fiscalDocumentNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				electronicCardKopecks: data.electronicCardKopecks,
				sbpKopecks: data.sbpKopecks,
				totalKopecks: data.totalKopecks,
			},
		});
	}
}
