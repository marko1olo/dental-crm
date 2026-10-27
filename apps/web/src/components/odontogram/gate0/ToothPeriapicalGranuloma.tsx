import React from "react";
import type { ApexPoint } from "./ToothAdaptivePeriapicalArea";

export interface ToothPeriapicalGranulomaProps {
	apices: readonly ApexPoint[];
	toothId?: string | undefined;
	className?: string | undefined;
}

export const ToothPeriapicalGranuloma: React.FC<
	ToothPeriapicalGranulomaProps
> = ({ apices, toothId, className }) => (
	<g
		id={toothId ? `tooth${toothId}-granuloma` : "tooth-granuloma"}
		data-testid="tooth-granuloma"
		className={`tooth-periapical-halo-group ${className ?? ""}`}
	>
		{apices.map((apex, i) => {
			const r = apex.r ?? 9.5;
			return (
				<g key={`gran-apex-${i}-${apex.x}`}>
					<ellipse
						cx={apex.x}
						cy={apex.y + 1}
						rx={r * 1.25}
						ry={r * 1.25}
						fill="url(#dente-granuloma-capsule)"
						stroke="none"
						opacity="0.85"
					/>
					<ellipse
						cx={apex.x}
						cy={apex.y + 1}
						rx={r * 0.95}
						ry={r * 0.95}
						fill="url(#dente-granuloma-core)"
						stroke="none"
						opacity="0.9"
					/>
				</g>
			);
		})}
	</g>
);
