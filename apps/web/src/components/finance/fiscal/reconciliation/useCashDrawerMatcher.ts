/**
 * useCashDrawerMatcher.ts — 1-Click Cash Drawer Matcher & Discrepancy Calculation Hook.
 * Mandate 8b & Mandate 8e (Zero blocked buttons, non-blocking input).
 */

import { useState, useMemo, useCallback } from "react";
import type { UseCashDrawerMatcherResult } from "./types";

export function useCashDrawerMatcher(expectedCashRub: number): UseCashDrawerMatcherResult {
	const [countedCashInput, setCountedCashInput] = useState<string>("");

	const countedCash = useMemo(() => {
		if (countedCashInput.trim() === "") return null;
		const parsed = Number.parseFloat(countedCashInput.replace(/\s/g, "").replace(",", "."));
		return Number.isNaN(parsed) ? null : parsed;
	}, [countedCashInput]);

	const differenceRub = useMemo(() => {
		if (countedCash === null) return null;
		return Math.round((countedCash - expectedCashRub) * 100) / 100;
	}, [countedCash, expectedCashRub]);

	const handleMatchWithExpected = useCallback(() => {
		setCountedCashInput(expectedCashRub.toString());
	}, [expectedCashRub]);

	return {
		countedCashInput,
		setCountedCashInput,
		countedCash,
		differenceRub,
		handleMatchWithExpected,
	};
}
