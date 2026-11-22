/**
 * apps/api/src/routes/cashbox/paymentStages/dmsStage.ts
 *
 * Stage 6: Voluntary Health Insurance (DMS) Guarantee Letter Locking & Coverage Deduction.
 * Governed by Mandate 8e, 8v, 8bm, 8bo (Emergency Overdraft & Float Defect Elimination).
 */

import { and, eq, or } from "drizzle-orm";
import { kopecksToNumericString, kopecksToRubles, parseKopecks } from "@dental/shared";
import { dmsGuaranteeLetters } from "../../../db/schema.js";
import type { PaymentProcessingContext, StageStepResult, TenantTransaction } from "./types.js";

export async function validateAndLockDmsCoverage(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment || ctx.requiredDmsKopecks <= 0n) {
		return { success: true };
	}

	const {
		orgId,
		body,
		requiredDmsKopecks,
		guaranteeLetterId,
		resolvedPatientId,
	} = ctx;

	const isUrgentCarePayment = Boolean(
		body.allowOverdraft ||
			body.isUrgentCare ||
			body.isEmergency ||
			body.hasAcutePain ||
			(body.note &&
				/(острая боль|экстрен|неотлож|urgent|emergency|overdraft)/i.test(body.note)),
	);

	const isEmergencyLetterAlias = Boolean(
		guaranteeLetterId === "emergency" ||
			guaranteeLetterId === "emergency_pending_letter" ||
			guaranteeLetterId === "none" ||
			guaranteeLetterId === "acute-pain",
	);
	ctx.isEmergencyLetterAlias = isEmergencyLetterAlias;

	let lockedDmsLetter: typeof dmsGuaranteeLetters.$inferSelect | null = null;
	let dmsAmountToDeductKop = 0n;
	let newDmsUsedRub = 0;
	let isDmsExhausted = false;

	if (isEmergencyLetterAlias || (isUrgentCarePayment && !guaranteeLetterId)) {
		// Mandate 8e: Acute pain / emergency bypass - proceed with pending letter
		lockedDmsLetter = null;
		dmsAmountToDeductKop = requiredDmsKopecks;
	} else {
		if (guaranteeLetterId) {
			const [matched] = await tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, guaranteeLetterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);
			lockedDmsLetter = matched ?? null;
		} else if (resolvedPatientId) {
			const activeLetters = await tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.patientId, resolvedPatientId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
						or(
							eq(dmsGuaranteeLetters.status, "active"),
							eq(dmsGuaranteeLetters.status, "approved"),
						),
					),
				)
				.for("update");
			lockedDmsLetter = activeLetters[0] ?? null;
		}

		if (!lockedDmsLetter) {
			if (isUrgentCarePayment) {
				lockedDmsLetter = null;
				dmsAmountToDeductKop = requiredDmsKopecks;
			} else {
				return {
					failure: {
						kind: "dms_letter_not_found",
						guaranteeLetterId: guaranteeLetterId || "не указан",
					},
				};
			}
		} else {
			// [FLOAT-DEFECT FIX]: Устранение round-trip rublesToKopecks(Number(lockedDmsLetter.usedAmountRub))
			const curUsedKop = BigInt(parseKopecks(lockedDmsLetter.usedAmountRub ?? 0));
			const maxCovKop = BigInt(parseKopecks(lockedDmsLetter.maxCoverageRub ?? 0));

			if (maxCovKop > 0n && curUsedKop + requiredDmsKopecks > maxCovKop) {
				if (isUrgentCarePayment) {
					// Soft Overdraft: Mandate 8e & 8v - do not abort transaction, record exhausted status
					dmsAmountToDeductKop = requiredDmsKopecks;
					const nextUsedKop = curUsedKop + dmsAmountToDeductKop;
					newDmsUsedRub = kopecksToRubles(Number(nextUsedKop));
					isDmsExhausted = true;
				} else {
					return {
						failure: {
							kind: "insufficient_dms_coverage",
							letterNumber: lockedDmsLetter.letterNumber,
							availableRub: kopecksToNumericString(Number(maxCovKop - curUsedKop)),
							requiredRub: kopecksToNumericString(Number(requiredDmsKopecks)),
						},
					};
				}
			} else {
				dmsAmountToDeductKop = requiredDmsKopecks;
				const nextUsedKop = curUsedKop + dmsAmountToDeductKop;
				newDmsUsedRub = kopecksToRubles(Number(nextUsedKop));
				isDmsExhausted = maxCovKop > 0n && nextUsedKop >= maxCovKop;
			}
		}
	}

	ctx.lockedDmsLetter = lockedDmsLetter;
	ctx.dmsAmountToDeductKop = dmsAmountToDeductKop;
	ctx.newDmsUsedRub = newDmsUsedRub;
	ctx.isDmsExhausted = isDmsExhausted;

	return { success: true };
}

export async function finalizeDmsDeduction(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<void> {
	if (
		ctx.isWarrantyPayment ||
		ctx.dmsAmountToDeductKop <= 0n ||
		!ctx.lockedDmsLetter
	) {
		return;
	}

	const { orgId, lockedDmsLetter, newDmsUsedRub, isDmsExhausted } = ctx;

	await tx
		.update(dmsGuaranteeLetters)
		.set({
			usedAmountRub: newDmsUsedRub,
			...(isDmsExhausted ? { status: "exhausted" } : {}),
		})
		.where(
			and(
				eq(dmsGuaranteeLetters.id, lockedDmsLetter.id),
				eq(dmsGuaranteeLetters.organizationId, orgId),
			),
		);
}
