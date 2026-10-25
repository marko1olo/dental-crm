import React from "react";
import type { GostStateDescriptor } from "./gostPathologyCodes";

export interface GostToothStatusBadgeProps {
	readonly gost: GostStateDescriptor;
	readonly pocketDepth?: number | undefined;
}

export const GostToothStatusBadge: React.FC<GostToothStatusBadgeProps> = ({
	gost,
	pocketDepth,
}) => {
	const hasDeepPocket = pocketDepth !== undefined && pocketDepth > 4;

	return (
		<div className="flex items-center justify-center gap-1 my-1">
			<span
				className={`inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-[24px] sm:h-[26px] px-1.5 rounded font-black text-xs sm:text-sm border transition-colors shadow-xs ${gost.badgeBg} ${gost.badgeText} ${gost.badgeBorder}`}
			>
				{gost.abbr}
			</span>
			{hasDeepPocket && (
				<span
					className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-2xs font-black text-white shadow-2xs leading-none ${
						pocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
					}`}
					title={`Пародонтальный карман ${pocketDepth} мм (Риск пародонтита K05.3)`}
				>
					P{pocketDepth}
				</span>
			)}
		</div>
	);
};
