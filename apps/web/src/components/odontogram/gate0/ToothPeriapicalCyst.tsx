import type React from "react";
import type { ApexPoint } from "./ToothAdaptivePeriapicalArea";

export interface ToothPeriapicalCystProps {
	apices: readonly ApexPoint[];
	condition: "cyst" | "resorption";
	isDark?: boolean | undefined;
	toothId?: string | undefined;
	className?: string | undefined;
}

export const ToothPeriapicalCyst: React.FC<ToothPeriapicalCystProps> = ({
	apices,
	condition,
	isDark = false,
	toothId,
	className,
}) => {
	const outerBorder = isDark ? "#ffffff" : "#f1f5f9";
	const spiculeStroke = isDark
		? "rgba(226, 232, 240, 0.5)"
		: "rgba(100, 116, 139, 0.5)";
	const lacunaeStroke = isDark
		? "rgba(248, 113, 113, 0.95)"
		: "rgba(220, 38, 38, 0.90)";
	const craterFill = isDark ? "#0f172a" : "#1e1b18";

	if (condition === "resorption") {
		return (
			<g
				id={toothId ? `tooth${toothId}-apical-resorption` : "tooth-apical-resorption"}
				data-testid="tooth-resorption"
				className={className}
			>
				{apices.map((apex, i) => {
					const r = apex.r ?? 9.5;
					return (
						<g key={`resorp-apex-${i}-${apex.x}`}>
							<ellipse cx={apex.x} cy={apex.y - 2} rx={r * 0.95} ry={r * 0.75} fill="url(#dente-resorption-halo)" />
							<path
								d={`M ${apex.x - r * 0.7},${apex.y - 3.5} C ${apex.x - r * 0.3},${apex.y - 1} ${apex.x + r * 0.3},${apex.y - 1} ${apex.x + r * 0.7},${apex.y - 3.5} Z`}
								fill={craterFill}
								stroke={lacunaeStroke}
								strokeWidth="0.8"
								strokeLinejoin="round"
								vectorEffect="non-scaling-stroke"
							/>
							<path
								data-component="resorption-lacuna"
								d={`M ${apex.x - r * 0.45},${apex.y - 4} C ${apex.x - r * 0.2},${apex.y - 2.5} ${apex.x - r * 0.1},${apex.y - 2.8} ${apex.x},${apex.y - 4}`}
								fill="none"
								stroke={lacunaeStroke}
								strokeWidth="0.65"
								strokeLinecap="round"
								vectorEffect="non-scaling-stroke"
							/>
							<path
								data-component="resorption-lacuna"
								d={`M ${apex.x},${apex.y - 4} C ${apex.x + r * 0.15},${apex.y - 2.5} ${apex.x + r * 0.3},${apex.y - 2.8} ${apex.x + r * 0.45},${apex.y - 4}`}
								fill="none"
								stroke={lacunaeStroke}
								strokeWidth="0.65"
								strokeLinecap="round"
								vectorEffect="non-scaling-stroke"
							/>
						</g>
					);
				})}
			</g>
		);
	}

	return (
		<g
			id={toothId ? `tooth${toothId}-radicular-cyst` : "tooth-radicular-cyst"}
			data-testid="tooth-radicular-cyst"
			className={className}
		>
			{apices.map((apex, i) => {
				const r = apex.r ?? 9.5;
				return (
					<g key={`cyst-apex-${i}-${apex.x}`}>
						<ellipse cx={apex.x} cy={apex.y + 1} rx={r * 1.15} ry={r * 1.15} fill="url(#dente-cyst-fluid)" />
						<ellipse cx={apex.x} cy={apex.y + 1} rx={r * 1.15} ry={r * 1.15} fill="none" stroke="rgba(148, 163, 184, 0.40)" strokeWidth="0.8" />
						<ellipse cx={apex.x} cy={apex.y + 1} rx={r * 1.25} ry={r * 1.25} fill="none" stroke={outerBorder} strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
						<path data-component="cyst-spicule" d={`M ${apex.x + r * 1.1},${apex.y - r * 0.5} L ${apex.x + r * 1.5},${apex.y - r * 0.7}`} fill="none" stroke={spiculeStroke} strokeWidth="0.6" strokeLinecap="round" />
						<path data-component="cyst-spicule" d={`M ${apex.x - r * 1.1},${apex.y - r * 0.5} L ${apex.x - r * 1.5},${apex.y - r * 0.7}`} fill="none" stroke={spiculeStroke} strokeWidth="0.6" strokeLinecap="round" />
						<path data-component="cyst-spicule" d={`M ${apex.x + r * 0.9},${apex.y + r * 1.1} L ${apex.x + r * 1.3},${apex.y + r * 1.4}`} fill="none" stroke={spiculeStroke} strokeWidth="0.6" strokeLinecap="round" />
						<path data-component="cyst-spicule" d={`M ${apex.x - r * 0.9},${apex.y + r * 1.1} L ${apex.x - r * 1.3},${apex.y + r * 1.4}`} fill="none" stroke={spiculeStroke} strokeWidth="0.6" strokeLinecap="round" />
					</g>
				);
			})}
		</g>
	);
};
