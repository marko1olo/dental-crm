import { useState, useCallback } from "react";
import { showToast } from "../../../GlobalToast";

export interface MedicalCardSnapshot {
	odontogram: any;
	cpitn: any;
	hygieneIndexOhiS: string;
	chiefComplaint: string;
	historyOfPresentIllness: string;
	allergologicalHistory: string;
	concomitantDiseases: string;
	currentMedications: string;
	pregnancyLactationStatus: string;
	pastDentalInterventions: string;
	biteType: any;
	biteDescription: string;
	oralMucosa: any;
	xrayFindingsDescription: string;
	generalTreatmentPlan: string;
}

export function useMedicalCardRevision(
	initialRevisionCount: number = 0,
	initialRevisionReason: string = "Исправленному верить",
	createSnapshot: () => MedicalCardSnapshot,
	restoreSnapshot: (s: MedicalCardSnapshot) => void,
) {
	const [isRevising, setIsRevising] = useState<boolean>(false);
	const [revisionCount, setRevisionCount] = useState<number>(initialRevisionCount);
	const [revisionReason, setRevisionReason] = useState<string>(initialRevisionReason);
	const [reviseSnapshot, setReviseSnapshot] = useState<MedicalCardSnapshot | null>(null);

	const handleBeginRevise = useCallback(() => {
		setReviseSnapshot(createSnapshot());
		setIsRevising(true);
		showToast(
			"Включен режим ревизии («Исправленному верить»). Все поля разблокированы для редактирования.",
			"info",
			4000,
		);
	}, [createSnapshot]);

	const handleCancelRevise = useCallback(() => {
		if (reviseSnapshot) {
			restoreSnapshot(reviseSnapshot);
		}
		setIsRevising(false);
		setReviseSnapshot(null);
		showToast("Режим ревизии отменен, исходные данные восстановлены", "info", 3000);
	}, [reviseSnapshot, restoreSnapshot]);

	const handleSaveRevision = useCallback(() => {
		setRevisionCount((c) => c + 1);
		setIsRevising(false);
		setReviseSnapshot(null);
		showToast(
			"Исправление зафиксировано («Исправленному верить»). Ревизия карты сохранена.",
			"success",
			4000,
		);
	}, []);

	return {
		isRevising,
		setIsRevising,
		revisionCount,
		revisionReason,
		setRevisionReason,
		reviseSnapshot,
		setReviseSnapshot,
		handleBeginRevise,
		handleCancelRevise,
		handleSaveRevision,
	};
}
