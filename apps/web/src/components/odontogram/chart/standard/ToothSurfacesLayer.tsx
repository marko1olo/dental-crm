import type React from "react";
import type { ToothState } from "../toothChartTypes";

export interface ToothSurfacesLayerProps {
	number: number;
	state: ToothState;
	surfaces?: readonly string[] | undefined;
	isTop: boolean;
	cfg: { viewX: number; viewWidth: number };
	handleSurfaceClick: (e: React.MouseEvent<SVGGElement>) => void;
	handleSurfaceKeyDown: (e: React.KeyboardEvent<SVGGElement>) => void;
}

export const ToothSurfacesLayer: React.FC<ToothSurfacesLayerProps> = ({
	number,
	state,
	surfaces,
	isTop,
	cfg,
	handleSurfaceClick,
	handleSurfaceKeyDown,
}) => {
	const fillFor = (code: string) => (surfaces?.includes(code) ? (state === "Filled" ? "#10b981" : "#ef4444") : "transparent");
	const isV = surfaces?.includes("V") || surfaces?.includes("B");
	const isLP = surfaces?.includes("L") || surfaces?.includes("P");

	return (
		<g
			transform={`translate(${cfg.viewX + cfg.viewWidth / 2 - 12}, ${isTop ? 95 : 35})`}
			stroke="rgba(255,255,255,0.7)"
			strokeWidth="0.5"
			className="tooth-surface-interactive-group"
			onClick={handleSurfaceClick}
			onKeyDown={handleSurfaceKeyDown}
		>
			{/* O - Occlusal */}
			<g role="tab" tabIndex={0} data-surface="O" aria-label={`Поверхность O зуба ${number}`} className="tooth-surface-target cursor-pointer">
				<polygon points="8,8 16,8 16,16 8,16" fill={fillFor("O")} style={{ transition: "fill 0.2s" }} />
			</g>

			{/* V - Vestibular / Buccal */}
			<g role="tab" tabIndex={0} data-surface="V" aria-label={`Поверхность V зуба ${number}`} className="tooth-surface-target cursor-pointer">
				<polygon points="0,0 24,0 16,8 8,8" fill={isV ? (state === "Filled" ? "#10b981" : "#ef4444") : "transparent"} style={{ transition: "fill 0.2s" }} />
			</g>

			{/* L/P - Lingual / Palatal */}
			<g role="tab" tabIndex={0} data-surface={isTop ? "P" : "L"} aria-label={`Поверхность ${isTop ? "P" : "L"} зуба ${number}`} className="tooth-surface-target cursor-pointer">
				<polygon points="8,16 16,16 24,24 0,24" fill={isLP ? (state === "Filled" ? "#10b981" : "#ef4444") : "transparent"} style={{ transition: "fill 0.2s" }} />
			</g>

			{/* D - Distal */}
			<g role="tab" tabIndex={0} data-surface="D" aria-label={`Поверхность D зуба ${number}`} className="tooth-surface-target cursor-pointer">
				<polygon points="0,0 8,8 8,16 0,24" fill={fillFor("D")} style={{ transition: "fill 0.2s" }} />
			</g>

			{/* M - Mesial */}
			<g role="tab" tabIndex={0} data-surface="M" aria-label={`Поверхность M зуба ${number}`} className="tooth-surface-target cursor-pointer">
				<polygon points="24,0 24,24 16,16 16,8" fill={fillFor("M")} style={{ transition: "fill 0.2s" }} />
			</g>

			{/* C - Cervical */}
			<g role="tab" tabIndex={0} data-surface="C" aria-label={`Поверхность C зуба ${number}`} className="tooth-surface-target cursor-pointer">
				<polygon points="0,25 24,25 20,29 4,29" fill={fillFor("C")} style={{ transition: "fill 0.2s" }} />
			</g>
		</g>
	);
};
