/**
 * apps/api/src/routes/cashbox/paymentStages/giftCertificateStage.ts
 *
 * Stage 5: Gift Certificate Validation, Balance Locking & Value Deduction.
 * Governed by Mandate 8e, 8bm, 8bo (Luhn-16, Integer Math & Float Defect Elimination).
 */

import { and, eq, or, sql } from "drizzle-orm";
import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import { giftCertificates } from "../../../db/schema.js";
import type { PaymentProcessingContext, StageStepResult, TenantTransaction } from "./types.js";

export async function validateAndLockGiftCertificate(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment || ctx.requiredCertificateKopecks <= 0n) {
		return { success: true };
	}

	const { orgId, requiredCertificateKopecks, certificateNumber } = ctx;
	if (!certificateNumber) {
		return { success: true };
	}

	const cleanCertNumber = certificateNumber.replace(/[\s-]/g, "");
	const [cert] = await tx
		.select()
		.from(giftCertificates)
		.where(
			and(
				eq(giftCertificates.organizationId, orgId),
				or(
					eq(giftCertificates.serialNumber, certificateNumber),
					sql`REPLACE(REPLACE(${giftCertificates.serialNumber}, '-', ''), ' ', '') = ${cleanCertNumber}`,
				),
			),
		)
		.for("update")
		.limit(1);

	if (!cert) {
		return {
			failure: {
				kind: "certificate_not_found",
				certificateNumber,
			},
		};
	}

	if (cert.status === "depleted") {
		return {
			failure: {
				kind: "certificate_depleted",
				certificateNumber,
			},
		};
	}

	if (cert.status === "cancelled") {
		return {
			failure: {
				kind: "certificate_cancelled",
				certificateNumber,
			},
		};
	}

	const now = new Date();
	if (cert.expiresAt && new Date(cert.expiresAt) < now) {
		return {
			failure: {
				kind: "certificate_expired",
				certificateNumber,
				expiresAt: cert.expiresAt.toISOString(),
			},
		};
	}

	// [FLOAT-DEFECT FIX]: Чтение точных копеек из currentBalanceKopecks
	const currentBalKop = BigInt(cert.currentBalanceKopecks ?? 0);

	if (currentBalKop < requiredCertificateKopecks) {
		return {
			failure: {
				kind: "insufficient_certificate",
				certificateNumber,
				availableRub: kopecksToNumericString(Number(currentBalKop)),
				requiredRub: kopecksToNumericString(Number(requiredCertificateKopecks)),
			},
		};
	}

	ctx.lockedCertificate = cert;
	ctx.certAmountToDeductKop = requiredCertificateKopecks;
	const newBalKop = currentBalKop - ctx.certAmountToDeductKop;
	ctx.newCertBalanceKopecks = newBalKop;
	ctx.newCertBalanceRub = kopecksToNumericString(Number(newBalKop));

	return { success: true };
}

export async function finalizeGiftCertificateDeduction(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<void> {
	if (
		ctx.isWarrantyPayment ||
		ctx.certAmountToDeductKop <= 0n ||
		!ctx.lockedCertificate
	) {
		return;
	}

	const { orgId, body, lockedCertificate, newCertBalanceRub, newCertBalanceKopecks } = ctx;
	const newBalKop =
		newCertBalanceKopecks !== undefined
			? Number(newCertBalanceKopecks)
			: parseKopecks(newCertBalanceRub);
	const isDepleted = newBalKop <= 0;

	await tx
		.update(giftCertificates)
		.set({
			currentBalanceKopecks: newBalKop,
			status: isDepleted ? "depleted" : "active",
			notes: body.invoiceId
				? `${lockedCertificate.notes || ""}; Оплата счета ${body.invoiceId}`.trim().slice(0, 500)
				: lockedCertificate.notes,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(giftCertificates.id, lockedCertificate.id),
				eq(giftCertificates.organizationId, orgId),
			),
		);
}
