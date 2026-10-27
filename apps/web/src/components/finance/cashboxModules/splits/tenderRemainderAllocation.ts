/**
 * tenderRemainderAllocation.ts — Layer 1: Kopeck-Exact Remainder Allocation.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: 1-click tender allocation, no manual math friction)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	MultiTenderStateRub,
	TenderAllocationTarget,
} from "../cashboxTypes.js";

/**
 * Мандат 8e, п. 9: распределение остатка: «Оплатить остаток картой / налом / с депозита / через СБП / сертификатом / бонусами / ДМС / 50/50».
 * Распределяет оставшуюся сумму до копейки без ручного ввода цифр.
 */
export function allocateRemainderToTender(params: {
	readonly totalDueRub: number;
	readonly currentTenders: MultiTenderStateRub;
	readonly targetTender: TenderAllocationTarget;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableCertificateRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly availableDmsCoverageRub?: number | undefined;
}): MultiTenderStateRub {
	const totalKop = rubToKopecks(params.totalDueRub);

	if (params.targetTender === "card_and_cash_5050") {
		let nonCardCashKop = 0;
		if (params.currentTenders.sbpRub) nonCardCashKop += rubToKopecks(params.currentTenders.sbpRub);
		if (params.currentTenders.depositRub) nonCardCashKop += rubToKopecks(params.currentTenders.depositRub);
		if (params.currentTenders.familyRub) nonCardCashKop += rubToKopecks(params.currentTenders.familyRub);
		if (params.currentTenders.certificateRub) nonCardCashKop += rubToKopecks(params.currentTenders.certificateRub);
		if (params.currentTenders.bonusRub) nonCardCashKop += rubToKopecks(params.currentTenders.bonusRub);
		if (params.currentTenders.dmsRub) nonCardCashKop += rubToKopecks(params.currentTenders.dmsRub);

		const remKop = Math.max(0, totalKop - nonCardCashKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;

		return {
			cardRub: kopecksToRub(halfCardKop),
			cashRub: kopecksToRub(halfCashKop),
			sbpRub: params.currentTenders.sbpRub,
			depositRub: params.currentTenders.depositRub,
			familyRub: params.currentTenders.familyRub,
			certificateRub: params.currentTenders.certificateRub || 0,
			bonusRub: params.currentTenders.bonusRub || 0,
			dmsRub: params.currentTenders.dmsRub || 0,
		};
	}

	let otherKop = 0;
	if (params.targetTender !== "card") otherKop += rubToKopecks(params.currentTenders.cardRub);
	if (params.targetTender !== "cash") otherKop += rubToKopecks(params.currentTenders.cashRub);
	if (params.targetTender !== "sbp") otherKop += rubToKopecks(params.currentTenders.sbpRub);
	if (params.targetTender !== "deposit") otherKop += rubToKopecks(params.currentTenders.depositRub);
	if (params.targetTender !== "family") otherKop += rubToKopecks(params.currentTenders.familyRub);
	if (params.targetTender !== "certificate") otherKop += rubToKopecks(params.currentTenders.certificateRub || 0);
	if (params.targetTender !== "bonus") otherKop += rubToKopecks(params.currentTenders.bonusRub || 0);
	if (params.targetTender !== "dms") otherKop += rubToKopecks(params.currentTenders.dmsRub || 0);

	const rawRemKop = Math.max(0, totalKop - otherKop);
	let targetAllocatedKop = rawRemKop;

	if (params.targetTender === "deposit") {
		const maxDepKop = rubToKopecks(Math.max(0, params.patientDepositRub || 0));
		targetAllocatedKop = Math.min(rawRemKop, maxDepKop);
	} else if (params.targetTender === "family") {
		const maxFamKop = rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0));
		targetAllocatedKop = Math.min(rawRemKop, maxFamKop);
	} else if (params.targetTender === "certificate" && typeof params.availableCertificateRub === "number") {
		const maxCertKop = rubToKopecks(Math.max(0, params.availableCertificateRub));
		targetAllocatedKop = Math.min(rawRemKop, maxCertKop);
	} else if (params.targetTender === "bonus" && typeof params.availableBonusRub === "number") {
		const maxBonusKop = rubToKopecks(Math.max(0, params.availableBonusRub));
		targetAllocatedKop = Math.min(rawRemKop, maxBonusKop);
	} else if (params.targetTender === "dms" && typeof params.availableDmsCoverageRub === "number") {
		const maxDmsKop = rubToKopecks(Math.max(0, params.availableDmsCoverageRub));
		targetAllocatedKop = Math.min(rawRemKop, maxDmsKop);
	}

	return {
		cardRub: params.targetTender === "card" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.cardRub,
		cashRub: params.targetTender === "cash" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.cashRub,
		sbpRub: params.targetTender === "sbp" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.sbpRub,
		depositRub: params.targetTender === "deposit" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.depositRub,
		familyRub: params.targetTender === "family" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.familyRub,
		certificateRub: params.targetTender === "certificate" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.certificateRub || 0),
		bonusRub: params.targetTender === "bonus" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.bonusRub || 0),
		dmsRub: params.targetTender === "dms" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.dmsRub || 0),
	};
}
