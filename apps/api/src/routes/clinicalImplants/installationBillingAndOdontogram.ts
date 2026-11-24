import { and, eq, notInArray } from "drizzle-orm";
import { type createImplantInstallationSchema, rublesToKopecks, kopecksToRubles, parseKopecks, toExactKopecks } from "@dental/shared";
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

function resolveCatalogPriceKopecks(item: {
	priceKopecks?: bigint | null;
	priceRub?: string | number | null;
}): bigint {
	const legacyRub = Number(item.priceRub ?? 0);
	const legacyKopecks = BigInt(rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : 0));
	if (typeof item.priceKopecks === "bigint" && (item.priceKopecks > 0n || legacyKopecks === 0n)) {
		return item.priceKopecks;
	}
	return legacyKopecks;
}

function resolveInvoiceTotalKopecks(invoice: {
	totalPriceKopecks?: bigint | null;
	totalAmountRub?: string | number | null;
	totalRub?: string | number | null;
}): bigint {
	const legacyKopecks = BigInt(parseKopecks(invoice.totalAmountRub ?? invoice.totalRub ?? 0));
	if (typeof invoice.totalPriceKopecks === "bigint" && (invoice.totalPriceKopecks > 0n || legacyKopecks === 0n)) {
		return invoice.totalPriceKopecks;
	}
	return legacyKopecks;
}

export async function linkBillingAndOdontogram(
	tx: DbExecutor,
	orgId: string,
	input: InstallationInput,
	implantCost: number | bigint,
	consumablesCost: number | bigint,
	effectiveLot: string,
	isqMean: number | null,
	protocol: string,
) {
	let operationPriceKopecks: bigint | null = null;
	if (input.operationPriceKopecks !== undefined && input.operationPriceKopecks !== null) {
		try {
			operationPriceKopecks = BigInt(input.operationPriceKopecks);
		} catch {
			operationPriceKopecks = null;
		}
	}

	if (operationPriceKopecks === null && input.operationPriceRub !== undefined && input.operationPriceRub !== null) {
		operationPriceKopecks = BigInt(rublesToKopecks(Number(input.operationPriceRub)));
	}

	if (operationPriceKopecks === null && input.catalogItemId) {
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
			operationPriceKopecks = resolveCatalogPriceKopecks(catalogItem);
		}
	}

	if (operationPriceKopecks === null) {
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
			operationPriceKopecks = resolveCatalogPriceKopecks(implantService);
		}
	}

	if (operationPriceKopecks === null) {
		operationPriceKopecks = 0n;
	}
	const operationPriceRub = kopecksToRubles(operationPriceKopecks);
	const implantCostKopecks =
		typeof implantCost === "bigint" ? implantCost : BigInt(rublesToKopecks(implantCost));
	const consumablesCostKopecks =
		typeof consumablesCost === "bigint" ? consumablesCost : BigInt(rublesToKopecks(consumablesCost));
	const implantCostRub = kopecksToRubles(implantCostKopecks);
	const consumablesCostRub = kopecksToRubles(consumablesCostKopecks);
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
					notInArray(patientInvoices.status, ["voided", "paid"]),
				),
			)
			.for("update")
			.limit(1);

		if (existingInvoice) {
			linkedInvoiceId = existingInvoice.id;
			const currentTotalKopecks = resolveInvoiceTotalKopecks(existingInvoice);
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
					notInArray(patientInvoices.status, ["voided", "paid"]),
				),
			)
			.for("update")
			.limit(1);

		if (existing) {
			linkedInvoiceId = existing.id;
			const currentTotalKopecks = resolveInvoiceTotalKopecks(existing);
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

	// Строгая запись позиции в invoiceItems с точными копейками без float-конверсии (Мандат 8bm)
	if (linkedInvoiceId) {
		const safeItemKopecks = toExactKopecks(operationPriceKopecks);
		await tx.insert(invoiceItems).values({
			organizationId: orgId,
			invoiceId: linkedInvoiceId,
			priceListItemId: input.catalogItemId ?? null,
			name: `Внутрикостная дентальная имплантация системы ${input.implantBrand} (Зуб FDI #${input.toothNumberFdi})`,
			quantity: "1",
			unitPriceKopecks: safeItemKopecks,
			discountPercent: "0",
			totalPriceKopecks: safeItemKopecks,
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

	const marginTenthsPercent =
		operationPriceKopecks > 0n
			? Number(
					(doctorGrossMarginKopecks * 1000n +
						(doctorGrossMarginKopecks >= 0n
							? operationPriceKopecks / 2n
							: -(operationPriceKopecks / 2n))) /
						operationPriceKopecks,
				)
			: 0;

	const financialSummary = {
		operationPriceRub,
		operationPriceKopecks: operationPriceKopecks.toString(),
		amountKopecks: operationPriceKopecks.toString(),
		totalAmountRub: operationPriceRub,
		totalAmountKopecks: operationPriceKopecks.toString(),
		implantCostRub,
		implantCostKopecks: implantCostKopecks.toString(),
		consumablesCostRub,
		consumablesCostKopecks: consumablesCostKopecks.toString(),
		totalMaterialsCostRub,
		totalMaterialsCostKopecks: totalMaterialsCostKopecks.toString(),
		doctorGrossMarginRub,
		doctorGrossMarginKopecks: doctorGrossMarginKopecks.toString(),
		netDoctorIncomeRub,
		netDoctorIncomeKopecks: netDoctorIncomeKopecks.toString(),
		invoiceId: linkedInvoiceId,
		marginPercent: marginTenthsPercent / 10,
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
