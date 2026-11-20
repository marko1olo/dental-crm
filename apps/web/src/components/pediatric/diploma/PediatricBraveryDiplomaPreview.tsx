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
			className="rounded-2xl border-2 border-[var(--warning-line,var(--warning))] bg-[var(--paper)] dark:bg-[var(--paper-soft)] p-5 sm:p-7 text-center relative overflow-hidden shadow-xs"
			data-testid="diploma-certificate-preview"
		>
			<div data-testid="diploma-preview-card" className="contents">
				<div className="flex items-center justify-between gap-2 mb-2 text-[var(--warning-ink,var(--warning))] font-extrabold text-xs tracking-normal">
					<div className="flex items-center gap-1.5">
						<Star className="h-4 w-4 fill-[var(--warning)] text-[var(--warning)]" />
						<span>{effectiveClinicName}</span>
					</div>
					{diplomaNumber && (
						<span className="text-[10px] font-mono font-bold text-[var(--warning-ink,var(--warning))] bg-[var(--warning-soft)] px-2 py-0.5 rounded-md border border-[var(--warning-line,var(--warning))]">
							№ {diplomaNumber}
						</span>
					)}
					<Star className="h-4 w-4 fill-[var(--warning)] text-[var(--warning)]" />
				</div>

				<div className="my-2 flex items-center justify-center gap-3">
					<Award className="h-8 w-8 text-[var(--warning)] shrink-0" />
					<h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">
						Диплом за храбрость
					</h2>
					<ToothDeciduous className="h-8 w-8 text-[var(--warning)] shrink-0" />
				</div>
				<div className="text-xs font-bold text-[var(--warning-ink,var(--warning))] tracking-normal mb-2">
					Диплом юного героя
				</div>

				<div className="my-3 inline-block rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] px-5 py-2 shadow-xs">
					<span className="text-base sm:text-lg font-black text-[var(--ink)] font-mono tracking-tight">
						{heroDisplay}
					</span>
				</div>

				<p className="max-w-md mx-auto text-xs sm:text-sm text-[var(--ink)] font-medium leading-relaxed my-2">
					{praiseText}
				</p>

				<div className="mt-4 pt-3 border-t border-dashed border-[var(--line)] flex items-center justify-between text-xs font-bold text-[var(--ink-muted)]">
					<span className="font-mono text-[var(--ink)] font-extrabold">
						{doctorDisplay}
					</span>
					<span>{effectiveDate}</span>
				</div>
			</div>
		</div>
	);
};
