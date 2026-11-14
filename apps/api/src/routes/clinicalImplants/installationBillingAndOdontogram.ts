import { and, eq } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { db } from "../../db/client.js";
import {
	patientInvoices,
	toothStateHistory,
	toothStates,
	treatmentItems,
} from "../../db/schema.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;
type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function linkBillingAndOdontogram(
	tx: DatabaseTransaction,
	orgId: string,
	input: InstallationInput,
	implantCost: number,
	consumablesCost: number,
	effectiveLot: string,
	isqMean: number | null,
	protocol: string,
) {
	const operationPriceRub = Number(input.operationPriceRub ?? 45000);
	const totalMaterialsCostRub = implantCost + consumablesCost;
	const doctorGrossMarginRub = operationPriceRub - totalMaterialsCostRub;
	const netDoctorIncomeRub = Math.max(0, doctorGrossMarginRub);

	let linkedInvoiceId: string | null = null;

	if (input.invoiceId) {
		const [existingInvoice] = await tx
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.id, input.invoiceId),
					eq(patientInvoices.organizationId, orgId),
					eq(patientInvoices.patientId, input.patientId),
				),
			)
			.limit(1);

		if (existingInvoice) {
			linkedInvoiceId = existingInvoice.id;
			const updatedTotal = Number(existingInvoice.totalAmountRub || 0) + operationPriceRub;
			await tx
				.update(patientInvoices)
				.set({
					totalAmountRub: updatedTotal,
					totalRub: String(updatedTotal),
				})
				.where(
					and(
						eq(patientInvoices.id, existingInvoice.id),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}
	}

	if (!linkedInvoiceId && input.visitId) {
		const [existing] = await tx
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, orgId),
					eq(patientInvoices.visitId, input.visitId),
					eq(patientInvoices.patientId, input.patientId),
				),
			)
			.limit(1);

		if (existing) {
			linkedInvoiceId = existing.id;
			const updatedTotal = Number(existing.totalAmountRub || 0) + operationPriceRub;
			await tx
				.update(patientInvoices)
				.set({
					totalAmountRub: updatedTotal,
					totalRub: String(updatedTotal),
				})
				.where(
					and(
						eq(patientInvoices.id, existing.id),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}
	}

	if (!linkedInvoiceId) {
		const [newInvoice] = await tx
			.insert(patientInvoices)
			.values({
				organizationId: orgId,
				patientId: input.patientId,
				visitId: input.visitId ?? null,
				totalAmountRub: operationPriceRub,
				totalRub: String(operationPriceRub),
				status: "issued",
				issuedAt: new Date(),
			})
			.returning();
		linkedInvoiceId = newInvoice?.id ?? null;
	}

	// ВСЕГДА создаем позицию в treatmentItems (даже если visitId равен null)
	await tx.insert(treatmentItems).values({
		organizationId: orgId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		toothCode: String(input.toothNumberFdi),
		title: `Внутрикостная дентальная имплантация системы ${input.implantBrand} (Зуб FDI #${input.toothNumberFdi})`,
		priceRub: operationPriceRub,
		unitPriceRub: operationPriceRub,
		quantity: "1",
		status: "completed",
		notes: `Установлен имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм. Торк: ${input.finalInsertionTorqueNcm} Н·см.${isqMean !== null ? ` ISQ: ${Math.round(isqMean)}.` : ""}`,
	});

	const financialSummary = {
		operationPriceRub,
		implantCostRub: implantCost,
		consumablesCostRub: consumablesCost,
		totalMaterialsCostRub,
		doctorGrossMarginRub,
		netDoctorIncomeRub,
		invoiceId: linkedInvoiceId,
		marginPercent: operationPriceRub > 0 ? Number(((doctorGrossMarginRub / operationPriceRub) * 100).toFixed(1)) : 0,
	};

	await tx.delete(toothStates).where(and(eq(toothStates.organizationId, orgId), eq(toothStates.patientId, input.patientId), eq(toothStates.toothNumber, input.toothNumberFdi)));
	await tx.insert(toothStates).values({
		organizationId: orgId,
		patientId: input.patientId,
		toothNumber: input.toothNumberFdi,
		state: "Implant",
		surfaces: ["implant_site"],
		notes: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (${isqMean !== null ? `ISQ: ${Math.round(isqMean)}, ` : ""}${input.finalInsertionTorqueNcm} Н·см, LOT: ${effectiveLot})`,
	});

	await tx.insert(toothStateHistory).values({
		organizationId: orgId,
		patientId: input.patientId,
		toothNumber: input.toothNumberFdi,
		newState: "Implant",
		newSurfaces: ["implant_site"],
		reason: `Хирургическая установка имплантата ${input.implantBrand}. Протокол: ${protocol}`,
	});

	return financialSummary;
}
