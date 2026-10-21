import type React from "react";
import { useCallback, useRef } from "react";
import { triggerHaptic } from "../../native/mobileBridge";
import type { RadialMenuAnchorData } from "./OdontogramViewModals";
import { getSafeBoundingRect } from "./odontogramGeometryUtils";
import type { ToothData, ToothState } from "./ToothChart";

export interface UseOdontogramToothClickInterceptParams {
	readonly teethData: readonly ToothData[];
	readonly onToothClick?:
		| ((tooth: number, rect: DOMRect, surface?: string) => void)
		| undefined;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly activeStampTool: ToothState | null;
	readonly isFastExtractMode: boolean;
	readonly useSurfaces: boolean;
	readonly setRadialMenuData: React.Dispatch<
		React.SetStateAction<RadialMenuAnchorData | null>
	>;
}

export function useOdontogramToothClickIntercept({
	teethData,
	onToothClick,
	onQuickStateChange,
	activeStampTool,
	isFastExtractMode,
	useSurfaces,
	setRadialMenuData,
}: UseOdontogramToothClickInterceptParams) {
	const teethDataRef = useRef(teethData);
	teethDataRef.current = teethData;
	const onToothClickRef = useRef(onToothClick);
	onToothClickRef.current = onToothClick;
	const onQuickStateChangeRef = useRef(onQuickStateChange);
	onQuickStateChangeRef.current = onQuickStateChange;
	const activeStampToolRef = useRef(activeStampTool);
	activeStampToolRef.current = activeStampTool;
	const isFastExtractModeRef = useRef(isFastExtractMode);
	isFastExtractModeRef.current = isFastExtractMode;
	const useSurfacesRef = useRef(useSurfaces);
	useSurfacesRef.current = useSurfaces;

	const handleToothClickIntercept = useCallback(
		(
			arg1: number | React.MouseEvent,
			arg2?: DOMRect | null | number,
			surface?: string,
		) => {
			const { num, safeRect } = getSafeBoundingRect(arg1, arg2);
			if (!num) return;

			triggerHaptic("selection");
			const effectiveSurface = useSurfacesRef.current ? surface : undefined;

			if (activeStampToolRef.current) {
				triggerHaptic("success");
				onQuickStateChangeRef.current?.([num], activeStampToolRef.current, []);
				return;
			}

			if (isFastExtractModeRef.current) {
				triggerHaptic("success");
				onQuickStateChangeRef.current?.([num], "Missing", []);
				return;
			}

			if (onToothClickRef.current) {
				onToothClickRef.current(num, safeRect, effectiveSurface);
				return;
			}

			const currentTooth = teethDataRef.current.find(
				(t) => t.toothNumber === num,
			);
			setRadialMenuData({
				toothNumber: num,
				rect: {
					x: safeRect.left,
					y: safeRect.top,
					width: safeRect.width,
					height: safeRect.height,
				},
				currentState: currentTooth?.state,
				surfaces: effectiveSurface ? [effectiveSurface] : undefined,
			});
		},
		[setRadialMenuData],
	);

	return { handleToothClickIntercept };
}
