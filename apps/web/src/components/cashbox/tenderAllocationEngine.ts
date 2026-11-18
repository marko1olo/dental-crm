/**
 * tenderAllocationEngine.ts — Layer 4: Multi-Tender Remainder Allocation & Combination Presets.
 *
 * Compliant with Mandate 8b (file size <= 400 lines) and integer kopeck precision.
 */

import { kopecksToRubles } from "@dental/shared";
import { rubToKopecks, kopecksToRub } from "./cashRegisterCatalogData.js";
import type {
	MultiTenderStateRub,
	TenderAllocationTarget,
	FastTenderPreset,
} from "./cashRegisterSplitsData.js";

export function createExactCashTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: 0, cashRub: totalDueRub, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

export function createFullCardTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: totalDueRub, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

export function createDepositAndCardComboTenders(totalDueRub: number, patientDepositRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const depKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, patientDepositRub))));
	const cardKop = Math.max(0, totalKop - depKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 };
}

export function createCertificateAndCardComboTenders(totalDueRub: number, certificateRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const certKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, certificateRub))));
	const cardKop = Math.max(0, totalKop - certKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: kopecksToRub(certKop), bonusRub: 0 };
}

export function createBonusAndCardComboTenders(totalDueRub: number, bonusRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const bonusKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, bonusRub))));
	const cardKop = Math.max(0, totalKop - bonusKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: kopecksToRub(bonusKop) };
}

export interface CombinedSplitCalculationParams {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamilyAccount?: boolean | undefined;
	readonly customAdvanceDeductionRub?: number | undefined;
}

export interface CombinedSplitCalculationResult {
	readonly totalDueRub: number;
	readonly totalDueKop: number;
	readonly advanceDeductedRub: number;
	readonly advanceDeductedKop: number;
	readonly advanceSource: "deposit" | "family" | "bonus" | "none";
	readonly remainderToPayRub: number;
	readonly remainderToPayKop: number;
	readonly cardRub: number;
	readonly cardKop: number;
	readonly cashRub: number;
	readonly cashKop: number;
	readonly tenders: MultiTenderStateRub;
	readonly isPennyExact: boolean;
	readonly descriptionRu: string;
}

export function calculateCombinedFamilyCashCardSplit(
	params: CombinedSplitCalculationParams,
): CombinedSplitCalculationResult {
	const totalKop = Number(rubToKopecks(Math.max(0, params.totalDueRub)));
	const depKop = Number(rubToKopecks(Math.max(0, params.patientDepositRub || 0)));
	const famKop = Number(rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0)));
	const bonusKop = Number(rubToKopecks(Math.max(0, params.availableBonusRub || 0)));

	let advanceKop = 0;
	let advanceSource: "deposit" | "family" | "bonus" | "none" = "none";

	if (params.customAdvanceDeductionRub !== undefined && params.customAdvanceDeductionRub > 0) {
		const customKop = Number(rubToKopecks(params.customAdvanceDeductionRub));
		const maxPossible = Math.max(depKop, famKop, bonusKop);
		advanceKop = Math.min(totalKop, Math.min(customKop, maxPossible));
		advanceSource = params.preferFamilyAccount && famKop > 0 ? "family" : depKop > 0 ? "deposit" : famKop > 0 ? "family" : "bonus";
	} else if (params.preferFamilyAccount && famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (depKop > 0) {
		advanceKop = Math.min(totalKop, depKop);
		advanceSource = "deposit";
	} else if (famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (bonusKop > 0) {
		advanceKop = Math.min(totalKop, bonusKop);
		advanceSource = "bonus";
	}

	const remKop = Math.max(0, totalKop - advanceKop);
	const cardKop = Math.floor(remKop / 2);
	const cashKop = remKop - cardKop;

	const tenders: MultiTenderStateRub = {
		cardRub: kopecksToRub(cardKop),
		cashRub: kopecksToRub(cashKop),
		sbpRub: 0,
		depositRub: advanceSource === "deposit" ? kopecksToRub(advanceKop) : 0,
		familyRub: advanceSource === "family" ? kopecksToRub(advanceKop) : 0,
		bonusRub: advanceSource === "bonus" ? kopecksToRub(advanceKop) : 0,
	};

	return {
		totalDueRub: kopecksToRub(totalKop),
		totalDueKop: totalKop,
		advanceDeductedRub: kopecksToRub(advanceKop),
		advanceDeductedKop: advanceKop,
		advanceSource,
		remainderToPayRub: kopecksToRub(remKop),
		remainderToPayKop: remKop,
		cardRub: kopecksToRub(cardKop),
		cardKop,
		cashRub: kopecksToRub(cashKop),
		cashKop,
		tenders,
		isPennyExact: cardKop + cashKop + advanceKop === totalKop,
		descriptionRu: `Аванс ${kopecksToRub(advanceKop)} ₽ + Карта ${kopecksToRub(cardKop)} ₽ + Наличные ${kopecksToRub(cashKop)} ₽`,
	};
}

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
	const totalKop = Number(rubToKopecks(params.totalDueRub));

	if (params.targetTender === "card_and_cash_5050") {
		let nonCardCashKop = 0;
		if (params.currentTenders.sbpRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.sbpRub));
		if (params.currentTenders.depositRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.depositRub));
		if (params.currentTenders.familyRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.familyRub));
		if (params.currentTenders.certificateRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.certificateRub));
		if (params.currentTenders.bonusRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.bonusRub));
		if (params.currentTenders.dmsRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.dmsRub));

		const remKop = Math.max(0, totalKop - nonCardCashKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;

		return {
			cardRub: kopecksToRub(halfCardKop),
			cashRub: kopecksToRub(halfCashKop),
			sbpRub: params.currentTenders.sbpRub,
			depositRub: params.currentTenders.depositRub,
			familyRub: params.currentTenders.familyRub,
			certificateRub: params.currentTenders.certificateRub,
			bonusRub: params.currentTenders.bonusRub,
			dmsRub: params.currentTenders.dmsRub,
		};
	}

	let otherKop = 0;
	if (params.targetTender !== "card" && params.currentTenders.cardRub) otherKop += Number(rubToKopecks(params.currentTenders.cardRub));
	if (params.targetTender !== "cash" && params.currentTenders.cashRub) otherKop += Number(rubToKopecks(params.currentTenders.cashRub));
	if (params.targetTender !== "sbp" && params.currentTenders.sbpRub) otherKop += Number(rubToKopecks(params.currentTenders.sbpRub));
	if (params.targetTender !== "deposit" && params.currentTenders.depositRub) otherKop += Number(rubToKopecks(params.currentTenders.depositRub));
	if (params.targetTender !== "family" && params.currentTenders.familyRub) otherKop += Number(rubToKopecks(params.currentTenders.familyRub));
	if (params.targetTender !== "certificate" && params.currentTenders.certificateRub) otherKop += Number(rubToKopecks(params.currentTenders.certificateRub));
	if (params.targetTender !== "bonus" && params.currentTenders.bonusRub) otherKop += Number(rubToKopecks(params.currentTenders.bonusRub));
	if (params.targetTender !== "dms" && params.currentTenders.dmsRub) otherKop += Number(rubToKopecks(params.currentTenders.dmsRub));

	let remKop = Math.max(0, totalKop - otherKop);

	if (params.targetTender === "deposit" && params.patientDepositRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.patientDepositRub)));
	} else if (params.targetTender === "family" && params.patientFamilyBalanceRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.patientFamilyBalanceRub)));
	} else if (params.targetTender === "certificate" && params.availableCertificateRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableCertificateRub)));
	} else if (params.targetTender === "bonus" && params.availableBonusRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableBonusRub)));
	} else if (params.targetTender === "dms" && params.availableDmsCoverageRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableDmsCoverageRub)));
	}

	const allocatedRub = kopecksToRub(remKop);

	return {
		cardRub: params.targetTender === "card" ? allocatedRub : params.currentTenders.cardRub,
		cashRub: params.targetTender === "cash" ? allocatedRub : params.currentTenders.cashRub,
		sbpRub: params.targetTender === "sbp" ? allocatedRub : params.currentTenders.sbpRub,
		depositRub: params.targetTender === "deposit" ? allocatedRub : params.currentTenders.depositRub,
		familyRub: params.targetTender === "family" ? allocatedRub : params.currentTenders.familyRub,
		certificateRub: params.targetTender === "certificate" ? allocatedRub : params.currentTenders.certificateRub,
		bonusRub: params.targetTender === "bonus" ? allocatedRub : params.currentTenders.bonusRub,
		dmsRub: params.targetTender === "dms" ? allocatedRub : params.currentTenders.dmsRub,
	};
}

