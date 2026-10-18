import type { Patient } from "@dental/shared";
import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDomListPagination } from "../../../hooks/useMemoryLeakGuard";
import { actionFailureToast } from "../../../lib/panelStateText";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import { showToast } from "../../GlobalToast";
import type { PatientInsight } from "./types";

export interface UsePatientsFilterLogicOptions {
	filteredPatients: Patient[];
	query: string;
	setQuery: (val: string) => void;
	appointments?: Array<{ id: string; patientId?: string | null }> | null | undefined;
	patientInsightById?: Map<string, PatientInsight> | null | undefined;
	selectedPatientId: string | null;
	setSelectedPatientId: (id: string) => void;
	setMobileActiveView: (view: "list" | "card") => void;
	showToastFn?:
		| ((
				text: string,
				type?: "success" | "error" | "info" | "warning",
				duration?: number,
		  ) => void)
		| undefined;
}

export function usePatientsFilterLogic({
	filteredPatients,
	query,
	setQuery,
	appointments,
	patientInsightById,
	selectedPatientId,
	setSelectedPatientId,
	setMobileActiveView,
	showToastFn = showToast,
}: UsePatientsFilterLogicOptions) {
	const [localQuery, setLocalQuery] = useState(query);
	const searchDebounceTimerRef = useRef<number | null>(null);

	useEffect(() => {
		setLocalQuery(query);
	}, [query]);

	const handleSearchChange = useCallback(
		(val: string) => {
			setLocalQuery(val);
			setMobileActiveView("list");
			if (searchDebounceTimerRef.current !== null) {
				window.clearTimeout(searchDebounceTimerRef.current);
			}
			const debounceMs = getOptimizedTiming().searchDebounceMs;
			searchDebounceTimerRef.current = window.setTimeout(() => {
				searchDebounceTimerRef.current = null;
				startTransition(() => {
					setQuery(val);
				});
			}, debounceMs);
		},
		[setQuery, setMobileActiveView],
	);

	const handleClearSearch = useCallback(() => {
		if (searchDebounceTimerRef.current !== null) {
			window.clearTimeout(searchDebounceTimerRef.current);
			searchDebounceTimerRef.current = null;
		}
		setLocalQuery("");
		setMobileActiveView("list");
		startTransition(() => {
			setQuery("");
		});
	}, [setQuery, setMobileActiveView]);

	const [showLostPatientsOnly, setShowLostPatientsOnly] = useState(false);
	const [lostPatientIds, setLostPatientIds] = useState<Set<string> | null>(
		null,
	);
	const [isLoadingLost, setIsLoadingLost] = useState(false);

	const toggleLostPatients = () => {
		if (showLostPatientsOnly) {
			setShowLostPatientsOnly(false);
			return;
		}
		setIsLoadingLost(true);
		fetch("/api/analytics/lost-patients-filters")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: Array<{ id: string }>) => {
				const ids = new Set((data || []).map((item) => item.id));
				setLostPatientIds(ids);
				setShowLostPatientsOnly(true);
			})
			.catch((err) => {
				showToastFn(
					actionFailureToast(
						"Не удалось загрузить фильтры потерянных пациентов",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				setLostPatientIds(new Set());
				setShowLostPatientsOnly(true);
			})
			.finally(() => {
				setIsLoadingLost(false);
			});
	};

	const [patientCategoryFilter, setPatientCategoryFilter] = useState<
		"all" | "treatment" | "primary" | "debt" | "archive"
	>("all");

	const patientApptCountMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const a of appointments || []) {
			if (a.patientId) {
				map.set(a.patientId, (map.get(a.patientId) || 0) + 1);
			}
		}
		return map;
	}, [appointments]);

	const { countAll, countTreatment, countPrimary, countDebt, countArchive } = useMemo(() => {
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
				const hasDebt =
					(insight?.balanceDueRub ?? 0) > 0 ||
					(p.balanceRub !== undefined && p.balanceRub < 0);
				if (hasDebt) {
					debt += 1;
				}
			}
		}
		return {
			countAll: all,
			countTreatment: treatment,
			countPrimary: primary,
			countDebt: debt,
			countArchive: archive,
		};
	}, [filteredPatients, patientApptCountMap, patientInsightById]);

	const displayPatients = useMemo(() => {
		let list = filteredPatients ?? [];
		if (showLostPatientsOnly && lostPatientIds) {
			list = list.filter((p) => lostPatientIds.has(p.id));
		}
		if (patientCategoryFilter === "treatment") {
			list = list.filter((p) => {
				if (p.status === "archived") return false;
				const appts = patientApptCountMap.get(p.id) || 0;
				return appts > 1;
			});
		} else if (patientCategoryFilter === "primary") {
			list = list.filter((p) => {
				if (p.status === "archived") return false;
				const appts = patientApptCountMap.get(p.id) || 0;
				return appts <= 1;
			});
		} else if (patientCategoryFilter === "debt") {
			list = list.filter((p) => {
				const insight = patientInsightById?.get(p.id);
				const hasDebt =
					(insight?.balanceDueRub ?? 0) > 0 ||
					(p.balanceRub !== undefined && p.balanceRub < 0);
				return hasDebt;
			});
		} else if (patientCategoryFilter === "archive") {
			list = list.filter((p) => p.status === "archived");
		} else if (patientCategoryFilter === "all") {
			if (!localQuery.trim() && !query.trim()) {
				list = list.filter((p) => p.status !== "archived");
			}
		}
		return list;
	}, [
		filteredPatients,
		showLostPatientsOnly,
		lostPatientIds,
		patientCategoryFilter,
		patientApptCountMap,
		patientInsightById,
		localQuery,
		query,
	]);

	const patientPagination = useDomListPagination(displayPatients, {
		initialLimit: 40,
		step: 40,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset limit on filter change
	useEffect(() => {
		patientPagination.resetLimit();
	}, [query, showLostPatientsOnly, patientCategoryFilter]);

	useEffect(() => {
		const firstPatient = (displayPatients ?? [])[0];
		if (!selectedPatientId && firstPatient?.id) {
			setSelectedPatientId(firstPatient.id);
		}
	}, [selectedPatientId, displayPatients, setSelectedPatientId]);

	return {
		localQuery,
		setLocalQuery,
		handleSearchChange,
		handleClearSearch,
		showLostPatientsOnly,
		isLoadingLost,
		toggleLostPatients,
		patientCategoryFilter,
		setPatientCategoryFilter,
		countAll,
		countTreatment,
		countPrimary,
		countDebt,
		countArchive,
		displayPatients,
		patientPagination,
	};
}
