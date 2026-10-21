import type React from "react";
import { useCallback } from "react";
import { useAppStore } from "../../store/appStore";
import {
	calculateToothMenuCoordinates,
	getSafeBoundingRect,
} from "./odontogramGeometryUtils";
import type { UseOdontogramToothClickHandlerParams } from "./toothClickHandlerTypes";
import { useOdontogramApplyToothState } from "./useOdontogramApplyToothState";

export * from "./toothClickHandlerTypes";

export function useOdontogramToothClickHandler({
	selectedTeeth,
	setSelectedTeeth,
	activeSurfaces,
	setActiveSurfaces,
	isMultiSelectMode,
	odontogramUseSurfaces,
	setMenuConfig,
	setRadialMenuData,
	teethDataRef,
	updateToothState,
	patientId,
}: UseOdontogramToothClickHandlerParams) {
	const handleToothClick = useCallback(
		(
			arg1: number | React.MouseEvent,
			arg2?: DOMRect | number,
			surface?: string,
		) => {
			const { num: toothNumber, safeRect: rect } = getSafeBoundingRect(
				arg1,
				arg2,
			);
			if (!toothNumber) return;
			useAppStore.getState().setActiveTooth(toothNumber);

			const coords = calculateToothMenuCoordinates(rect, toothNumber);

			if (isMultiSelectMode) {
				const next = selectedTeeth.includes(toothNumber)
					? selectedTeeth.filter((t) => t !== toothNumber)
					: [...selectedTeeth, toothNumber];
				setSelectedTeeth(next);
				if (next.length > 0) {
					setMenuConfig({
						toothNumber,
						...coords,
						surfaces: activeSurfaces,
					});
				} else {
					setMenuConfig(null);
				}
			} else {
				let currentSurfaces = !selectedTeeth.includes(toothNumber)
					? []
					: surface
						? [...activeSurfaces]
						: [];
				if (surface && odontogramUseSurfaces) {
					currentSurfaces = currentSurfaces.includes(surface)
						? currentSurfaces.filter((s) => s !== surface)
						: [...currentSurfaces, surface];
				}
				setSelectedTeeth([toothNumber]);
				setActiveSurfaces(currentSurfaces);
				setMenuConfig({
					toothNumber,
					...coords,
					...(currentSurfaces.length > 0 ? { surfaces: currentSurfaces } : {}),
				});

				const currentTooth = teethDataRef.current?.find(
					(t: any) => t.toothNumber === toothNumber,
				);
				setRadialMenuData({
					toothNumber,
					anchorRect: {
						x: rect.left,
						y: rect.top,
						width: rect.width || 48,
						height: rect.height || 90,
					},
					currentState: currentTooth?.state ?? "Healthy",
					surfaces: currentSurfaces.length > 0 ? currentSurfaces : undefined,
				});
			}
		},
		[
			selectedTeeth,
			setSelectedTeeth,
			activeSurfaces,
			setActiveSurfaces,
			isMultiSelectMode,
			odontogramUseSurfaces,
			setMenuConfig,
			setRadialMenuData,
			teethDataRef,
		],
	);

	const handleApplyToothState = useOdontogramApplyToothState({
		selectedTeeth,
		activeSurfaces,
		updateToothState,
		patientId,
		setMenuConfig,
	});

	return { handleToothClick, handleApplyToothState };
}
