import { useEffect, useState } from "react";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../../../lib/safeLocalStorage";
import type { ChairDoctorShiftAssignment } from "../gridTypes";

export function useChairDutyStorage(
	dateKey: string,
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
) {
	const [localChairAssignments, setLocalChairAssignments] = useState<
		Record<string, ChairDoctorShiftAssignment>
	>(() => {
		if (chairDoctorAssignments) return chairDoctorAssignments;
		return safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(
			`dente_chair_doctor_assignments_${dateKey}`,
			{},
		);
	});

	useEffect(() => {
		const incoming = chairDoctorAssignments;
		if (incoming) {
			setLocalChairAssignments((prev) => {
				if (prev === incoming) return prev;
				if (
					prev &&
					Object.keys(prev).length === 0 &&
					Object.keys(incoming).length === 0
				) {
					return prev;
				}
				return incoming;
			});
			return;
		}
		if (typeof window !== "undefined") {
			const parsed = safeLocalStorageGetJson<Record<
				string,
				ChairDoctorShiftAssignment
			> | null>(`dente_chair_doctor_assignments_${dateKey}`, null);
			if (parsed) {
				setLocalChairAssignments(parsed);
				return;
			}
		}
		setLocalChairAssignments({});
	}, [dateKey, chairDoctorAssignments]);

	const saveAssignment = (chairId: string, assignment: ChairDoctorShiftAssignment) => {
		setLocalChairAssignments((prev) => {
			const next = { ...prev, [chairId]: assignment };
			if (typeof window !== "undefined") {
				safeLocalStorageSetJson(
					`dente_chair_doctor_assignments_${dateKey}`,
					next,
				);
			}
			return next;
		});
	};

	return {
		localChairAssignments,
		setLocalChairAssignments,
		saveAssignment,
	};
}
