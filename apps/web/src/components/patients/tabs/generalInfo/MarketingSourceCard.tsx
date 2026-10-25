import React from "react";
import { Megaphone } from "lucide-react";
import { MARKETING_SOURCES_CATALOG } from "@dental/shared";
import type { PatientGeneralInfo } from "./types";

interface MarketingSourceCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
}

export const MarketingSourceCard: React.FC<MarketingSourceCardProps> = ({
	patient, onUpdatePatient, disabled = false,
}) => {
	return (
		<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Megaphone className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span className="font-bold text-xs text-[var(--ink)]">Канал привлечения пациента (Маркетинг):</span>
				</div>
				{patient?.acquisitionSource && (
					<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
						{patient.acquisitionSource}
					</span>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap py-1 min-w-0">
				{MARKETING_SOURCES_CATALOG.slice(0, 9).map((src) => {
					const isSelected = patient?.acquisitionSource === src.nameRu;
					return (
						<button
							key={src.channel} type="button" data-testid={`chip-marketing-${src.channel}`}
							className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
								isSelected ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold" : "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]"
							}`}
							onClick={() => {
								if (disabled) return;
								onUpdatePatient?.("acquisitionSource", isSelected ? "" : src.nameRu);
							}}
							disabled={disabled}
						>
							<span>{src.nameRu}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
