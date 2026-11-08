import type React from "react";
import { useCallback } from "react";
import { resolveTeethRange } from "@dental/shared";
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
			eventOrModifier?: React.MouseEvent | boolean,
		) => {
			const { num: toothNumber, safeRect: rect } = getSafeBoundingRect(
				arg1,
				arg2,
			);
			if (!toothNumber) return;
			useAppStore.getState().setActiveTooth(toothNumber);

			const coords = calculateToothMenuCoordinates(rect, toothNumber);

			const mouseEv =
				typeof arg1 === "object" &&
				arg1 &&
				("shiftKey" in arg1 || "ctrlKey" in arg1 || "metaKey" in arg1)
					? (arg1 as React.MouseEvent)
					: typeof eventOrModifier === "object" &&
							eventOrModifier &&
							("shiftKey" in eventOrModifier ||
								"ctrlKey" in eventOrModifier ||
								"metaKey" in eventOrModifier)
						? (eventOrModifier as React.MouseEvent)
						: null;

			const isShift = Boolean(mouseEv?.shiftKey);
			const isCtrlOrMeta = Boolean(
				mouseEv?.ctrlKey || mouseEv?.metaKey || eventOrModifier === true,
			);

			if (isShift) {
				const lastTooth =
					selectedTeeth.length > 0
						? selectedTeeth[selectedTeeth.length - 1]
						: toothNumber;
				if (lastTooth && lastTooth !== toothNumber) {
					const range = resolveTeethRange(lastTooth, toothNumber);
					const combined = Array.from(new Set([...selectedTeeth, ...range]));
					setSelectedTeeth(combined);
					if (setMenuConfig) setMenuConfig(null);
					return;
				}
			}

			if (isMultiSelectMode || isCtrlOrMeta) {
				const next = selectedTeeth.includes(toothNumber)
					? selectedTeeth.filter((t) => t !== toothNumber)
					: [...selectedTeeth, toothNumber];
				setSelectedTeeth(next);
				if (setMenuConfig) setMenuConfig(null);
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
				if (setMenuConfig) setMenuConfig(null);

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
		setRadialMenuData,
		setMenuConfig,
	});

	return { handleToothClick, handleApplyToothState };
}
