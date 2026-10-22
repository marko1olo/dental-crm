/**
 * useHygieneOhiSHistory.ts — Загрузка истории OHI-S и расчет динамики (Мандаты 8e, 8k).
 * (Layer 3 Hook).
 */

import { useEffect, useMemo, useState } from "react";
import { useVisitStore } from "../../store/visitStore";

export interface PreviousOhiSRecord {
	ohi_s: number;
	debris?: number;
	calculus?: number;
	date?: string;
}

export function useHygieneOhiSHistory(
	patientId?: string,
	previousOhiS?: PreviousOhiSRecord | number | null,
	currentOhiSScore: number = 0,
) {
	const [fetchedPreviousOhiS, setFetchedPreviousOhiS] =
		useState<PreviousOhiSRecord | null>(null);

	useEffect(() => {
		if (previousOhiS !== undefined) return;
		const effectivePatientId =
			patientId ||
			(useVisitStore.getState() as any).activeVisit?.patientId ||
			(useVisitStore.getState() as any).patientId;
		if (!effectivePatientId) return;
		let cancelled = false;
		fetch(`/api/patients/${effectivePatientId}/hygiene-indices/latest`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!cancelled && data?.latest) setFetchedPreviousOhiS(data.latest);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [patientId, previousOhiS]);

	const resolvedPreviousOhiS = useMemo(() => {
		if (previousOhiS !== undefined) return previousOhiS;
		if (fetchedPreviousOhiS !== null) return fetchedPreviousOhiS;
		const storeState = useVisitStore.getState() as any;
		if (storeState.previousOhiS) return storeState.previousOhiS;
		if (storeState.activeVisit?.hygieneIndices)
			return storeState.activeVisit.hygieneIndices;
		if (storeState.visitNoteForm?.hygieneIndices)
			return storeState.visitNoteForm.hygieneIndices;
		if (
			typeof window !== "undefined" &&
			(window as any).__DENTE_LAST_OHI_S__
		)
			return (window as any).__DENTE_LAST_OHI_S__;
		return null;
	}, [previousOhiS, fetchedPreviousOhiS]);

	const previousScoreNum = useMemo(() => {
		if (resolvedPreviousOhiS === null || resolvedPreviousOhiS === undefined)
			return null;
		if (typeof resolvedPreviousOhiS === "number") return resolvedPreviousOhiS;
		if (
			typeof resolvedPreviousOhiS === "object" &&
			typeof resolvedPreviousOhiS.ohi_s === "number"
		) {
			return resolvedPreviousOhiS.ohi_s;
		}
		return null;
	}, [resolvedPreviousOhiS]);

	const previousDate = useMemo(() => {
		if (
			typeof resolvedPreviousOhiS === "object" &&
			resolvedPreviousOhiS?.date
		) {
			return resolvedPreviousOhiS.date;
		}
		return null;
	}, [resolvedPreviousOhiS]);

	const comparisonText = useMemo(() => {
		if (previousScoreNum === null) return null;
		const current = currentOhiSScore;
		const formatScore = (val: number) =>
			Number.isInteger(val) ? val.toString() : val.toFixed(1);

		if (current < previousScoreNum) {
			const diff = previousScoreNum - current;
			const pct =
				previousScoreNum > 0
					? Math.round((diff / previousScoreNum) * 100)
					: 100;
			return `Было: ${formatScore(previousScoreNum)} ➔ Стало: ${formatScore(current)} (Улучшение на ${pct}% 🟢)`;
		}
		if (current > previousScoreNum) {
			const diff = current - previousScoreNum;
			const pct =
				previousScoreNum > 0
					? Math.round((diff / previousScoreNum) * 100)
					: 100;
			return `Было: ${formatScore(previousScoreNum)} ➔ Стало: ${formatScore(current)} (Ухудшение на ${pct}% 🔴)`;
		}
		return `Было: ${formatScore(previousScoreNum)} ➔ Стало: ${formatScore(current)} (Без изменений 🟡)`;
	}, [previousScoreNum, currentOhiSScore]);

	return {
		resolvedPreviousOhiS,
		previousScoreNum,
		previousDate,
		comparisonText,
	};
}
