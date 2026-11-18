/**
 * apps/web/src/components/imaging/dental3d/Dental3dCaliperToast.tsx
 *
 * 3D Micrometer Caliper HUD & active measurement display.
 */

import React from "react";
import { Ruler } from "lucide-react";
import type { CaliperMeasurement } from "./dental3dTypes.js";

export interface Dental3dCaliperToastProps {
	readonly isCaliperActive: boolean;
	readonly caliperMeasurement: CaliperMeasurement | null;
	readonly onClearCaliper: () => void;
}

export const Dental3dCaliperToast: React.FC<Dental3dCaliperToastProps> = ({
	isCaliperActive,
	caliperMeasurement,
	onClearCaliper,
}) => {
	if (!isCaliperActive) return null;

	return (
		<div
			className="pointer-events-auto fixed md:absolute top-14 md:top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg animate-in fade-in slide-in-from-top-2"
			style={{
				backgroundColor: "var(--paper-strong, #090d16)",
				borderColor: "rgba(245, 158, 11, 0.4)",
				color: "var(--ink, #f8fafc)",
			}}
			data-testid="caliper-measurement-bar"
		>
			<Ruler className="w-4 h-4 text-amber-500 shrink-0" />
			<div className="text-xs">
				{caliperMeasurement ? (
					<span style={{ color: "var(--ink)" }} className="font-medium">
						Расстояние:{" "}
						<b className="font-mono text-sm text-amber-500 font-bold">
							{caliperMeasurement.distanceMm.toFixed(2)} мм
						</b>
					</span>
				) : (
					<span style={{ color: "var(--muted)" }}>
						Кликните 2 точки на 3D-модели для замера
					</span>
				)}
			</div>
			{caliperMeasurement && (
				<button
					type="button"
					onClick={onClearCaliper}
					className="text-[11px] font-semibold px-2 py-0.5 rounded-md hover:text-rose-500 cursor-pointer border-0"
					style={{ color: "var(--muted)", backgroundColor: "transparent" }}
				>
					Сброс
				</button>
			)}
		</div>
	);
};
