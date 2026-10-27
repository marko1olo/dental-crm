/**
 * apps/web/src/components/visit/anamnesisTab/useAnamnesisRisks.ts
 *
 * Хук управления соматическими стоп-факторами и факторами риска у кресла
 * (инфаркт, ЭКС, антикоагулянты, бисфосфонаты, диабет, беременность).
 */

import { useCallback, useMemo, useState } from "react";
import type { PregnancyTrimester } from "./types";

export function useAnamnesisRisks(initialRisks: string[] = []) {
	const [selectedRisks, setSelectedRisks] = useState<string[]>(initialRisks);
	const [anticoagulantName, setAnticoagulantName] = useState("");
	const [bisphosphonateName, setBisphosphonateName] = useState("");
	const [pregnancyTrimester, setPregnancyTrimester] = useState<PregnancyTrimester>("trimester_2");

	const toggleRisk = useCallback((label: string) => {
		setSelectedRisks((prev) =>
			prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
		);
	}, []);

	const hasCriticalStopRisks = useMemo(() => {
		return selectedRisks.some(
			(r) =>
				r.includes("Инфаркт") ||
				r.includes("ЭКС") ||
				r.includes("антикоагулянтов") ||
				r.includes("бисфосфонатов"),
		);
	}, [selectedRisks]);

	return {
		selectedRisks,
		setSelectedRisks,
		toggleRisk,
		anticoagulantName,
		setAnticoagulantName,
		bisphosphonateName,
		setBisphosphonateName,
		pregnancyTrimester,
		setPregnancyTrimester,
		hasCriticalStopRisks,
	};
}
