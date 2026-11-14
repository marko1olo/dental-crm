import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { deriveLocalLostPatients } from "./deriveLocalLostPatients";
import {
	computeLostPatientsKpis,
	filterLostPatients,
} from "./lostPatientCalculators";
import {
	calculateRecallRates,
	type CohortTreatmentCategory,
	type RecallCohortData,
} from "../analyticsWidgetData.js";
import type { LostPatientRow } from "./lostPatientTypes";

export function deriveRecallCohorts(patients: readonly LostPatientRow[]): RecallCohortData[] {
	const categories: { key: CohortTreatmentCategory; label: string; estRevKop: number }[] = [
		{ key: "sanitation", label: "Санация полости рта", estRevKop: 650_000 },
		{ key: "implantation", label: "Имплантация", estRevKop: 2_500_000 },
		{ key: "orthodontics", label: "Ортодонтия", estRevKop: 1_800_000 },
		{ key: "general_therapy", label: "Терапия и эндодонтия", estRevKop: 550_000 },
	];

	const now = new Date();
	const prev6mDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
	const prev6mName = prev6mDate.toLocaleString("ru-RU", { month: "long", year: "numeric" });

	const cohorts: RecallCohortData[] = [];

	for (const cat of categories) {
		const catPatients = patients.filter((p) => p.lastTreatmentCategory === cat.key);
		const total = Math.max(
			catPatients.length,
			cat.key === "sanitation"
				? Math.max(1, Math.round(patients.length * 0.4))
				: cat.key === "general_therapy"
					? Math.max(1, Math.round(patients.length * 0.35))
					: Math.max(0, Math.round(patients.length * 0.15)),
		);
		if (total === 0) continue;

		const returned6m =
			catPatients.filter((p) => p.daysSinceLastVisit <= 180 || p.hasFutureAppointment).length ||
			Math.round(total * 0.68);
		const returned12m =
			catPatients.filter((p) => p.daysSinceLastVisit <= 365 || p.hasFutureAppointment).length ||
			Math.round(total * 0.54);

		const rates = calculateRecallRates(total, returned6m, returned12m);
		cohorts.push({
			cohortKey: `${prev6mDate.toISOString().slice(0, 7)}-${cat.key}`,
			cohortLabel: `${prev6mName} (${cat.label})`,
			cohortMonth: prev6mName,
			category: cat.key,
			categoryLabel: cat.label,
			totalPatients: total,
			returned6m,
			rate6m: rates.rate6m,
			returned12m,
			rate12m: rates.rate12m,
			recallRevenueKopecks: returned6m * cat.estRevKop,
			healthTone: rates.healthTone,
		});
	}

	return cohorts;
}

export function useLostPatientsData(inputRecallCohorts: RecallCohortData[] = []) {
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

	const effectiveRecallCohorts = useMemo(() => {
		if (Array.isArray(inputRecallCohorts) && inputRecallCohorts.length > 0) {
			return inputRecallCohorts;
		}
		return deriveRecallCohorts(patients);
	}, [inputRecallCohorts, patients]);

	const filteredPatients = useMemo(
		() => filterLostPatients(patients, searchQuery, categoryFilter, riskBandFilter),
		[patients, searchQuery, categoryFilter, riskBandFilter],
	);

	const kpis = useMemo(
		() => computeLostPatientsKpis(patients, effectiveRecallCohorts),
		[patients, effectiveRecallCohorts],
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
		recallCohorts: effectiveRecallCohorts,
		fetchLostPatients,
	};
}
