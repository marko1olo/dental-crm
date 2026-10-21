import { Ruler, X } from "lucide-react";
import type React from "react";

export interface MobileRulerOverlayProps {
	isRulerActive: boolean;
	rulerStart: { x: number; y: number } | null;
	rulerCurrent: { x: number; y: number } | null;
	savedRulerDistanceMm: number | null;
	setSavedRulerDistanceMm: (d: number | null) => void;
	setRulerStart: (pt: { x: number; y: number } | null) => void;
	setRulerCurrent: (pt: { x: number; y: number } | null) => void;
}

export const MobileRulerBanner: React.FC<MobileRulerOverlayProps> = ({
	isRulerActive,
	savedRulerDistanceMm,
	setSavedRulerDistanceMm,
	setRulerStart,
	setRulerCurrent,
}) => {
	if (!isRulerActive) return null;
	return (
		<div
			className="mobile-radiology-ruler-banner"
			data-testid="mobile-ruler-banner"
		>
			<Ruler size={13} className="text-white shrink-0" />
			<span>
				{savedRulerDistanceMm !== null
					? `Длина: ${savedRulerDistanceMm} мм`
					: "Проведите пальцем для замера (мм)"}
			</span>
			{savedRulerDistanceMm !== null && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setSavedRulerDistanceMm(null);
						setRulerStart(null);
						setRulerCurrent(null);
					}}
					className="ml-1 p-0.5 rounded text-white/80 hover:text-white"
					title="Сбросить замер"
				>
					<X size={12} />
				</button>
			)}
		</div>
	);
};

export const MobileRulerSvg: React.FC<{
	isRulerActive: boolean;
	rulerStart: { x: number; y: number } | null;
	rulerCurrent: { x: number; y: number } | null;
}> = ({ isRulerActive, rulerStart, rulerCurrent }) => {
	if (!isRulerActive || !rulerStart || !rulerCurrent) return null;
	return (
		<svg
			role="img"
			aria-label="Линейка калибровки"
			className="absolute inset-0 w-full h-full pointer-events-none"
			style={{ overflow: "visible" }}
		>
			<title>Линейка калибровки</title>
			<line
				x1={rulerStart.x}
				y1={rulerStart.y}
				x2={rulerCurrent.x}
				y2={rulerCurrent.y}
				stroke="#10b981"
				strokeWidth="2.5"
				strokeDasharray="4 2"
			/>
			<circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="#10b981" />
			<circle cx={rulerCurrent.x} cy={rulerCurrent.y} r="4" fill="#10b981" />
		</svg>
	);
};
