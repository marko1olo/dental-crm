import React from "react";
import type { LandmarkKey, Point2D } from "../cephalometricMath";

interface CephMagnifierProps {
	draggingKey: LandmarkKey | null;
	hoveredKey: LandmarkKey | null;
	cursorImgPos: Point2D | null;
}

export const CephMagnifier: React.FC<CephMagnifierProps> = ({
	draggingKey,
	hoveredKey,
	cursorImgPos,
}) => {
	if ((!draggingKey && !hoveredKey) || !cursorImgPos) return null;

	return (
		<div className="absolute bottom-4 right-4 z-40 w-36 h-36 rounded-full overflow-hidden border-2 border-[var(--teal,#0d9488)] bg-slate-950 shadow-2xl pointer-events-none flex items-center justify-center">
			<div
				className="relative w-full h-full"
				style={{
					transform: `scale(2.4) translate(${-cursorImgPos.x + 72}px, ${-cursorImgPos.y + 72}px)`,
					transformOrigin: "top left",
				}}
			>
				<div
					className="absolute w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)] border border-white"
					style={{ left: cursorImgPos.x - 5, top: cursorImgPos.y - 5 }}
				/>
			</div>
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div className="w-full h-[1px] bg-[var(--teal-soft,rgba(13,148,136,0.3))]" />
				<div className="h-full w-[1px] bg-[var(--teal-soft,rgba(13,148,136,0.3))] absolute" />
				<div className="w-4 h-4 rounded-full border border-[var(--teal,#0d9488)]" />
			</div>
			<div className="absolute bottom-1.5 bg-slate-900/95 text-xs text-[var(--teal,#0d9488)] px-2.5 py-0.5 rounded-full font-mono font-bold border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
				{draggingKey ?? hoveredKey} ({Math.round(cursorImgPos.x)}, {Math.round(cursorImgPos.y)})
			</div>
		</div>
	);
};
