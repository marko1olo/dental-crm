/**
 * SpotlightOverlay.tsx
 *
 * DENTE CRM — Smooth Spotlight Overlay with Non-blocking SVG Mask Cutout
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero visual landfill, smooth transitions, mobile safe).
 * - Mandate 8e: Doctor Autonomy (Underlying button remains 100% interactive and clickable).
 * - Mandate 8s: Friction-Killer (Fluid interpolations between steps, theme-safe colors).
 */

import React, { useEffect, useId, useMemo, useState } from "react";
import { calculateSpotlightCutout, type SimpleRect, type ViewportDimensions } from "./spotlightGeometry";

export interface SpotlightOverlayProps {
	readonly isOpen: boolean;
	readonly targetRect?: SimpleRect | null;
	readonly padding?: number;
	readonly borderRadius?: number;
	readonly onBackdropClick?: () => void;
	readonly backdropOpacityClass?: string;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = React.memo(({
	isOpen,
	targetRect,
	padding = 8,
	borderRadius = 8,
	onBackdropClick,
}) => {
	const maskId = useId();

	// Dynamic viewport tracking with clean unmount listener (Defect 6 fix)
	const [viewport, setViewport] = useState<ViewportDimensions>(() => {
		if (typeof window === "undefined") {
			return { width: 1920, height: 1080 };
		}
		return { width: window.innerWidth, height: window.innerHeight };
	});

	useEffect(() => {
		if (!isOpen) return;

		let rafId: number | null = null;
		const handleResize = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				setViewport({ width: window.innerWidth, height: window.innerHeight });
			});
		};

		window.addEventListener("resize", handleResize, { passive: true });
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			window.removeEventListener("resize", handleResize);
		};
	}, [isOpen]);

	const cutout = useMemo(() => {
		return calculateSpotlightCutout(targetRect, padding, borderRadius, viewport);
	}, [targetRect, padding, borderRadius, viewport]);

	if (!isOpen) return null;

	return (
		<div
			className="tour-spotlight-root"
			data-testid="guided-tour-spotlight-overlay"
			aria-hidden="true"
		>
			{/* SVG Mask Container */}
			<svg
				className="tour-spotlight-svg"
				width="100%"
				height="100%"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<mask id={maskId}>
						{/* 1. White backdrop = visible dark mask */}
						<rect width="100%" height="100%" fill="white" />

						{/* 2. Black hole cutout with smooth transition and opacity fade (Defect 1 fix) */}
						<rect
							className="tour-spotlight-cutout-rect"
							x={cutout ? cutout.x : Math.round(viewport.width / 2)}
							y={cutout ? cutout.y : Math.round(viewport.height / 2)}
							width={cutout ? cutout.width : 0}
							height={cutout ? cutout.height : 0}
							rx={cutout ? cutout.rx : 0}
							ry={cutout ? cutout.rx : 0}
							fill="black"
							opacity={cutout ? 1 : 0}
							style={{
								transition:
									"x 0.32s cubic-bezier(0.16, 1, 0.3, 1), y 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1), height 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
							}}
						/>
					</mask>
				</defs>

				{/* Rendered backdrop rectangle using mask */}
				<rect
					className="tour-spotlight-backdrop"
					width="100%"
					height="100%"
					mask={`url(#${maskId})`}
				/>
			</svg>

			{/* Interactive click zones for dismissing on outside click while preserving target clickability */}
			{onBackdropClick && (
				<>
					{cutout ? (
						<>
							{/* Top zone */}
							<div
								className="tour-backdrop-clickable-zone"
								style={{ top: 0, left: 0, width: "100%", height: cutout.y }}
								onClick={onBackdropClick}
								data-testid="spotlight-backdrop-top"
							/>
							{/* Bottom zone */}
							<div
								className="tour-backdrop-clickable-zone"
								style={{
									top: cutout.y + cutout.height,
									left: 0,
									width: "100%",
									height: Math.max(0, viewport.height - (cutout.y + cutout.height)),
								}}
								onClick={onBackdropClick}
								data-testid="spotlight-backdrop-bottom"
							/>
							{/* Left zone */}
							<div
								className="tour-backdrop-clickable-zone"
								style={{ top: cutout.y, left: 0, width: cutout.x, height: cutout.height }}
								onClick={onBackdropClick}
								data-testid="spotlight-backdrop-left"
							/>
							{/* Right zone */}
							<div
								className="tour-backdrop-clickable-zone"
								style={{
									top: cutout.y,
									left: cutout.x + cutout.width,
									width: Math.max(0, viewport.width - (cutout.x + cutout.width)),
									height: cutout.height,
								}}
								onClick={onBackdropClick}
								data-testid="spotlight-backdrop-right"
							/>
						</>
					) : (
						/* Entire screen clickable when no cutout exists */
						<div
							className="tour-backdrop-clickable-zone"
							style={{ inset: 0 }}
							onClick={onBackdropClick}
							data-testid="spotlight-backdrop-full"
						/>
					)}
				</>
			)}
		</div>
	);
});

SpotlightOverlay.displayName = "SpotlightOverlay";
