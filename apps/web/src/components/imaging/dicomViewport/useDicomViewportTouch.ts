import { useRef } from "react";
import {
	calculate1FingerPan,
	calculate2FingerWindowLevel,
	calculatePinchDistance,
	calculatePinchZoom,
	type DicomViewportState,
	type Point2D,
} from "../rvgViewerEngine.js";

export interface UseDicomViewportTouchProps {
	viewportState: DicomViewportState;
	scheduleViewportUpdate: (update: Partial<DicomViewportState>) => void;
	flushViewportUpdate: () => void;
	onViewportChange: (nextState: Partial<DicomViewportState>) => void;
}

export function useDicomViewportTouch({
	viewportState,
	scheduleViewportUpdate,
	flushViewportUpdate,
	onViewportChange,
}: UseDicomViewportTouchProps) {
	const touchStartDistanceRef = useRef(0);
	const touchStartZoomRef = useRef(1);
	const touchStartPosRef = useRef<Point2D>({ x: 0, y: 0 });
	const touchStartPanRef = useRef<Point2D>({ x: 0, y: 0 });
	const touchStartWwWlRef = useRef({ ww: 2000, wl: 500 });
	const touchCountRef = useRef(0);

	const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
		touchCountRef.current = e.touches.length;
		if (e.touches.length === 1 && e.touches[0]) {
			touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			touchStartPanRef.current = { x: viewportState.panX, y: viewportState.panY };
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			const p1 = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
			const p2 = { clientX: e.touches[1].clientX, clientY: e.touches[1].clientY };
			touchStartDistanceRef.current = calculatePinchDistance(p1, p2);
			touchStartZoomRef.current = viewportState.zoom;
			touchStartWwWlRef.current = { ww: viewportState.windowWidth, wl: viewportState.windowCenter };
			touchStartPosRef.current = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 1 && e.touches[0]) {
			const currentPos: Point2D = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			const nextPan = calculate1FingerPan(touchStartPosRef.current, currentPos, touchStartPanRef.current);
			scheduleViewportUpdate({ panX: nextPan.x, panY: nextPan.y });
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			const p1 = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
			const p2 = { clientX: e.touches[1].clientX, clientY: e.touches[1].clientY };
			const currentDist = calculatePinchDistance(p1, p2);
			const nextZoom = calculatePinchZoom(touchStartDistanceRef.current, currentDist, touchStartZoomRef.current);

			const currentMidX = (p1.x + p2.x) / 2;
			const currentMidY = (p1.y + p2.y) / 2;
			const dx = currentMidX - touchStartPosRef.current.x;
			const dy = currentMidY - touchStartPosRef.current.y;
			const nextWwWl = calculate2FingerWindowLevel(dx, dy, touchStartWwWlRef.current.ww, touchStartWwWlRef.current.wl);

			scheduleViewportUpdate({
				zoom: nextZoom,
				windowWidth: nextWwWl.windowWidth,
				windowCenter: nextWwWl.windowCenter,
			});
		}
	};

	const handleTouchEnd = () => {
		touchCountRef.current = 0;
		flushViewportUpdate();
	};

	return {
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
	};
}
