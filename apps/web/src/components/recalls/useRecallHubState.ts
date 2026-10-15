import { useCallback, useEffect, useMemo, useState } from "react";
import type { RecallReport } from "@dental/shared";
import { mapRecallCandidateToRecord } from "./recallCandidateAdapter";
import {
	filterAndSortRecallCandidates,
	isPatientEligibleForRecall,
	type PatientRecallRecord,
	type RecallContactStatus,
	type RecallCycleType,
	type RecallPeriodFilter,
} from "./patientRecallEngine";
import type { RecallHubActiveTab } from "./RecallHubHeader";
import type { QuickBookingSlotInfo } from "../schedule/QuickBookingDrawerTypes";

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

	const uniqueDoctors = useMemo(() => {
		const docMap = new Map<string, string>();
		for (const c of candidates) {
			if (c.attendingDoctorId && c.attendingDoctorName) docMap.set(c.attendingDoctorId, c.attendingDoctorName);
		}
		return Array.from(docMap.entries()).map(([id, name]) => ({ id, name }));
	}, [candidates]);

	const statusCounts = useMemo(() => {
		const counts = {
			all: 0,
			due_now: 0,
			invited: 0,
			scheduled: 0,
			completed: 0,
		};
		for (const c of candidates) {
			if (!isPatientEligibleForRecall(c)) continue;
			counts.all++;
			if (
				(c.status === "pending" || c.status === "due_now") &&
				(c.urgencyStatus === "due_now" || c.urgencyStatus === "overdue_30" || c.urgencyStatus === "overdue_90")
			) {
				counts.due_now++;
			} else if (c.status === "invited" || c.status === "contacted") {
				counts.invited++;
			} else if (c.status === "scheduled") {
				counts.scheduled++;
			} else if (c.status === "completed") {
				counts.completed++;
			}
		}
		return counts;
	}, [candidates]);

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
