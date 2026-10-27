import React from "react";

export interface ToothBrokenFileMarkerProps {
	toothId?: string | undefined;
	path: string;
	fracturePoint?: { x: number; y: number } | undefined;
	flutes?: readonly string[] | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Universal high-contrast separated endodontic instrument (сломанный файл NiTi) marker.
 * Conforms to Tooth46BrokenFileOverlay clinical visual invariant:
 * - Vivid amber-orange warning danger contour (rgba(217, 119, 6, 0.95) / rgba(251, 191, 36, 0.95))
 * - Dark surgical metallic NiTi core (#1e293b / url(#dente-niti-metal))
 * - Vivid red fracture notch (#ef4444) at torsional fatigue separation point
 * - High-luster spiral flutes (#ffffff)
 * Mandate 8b: Strictly <= 120 lines.
 */
export const ToothBrokenFileMarker: React.FC<ToothBrokenFileMarkerProps> = ({
	toothId,
	path,
	fracturePoint,
	flutes,
	isDark = false,
	className,
}) => {
	const warningStroke = isDark
		? "rgba(251, 191, 36, 0.95)"
		: "rgba(217, 119, 6, 0.95)";

	return (
		<g
			id={toothId ? `tooth${toothId}-broken-file` : "broken-file-marker"}
			data-testid={toothId ? `tooth${toothId}-broken-file` : "broken-file"}
			className={className}
		>
			{/* High-visibility amber-orange danger beacon glow / outline */}
			<path
				d={path}
				fill="none"
				stroke={warningStroke}
				strokeWidth="3.4"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
				opacity="0.95"
			/>

			{/* Dark surgical alloy NiTi shaft */}
			<path
				d={path}
				fill="none"
				stroke="url(#dente-niti-metal)"
				strokeWidth="2.0"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={path}
				fill="none"
				stroke="#1e293b"
				strokeWidth="1.0"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
				opacity="0.85"
			/>

			{/* Micro-helical specular ridge along the core */}
			<path
				d={path}
				fill="none"
				stroke="#ffffff"
				strokeWidth="0.45"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
				opacity="0.85"
			/>

			{/* Helical flutes (spiral cutting edges) */}
			{Array.isArray(flutes) &&
				flutes.map((f, idx) => (
					<path
						key={`bf-flute-${idx}`}
						d={f}
						fill="none"
						stroke="#ffffff"
						strokeWidth="0.65"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
						opacity="0.95"
					/>
				))}

			{/* Torsional fatigue fracture notch at coronal separation point */}
			{fracturePoint && (
				<circle
					cx={fracturePoint.x}
					cy={fracturePoint.y}
					r="1.4"
					fill="#ef4444"
					stroke="#ffffff"
					strokeWidth="0.4"
				/>
			)}
		</g>
	);
};
