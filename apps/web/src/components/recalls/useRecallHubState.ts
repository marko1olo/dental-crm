import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClinicalTaskCallType, RecallReport } from "@dental/shared";
import { mapRecallCandidateToRecord } from "./recallCandidateAdapter";
import {
	filterAndSortRecallCandidates,
	type PatientRecallRecord,
	type RecallContactStatus,
	type RecallCycleType,
	type RecallPeriodFilter,
} from "./patientRecallEngine";
import type { RecallHubActiveTab } from "./RecallHubHeader";
import type { QuickBookingSlotInfo } from "../schedule/QuickBookingDrawerTypes";
import { calculateRecallStatusCounts, extractUniqueDoctors } from "./useRecallHubSelectors";

export function useRecallHubState(
	isOpen: boolean,
	initialCandidates?: readonly PatientRecallRecord[] | undefined,
	authHeaders?: Record<string, string> | undefined,
) {
	const [candidates, setCandidates] = useState<readonly PatientRecallRecord[]>(initialCandidates ?? []);
	const [isLoading, setIsLoading] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<RecallHubActiveTab>("registry");
	const [selectedCycle, setSelectedCycle] = useState<RecallCycleType | "all">("all");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | "all">("all");
	const [selectedPeriod, setSelectedPeriod] = useState<RecallPeriodFilter>("all");
	const [selectedWorkflowStatus, setSelectedWorkflowStatus] = useState<RecallContactStatus | "all">("all");
	const [selectedTaskCallType, setSelectedTaskCallType] = useState<ClinicalTaskCallType | "all">("all");
	const [activeTaskCallScriptType, setActiveTaskCallScriptType] = useState<ClinicalTaskCallType | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeScriptCandidate, setActiveScriptCandidate] = useState<PatientRecallRecord | null>(null);
	const [activePreviewCandidate, setActivePreviewCandidate] = useState<PatientRecallRecord | null>(null);
	const [bookingSlot, setBookingSlot] = useState<QuickBookingSlotInfo | null>(null);

	const loadCandidates = useCallback(async () => {
		if (initialCandidates && initialCandidates.length > 0) {
			setCandidates(initialCandidates);
			return;
		}
		setIsLoading(true);
		setFetchError(null);
		try {
			const res = await fetch("/api/patients/recall-candidates?minMonths=1&limit=200", {
				headers: { ...(authHeaders ?? {}), Accept: "application/json" },
			});
			if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
			const payload = (await res.json()) as RecallReport;
			setCandidates((payload.candidates || []).map(mapRecallCandidateToRecord));
		} catch (err) {
			setCandidates([]);
			setFetchError(err instanceof Error ? err.message : "Не удалось загрузить пациентов.");
		} finally {
			setIsLoading(false);
		}
	}, [authHeaders, initialCandidates]);

	useEffect(() => {
		if (isOpen) void loadCandidates();
	}, [isOpen, loadCandidates]);

	const uniqueDoctors = useMemo(() => extractUniqueDoctors(candidates), [candidates]);
	const statusCounts = useMemo(() => calculateRecallStatusCounts(candidates), [candidates]);

	const filteredCandidates = useMemo(() => {
		return filterAndSortRecallCandidates(candidates, {
			cycleType: selectedCycle,
			doctorId: selectedDoctorId,
			period: selectedPeriod,
			status: selectedWorkflowStatus === "all" ? undefined : selectedWorkflowStatus,
			searchQuery,
			sortBy: "daysOverdue",
			sortDirection: "desc",
		});
	}, [candidates, selectedCycle, selectedDoctorId, selectedPeriod, selectedWorkflowStatus, searchQuery]);

	return {
		candidates,
		setCandidates,
		isLoading,
		fetchError,
		statusNotice,
		setStatusNotice,
		activeTab,
		setActiveTab,
		selectedCycle,
		setSelectedCycle,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedPeriod,
		setSelectedPeriod,
		selectedWorkflowStatus,
		setSelectedWorkflowStatus,
		selectedTaskCallType,
		setSelectedTaskCallType,
		activeTaskCallScriptType,
		setActiveTaskCallScriptType,
		statusCounts,
		searchQuery,
		setSearchQuery,
		activeScriptCandidate,
		setActiveScriptCandidate,
		activePreviewCandidate,
		setActivePreviewCandidate,
		bookingSlot,
		setBookingSlot,
		uniqueDoctors,
		filteredCandidates,
		loadCandidates,
	};
}
