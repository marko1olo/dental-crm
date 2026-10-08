/**
 * DENTE CRM — CBCT 3D Orbit Camera & Trackball Controls (Layer 2)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Cybermed OnDemand3D
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	DEFAULT_CAMERA_PITCH,
	DEFAULT_CAMERA_YAW,
	DEFAULT_CAMERA_ZOOM,
	EXTRA_SKULL_PROJECTIONS,
	MAX_CAMERA_ZOOM,
	MIN_CAMERA_ZOOM,
	PITCH_CLAMP_MAX,
	PITCH_CLAMP_MIN,
} from "./constants";

export function normalizeYawAngle(yaw: number): number {
	return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

export function checkIsAngleNear(
	yaw: number,
	pitch: number,
	targetYaw: number,
	targetPitch: number,
	tolerance = 12,
): boolean {
	const normYaw = normalizeYawAngle(yaw);
	const dYaw = Math.abs(normYaw - targetYaw);
	const dPitch = Math.abs(pitch - targetPitch);
	return (
		(dYaw <= tolerance || Math.abs(dYaw - 360) <= tolerance) &&
		dPitch <= tolerance
	);
}

export function useVolumeCameraControls() {
	const [yaw, setYaw] = useState<number>(DEFAULT_CAMERA_YAW);
	const [pitch, setPitch] = useState<number>(DEFAULT_CAMERA_PITCH);
	const [zoom, setZoom] = useState<number>(DEFAULT_CAMERA_ZOOM);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState<boolean>(false);

	const isDraggingRef = useRef<boolean>(false);
	const dragButtonRef = useRef<number>(0);
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const dragStartAnglesRef = useRef<{ yaw: number; pitch: number }>({
		yaw: DEFAULT_CAMERA_YAW,
		pitch: DEFAULT_CAMERA_PITCH,
	});
	const dragStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const targetAnglesRef = useRef<{ yaw: number; pitch: number }>({
		yaw: DEFAULT_CAMERA_YAW,
		pitch: DEFAULT_CAMERA_PITCH,
	});
	const targetPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const rafIdRef = useRef<number | null>(null);

	const touchStartDistRef = useRef<number | null>(null);
	const touchStartZoomRef = useRef<number>(DEFAULT_CAMERA_ZOOM);

	// Cancel RAF on unmount
	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
		};
	}, []);

	const isAngleNear = useCallback(
		(targetYaw: number, targetPitch: number, tolerance = 12): boolean => {
			return checkIsAngleNear(yaw, pitch, targetYaw, targetPitch, tolerance);
		},
		[yaw, pitch],
	);

	const handleSetOrientation = useCallback(
		(orientation: "coronal" | "sagittal" | "isometric") => {
			if (orientation === "coronal") {
				setYaw(0);
				setPitch(0);
			} else if (orientation === "sagittal") {
				setYaw(90);
				setPitch(0);
			} else {
				setYaw(45);
				setPitch(15);
			}
			setPan({ x: 0, y: 0 });
		},
		[],
	);

	const handleResetCamera = useCallback(() => {
		setYaw(DEFAULT_CAMERA_YAW);
		setPitch(DEFAULT_CAMERA_PITCH);
		setZoom(DEFAULT_CAMERA_ZOOM);
		setPan({ x: 0, y: 0 });
	}, []);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault();
			isDraggingRef.current = true;
			setIsInteracting(true);
			dragButtonRef.current = e.button;
			dragStartPosRef.current = { x: e.clientX, y: e.clientY };
			dragStartAnglesRef.current = { yaw, pitch };
			dragStartPanRef.current = { ...pan };
			targetAnglesRef.current = { yaw, pitch };
			targetPanRef.current = { ...pan };
		},
		[yaw, pitch, pan],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDraggingRef.current) return;
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;

			if (dragButtonRef.current === 0) {
				targetAnglesRef.current = {
					yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
					pitch: Math.max(
						PITCH_CLAMP_MIN,
						Math.min(PITCH_CLAMP_MAX, dragStartAnglesRef.current.pitch + dy * 0.6),
					),
				};
			} else if (dragButtonRef.current === 2 || dragButtonRef.current === 1) {
				targetPanRef.current = {
					x: dragStartPanRef.current.x + dx,
					y: dragStartPanRef.current.y + dy,
				};
			}

			if (rafIdRef.current === null) {
				rafIdRef.current = requestAnimationFrame(() => {
					rafIdRef.current = null;
					setYaw(targetAnglesRef.current.yaw);
					setPitch(targetAnglesRef.current.pitch);
					setPan(targetPanRef.current);
				});
			}
		},
		[],
	);

	const handleMouseUp = useCallback(() => {
		if (!isDraggingRef.current) return;
		isDraggingRef.current = false;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setYaw(targetAnglesRef.current.yaw);
		setPitch(targetAnglesRef.current.pitch);
		setPan(targetPanRef.current);
		setIsInteracting(false);
	}, []);

	const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.1 : 0.91;
		setZoom((prev) => Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, prev * zoomDelta)));
	}, []);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent<HTMLCanvasElement>) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0]!;
				isDraggingRef.current = true;
				setIsInteracting(true);
				dragButtonRef.current = 0;
				dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
				dragStartAnglesRef.current = { yaw, pitch };
				targetAnglesRef.current = { yaw, pitch };
				touchStartDistRef.current = null;
			} else if (e.touches.length === 2) {
				isDraggingRef.current = false;
				setIsInteracting(true);
				const t1 = e.touches[0]!;
				const t2 = e.touches[1]!;
				touchStartDistRef.current = Math.hypot(
					t1.clientX - t2.clientX,
					t1.clientY - t2.clientY,
				);
				touchStartZoomRef.current = zoom;
			}
		},
		[yaw, pitch, zoom],
	);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent<HTMLCanvasElement>) => {
			if (e.touches.length === 1 && isDraggingRef.current) {
				const touch = e.touches[0]!;
				const dx = touch.clientX - dragStartPosRef.current.x;
				const dy = touch.clientY - dragStartPosRef.current.y;
				targetAnglesRef.current = {
					yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
					pitch: Math.max(
						PITCH_CLAMP_MIN,
						Math.min(PITCH_CLAMP_MAX, dragStartAnglesRef.current.pitch + dy * 0.6),
					),
				};
				if (rafIdRef.current === null) {
					rafIdRef.current = requestAnimationFrame(() => {
						rafIdRef.current = null;
						setYaw(targetAnglesRef.current.yaw);
						setPitch(targetAnglesRef.current.pitch);
					});
				}
			} else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
				const t1 = e.touches[0]!;
				const t2 = e.touches[1]!;
				const curDist = Math.hypot(
					t1.clientX - t2.clientX,
					t1.clientY - t2.clientY,
				);
				if (curDist > 10 && touchStartDistRef.current > 10) {
					const factor = curDist / touchStartDistRef.current;
					setZoom(
						Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, touchStartZoomRef.current * factor)),
					);
				}
			}
		},
		[],
	);

	const handleTouchEnd = useCallback(() => {
		isDraggingRef.current = false;
		touchStartDistRef.current = null;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setYaw(targetAnglesRef.current.yaw);
		setPitch(targetAnglesRef.current.pitch);
		setIsInteracting(false);
	}, []);

	const isCoronalActive = isAngleNear(0, 0);
	const isSagittalActive = isAngleNear(90, 0);
	const isIsometricActive = isAngleNear(45, 15, 16) || isAngleNear(30, 12, 16);
	const activeExtraProjection = EXTRA_SKULL_PROJECTIONS.find((p) =>
		isAngleNear(p.yaw, p.pitch, 15),
	);
	const isExtraActive = Boolean(activeExtraProjection);

	return {
		yaw,
		setYaw,
		pitch,
		setPitch,
		zoom,
		setZoom,
		pan,
		setPan,
		isInteracting,
		setIsInteracting,
		rafIdRef,
		isAngleNear,
		handleSetOrientation,
		handleResetCamera,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleWheel,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		isCoronalActive,
		isSagittalActive,
		isIsometricActive,
		activeExtraProjection,
		isExtraActive,
	};
}
