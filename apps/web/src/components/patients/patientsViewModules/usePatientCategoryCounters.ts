import type { Patient } from "@dental/shared";
import { useMemo } from "react";
import type { PatientInsight } from "./types";

export function usePatientCategoryCounters(
	filteredPatients: Patient[],
	patientApptCountMap: Map<string, number>,
	patientInsightById?: Map<string, PatientInsight> | null | undefined,
) {
	return useMemo(() => {
		let all = 0;
		let treatment = 0;
		let primary = 0;
		let debt = 0;
		let archive = 0;
		for (const p of filteredPatients ?? []) {
			if (p.status === "archived") {
				archive += 1;
			} else {
				all += 1;
				const appts = patientApptCountMap.get(p.id) || 0;
				if (appts <= 1) {
					primary += 1;
				} else {
					treatment += 1;
				}
				const insight = patientInsightById?.get(p.id);
				const hasDebt = (insight?.balanceDueRub ?? 0) > 0 || (p.balanceRub !== undefined && p.balanceRub < 0);
				if (hasDebt) debt += 1;
			}
		}
		return { countAll: all, countTreatment: treatment, countPrimary: primary, countDebt: debt, countArchive: archive };
	}, [filteredPatients, patientApptCountMap, patientInsightById]);
}
