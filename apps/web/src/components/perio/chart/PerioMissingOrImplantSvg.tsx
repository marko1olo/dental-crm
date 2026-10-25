/**
 * PerioMissingOrImplantSvg.tsx — SVG иконки отсутствующего зуба и имплантата.
 * Архитектурный слой Layer 4: SVG Subcomponent (Мандат 8b, <= 120 строк).
 */

import React from "react";

export interface PerioSvgIconProps {
	readonly width?: number | undefined;
	readonly height?: number | undefined;
}

export const PerioMissingToothSvg: React.FC<PerioSvgIconProps> = ({ width = 28, height = 34 }) => (
	<svg width={width} height={height} viewBox="0 0 28 34" className="text-[var(--muted)]">
		<line x1="4" y1="4" x2="24" y2="30" stroke="currentColor" strokeWidth="2" />
		<line x1="24" y1="4" x2="4" y2="30" stroke="currentColor" strokeWidth="2" />
	</svg>
);

export const PerioImplantToothSvg: React.FC<PerioSvgIconProps> = ({ width = 28, height = 34 }) => (
	<svg width={width} height={height} viewBox="0 0 28 34" className="text-amber-400">
		<rect x="7" y="4" width="14" height="26" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
		<line x1="7" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
		<line x1="7" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
		<line x1="7" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1.5" />
		<line x1="7" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="1.5" />
		<line x1="7" y1="24" x2="21" y2="24" stroke="currentColor" strokeWidth="1.5" />
	</svg>
);

export const PerioImplantVisualSvg = PerioImplantToothSvg;
export const PerioMissingVisualSvg = PerioMissingToothSvg;

