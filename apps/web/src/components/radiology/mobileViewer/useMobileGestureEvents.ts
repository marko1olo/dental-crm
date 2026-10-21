import type React from "react";
import { showToast } from "../../GlobalToast.js";
import type { UseMobileGestureEventsProps } from "./gestureTypes.js";

export function useMobileGestureEvents(p: UseMobileGestureEventsProps) {
	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (!touch) return;
			const now = Date.now();
			const isDoubleTap = now - p.touchStartRef.current.lastTapTime < 280;
			p.touchStartRef.current.lastTapTime = now;
			if (isDoubleTap && !p.isRulerActive) {
				p.triggerHaptic();
				p.setZoom((prev) => (prev > 1.2 ? 1.0 : 2.0));
				p.setPan({ x: 0, y: 0 });
				return;
			}
			if (p.isRulerActive && p.viewportRef.current) {
				const rect = p.viewportRef.current.getBoundingClientRect();
				const pt = {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				};
				p.setRulerStart(pt);
				p.setRulerCurrent(pt);
				return;
			}
			p.touchStartRef.current = {
				x: touch.clientX,
				y: touch.clientY,
				panX: p.pan.x,
				panY: p.pan.y,
				dist: 0,
				initialZoom: p.zoom,
				lastTapTime: now,
			};
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			p.touchStartRef.current.dist = Math.hypot(
				e.touches[1].clientX - e.touches[0].clientX,
				e.touches[1].clientY - e.touches[0].clientY,
			);
			p.touchStartRef.current.initialZoom = p.zoom;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1 && e.touches[0]) {
			const touch = e.touches[0];
			if (p.isRulerActive && p.rulerStart && p.viewportRef.current) {
				const rect = p.viewportRef.current.getBoundingClientRect();
				p.setRulerCurrent({
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				});
				return;
			}
			const dx = touch.clientX - p.touchStartRef.current.x;
			const dy = touch.clientY - p.touchStartRef.current.y;
			p.setPan({
				x: p.touchStartRef.current.panX + dx,
				y: p.touchStartRef.current.panY + dy,
			});
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			const dist = Math.hypot(
				e.touches[1].clientX - e.touches[0].clientX,
				e.touches[1].clientY - e.touches[0].clientY,
			);
			if (p.touchStartRef.current.dist > 0) {
				const nextZoom = Math.max(
					0.8,
					Math.min(
						4.5,
						p.touchStartRef.current.initialZoom *
							(dist / p.touchStartRef.current.dist),
					),
				);
				p.setZoom(Number(nextZoom.toFixed(2)));
			}
		}
	};

	const handleTouchEnd = () => {
		if (p.isRulerActive && p.rulerStart && p.rulerCurrent) {
			const distPx = Math.hypot(
				p.rulerCurrent.x - p.rulerStart.x,
				p.rulerCurrent.y - p.rulerStart.y,
			);
			if (distPx > 10) {
				const distMm = Number(
					((distPx / p.zoom) * p.pixelSpacingMm).toFixed(1),
				);
				p.setSavedRulerDistanceMm(distMm);
				p.triggerHaptic();
				showToast(`Измерение: ${distMm} мм`, "success");
			} else {
				p.setRulerStart(null);
				p.setRulerCurrent(null);
			}
		}
	};

	return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
