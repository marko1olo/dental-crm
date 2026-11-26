import { randomUUID } from "node:crypto";
import { and, eq, notInArray } from "drizzle-orm";
import { kopecksToRubles, formatKopecksToRubles, rublesToKopecks, sumKopecks } from "@dental/shared";
import type { TenantDb } from "../../../../db/rls.js";
import {
	invoiceItems,
	patientInvoices,
	patients,
	treatmentPlanItemsNew,
} from "../../../../db/schema.js";
import { formatInvoiceNumber } from "../../../invoiceRoutes/invoiceCalculationHelpers.js";
import { calculateEffectivePlanDiscount } from "../treatmentPlanTotalsCalculator.js";

export interface CreatedInvoiceSummary {
	id: string;
	number: string;
	invoiceNumber: string;
	patientId: string;
	patientName: string;
	treatmentPlanId: string | null;
	visitId: string | null;
	totalAmountRub: number;
	status: string;
	issuedAt: string;
	createdAt: string;
	items: Array<{
		id: string;
		name: string;
		quantity: number;
		unitPriceRub: number;
		priceRub: number;
		serviceCode?: string | undefined;
		toothCode?: string | undefined;
	}>;
}

export async function createInvoiceForApprovedPlan(
	tx: TenantDb,
	params: {
		organizationId: string;
		patientId: string;
		planId: string;
		planName: string;
		planTotalPriceRub?: string | number | null;
		discountMode?: string | null | undefined;
		planDiscountPercent?: number | null | undefined;
		planDiscountRub?: number | null | undefined;
		planDiscountKopecks?: bigint | number | null | undefined;
		totalPriceKopecks?: bigint | number | null | undefined;
	},
): Promise<CreatedInvoiceSummary> {
	const { organizationId, patientId, planId, planName, planTotalPriceRub } = params;
	const now = new Date();

	// [W13-BIZ-12] Исключаем voided/cancelled счета при проверке идемпотентности повторного утверждения плана
	const [existingInvoice] = await tx
		.select()
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.treatmentPlanId, planId),
				notInArray(patientInvoices.status, ["voided", "cancelled"]),
			),
		)
		.for("update")
		.limit(1);

	if (existingInvoice) {
		if (existingInvoice.totalPriceKopecks === 0n && (existingInvoice.totalAmountRub > 0 || Number(existingInvoice.totalRub || 0) > 0)) {
			const recoveredKop = BigInt(rublesToKopecks(existingInvoice.totalAmountRub ?? Number(existingInvoice.totalRub || 0)));
			await tx
				.update(patientInvoices)
				.set({ totalPriceKopecks: recoveredKop })
				.where(and(eq(patientInvoices.id, existingInvoice.id), eq(patientInvoices.organizationId, organizationId)));
			existingInvoice.totalPriceKopecks = recoveredKop;
		}

		const existingItems = await tx
			.select()
			.from(invoiceItems)
			.where(
				and(
					eq(invoiceItems.organizationId, organizationId),
					eq(invoiceItems.invoiceId, existingInvoice.id),
				),
			);

		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
			.limit(1);

		const issuedYear = existingInvoice.issuedAt
			? new Date(existingInvoice.issuedAt).getFullYear()
			: now.getFullYear();
		const deterministicReplayNumber = `СЧ-${issuedYear}-${existingInvoice.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

		return {
			id: existingInvoice.id,
			number: deterministicReplayNumber,
			invoiceNumber: deterministicReplayNumber,
			patientId,
			patientName: patient?.fullName || "Пациент",
			treatmentPlanId: planId,
			visitId: existingInvoice.visitId,
			totalAmountRub:
				existingInvoice.totalPriceKopecks != null && existingInvoice.totalPriceKopecks > 0n
					? kopecksToRubles(Number(existingInvoice.totalPriceKopecks))
					: (existingInvoice.totalAmountRub ?? Number(existingInvoice.totalRub || 0)),
			status: existingInvoice.status || "draft",
			issuedAt: existingInvoice.issuedAt ? new Date(existingInvoice.issuedAt).toISOString() : now.toISOString(),
			createdAt: existingInvoice.createdAt ? new Date(existingInvoice.createdAt).toISOString() : now.toISOString(),
			items: existingItems.map((it) => ({
				id: it.id,
				name: it.name,
				quantity: Number(it.quantity || 1),
				unitPriceRub: kopecksToRubles(it.unitPriceKopecks || 0),
				priceRub: kopecksToRubles(it.totalPriceKopecks || 0),
				serviceCode: it.serviceCode || undefined,
				toothCode: it.toothCode || undefined,
			})),
		};
	}

	const invoiceId = randomUUID();

	const planItems = await tx
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, planId),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		);

	const [patient] = await tx
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	const patientName = patient?.fullName || "Пациент";
	const invoiceNumber =
		formatInvoiceNumber("invoice", patientId) ||
		`СЧ-${now.getFullYear()}-${invoiceId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

	let totalAmountKopecks = 0;
	const returnedItems: CreatedInvoiceSummary["items"] = [];
	const itemsToInsert: Array<typeof invoiceItems.$inferInsert> = [];

	if (planItems.length > 0) {
		const rawLineData = planItems.map((it) => {
			const qty = Math.max(1, it.quantity || 1);
			const unitPrice = Number(it.price || 0);
			const lineDiscountRub = Number(it.discount || 0);
			const unitPriceKopecks = it.priceKopecks != null
				? Number(it.priceKopecks)
				: rublesToKopecks(unitPrice);
			const lineDiscountKopecks = it.discountKopecks != null
				? Number(it.discountKopecks)
				: rublesToKopecks(lineDiscountRub);
			const lineBaseKopecks = Math.max(0, unitPriceKopecks * qty - lineDiscountKopecks);
			return {
				it,
				qty,
				unitPriceKopecks,
				lineBaseKopecks,
			};
		});

		const sumOfLinesKopecks = sumKopecks(rawLineData.map((l) => l.lineBaseKopecks));

		const effectiveDiscount = calculateEffectivePlanDiscount({
			baseTotalKopecks: sumOfLinesKopecks,
			discountMode: params.discountMode ?? "plan_fixed",
			planDiscountPercent: Number(params.planDiscountPercent ?? 0),
			planDiscountRub: Number(params.planDiscountRub ?? 0),
			planDiscountKopecks: params.planDiscountKopecks,
		});

		const targetFinalTotalKopecks = effectiveDiscount.finalTotalKopecks;
		const totalDiscountToApplyKopecks = effectiveDiscount.discountKopecks;
		let remainingDiscountKopecks = totalDiscountToApplyKopecks;

		for (let i = 0; i < rawLineData.length; i++) {
			const line = rawLineData[i];
			if (!line) continue;
			let lineAdditionalDiscountKopecks = 0;

			if (totalDiscountToApplyKopecks > 0 && sumOfLinesKopecks > 0) {
				if (i === rawLineData.length - 1) {
					lineAdditionalDiscountKopecks = Math.min(line.lineBaseKopecks, remainingDiscountKopecks);
				} else {
					lineAdditionalDiscountKopecks = Math.min(
						line.lineBaseKopecks,
						Math.round((line.lineBaseKopecks * totalDiscountToApplyKopecks) / sumOfLinesKopecks),
					);
					lineAdditionalDiscountKopecks = Math.min(lineAdditionalDiscountKopecks, remainingDiscountKopecks);
				}
				remainingDiscountKopecks -= lineAdditionalDiscountKopecks;
			}

			const lineFinalKopecks = Math.max(0, line.lineBaseKopecks - lineAdditionalDiscountKopecks);
			const lineFinalRub = kopecksToRubles(lineFinalKopecks);
			const fullLinePriceKopecks = line.unitPriceKopecks * line.qty;
			const totalLineDiscountKopecks = Math.max(0, fullLinePriceKopecks - lineFinalKopecks);
			const effectiveDiscountPercent = fullLinePriceKopecks > 0
				? Math.min(100, Math.round((totalLineDiscountKopecks / fullLinePriceKopecks) * 100))
				: 0;

			const itemId = randomUUID();

			itemsToInsert.push({
				id: itemId,
				organizationId,
				invoiceId,
				priceListItemId:
					line.it.priceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line.it.priceId)
						? line.it.priceId
						: null,
				name: line.it.name || "Стоматологическая услуга плана лечения",
				quantity: String(line.qty),
				unitPriceKopecks: line.unitPriceKopecks,
				discountPercent: String(effectiveDiscountPercent),
				totalPriceKopecks: lineFinalKopecks,
				serviceCode: line.it.priceId || null,
				toothCode: line.it.toothNumber ? String(line.it.toothNumber) : null,
				createdAt: now,
			});

			returnedItems.push({
				id: itemId,
				name: line.it.name || "Стоматологическая услуга плана лечения",
				quantity: line.qty,
				unitPriceRub: kopecksToRubles(line.unitPriceKopecks),
				priceRub: lineFinalRub,
				serviceCode: line.it.priceId || undefined,
				toothCode: line.it.toothNumber ? String(line.it.toothNumber) : undefined,
			});
		}

		totalAmountKopecks = targetFinalTotalKopecks;
	} else {
		const rawTotalRub = Number(planTotalPriceRub || 0);
		const planDiscountKopNum =
			params.planDiscountKopecks != null ? Number(params.planDiscountKopecks) : 0;
		const hasAuthoritativeTotalKopecks =
			params.totalPriceKopecks != null &&
			(Number(params.totalPriceKopecks) > 0 || planDiscountKopNum > 0);
		const grossKopecks = hasAuthoritativeTotalKopecks
			? Number(params.totalPriceKopecks) + planDiscountKopNum
			: rublesToKopecks(rawTotalRub);

		const effectiveDiscount = calculateEffectivePlanDiscount({
			baseTotalKopecks: grossKopecks,
			discountMode: params.discountMode ?? "plan_fixed",
			planDiscountPercent: Number(params.planDiscountPercent ?? 0),
			planDiscountRub: Number(params.planDiscountRub ?? 0),
			planDiscountKopecks: params.planDiscountKopecks,
		});

		const finalTotalKopecks = effectiveDiscount.finalTotalKopecks;
		totalAmountKopecks = finalTotalKopecks;
		const totalAmountRub = kopecksToRubles(finalTotalKopecks);
		const itemId = randomUUID();
		const discountPercent = grossKopecks > 0
			? Math.min(100, Math.round((effectiveDiscount.discountKopecks / grossKopecks) * 100))
			: 0;

		itemsToInsert.push({
			id: itemId,
			organizationId,
			invoiceId,
			name: `План лечения: «${planName}»`,
			quantity: "1",
			unitPriceKopecks: grossKopecks,
			discountPercent: String(discountPercent),
			totalPriceKopecks: finalTotalKopecks,
			createdAt: now,
		});

		returnedItems.push({
			id: itemId,
			name: `План лечения: «${planName}»`,
			quantity: 1,
			unitPriceRub: kopecksToRubles(grossKopecks),
			priceRub: totalAmountRub,
		});
	}

	const finalTotalAmountRub = kopecksToRubles(totalAmountKopecks);
	const totalRubText = formatKopecksToRubles(totalAmountKopecks);

	await tx.insert(patientInvoices).values({
		id: invoiceId,
		organizationId,
		patientId,
		treatmentPlanId: planId,
		visitId: null,
		totalRub: totalRubText,
		totalAmountRub: finalTotalAmountRub,
		totalPriceKopecks: BigInt(totalAmountKopecks),
		status: "draft",
		issuedAt: now,
		createdAt: now,
	});

	if (itemsToInsert.length > 0) {
		await tx.insert(invoiceItems).values(itemsToInsert);
	}

	return {
		id: invoiceId,
		number: invoiceNumber,
		invoiceNumber,
		patientId,
		patientName,
		treatmentPlanId: planId,
		visitId: null,
		totalAmountRub: finalTotalAmountRub,
		status: "draft",
		issuedAt: now.toISOString(),
		createdAt: now.toISOString(),
		items: returnedItems,
	};
}
