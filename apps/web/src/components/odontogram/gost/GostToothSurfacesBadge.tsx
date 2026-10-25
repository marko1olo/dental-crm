import React from "react";
import type { ToothData } from "../ToothChart";

export interface GostToothSurfacesBadgeProps {
	readonly useSurfaces?: boolean | undefined;
	readonly surfaces?: readonly string[] | undefined;
	readonly tooth?: ToothData | undefined;
}

export const GostToothSurfacesBadge: React.FC<GostToothSurfacesBadgeProps> = ({
	useSurfaces,
	surfaces,
	tooth,
}) => {
	const hasCanals =
		tooth?.clinicalData &&
		typeof tooth.clinicalData === "object" &&
		"canals" in tooth.clinicalData &&
		Array.isArray((tooth.clinicalData as { canals?: unknown[] }).canals) &&
		(tooth.clinicalData as { canals?: unknown[] }).canals!.length > 0;

	return (
		<div className="flex flex-wrap items-center justify-center gap-0.5 min-h-[14px]">
			{useSurfaces && surfaces && surfaces.length > 0 ? (
				<span
					className="text-xs font-bold px-1 py-0.2 rounded bg-teal-500/20 text-teal-800 dark:text-teal-200 border border-teal-500/30 font-mono"
					title={`Поверхности: ${surfaces.join(", ")}`}
				>
					{surfaces.join("")}
				</span>
			) : hasCanals ? (
				<span
					className="text-xs font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono"
					title="Заполнены корневые каналы"
				>
					{(tooth?.clinicalData as { canals?: unknown[] }).canals?.length}к
				</span>
			) : null}
		</div>
	);
};
