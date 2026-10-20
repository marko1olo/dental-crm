/**
 * receiptCashBoxLedger.ts — Layer 2: Cash Register Ledger, Shift Inflow & Drawer Balance Mutation.
 *
 * Updates:
 * - Cash box balance (cashBoxes table with atomic numeric math)
 * - Active shift totals (cashBoxShifts table)
 * - Shift audit operations log (cashOperations table)
 */

import { kopecksToRub, parseKopecks } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	patients,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import type { ApplyCashBoxReceiptParams, DbClientOrTransaction, PrintResultMetadata } from "./types.js";

export async function applyCashBoxFiscalReceipt(
	tx: DbClientOrTransaction,
	orgId: string,
	data: ApplyCashBoxReceiptParams,
	printResult: PrintResultMetadata,
): Promise<void> {
	await ensureOrganizationCashBoxes(tx, orgId);
	const allBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
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
	const cashlessBox = allBoxes.find((b) => b.isCashless || b.type === "cashless") ?? mainBox;

	// If a specific cash box was selected by the cashier
	if (data.cashBoxId) {
		const chosenBox = allBoxes.find((b) => b.id === data.cashBoxId) ?? mainBox;
		const totalInflowKop = (data.cashKopecks || 0) + (data.electronicCardKopecks || 0) + (data.sbpKopecks || 0);
		const amountRub = kopecksToRub(totalInflowKop);
		const balanceBeforeKop = parseKopecks(chosenBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop + totalInflowKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} + ${amountRub})::numeric, 2)`,
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

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`round((${cashBoxShifts.incomeTotalRub} + ${amountRub})::numeric, 2)`,
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
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
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
	const cashKop = data.cashKopecks || 0;
	const electronicKop = (data.electronicCardKopecks || 0) + (data.sbpKopecks || 0);

	if (cashKop > 0 || (cashKop === 0 && electronicKop === 0)) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBeforeKop = parseKopecks(mainBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop + cashKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} + ${amountRub})::numeric, 2)`,
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

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`round((${cashBoxShifts.incomeTotalRub} + ${amountRub})::numeric, 2)`,
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
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
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
		const balanceBeforeKop = parseKopecks(cashlessBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop + electronicKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} + ${amountRub})::numeric, 2)`,
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

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`round((${cashBoxShifts.incomeTotalRub} + ${amountRub})::numeric, 2)`,
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
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
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
