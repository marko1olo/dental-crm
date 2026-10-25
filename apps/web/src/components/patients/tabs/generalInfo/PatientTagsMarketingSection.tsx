import React from "react";
import { ChevronDown, Tag } from "lucide-react";
import type { PatientTagsMarketingSectionProps } from "./types";
import { RegistryNotesCard } from "./RegistryNotesCard";
import { DoctorClinicalNotesCard } from "./DoctorClinicalNotesCard";
import { MarketingSourceCard } from "./MarketingSourceCard";

export const PatientTagsMarketingSection: React.FC<PatientTagsMarketingSectionProps> =
	React.memo(function PatientTagsMarketingSection({
		patient,
		onUpdatePatient,
		disabled = false,
		isOpen = false,
		onToggle,
		summary = "Заметок нет",
		onToggleServiceTag,
		onAppendDoctorTag,
	}) {
		return (
			<div
				className={`rounded-xl bg-[var(--paper)] border transition-all overflow-hidden ${
					isOpen
						? "border-[var(--teal)]/40 ring-1 ring-[var(--teal)]/20 shadow-xs"
						: "border-[var(--glass-border)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]/40 shadow-2xs"
				}`}
			>
				<button
					type="button"
					onClick={onToggle}
					className="w-full flex items-center justify-between p-3 sm:p-3.5 text-left cursor-pointer select-none transition-colors bg-transparent min-h-[44px]"
					data-testid="accordion-toggle-notes"
					aria-expanded={isOpen}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
							<Tag className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink)] block truncate">
								Заметки и особенности обслуживания
							</span>
							<span className="text-[11px] text-[var(--muted)] block truncate font-normal sm:hidden">
								{summary}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2.5 shrink-0 ml-2">
						<span
							className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold hidden sm:inline-block truncate max-w-[260px] md:max-w-xs transition-colors ${
								summary === "Заметок нет"
									? "bg-[var(--paper-soft)] border border-[var(--glass-border)] text-[var(--muted)]"
									: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold"
							}`}
						>
							{summary}
						</span>
						<ChevronDown
							className={`w-4 h-4 text-[var(--teal)] transition-transform duration-200 ${
								isOpen ? "rotate-180" : ""
							}`}
						/>
					</div>
				</button>

				<div
					className={
						isOpen
							? "p-3.5 sm:p-4 border-t border-[var(--glass-border)] flex flex-col gap-3.5 bg-[var(--paper)]"
							: "hidden"
					}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
						<RegistryNotesCard
							patient={patient}
							onUpdatePatient={onUpdatePatient}
							disabled={disabled}
							onToggleServiceTag={onToggleServiceTag}
						/>
						<DoctorClinicalNotesCard
							patient={patient}
							onUpdatePatient={onUpdatePatient}
							disabled={disabled}
							onAppendDoctorTag={onAppendDoctorTag}
						/>
					</div>
					<MarketingSourceCard
						patient={patient}
						onUpdatePatient={onUpdatePatient}
						disabled={disabled}
					/>
				</div>
			</div>
		);
	});

export default PatientTagsMarketingSection;
