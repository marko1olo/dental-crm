import React from "react";
import { ChevronDown, FileCheck } from "lucide-react";
import type { PatientInsuranceSectionProps } from "./types";
import { SnilsOmsFields } from "./SnilsOmsFields";
import { DmsPolicyCard } from "./DmsPolicyCard";

export const PatientInsuranceSection: React.FC<PatientInsuranceSectionProps> = React.memo(
	function PatientInsuranceSection({
		patient,
		onUpdatePatient,
		disabled = false,
		isOpen = false,
		onToggle,
		summary = "Не заполнено",
		onOpenDmsLetters,
		onOpenTaxCertificate,
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
					data-testid="accordion-toggle-insurance"
					aria-expanded={isOpen}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 flex items-center justify-center shrink-0">
							<FileCheck className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink)] block truncate">
								Страхование и СНИЛС (ОМС, ДМС)
							</span>
							<span className="text-[11px] text-[var(--muted)] block truncate font-normal sm:hidden">
								{summary}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2.5 shrink-0 ml-2">
						<span
							className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold hidden sm:inline-block truncate max-w-[260px] md:max-w-xs transition-colors ${
								summary === "Не заполнено"
									? "bg-[var(--paper-soft)] border border-[var(--glass-border)] text-[var(--muted)]"
									: "bg-teal-500/10 text-[var(--teal)] border border-teal-500/20 font-bold"
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
					<SnilsOmsFields
						patient={patient}
						onUpdatePatient={onUpdatePatient}
						disabled={disabled}
						onOpenTaxCertificate={onOpenTaxCertificate}
					/>
					<DmsPolicyCard
						patient={patient}
						onUpdatePatient={onUpdatePatient}
						disabled={disabled}
						onOpenDmsLetters={onOpenDmsLetters}
					/>
				</div>
			</div>
		);
	},
);

export default PatientInsuranceSection;
