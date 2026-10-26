/**
 * crossSectionHandlers.ts — Фасадный хук обработчиков взаимодействия с кросс-секцией (Мандат 8b <= 120 строк).
 */

import { useCallback } from "react";
import type { Point3D } from "../../cbctMprMath";
import { getCrossPointerWorldMm } from "./curveSplineMath";
import type { UseCbctCurvedViewportHandlersParams } from "./types";
import { executeCrossSectionMouseDown } from "./handlers/crossSectionMouseDownLogic";
import { executeCrossSectionMouseMove } from "./handlers/crossSectionMouseMoveLogic";
import { executeCrossSectionMouseUp, executeCrossSectionWheel } from "./handlers/crossSectionMouseUpAndWheelLogic";

export * from "./handlers/crossSectionHitTesting";

export function useCrossSectionViewportHandlers(params: UseCbctCurvedViewportHandlersParams) {
	const { transforms, activeCrossSection } = params;

	const getCrossPointerMm = useCallback(
		(pointerPx: { readonly x: number; readonly y: number }, cW: number): Point3D => {
			return getCrossPointerWorldMm(pointerPx, transforms.cross_section, activeCrossSection, cW);
		},
		[transforms.cross_section, activeCrossSection],
	);

	const handleCrossSectionMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => executeCrossSectionMouseDown(e, params, getCrossPointerMm),
		[params, getCrossPointerMm],
	);

	const handleCrossSectionMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => executeCrossSectionMouseMove(e, params, getCrossPointerMm),
		[params, getCrossPointerMm],
	);

	const handleCrossSectionMouseUp = useCallback(
		() => executeCrossSectionMouseUp(params),
		[params],
	);

	const handleCrossSectionWheel = useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => executeCrossSectionWheel(e, params),
		[params],
	);

	return {
		handleCrossSectionMouseDown,
		handleCrossSectionMouseMove,
		handleCrossSectionMouseUp,
		handleCrossSectionWheel,
	};
}
