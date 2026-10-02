/**
 * PulsingHaloAnchor.tsx
 *
 * DENTE CRM — Concentric Ripple Rings & Pulsing Pointer Badge for Interactive Targets
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, subtle medical elegance).
 * - Mandate 8e: Doctor Autonomy (pointer-events: none, underlying controls never blocked).
 * - User Mandate: "с акцентуацией кружками на какие-то кнопки, элементы, подсвечиванием, миганием".
 * - Theme Safety: Seamless integration with all 10 clinical and atmospheric themes.
 */

import React, { useMemo } from "react";
import { MousePointerClick } from "lucide-react";
import type { SimpleRect } from "./spotlightGeometry";

export type HaloColorTheme = "auto" | "cyan" | "emerald" | "sakura" | "ocean";

export interface PulsingHaloAnchorProps {
	readonly isOpen: boolean;
	readonly targetRect?: SimpleRect | null;
	readonly showPointerBadge?: boolean;
	readonly badgeText?: string;
	readonly pointerDirection?: "top" | "bottom" | "left" | "right";
	readonly colorTheme?: HaloColorTheme;
	readonly borderRadius?: number;
}

export const PulsingHaloAnchor: React.FC<PulsingHaloAnchorProps> = React.memo(({
	isOpen,
	targetRect,
	showPointerBadge = true,
	badgeText = "Кликните сюда",
	pointerDirection,
	colorTheme = "auto",
	borderRadius,
}) => {
	const effectiveDirection = useMemo(() => {
		if (pointerDirection) return pointerDirection;
		if (!targetRect) return "top";
		// Default to top if space permits, otherwise bottom
		return targetRect.top >= 48 ? "top" : "bottom";
	}, [pointerDirection, targetRect]);

	const effectiveBorderRadius = useMemo(() => {
		if (typeof borderRadius === "number") return borderRadius;
		// Auto-detect circular targets (e.g. 32-44px circular icon buttons, avatars)
		if (targetRect && Math.abs(targetRect.width - targetRect.height) <= 4 && targetRect.width <= 48) {
			return 9999;
		}
		return 8;
	}, [borderRadius, targetRect]);

	const themeOverrideStyle = useMemo((): React.CSSProperties | undefined => {
		if (colorTheme === "emerald") {
			return {
				["--tour-halo-color" as string]: "#10b981",
				["--tour-halo-color-bright" as string]: "#34d399",
				["--tour-halo-glow" as string]: "rgba(16, 185, 129, 0.65)",
				["--tour-halo-rgb" as string]: "16, 185, 129",
			};
		}
		if (colorTheme === "cyan") {
			return {
				["--tour-halo-color" as string]: "#0ea5e9",
				["--tour-halo-color-bright" as string]: "#38bdf8",
				["--tour-halo-glow" as string]: "rgba(14, 165, 233, 0.55)",
				["--tour-halo-rgb" as string]: "14, 165, 233",
			};
		}
		if (colorTheme === "sakura") {
			return {
				["--tour-halo-color" as string]: "#ec4899",
				["--tour-halo-color-bright" as string]: "#f472b6",
				["--tour-halo-glow" as string]: "rgba(236, 72, 153, 0.55)",
				["--tour-halo-rgb" as string]: "236, 72, 153",
			};
		}
		if (colorTheme === "ocean") {
			return {
				["--tour-halo-color" as string]: "#38bdf8",
				["--tour-halo-color-bright" as string]: "#7dd3fc",
				["--tour-halo-glow" as string]: "rgba(56, 189, 248, 0.65)",
				["--tour-halo-rgb" as string]: "56, 189, 248",
			};
		}
		return undefined;
	}, [colorTheme]);

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
			style={{
				top,
				left,
				width,
				height,
				borderRadius: effectiveBorderRadius,
				...themeOverrideStyle,
			}}
			data-testid="guided-tour-pulsing-halo-anchor"
			aria-hidden="true"
		>
			{/* 1. Primary concentric expanding halo ring */}
			<div
				className="tour-halo-ring"
				data-testid="halo-ring-primary"
			/>

			{/* 2. Secondary phase-delayed concentric halo ripple */}
			<div
				className="tour-halo-ring-delayed"
				data-testid="halo-ring-delayed"
			/>

			{/* 3. Glowing bounding frame */}
			<div
				className="tour-beacon-frame"
				data-testid="beacon-frame"
			/>

			{/* 4. Directional pulsating pointer badge */}
			{showPointerBadge && (
				<div
					className={`tour-pointer-badge tour-pointer-badge-${effectiveDirection}`}
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
