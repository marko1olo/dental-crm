import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { deriveLocalLostPatients } from "./deriveLocalLostPatients";
import {
	computeLostPatientsKpis,
	filterLostPatients,
} from "./lostPatientCalculators";
import type { RecallCohortData } from "../analyticsWidgetData.js";
import type { LostPatientRow } from "./lostPatientTypes";

export function useLostPatientsData(recallCohorts: RecallCohortData[] = []) {
	const { auth, dashboard } = useAppLogicContext();
	const [patients, setPatients] = useState<LostPatientRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [riskBandFilter, setRiskBandFilter] = useState<string>("all");

	const fetchLostPatients = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers: Record<string, string> = auth
				? auth.denteClinicalReadHeaders()
				: {};
			const response = await fetch("/api/analytics/lost-patients-filters", {
				headers,
			});
			if (!response.ok) throw new Error(`Ошибка загрузки (${response.status})`);
			const data = await response.json();
			if (Array.isArray(data)) {
				const enriched = data.map((p) => ({
					...p,
					lastTreatmentCategory:
						p.lastTreatmentCategory &&
						["sanitation", "implantation", "orthodontics", "general_therapy"].includes(p.lastTreatmentCategory)
							? p.lastTreatmentCategory
							: "general_therapy",
				}));
				setPatients(enriched);
			} else {
				setPatients([]);
			}
		} catch {
			const derived = deriveLocalLostPatients(dashboard);
			setPatients(derived);
			setError(null);
		} finally {
			setLoading(false);
		}
	}, [auth, dashboard]);

	useEffect(() => {
		fetchLostPatients();
	}, [fetchLostPatients]);

	const filteredPatients = useMemo(
		() => filterLostPatients(patients, searchQuery, categoryFilter, riskBandFilter),
		[patients, searchQuery, categoryFilter, riskBandFilter],
	);

	const kpis = useMemo(
		() => computeLostPatientsKpis(patients, recallCohorts),
		[patients, recallCohorts],
	);

	return {
		patients,
		loading,
		error,
		searchQuery,
		setSearchQuery,
		categoryFilter,
		setCategoryFilter,
		riskBandFilter,
		setRiskBandFilter,
		filteredPatients,
		kpis,
		fetchLostPatients,
	};
}
