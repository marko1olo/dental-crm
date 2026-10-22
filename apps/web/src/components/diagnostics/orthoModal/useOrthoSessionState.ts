import { useState, useEffect, useCallback } from "react";
import {
	createEmptyOrthodonticSession,
	type OrthodonticPhotoSession,
	type OrthodonticSessionStage,
} from "@dental/shared";

interface UseOrthoSessionStateProps {
	patientId?: string | undefined;
	patientName: string;
	doctorName: string;
	clinicName: string;
	initialSession?: OrthodonticPhotoSession | undefined;
	treatmentPlanId?: string | undefined;
	treatmentPlanStageId?: string | undefined;
	treatmentStageTitle: string;
	isOpen: boolean;
}

export function useOrthoSessionState({
	patientId = "",
	patientName,
	doctorName,
	clinicName,
	initialSession,
	treatmentPlanId,
	treatmentPlanStageId,
	treatmentStageTitle,
	isOpen,
}: UseOrthoSessionStateProps) {
	const [session, setSession] = useState<OrthodonticPhotoSession>(() => {
		if (initialSession) return initialSession;
		return createEmptyOrthodonticSession({
			patientId: patientId || "",
			patientName,
			doctorName,
			clinicName,
			stage: "pre_treatment",
			...(treatmentPlanId ? { treatmentPlanId } : {}),
			...(treatmentPlanStageId ? { treatmentPlanStageId } : {}),
			treatmentStageTitle,
		});
	});

	// Sync session when initialSession or props update
	useEffect(() => {
		if (initialSession) {
			setSession(initialSession);
		} else if (isOpen) {
			setSession((prev) => {
				if (
					(patientId && prev.patientId !== patientId) ||
					(patientName && prev.patientName !== patientName) ||
					(doctorName && prev.doctorName !== doctorName) ||
					(clinicName && prev.clinicName !== clinicName)
				) {
					return { ...prev, patientId: patientId || prev.patientId, patientName, doctorName, clinicName };
				}
				return prev;
			});
		}
	}, [initialSession, isOpen, patientId, patientName, doctorName, clinicName]);

	const handleStageChange = useCallback((newStage: OrthodonticSessionStage) => {
		setSession((prev) => ({ ...prev, stage: newStage, updatedAt: new Date().toISOString() }));
	}, []);

	const handleFindingsChange = <K extends keyof OrthodonticPhotoSession["findings"]>(
		key: K,
		value: OrthodonticPhotoSession["findings"][K],
	) => {
		setSession((prev) => ({
			...prev,
			findings: { ...prev.findings, [key]: value },
			updatedAt: new Date().toISOString(),
		}));
	};

	return {
		session,
		setSession,
		handleStageChange,
		handleFindingsChange,
	};
}
