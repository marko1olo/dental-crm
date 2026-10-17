import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewerRulerMeasurement } from "./types.js";
import { buildRulerMeasurement, clientToImagePercent } from "./transformHelpers.js";

export interface UseClinicalImageInteractionsProps {
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
	readonly transformStr?: string | undefined;
	readonly isRulerActive: boolean;
	readonly isPanActive: boolean;
	readonly pan?: { x: number; y: number } | undefined;
	readonly onPanChange?: ((pan: { x: number; y: number }) => void) | undefined;
	readonly measurements?: ViewerRulerMeasurement[] | undefined;
	readonly onMeasurementsChange?: ((m: ViewerRulerMeasurement[]) => void) | undefined;
	readonly pixelSpacingMm?: number | undefined;
	readonly toothCode?: string | number | null | undefined;
	readonly onMeasureApexLength?: ((lengthMm: number) => void) | undefined;
}

export function useClinicalImageInteractions({
	containerRef,
	transformStr,
	isRulerActive,
	isPanActive,
	pan,
	onPanChange,
	measurements,
	onMeasurementsChange,
	pixelSpacingMm = 0.04,
	toothCode,
	onMeasureApexLength,
}: UseClinicalImageInteractionsProps) {
	const [isPanning, setIsPanning] = useState(false);
	const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
	const [internalMeasurements, setInternalMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [drawingRuler, setDrawingRuler] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

	const activeMeasurements = measurements ?? internalMeasurements;
	const activePan = pan ?? internalPan;
	const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	const toPercent = useCallback(
		(clientX: number, clientY: number) => {
			if (!containerRef.current) return { x: 50, y: 50 };
			return clientToImagePercent(clientX, clientY, containerRef.current.getBoundingClientRect(), transformStr);
		},
		[transformStr, containerRef],
	);

	useEffect(() => {
		if (!isPanning && !drawingRuler) return;

		const onMove = (e: MouseEvent) => {
			if (isPanning) {
				const dx = e.clientX - lastMousePos.current.x;
				const dy = e.clientY - lastMousePos.current.y;
				lastMousePos.current = { x: e.clientX, y: e.clientY };
				const nextPan = { x: activePan.x + dx, y: activePan.y + dy };
				if (onPanChange) onPanChange(nextPan);
				else setInternalPan(nextPan);
			} else if (drawingRuler && containerRef.current) {
				const { x, y } = toPercent(e.clientX, e.clientY);
				setDrawingRuler((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
			}
		};

		const onUp = (e: MouseEvent) => {
			if (isPanning) setIsPanning(false);
			if (drawingRuler && containerRef.current) {
				const { x, y } = toPercent(e.clientX, e.clientY);
				const newM = buildRulerMeasurement({
					startX: drawingRuler.startX, startY: drawingRuler.startY,
					endX: x, endY: y, rect: containerRef.current.getBoundingClientRect(),
					pixelSpacingMm: pixelSpacingMm || 0.04, toothCode,
				});
				if (newM) {
					const next = [...activeMeasurements, newM];
					if (onMeasurementsChange) onMeasurementsChange(next);
					else setInternalMeasurements(next);
					if (onMeasureApexLength && typeof newM.lengthMm === "number") onMeasureApexLength(newM.lengthMm);
				}
				setDrawingRuler(null);
			}
		};

		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [isPanning, drawingRuler, toPercent, activePan, onPanChange, activeMeasurements, onMeasurementsChange, pixelSpacingMm, toothCode, onMeasureApexLength, containerRef]);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button !== 0) return;
		if (isRulerActive) {
			e.preventDefault();
			const { x, y } = toPercent(e.clientX, e.clientY);
			setDrawingRuler({ startX: x, startY: y, endX: x, endY: y });
			return;
		}
		if (isPanActive) {
			e.preventDefault();
			setIsPanning(true);
			lastMousePos.current = { x: e.clientX, y: e.clientY };
		}
	};

	const deleteMeasurement = (id: string) => {
		const next = activeMeasurements.filter((m) => m.id !== id);
		if (onMeasurementsChange) onMeasurementsChange(next);
		else setInternalMeasurements(next);
	};

	return { activeMeasurements, drawingRuler, handleMouseDown, deleteMeasurement, isPanning };
}