export function getFastCombinedTenderPresets(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
}): readonly FastTenderPreset[] {
	const totalDue = params.totalDueRub || 0;
	const dep = params.patientDepositRub || 0;
	const fam = params.patientFamilyBalanceRub || 0;

	const presets: FastTenderPreset[] = [
		{ id: "all_card", title: "100% Картой", description: "Вся сумма через POS-терминал", tenders: { cardRub: totalDue, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_cash", title: "100% Наличными", description: "Вся сумма в кассу наличными", tenders: { cardRub: 0, cashRub: totalDue, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_sbp", title: "100% СБП (QR)", description: "Вся сумма по QR-коду СБП", tenders: { cardRub: 0, cashRub: 0, sbpRub: totalDue, depositRub: 0, familyRub: 0 } },
	];

	if (dep > 0 && totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const depKop = Math.min(totalKop, Number(rubToKopecks(dep)));
		const remKop = Math.max(0, totalKop - depKop);
		presets.push(
			{ id: "deposit_plus_card", title: `Аванс (${kopecksToRub(depKop)} ₽) + Карта`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
			{ id: "deposit_plus_cash", title: `Аванс (${kopecksToRub(depKop)} ₽) + Нал`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ наличными`, tenders: { cardRub: 0, cashRub: kopecksToRub(remKop), sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
		);
	}

	if (fam > 0 && totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const famKop = Math.min(totalKop, Number(rubToKopecks(fam)));
		const remKop = Math.max(0, totalKop - famKop);
		presets.push({ id: "family_plus_card", title: `Семья (${kopecksToRub(famKop)} ₽) + Карта`, description: `Списание с семейного баланса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: kopecksToRub(famKop) } });
	}

	if (totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const halfCardKop = Math.floor(totalKop / 2);
		const halfCashKop = totalKop - halfCardKop;
		presets.push({
			id: "half_card_half_cash",
			title: "50% Карта + 50% Нал",
			description: `${kopecksToRub(halfCardKop)} ₽ картой + ${kopecksToRub(halfCashKop)} ₽ наличными`,
			tenders: { cardRub: kopecksToRub(halfCardKop), cashRub: kopecksToRub(halfCashKop), sbpRub: 0, depositRub: 0, familyRub: 0 },
		});
	}

	return presets;
}
