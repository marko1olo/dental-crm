import React from "react";
import type { DentitionPhaseBadge } from "./visitOdontogramTabTypes";

interface DentitionStatusBannerProps {
	badge: DentitionPhaseBadge | null;
	smartDentitionMode: "adult" | "pediatric" | "mixed";
}

export const DentitionStatusBanner: React.FC<DentitionStatusBannerProps> = React.memo(
	function DentitionStatusBanner({ badge, smartDentitionMode }) {
		if (!badge || smartDentitionMode === "adult") {
			return null;
		}

		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 px-3 py-1.5 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 text-xs">
				<div className="flex items-center gap-2">
					<span className="font-bold text-teal-900 dark:text-teal-200">
						Зубная формула:
					</span>
					<span className="font-semibold text-teal-700 dark:text-teal-300">
						{badge.label}
					</span>
				</div>
				<span className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight">
					{badge.hint}
				</span>
			</div>
		);
	},
);

DentitionStatusBanner.displayName = "DentitionStatusBanner";
