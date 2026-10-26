/**
 * DicomArchiveStatusHeader.tsx — Заголовок статуса и индикатор прогресса загрузки DICOM архива
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Archive } from "lucide-react";
import type { SyncBadgeState } from "./types";

interface Props {
	status: string;
	syncBadge: SyncBadgeState | null;
	loading: boolean;
	progressPercent: number | null;
}

export const DicomArchiveStatusHeader: React.FC<Props> = ({
	status,
	syncBadge,
	loading,
	progressPercent,
}) => {
	return (
		<>
			<div className="flex flex-col items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
				<div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-0.5 sm:mb-1 shrink-0">
					<Archive className="w-4 h-4 sm:w-6 sm:h-6" />
				</div>
				<div
					style={{ color: "var(--ink)", fontWeight: 700, fontSize: "13px", textAlign: "center" }}
					className="sm:text-[15px]"
				>
					{status}
				</div>
				{syncBadge && (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 transition-all"
						style={{
							background: syncBadge.type === "synced" ? "var(--teal-soft, rgba(20,184,166,0.12))" : "var(--amber-soft, rgba(245,158,11,0.12))",
							color: syncBadge.type === "synced" ? "var(--teal, #14b8a6)" : "var(--amber, #d97706)",
							border: `1px solid ${syncBadge.type === "synced" ? "var(--teal-soft, rgba(20,184,166,0.3))" : "var(--amber-soft, rgba(245,158,11,0.3))"}`,
						}}
					>
						<span className="w-1.5 h-1.5 rounded-full bg-current" />
						<span>{syncBadge.text}</span>
					</div>
				)}
			</div>

			{loading && (
				<div className="w-full max-w-xs my-2 flex flex-col items-center gap-2">
					<div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
					{progressPercent !== null && (
						<div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-150"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
					)}
				</div>
			)}
		</>
	);
};
