import { useState, useEffect, useMemo } from "react";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { safeLocalStorageGetJson } from "../../../lib/safeLocalStorage";

interface UseChairAssignmentsStateParams {
	dateKey?: string | undefined;
	externalChairAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
}

export function useChairAssignmentsState({
	dateKey,
	externalChairAssignments,
}: UseChairAssignmentsStateParams) {
	const [localAssignments, setLocalAssignments] = useState<Record<string, ChairDoctorShiftAssignment>>({});

	useEffect(() => {
		if (!dateKey || typeof window === "undefined") return;
		if (externalChairAssignments && Object.keys(externalChairAssignments).length > 0) {
			return;
		}
		const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
		const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
		if (parsed && typeof parsed === "object") {
			setLocalAssignments((prev) => (JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed));
		}
	}, [dateKey, externalChairAssignments]);

	const effectiveChairDoctorAssignments = useMemo(() => {
		return externalChairAssignments ?? localAssignments;
	}, [externalChairAssignments, localAssignments]);

	return {
		localAssignments,
		setLocalAssignments,
		effectiveChairDoctorAssignments,
	};
}
