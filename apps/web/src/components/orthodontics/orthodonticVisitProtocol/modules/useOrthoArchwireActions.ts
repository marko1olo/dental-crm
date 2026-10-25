import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import type { WorkhorseArchwireOption } from "../../OrthoArchwireSelector";
import type { TargetArch } from "../../orthoProtocolTypes";
import { syncWorkhorseArchwire } from "./orthoBackendSync";
import { useOrthoNormActions, type UseOrthoNormActionsParams } from "./useOrthoNormActions";

export interface UseOrthoArchwireActionsParams extends UseOrthoNormActionsParams {
	patientId?: string | undefined;
	targetArch: TargetArch;
	elasticScheme: string;
	selectedActions: string[];
	setTargetArch: (arch: TargetArch) => void;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
	setActivePreset: (preset: null) => void;
	setArchwireMaterial: (mat: any) => void;
	setArchwireSection: (sec: any) => void;
	onSelectTooth?: ((toothNumber: number) => void) | undefined;
}

export function useOrthoArchwireActions(params: UseOrthoArchwireActionsParams) {
	const {
		patientId, targetArch, elasticScheme, selectedActions,
		setTargetArch, setSelectedTeeth, setSelectedActions, setActivePreset,
		setArchwireMaterial, setArchwireSection, setElasticScheme,
		onSelectTooth,
	} = params;

	const normActions = useOrthoNormActions(params);

	const handleSelectArch = useCallback((arch: TargetArch) => {
		setActivePreset(null);
		setTargetArch(arch);
		if (arch === "upper") setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		else if (arch === "lower") setSelectedTeeth([47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
		else setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
	}, [setActivePreset, setTargetArch, setSelectedTeeth]);

	const handleToggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) => prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b));
		onSelectTooth?.(tooth);
	}, [setSelectedTeeth, onSelectTooth]);

	const handleToggleAction = useCallback((actionId: string) => {
		setSelectedActions((prev) => prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId]);
	}, [setSelectedActions]);

	const handleSelectWorkhorseArchwire = useCallback((wire: WorkhorseArchwireOption) => {
		setActivePreset(null);
		setArchwireMaterial(wire.material);
		setArchwireSection(wire.section);
		if (!selectedActions.includes("wire_change")) setSelectedActions((prev) => [...prev, "wire_change"]);
		showToast(`Установлена рабочая дуга ${wire.label}`, "info");
		if (patientId) syncWorkhorseArchwire(patientId, wire, targetArch);
	}, [setActivePreset, setArchwireMaterial, setArchwireSection, selectedActions, setSelectedActions, patientId, targetArch]);

	const handleElasticSizeInteraction = useCallback(() => {
		if (elasticScheme === "none") {
			setElasticScheme("class_ii");
			showToast("Схема эластиков: установлен «Класс II (по умолчанию)»", "info");
		}
	}, [elasticScheme, setElasticScheme]);

	return {
		handleSelectArch,
		handleToggleTooth,
		handleToggleAction,
		handleSelectWorkhorseArchwire,
		handleElasticSizeInteraction,
		...normActions,
	};
}
