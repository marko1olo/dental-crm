/**
 * useDmsBillSplitLogic.ts — Логика расчета сооплаты визита, переопределений и распределения оплаты
 * Мандат 8b: строго <= 120 строк.
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	calculateDmsCoPaymentSplitWithPayment,
	calculatePatientPaymentSplit,
	rublesToKopecks,
	type DmsBillableLineItem,
	type DmsGuaranteeLetter,
	type PatientPaymentMethod,
} from "../dmsSplitEngine.js";
import type { BillItemToSplit } from "../DmsGuaranteeLetterModal.js";
import { DEMO_VISIT_BILL_ITEMS } from "./types.js";
import { mapBillItemToDmsLine } from "./mapBillItemToDmsLine.js";

export type SplitOverrideMode = "auto" | "dms" | "patient" | "split_50";

export function useDmsBillSplitLogic(
	letter: DmsGuaranteeLetter,
	billItems?: readonly BillItemToSplit[] | undefined,
) {
	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");
	const [mixedCashRub, setMixedCashRub] = useState<number>(5000);
	const [itemSplitOverrides, setItemSplitOverrides] = useState<Record<string, SplitOverrideMode>>({});

	const isDemo = isDemoShowcaseMode();
	const effectiveItems = billItems !== undefined ? billItems : (isDemo ? DEMO_VISIT_BILL_ITEMS : []);

	const mappedItems: DmsBillableLineItem[] = useMemo(() => {
		return effectiveItems.map(mapBillItemToDmsLine);
	}, [effectiveItems]);

	const splitCalculation = useMemo(() => {
		const cashKopecks = paymentMethod === "mixed" ? rublesToKopecks(mixedCashRub) : undefined;
		return calculateDmsCoPaymentSplitWithPayment(mappedItems, letter, paymentMethod, cashKopecks);
	}, [mappedItems, letter, paymentMethod, mixedCashRub]);

	const effectiveLines = useMemo(() => {
		return splitCalculation.lines.map((line) => {
			const itemId = line.lineItemId || line.id || "";
			const mode = itemSplitOverrides[itemId] || "auto";

			if (mode === "dms") {
				return {
					...line,
					effectiveDmsKopecks: line.totalKopecks,
					effectivePatientKopecks: 0,
					overrideMode: "dms" as const,
					splitReason: "Врачебное решение: 100% покрытие ДМС",
				};
			}
			if (mode === "patient") {
				return {
					...line,
					effectiveDmsKopecks: 0,
					effectivePatientKopecks: line.totalKopecks,
					overrideMode: "patient" as const,
					splitReason: "Оплата пациентом (нестраховой случай)",
				};
			}
			if (mode === "split_50") {
				const dmsKop = Math.floor(line.totalKopecks / 2);
				return {
					...line,
					effectiveDmsKopecks: dmsKop,
					effectivePatientKopecks: line.totalKopecks - dmsKop,
					overrideMode: "split_50" as const,
					splitReason: "Сплит 50% ДМС / 50% Пациент",
				};
			}
			return {
				...line,
				effectiveDmsKopecks: line.coveredByDmsKopecks ?? line.insuranceCoveredKopecks ?? 0,
				effectivePatientKopecks: line.patientTotalKopecks ?? line.patientOutOfPocketKopecks ?? 0,
				overrideMode: "auto" as const,
			};
		});
	}, [splitCalculation.lines, itemSplitOverrides]);

	const totalBillKopecks = splitCalculation.totalBillKopecks;
	const totalDmsCoveredKopecks = effectiveLines.reduce((acc, l) => acc + l.effectiveDmsKopecks, 0);
	const totalPatientTotalKopecks = Math.max(0, totalBillKopecks - totalDmsCoveredKopecks);
	const initialMaxKop = letter.maxCoverageKopecks ?? letter.maxApprovedAmountKopecks ?? rublesToKopecks(letter.maxCoverageRub ?? 0);
	const initialUsedKop = letter.usedAmountKopecks ?? rublesToKopecks(letter.usedAmountRub ?? 0);
	const remainingLimitKopecks = Math.max(0, initialMaxKop - initialUsedKop - totalDmsCoveredKopecks);

	const paymentSplit = useMemo(() => {
		const cashKopecks = paymentMethod === "mixed" ? rublesToKopecks(mixedCashRub) : undefined;
		return calculatePatientPaymentSplit(totalPatientTotalKopecks, { preferredMethod: paymentMethod, cashKopecks });
	}, [totalPatientTotalKopecks, paymentMethod, mixedCashRub]);

	const handleSetOverride = (itemId: string, mode: SplitOverrideMode) => {
		setItemSplitOverrides((prev) => ({ ...prev, [itemId]: mode }));
	};

	return {
		mappedItems,
		effectiveLines,
		totalBillKopecks,
		totalDmsCoveredKopecks,
		totalPatientTotalKopecks,
		remainingLimitKopecks,
		paymentMethod, setPaymentMethod,
		mixedCashRub, setMixedCashRub,
		paymentSplit,
		handleSetOverride,
	};
}
