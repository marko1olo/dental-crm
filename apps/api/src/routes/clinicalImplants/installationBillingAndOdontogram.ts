import { and, eq } from "drizzle-orm";
import type { createImplantInstallationSchema } from "@dental/shared";
import type { z } from "zod";
import { db } from "../../db/client.js";
import {
	invoiceItems,
	patientInvoices,
	serviceCatalogItems,
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
	let resolvedPriceRub: number | null =
		input.operationPriceRub !== undefined && input.operationPriceRub !== null
			? Number(input.operationPriceRub)
			: null;

	if (resolvedPriceRub === null && input.catalogItemId) {
		const [catalogItem] = await tx
			.select()
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.id, input.catalogItemId),
					eq(serviceCatalogItems.organizationId, orgId),
				),
			)
			.limit(1);
		if (catalogItem) {
			resolvedPriceRub = Number(catalogItem.priceRub);
		}
	}

	if (resolvedPriceRub === null) {
		const [implantService] = await tx
			.select()
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.organizationId, orgId),
					eq(serviceCatalogItems.code, "A16.07.054"),
				),
			)
			.limit(1);
		if (implantService) {
			resolvedPriceRub = Number(implantService.priceRub);
		}
	}

	const operationPriceRub = resolvedPriceRub ?? 0;
	const operationPriceKopecks = BigInt(Math.round(operationPriceRub * 100));
	const implantCostKopecks = BigInt(Math.round(implantCost * 100));
	const consumablesCostKopecks = BigInt(Math.round(consumablesCost * 100));
	const totalMaterialsCostKopecks = implantCostKopecks + consumablesCostKopecks;
	const doctorGrossMarginKopecks = operationPriceKopecks - totalMaterialsCostKopecks;
	const netDoctorIncomeKopecks = doctorGrossMarginKopecks > 0n ? doctorGrossMarginKopecks : 0n;

	const totalMaterialsCostRub = Number(totalMaterialsCostKopecks) / 100;
	const doctorGrossMarginRub = Number(doctorGrossMarginKopecks) / 100;
	const netDoctorIncomeRub = Number(netDoctorIncomeKopecks) / 100;

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
			const currentTotalKopecks = BigInt(Math.round(Number(existingInvoice.totalAmountRub || 0) * 100));
			const newTotalKopecks = currentTotalKopecks + operationPriceKopecks;
			const updatedTotalRub = Number(newTotalKopecks) / 100;
			await tx
				.update(patientInvoices)
				.set({
					totalAmountRub: updatedTotalRub,
					totalRub: String(updatedTotalRub),
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
			const currentTotalKopecks = BigInt(Math.round(Number(existing.totalAmountRub || 0) * 100));
			const newTotalKopecks = currentTotalKopecks + operationPriceKopecks;
			const updatedTotalRub = Number(newTotalKopecks) / 100;
			await tx
				.update(patientInvoices)
				.set({
					totalAmountRub: updatedTotalRub,
					totalRub: String(updatedTotalRub),
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
		const invoiceTotalRub = Number(operationPriceKopecks) / 100;
		const [newInvoice] = await tx
			.insert(patientInvoices)
			.values({
				organizationId: orgId,
				patientId: input.patientId,
				visitId: input.visitId ?? null,
				totalAmountRub: invoiceTotalRub,
				totalRub: String(invoiceTotalRub),
				status: "issued",
				issuedAt: new Date(),
			})
			.returning();
		linkedInvoiceId = newInvoice?.id ?? null;
	}

	// Строгая запись позиции в invoiceItems с точными копейками (Мандат 8bm)
	if (linkedInvoiceId) {
		await tx.insert(invoiceItems).values({
			organizationId: orgId,
			invoiceId: linkedInvoiceId,
			priceListItemId: input.catalogItemId ?? null,
			name: `Внутрикостная дентальная имплантация системы ${input.implantBrand} (Зуб FDI #${input.toothNumberFdi})`,
			quantity: "1",
			unitPriceKopecks: Number(operationPriceKopecks),
			discountPercent: "0",
			totalPriceKopecks: Number(operationPriceKopecks),
			serviceCode: "A16.07.054",
			toothCode: String(input.toothNumberFdi),
		});
	}

	// ВСЕГДА создаем позицию в treatmentItems (даже если visitId равен null) со строгим копеечным расчетом
	await tx.insert(treatmentItems).values({
		organizationId: orgId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		invoiceId: linkedInvoiceId,
		toothCode: String(input.toothNumberFdi),
		title: `Внутрикостная дентальная имплантация системы ${input.implantBrand} (Зуб FDI #${input.toothNumberFdi})`,
		priceRub: Number(operationPriceKopecks) / 100,
		unitPriceRub: Number(operationPriceKopecks) / 100,
		quantity: "1",
		status: "completed",
		notes: `Установлен имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм. Торк: ${input.finalInsertionTorqueNcm} Н·см.${isqMean !== null ? ` ISQ: ${Math.round(isqMean)}.` : ""}`,
	});

	const financialSummary = {
		operationPriceRub,
		operationPriceKopecks: operationPriceKopecks.toString(),
		totalAmountRub: operationPriceRub,
		totalAmountKopecks: operationPriceKopecks.toString(),
		implantCostRub: implantCost,
		implantCostKopecks: implantCostKopecks.toString(),
		consumablesCostRub: consumablesCost,
		consumablesCostKopecks: consumablesCostKopecks.toString(),
		totalMaterialsCostRub,
		totalMaterialsCostKopecks: totalMaterialsCostKopecks.toString(),
		doctorGrossMarginRub,
		doctorGrossMarginKopecks: doctorGrossMarginKopecks.toString(),
		netDoctorIncomeRub,
		netDoctorIncomeKopecks: netDoctorIncomeKopecks.toString(),
		invoiceId: linkedInvoiceId,
		marginPercent: operationPriceKopecks > 0n ? Number(((Number(doctorGrossMarginKopecks) / Number(operationPriceKopecks)) * 100).toFixed(1)) : 0,
	};

	const [existingTooth] = await tx
		.select()
		.from(toothStates)
		.where(
			and(
				eq(toothStates.organizationId, orgId),
				eq(toothStates.patientId, input.patientId),
				eq(toothStates.toothNumber, input.toothNumberFdi),
			),
		)
		.limit(1);

	const existingSurfaces = Array.isArray(existingTooth?.surfaces)
		? (existingTooth.surfaces as string[])
		: [];
	const mergedSurfaces = Array.from(new Set([...existingSurfaces, "implant_site"]));

	const newNote = `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (${isqMean !== null ? `ISQ: ${Math.round(isqMean)}, ` : ""}${input.finalInsertionTorqueNcm} Н·см, LOT: ${effectiveLot})`;
	const mergedNotes = existingTooth?.notes
		? `${existingTooth.notes}; ${newNote}`
		: newNote;

	if (existingTooth) {
		await tx
			.update(toothStates)
			.set({
				state: "Implant",
				surfaces: mergedSurfaces,
				notes: mergedNotes,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(toothStates.organizationId, orgId),
					eq(toothStates.patientId, input.patientId),
					eq(toothStates.toothNumber, input.toothNumberFdi),
				),
			);
	} else {
		await tx.insert(toothStates).values({
			organizationId: orgId,
			patientId: input.patientId,
			toothNumber: input.toothNumberFdi,
			state: "Implant",
			surfaces: mergedSurfaces,
			notes: mergedNotes,
		});
	}

	await tx.insert(toothStateHistory).values({
		organizationId: orgId,
		patientId: input.patientId,
		toothNumber: input.toothNumberFdi,
		newState: "Implant",
		newSurfaces: mergedSurfaces,
		reason: `Хирургическая установка имплантата ${input.implantBrand}. Протокол: ${protocol}`,
	});

	return financialSummary;
}
