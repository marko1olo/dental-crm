import React from "react";
import { Award, Star } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";

interface PediatricBraveryDiplomaPreviewProps {
	readonly effectiveClinicName: string;
	readonly heroDisplay: string;
	readonly praiseText: string;
	readonly doctorDisplay: string;
	readonly effectiveDate: string;
	readonly diplomaNumber?: string | undefined;
}

export const PediatricBraveryDiplomaPreview: React.FC<PediatricBraveryDiplomaPreviewProps> = ({
	effectiveClinicName,
	heroDisplay,
	praiseText,
	doctorDisplay,
	effectiveDate,
	diplomaNumber,
}) => {
	return (
		<div
			className="rounded-2xl border-4 border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 p-5 sm:p-7 text-center relative overflow-hidden shadow-inner"
			data-testid="diploma-certificate-preview"
		>
			<div data-testid="diploma-preview-card" className="contents">
				<div className="flex items-center justify-between gap-2 mb-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-widest">
					<div className="flex items-center gap-1.5">
						<Star className="h-4 w-4 fill-amber-400 text-amber-500" />
						<span>{effectiveClinicName}</span>
					</div>
					{diplomaNumber && (
						<span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300/60 dark:border-amber-700/60">
							№ {diplomaNumber}
						</span>
					)}
					<Star className="h-4 w-4 fill-amber-400 text-amber-500" />
				</div>

				<div className="my-2 flex items-center justify-center gap-3">
					<Award className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
					<h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-amber-900 dark:text-amber-200">
						Диплом за храбрость
					</h2>
					<ToothDeciduous className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
				</div>
				<div className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">
					Диплом юного героя
				</div>

				<div className="my-3 inline-block rounded-xl bg-[var(--paper,#ffffff)] border border-amber-300 dark:border-amber-700/60 px-5 py-2 shadow-xs">
					<span className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-100 font-mono tracking-tight">
						{heroDisplay}
					</span>
				</div>

				<p className="max-w-md mx-auto text-xs sm:text-sm text-[var(--ink,#0f172a)] font-medium leading-relaxed my-2">
					{praiseText}
				</p>

				<div className="mt-4 pt-3 border-t border-dashed border-amber-300 dark:border-amber-800/60 flex items-center justify-between text-xs font-bold text-[var(--muted,#64748b)]">
					<span className="font-mono text-amber-900 dark:text-amber-300 font-extrabold">
						{doctorDisplay}
					</span>
					<span>{effectiveDate}</span>
				</div>
			</div>
		</div>
	);
};
