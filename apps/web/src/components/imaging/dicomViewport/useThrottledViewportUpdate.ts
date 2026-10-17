import { useCallback, useEffect, useRef } from "react";
import type { DicomViewportState } from "./types.js";

export function useThrottledViewportUpdate(
	onViewportChange: (next: Partial<DicomViewportState>) => void,
) {
	const pendingRef = useRef<Partial<DicomViewportState> | null>(null);
	const rafIdRef = useRef<number | null>(null);

	const scheduleViewportUpdate = useCallback(
		(update: Partial<DicomViewportState>) => {
			pendingRef.current = { ...(pendingRef.current || {}), ...update };
			if (rafIdRef.current === null) {
				rafIdRef.current = requestAnimationFrame(() => {
					rafIdRef.current = null;
					if (pendingRef.current) {
						const next = pendingRef.current;
						pendingRef.current = null;
						onViewportChange(next);
					}
				});
			}
		},
		[onViewportChange],
	);

	const flushViewportUpdate = useCallback(() => {
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		if (pendingRef.current) {
			const next = pendingRef.current;
			pendingRef.current = null;
			onViewportChange(next);
		}
	}, [onViewportChange]);

	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
		};
	}, []);

	return { scheduleViewportUpdate, flushViewportUpdate, rafIdRef };
}
