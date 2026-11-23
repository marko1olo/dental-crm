import { useState, useMemo } from "react";
import {
	mergeToothSurfaceStates,
	type ToothSurfaceKey,
	type ToothSurfaceStateMap,
} from "@dental/shared";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { RestorativeMaterialKey } from "../../odontogram/anatomicalGeometriesTypes";
import { showToast } from "../../GlobalToast";
import type { SurfaceKey, BlackClassificationMacro } from "../toothSurfacesConstants";

export interface UseToothSurfacesStateProps {
	toothData?: ToothData | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
}

function isSurfaceKey(key: string): key is SurfaceKey {
	return key === "M" || key === "O" || key === "D" || key === "V" || key === "L";
}

export function useToothSurfacesState({ toothData, onUpdateTooth }: UseToothSurfacesStateProps) {
	const currentSurfaces = useMemo<SurfaceKey[]>(() => {
		const raw = toothData?.surfaces ?? [];
		const set = new Set<SurfaceKey>();
		for (const s of raw) {
			const upper = s.toUpperCase();
			if (isSurfaceKey(upper)) {
				set.add(upper);
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

	const computeSurfaceMutation = (next: SurfaceKey[]) => {
		const clinicalData = toothData?.clinicalData;
		const hasFillingProp = Boolean(
			clinicalData && typeof clinicalData === "object" && "hasFilling" in clinicalData && clinicalData.hasFilling,
		);
		const isFilled =
			toothData?.state === "Filled" ||
			(toothData?.state as string) === "Filled + Caries" ||
			hasFillingProp;

		if (isFilled) {
			const rawFillingSurfaces =
				clinicalData && typeof clinicalData === "object" && "fillingSurfaces" in clinicalData
					? clinicalData.fillingSurfaces
					: undefined;
			const prevFillingSurfaces: SurfaceKey[] = Array.isArray(rawFillingSurfaces)
				? (rawFillingSurfaces as SurfaceKey[])
				: currentSurfaces;

			const retainedFillingSurfaces = prevFillingSurfaces.filter((s) =>
				next.includes(s),
			);
			const defectSurfaces = next.filter(
				(s) => !prevFillingSurfaces.includes(s),
			);

			const prevMap: ToothSurfaceStateMap = {};
			for (const s of retainedFillingSurfaces) {
				prevMap[s as ToothSurfaceKey] = "filling";
			}
			const defectMap: ToothSurfaceStateMap = {};
			for (const s of defectSurfaces) {
				defectMap[s as ToothSurfaceKey] = "caries";
			}
			const surfaceStateMap = mergeToothSurfaceStates(prevMap, defectMap);

			const hasFilling = retainedFillingSurfaces.length > 0;
			const hasCaries = defectSurfaces.length > 0;
			const resolvedState: ToothState =
				hasFilling && hasCaries
					? ("Filled + Caries" as ToothState)
					: hasFilling
						? "Filled"
						: "Caries";

			return {
				surfaces: next,
				state: resolvedState,
				clinicalData: {
					...(toothData?.clinicalData || {}),
					baseState: hasFilling ? "Filled" : undefined,
					fillingSurfaces: hasFilling ? retainedFillingSurfaces : undefined,
					defectSurfaces: hasCaries ? defectSurfaces : undefined,
					hasFilling,
					hasCaries,
					surfaceStateMap,
				},
			};
		}

		return {
			surfaces: next,
			state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
			clinicalData: {
				...(toothData?.clinicalData || {}),
				defectSurfaces: next.length > 0 ? next : undefined,
				hasCaries: next.length > 0,
			},
		};
	};

	const handleToggleSurface = (surface: SurfaceKey) => {
		const next = currentSurfaces.includes(surface)
			? currentSurfaces.filter((s) => s !== surface)
			: [...currentSurfaces, surface];

		onUpdateTooth?.(computeSurfaceMutation(next));
	};

	const handleSetSurfaces = (surfaces: SurfaceKey[]) => {
		onUpdateTooth?.(computeSurfaceMutation(surfaces));
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
