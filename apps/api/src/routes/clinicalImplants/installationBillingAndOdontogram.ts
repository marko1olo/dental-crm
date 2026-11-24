import { and, eq } from "drizzle-orm";
import { type createImplantInstallationSchema, rublesToKopecks, kopecksToRubles, parseKopecks } from "@dental/shared";
import type { z } from "zod";
import type { DbExecutor } from "../../services/treatmentConsumables/types.js";
import {
	invoiceItems,
	patientInvoices,
	serviceCatalogItems,
	toothStateHistory,
	toothStates,
	treatmentItems,
} from "../../db/schema.js";

type InstallationInput = z.infer<typeof createImplantInstallationSchema>;

export async function linkBillingAndOdontogram(
	tx: DbExecutor,
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
	const operationPriceKopecks = BigInt(rublesToKopecks(operationPriceRub));
	const implantCostKopecks = BigInt(rublesToKopecks(implantCost));
	const consumablesCostKopecks = BigInt(rublesToKopecks(consumablesCost));
	const totalMaterialsCostKopecks = implantCostKopecks + consumablesCostKopecks;
	const doctorGrossMarginKopecks = operationPriceKopecks - totalMaterialsCostKopecks;
	const netDoctorIncomeKopecks = doctorGrossMarginKopecks > 0n ? doctorGrossMarginKopecks : 0n;

	const totalMaterialsCostRub = kopecksToRubles(totalMaterialsCostKopecks);
	const doctorGrossMarginRub = kopecksToRubles(doctorGrossMarginKopecks);
	const netDoctorIncomeRub = kopecksToRubles(netDoctorIncomeKopecks);

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
			const currentTotalKopecks = BigInt(
				existingInvoice.totalPriceKopecks && existingInvoice.totalPriceKopecks > 0n
					? existingInvoice.totalPriceKopecks
					: parseKopecks(existingInvoice.totalAmountRub ?? existingInvoice.totalRub ?? 0),
			);
			const newTotalKopecks = currentTotalKopecks + operationPriceKopecks;
			const updatedTotalRub = kopecksToRubles(newTotalKopecks);
			await tx
				.update(patientInvoices)
				.set({
					totalAmountRub: updatedTotalRub,
					totalRub: String(updatedTotalRub),
					totalPriceKopecks: newTotalKopecks,
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
			const currentTotalKopecks = BigInt(
				existing.totalPriceKopecks && existing.totalPriceKopecks > 0n
					? existing.totalPriceKopecks
					: parseKopecks(existing.totalAmountRub ?? existing.totalRub ?? 0),
			);
			const newTotalKopecks = currentTotalKopecks + operationPriceKopecks;
			const updatedTotalRub = kopecksToRubles(newTotalKopecks);
			await tx
				.update(patientInvoices)
				.set({
					totalAmountRub: updatedTotalRub,
					totalRub: String(updatedTotalRub),
					totalPriceKopecks: newTotalKopecks,
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
		const invoiceTotalRub = kopecksToRubles(operationPriceKopecks);
		const [newInvoice] = await tx
			.insert(patientInvoices)
			.values({
				organizationId: orgId,
				patientId: input.patientId,
				visitId: input.visitId ?? null,
				totalAmountRub: invoiceTotalRub,
				totalRub: String(invoiceTotalRub),
				totalPriceKopecks: operationPriceKopecks,
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
		priceRub: kopecksToRubles(operationPriceKopecks),
		unitPriceRub: kopecksToRubles(operationPriceKopecks),
		priceKopecks: operationPriceKopecks,
		unitPriceKopecks: operationPriceKopecks,
		quantity: "1",
		status: "completed",
		notes: `Установлен имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм. Торк: ${input.finalInsertionTorqueNcm} Н·см.${isqMean !== null ? ` ISQ: ${Math.round(isqMean)}.` : ""}`,
	});

	const financialSummary = {
		operationPriceRub,
		operationPriceKopecks: operationPriceKopecks.toString(),
		amountKopecks: operationPriceKopecks.toString(),
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
