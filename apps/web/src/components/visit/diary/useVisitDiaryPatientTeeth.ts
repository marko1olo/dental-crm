import { useState, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";

export interface ToothStateItem {
	toothNumber: number;
	state: string;
	surfaces?: readonly string[] | null;
}

export function useVisitDiaryPatientTeeth(
	patientId: string,
	initialTeethData: readonly ToothStateItem[] = [],
) {
	const [activeTeeth, setActiveTeeth] = useState<readonly ToothStateItem[]>(initialTeethData);

	useEffect(() => {
		if (initialTeethData && initialTeethData.length > 0) {
			setActiveTeeth(initialTeethData);
			return;
		}
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/patients/${encodeURIComponent(patientId)}/tooth-states`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!cancelled && data?.success && Array.isArray(data.states)) {
					setActiveTeeth(data.states);
				}
			})
			.catch((err) => {
				console.warn("[useVisitDiaryPatientTeeth] Failed to fetch tooth-states:", err);
			});
		return () => {
			cancelled = true;
		};
	}, [patientId, initialTeethData]);

	return { activeTeeth, setActiveTeeth };
}
