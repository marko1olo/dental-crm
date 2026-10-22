import { useState, useEffect, useMemo, useCallback } from "react";
import {
	calculateOrthodonticProtocolCompleteness,
	type OrthodonticPhotoSession,
	type OrthodonticAngleId,
	type OrthodonticSessionStage,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	type OrthodonticClinicalPreset,
	ORTHODONTIC_CLINICAL_PRESETS,
} from "../orthodonticPresets";

interface UseOrthoModalUiProps {
	session: OrthodonticPhotoSession;
	setSession: React.Dispatch<React.SetStateAction<OrthodonticPhotoSession>>;
	handleStageChange: (newStage: OrthodonticSessionStage) => void;
}

export function useOrthoModalUi({ session, setSession, handleStageChange }: UseOrthoModalUiProps) {
	const [globalGuidelinesEnabled, setGlobalGuidelinesEnabled] = useState<boolean>(true);
	const [showFindingsAccordion, setShowFindingsAccordion] = useState<boolean>(true);
	const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | "extraoral" | "intraoral">("all");
	const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
	const [activePreset, setActivePreset] = useState<OrthodonticClinicalPreset | null>(ORTHODONTIC_CLINICAL_PRESETS[0] ?? null);
	const [insertProtocolOnSave, setInsertProtocolOnSave] = useState<boolean>(true);
	const [showPresetPreview, setShowPresetPreview] = useState<boolean>(false);
	const [openMenuSlotId, setOpenMenuSlotId] = useState<OrthodonticAngleId | null>(null);

	useEffect(() => {
		if (!openMenuSlotId) return;
		const handleClickOutside = () => setOpenMenuSlotId(null);
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenuSlotId(null); };
		window.addEventListener("click", handleClickOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("click", handleClickOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [openMenuSlotId]);

	const completeness = useMemo(() => calculateOrthodonticProtocolCompleteness(session), [session]);

	const handleSelectPreset = useCallback((preset: OrthodonticClinicalPreset) => {
		setActivePreset(preset);
		if (preset.suggestedStage !== session.stage) handleStageChange(preset.suggestedStage);
		if (!session.findings.clinicalDiagnosisRu || session.findings.clinicalDiagnosisRu.trim() === "") {
			setSession((prev) => ({
				...prev,
				findings: { ...prev.findings, clinicalDiagnosisRu: preset.diagnosisRu },
				updatedAt: new Date().toISOString(),
			}));
		}
		showToast(`Выбран пресет: ${preset.shortLabel}`, "info");
	}, [session.stage, session.findings.clinicalDiagnosisRu, handleStageChange, setSession]);

	return {
		globalGuidelinesEnabled,
		setGlobalGuidelinesEnabled,
		showFindingsAccordion,
		setShowFindingsAccordion,
		activeCategoryFilter,
		setActiveCategoryFilter,
		isCompareMode,
		setIsCompareMode,
		activePreset,
		insertProtocolOnSave,
		setInsertProtocolOnSave,
		showPresetPreview,
		setShowPresetPreview,
		openMenuSlotId,
		setOpenMenuSlotId,
		completeness,
		handleSelectPreset,
	};
}
