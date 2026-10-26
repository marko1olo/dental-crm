import { useState, useMemo } from "react";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { RestorativeMaterialKey } from "../../odontogram/anatomicalToothGeometries";
import { showToast } from "../../GlobalToast";
import type { SurfaceKey, BlackClassificationMacro } from "../toothSurfacesConstants";

export interface UseToothSurfacesStateProps {
	toothData?: ToothData | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
}

export function useToothSurfacesState({ toothData, onUpdateTooth }: UseToothSurfacesStateProps) {
	const currentSurfaces = useMemo<SurfaceKey[]>(() => {
		const raw = toothData?.surfaces ?? [];
		const set = new Set<SurfaceKey>();
		for (const s of raw) {
			const upper = s.toUpperCase();
			if (upper === "M" || upper === "O" || upper === "D" || upper === "V" || upper === "L") {
				set.add(upper as SurfaceKey);
			} else if (upper === "B") {
				set.add("V");
			} else if (upper === "P") {
				set.add("L");
			} else if (upper === "MOD") {
				set.add("M");
				set.add("O");
				set.add("D");
			} else if (upper === "MO") {
				set.add("M");
				set.add("O");
			} else if (upper === "DO" || upper === "OD") {
				set.add("O");
				set.add("D");
			}
		}
		return Array.from(set);
	}, [toothData?.surfaces]);

	const [showEndoTable, setShowEndoTable] = useState<boolean>(
		toothData?.state === "Pulpitis" || toothData?.state === "Periodontitis",
	);

	const handleToggleSurface = (surface: SurfaceKey) => {
		const next = currentSurfaces.includes(surface)
			? currentSurfaces.filter((s) => s !== surface)
			: [...currentSurfaces, surface];

		onUpdateTooth?.({
			surfaces: next,
			state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
		});
	};

	const handleSetSurfaces = (surfaces: SurfaceKey[]) => {
		onUpdateTooth?.({
			surfaces,
			state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
		});
	};

	const handleClearSurfaces = () => {
		onUpdateTooth?.({ surfaces: [] });
	};

	const handleApplyMacro = (macro: BlackClassificationMacro) => {
		onUpdateTooth?.({
			surfaces: [...macro.surfaces],
			state: macro.suggestedState,
		});
		showToast(`Применен макрос: ${macro.label} (${macro.titleRu})`, "info");
	};

	const handleStateChange = (state: ToothState) => {
		onUpdateTooth?.({ state });
		if (state === "Pulpitis" || state === "Periodontitis") {
			setShowEndoTable(true);
		}
	};

	const handleMaterialChange = (material: RestorativeMaterialKey) => {
		onUpdateTooth?.({ material });
	};

	const iropzCalculated = useMemo(() => {
		const count = currentSurfaces.length;
		if (count === 0) return 0;
		if (count === 1) return 0.2;
		if (count === 2) return 0.45;
		if (count === 3) return 0.65;
		if (count === 4) return 0.85;
		return 1.0;
	}, [currentSurfaces]);

	return {
		currentSurfaces,
		showEndoTable,
		setShowEndoTable,
		iropzCalculated,
		handleToggleSurface,
		handleSetSurfaces,
		handleClearSurfaces,
		handleApplyMacro,
		handleStateChange,
		handleMaterialChange,
	};
}
