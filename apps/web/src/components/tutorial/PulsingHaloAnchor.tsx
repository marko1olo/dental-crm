/**
 * PulsingHaloAnchor.tsx
 *
 * DENTE CRM — Concentric Ripple Rings & Pulsing Pointer Badge for Interactive Targets
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, subtle medical elegance).
 * - Mandate 8e: Doctor Autonomy (pointer-events: none, underlying controls never blocked).
 * - User Mandate: "с акцентуацией кружками на какие-то кнопки, элементы, подсвечиванием, миганием".
 */

import React, { useMemo } from "react";
import { MousePointerClick } from "lucide-react";
import type { SimpleRect } from "./spotlightGeometry";

export interface PulsingHaloAnchorProps {
	readonly isOpen: boolean;
	readonly targetRect?: SimpleRect | null;
	readonly showPointerBadge?: boolean;
	readonly badgeText?: string;
	readonly pointerDirection?: "top" | "bottom" | "left" | "right";
	readonly colorTheme?: "cyan" | "emerald";
}

export const PulsingHaloAnchor: React.FC<PulsingHaloAnchorProps> = React.memo(({
	isOpen,
	targetRect,
	showPointerBadge = true,
	badgeText = "Кликните сюда",
	pointerDirection,
	colorTheme = "cyan",
}) => {
	const effectiveDirection = useMemo(() => {
		if (pointerDirection) return pointerDirection;
		if (!targetRect) return "top";
		// Default to top if space permits, otherwise bottom
		return targetRect.top >= 48 ? "top" : "bottom";
	}, [pointerDirection, targetRect]);

	if (!isOpen || !targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
		return null;
	}

	const padding = 4;
	const top = Math.round(targetRect.top - padding);
	const left = Math.round(targetRect.left - padding);
	const width = Math.round(targetRect.width + padding * 2);
	const height = Math.round(targetRect.height + padding * 2);

	return (
		<div
			className="tour-beacon-anchor"
			style={{ top, left, width, height }}
			data-testid="guided-tour-pulsing-halo-anchor"
			aria-hidden="true"
		>
			{/* 1. Primary concentric expanding halo ring */}
			<div
				className="tour-halo-ring"
				style={
					colorTheme === "emerald"
						? {
								animationName: "tour-halo-pulse-emerald",
								borderColor: "rgba(13, 148, 136, 0.65)",
							}
						: undefined
				}
				data-testid="halo-ring-primary"
			/>

			{/* 2. Secondary phase-delayed concentric halo ripple */}
			<div
				className="tour-halo-ring-delayed"
				style={
					colorTheme === "emerald"
						? {
								animationName: "tour-halo-pulse-emerald",
								borderColor: "rgba(13, 148, 136, 0.45)",
							}
						: undefined
				}
				data-testid="halo-ring-delayed"
			/>

			{/* 3. Glowing bounding frame */}
			<div
				className="tour-beacon-frame"
				style={
					colorTheme === "emerald"
						? {
								borderColor: "#0d9488",
								boxShadow: "0 0 16px rgba(13, 148, 136, 0.5)",
							}
						: undefined
				}
				data-testid="beacon-frame"
			/>

			{/* 4. Directional pulsating pointer badge */}
			{showPointerBadge && (
				<div
					className={`tour-pointer-badge tour-pointer-badge-${effectiveDirection}`}
					style={
						colorTheme === "emerald"
							? {
									background: "#0d9488",
									boxShadow: "0 4px 14px rgba(13, 148, 136, 0.5)",
								}
							: undefined
					}
					data-testid="halo-pointer-badge"
				>
					<MousePointerClick size={13} aria-hidden="true" />
					<span>{badgeText}</span>
				</div>
			)}
		</div>
	);
});

PulsingHaloAnchor.displayName = "PulsingHaloAnchor";
