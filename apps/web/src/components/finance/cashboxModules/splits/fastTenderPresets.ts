/**
 * fastTenderPresets.ts — Layer 2: Fast Combined Tender Presets Generator.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { FastTenderPreset } from "../cashboxTypes.js";

function buildBasePresets(totalDue: number): FastTenderPreset[] {
	return [
		{ id: "all_card", title: "100% Картой", description: "Вся сумма через POS-терминал", tenders: { cardRub: totalDue, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_cash", title: "100% Наличными", description: "Вся сумма в кассу наличными", tenders: { cardRub: 0, cashRub: totalDue, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_sbp", title: "100% СБП (QR)", description: "Вся сумма по QR-коду СБП", tenders: { cardRub: 0, cashRub: 0, sbpRub: totalDue, depositRub: 0, familyRub: 0 } },
	];
}

function appendDepositPresets(presets: FastTenderPreset[], totalDue: number, dep: number): void {
	if (dep <= 0 || totalDue <= 0) return;
	const totalKop = rubToKopecks(totalDue);
	const depKop = Math.min(totalKop, rubToKopecks(dep));
	const remKop = Math.max(0, totalKop - depKop);
	presets.push(
		{ id: "deposit_plus_card", title: `Аванс (${kopecksToRub(depKop)} ₽) + Карта`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
		{ id: "deposit_plus_cash", title: `Аванс (${kopecksToRub(depKop)} ₽) + Нал`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ наличными`, tenders: { cardRub: 0, cashRub: kopecksToRub(remKop), sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
	);
}

function appendFamilyPresets(presets: FastTenderPreset[], totalDue: number, dep: number, fam: number): void {
	if (fam > 0 && totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const famKop = Math.min(totalKop, rubToKopecks(fam));
		const remKop = Math.max(0, totalKop - famKop);
		presets.push({ id: "family_plus_card", title: `Семья (${kopecksToRub(famKop)} ₽) + Карта`, description: `Списание с семейного баланса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: kopecksToRub(famKop) } });
	}
	if ((dep > 0 || fam > 0) && totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const maxAdvKop = rubToKopecks(Math.max(dep, fam));
		const advKop = Math.min(totalKop, maxAdvKop);
		const remKop = Math.max(0, totalKop - advKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;
		const isFam = fam >= dep;
		presets.push({
			id: "family_cash_card_three_way",
			title: isFam ? `Семья (${kopecksToRub(advKop)} ₽) + Нал + Карта` : `Аванс (${kopecksToRub(advKop)} ₽) + Нал + Карта`,
			description: `${isFam ? "Семейный счет" : "Аванс"} ${kopecksToRub(advKop)} ₽ + ${kopecksToRub(halfCardKop)} ₽ картой + ${kopecksToRub(halfCashKop)} ₽ наличными`,
			tenders: { cardRub: kopecksToRub(halfCardKop), cashRub: kopecksToRub(halfCashKop), sbpRub: 0, depositRub: !isFam ? kopecksToRub(advKop) : 0, familyRub: isFam ? kopecksToRub(advKop) : 0 },
		});
	}
}

/**
 * Генерация быстрых пресетов комбинированной оплаты.
 */
export function getFastCombinedTenderPresets(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
}): readonly FastTenderPreset[] {
	const totalDue = params.totalDueRub;
	const dep = Math.max(0, params.patientDepositRub || 0);
	const fam = Math.max(0, params.patientFamilyBalanceRub || 0);
	const presets = buildBasePresets(totalDue);

	if (totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const halfKop = Math.floor(totalKop / 2);
		const otherKop = totalKop - halfKop;
		presets.push({
			id: "half_card_half_cash",
			title: "50% Карта / 50% Нал",
			description: `${kopecksToRub(halfKop)} ₽ картой + ${kopecksToRub(otherKop)} ₽ наличными`,
			tenders: { cardRub: kopecksToRub(halfKop), cashRub: kopecksToRub(otherKop), sbpRub: 0, depositRub: 0, familyRub: 0 },
		});
	}

	appendDepositPresets(presets, totalDue, dep);
	appendFamilyPresets(presets, totalDue, dep, fam);
	return presets;
}
