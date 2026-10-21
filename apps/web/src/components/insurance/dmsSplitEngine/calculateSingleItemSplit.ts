/**
 * calculateSingleItemSplit.ts — Расчет распределения сооплаты для отдельной позиции счета
 */

import { kopecksToRubles } from "@dental/shared";
import { isServiceExcludedByDmsRules } from "../insuranceCatalogs.js";
import { calculateApprovedItemSplit } from "./calculateApprovedItemSplit.js";
import { isServiceCodeApprovedByLetter, isToothApprovedByLetter } from "./matchers.js";
import type { SingleItemSplitOptions, SingleItemSplitOutput } from "./singleItemSplitTypes.js";
import type { DmsBillableLineItem } from "./types.js";

export type { SingleItemSplitOptions, SingleItemSplitOutput };

export function calculateSingleItemSplit(item: DmsBillableLineItem, opts: SingleItemSplitOptions): SingleItemSplitOutput {
	const { policy, guaranteeLetter, isUrgentCare } = opts;
	const qty = Math.max(1, item.quantity);
	const discount = Math.min(100, Math.max(0, item.discountPercent ?? 0));
	const grossLineKopecks = item.unitPriceKopecks * qty;
	const rawLineTotalKopecks = Math.max(0, grossLineKopecks - Math.round((grossLineKopecks * discount) / 100));

	let isExcluded = false;
	let reason = "";
	if (policy || (guaranteeLetter?.programExclusions && guaranteeLetter.programExclusions.length > 0)) {
		const excl = isServiceExcludedByDmsRules(item.serviceCode, item.serviceName, policy?.program ?? "base", {
			lastHygieneDate: opts.lastHygieneDate, currentVisitDate: opts.visitDate,
		});
		if (excl.isExcluded) { isExcluded = true; reason = excl.reason || "Исключение программы страхования"; }
	}

	const toothApproved = isToothApprovedByLetter(item.toothNumber, guaranteeLetter);
	const codeApproved = isServiceCodeApprovedByLetter(item.serviceCode, guaranteeLetter);

	if (isExcluded || !toothApproved || !codeApproved) {
		if (isUrgentCare) {
			return {
				splitResult: {
					lineItemId: item.id, serviceCode: item.serviceCode, serviceCode804n: item.serviceCode,
					serviceName: item.serviceName, toothNumber: item.toothNumber, quantity: qty,
					unitPriceKopecks: item.unitPriceKopecks, totalKopecks: rawLineTotalKopecks,
					insuranceCoveredKopecks: rawLineTotalKopecks, coveredByDmsKopecks: rawLineTotalKopecks,
					patientOutOfPocketKopecks: 0, patientTotalKopecks: 0,
					insuranceCoveredRubles: kopecksToRubles(rawLineTotalKopecks), patientOutOfPocketRubles: 0,
					status: "full_dms", splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					isApprovedByLetter: true, isExcludedByPolicy: isExcluded, franchiseDeductionKopecks: 0, copayKopecks: 0,
				},
				dmsCoveredDeductedKopecks: 0, hasUnapprovedTeeth: !toothApproved, hasExcludedServices: isExcluded,
			};
		}
		if (!toothApproved) reason = `Зуб ${item.toothNumber} не входит в перечень письма № ${guaranteeLetter?.letterNumber || ""}.`;
		else if (!codeApproved) reason = `Код услуги ${item.serviceCode} не согласован письмом № ${guaranteeLetter?.letterNumber || ""}.`;

		return {
			splitResult: {
				lineItemId: item.id, id: item.id, serviceCode: item.serviceCode, serviceCode804n: item.serviceCode,
				serviceName: item.serviceName, toothNumber: item.toothNumber, quantity: qty,
				unitPriceKopecks: item.unitPriceKopecks, totalKopecks: rawLineTotalKopecks,
				insuranceCoveredKopecks: 0, coveredByDmsKopecks: 0,
				patientOutOfPocketKopecks: rawLineTotalKopecks, patientTotalKopecks: rawLineTotalKopecks,
				insuranceCoveredRubles: 0, patientOutOfPocketRubles: kopecksToRubles(rawLineTotalKopecks),
				status: "patient_full", splitReason: reason,
				isApprovedByLetter: toothApproved && codeApproved, isExcludedByPolicy: isExcluded,
				franchiseDeductionKopecks: 0, copayKopecks: 0, patientExcludedKopecks: isExcluded ? rawLineTotalKopecks : 0, patientExceededLimitKopecks: 0,
			},
			dmsCoveredDeductedKopecks: 0, hasUnapprovedTeeth: !toothApproved, hasExcludedServices: isExcluded,
		};
	}

	return calculateApprovedItemSplit(item, qty, rawLineTotalKopecks, opts);
}
