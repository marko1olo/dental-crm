import React from "react";
import { Shield } from "lucide-react";
import { POPULAR_DMS_COMPANIES } from "./constants";
import type { PatientGeneralInfo } from "./types";

interface DmsPolicyCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	onOpenDmsLetters?: (() => void) | undefined;
}

export const DmsPolicyCard: React.FC<DmsPolicyCardProps> = ({
	patient, onUpdatePatient, disabled = false, onOpenDmsLetters,
}) => {
	return (
		<div className="rounded-xl p-3 sm:p-3.5 bg-[var(--paper-soft)] border border-[var(--teal)]/25 flex flex-col gap-3 shadow-2xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded-md bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Shield className="w-3.5 h-3.5" />
					</div>
					<span className="text-xs sm:text-sm font-bold text-[var(--ink)]">Страховой полис ДМС</span>
					{patient?.dmsInsuranceCompany && (
						<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-[var(--teal)] border border-teal-500/20">
							{patient.dmsInsuranceCompany}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={() => {
						if (onOpenDmsLetters) onOpenDmsLetters();
						else window.dispatchEvent(new CustomEvent("dente:open-dms-letters", { detail: { patientId: patient?.id, patientFullName: patient?.fullName } }));
					}}
					className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)] bg-teal-500/10"
					title="Открыть гарантийные письма и согласованные услуги по ДМС" data-testid="btn-open-dms-letters-tab"
				>
					<Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Гарантийные письма</span>
				</button>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-[11px] font-bold text-[var(--muted)]">Страховая компания ДМС</label>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<input
						type="text"
						className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] flex-1 focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
						value={patient?.dmsInsuranceCompany ?? ""}
						onChange={(e) => onUpdatePatient?.("dmsInsuranceCompany", e.target.value)}
						placeholder="СОГАЗ, Ингосстрах, АльфаСтрахование..." disabled={disabled} data-testid="input-dms-company"
					/>
					<div className="flex items-center gap-1.5 flex-wrap">
						{POPULAR_DMS_COMPANIES.slice(0, 6).map((comp) => {
							const isSelected = patient?.dmsInsuranceCompany === comp;
							return (
								<button
									key={comp} type="button" onClick={() => onUpdatePatient?.("dmsInsuranceCompany", comp)}
									className="min-h-[44px] sm:min-h-[28px] h-7 text-xs px-2.5 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center justify-center select-none"
									style={{
										border: isSelected ? "1px solid var(--teal)" : "1px solid var(--line-strong, var(--line, #cbd5e1))",
										background: isSelected ? "var(--teal)" : "var(--paper-soft, #f1f5f9)",
										color: isSelected ? "var(--on-teal, #ffffff)" : "var(--ink)",
										boxShadow: isSelected ? "0 1px 2px rgba(13, 148, 136, 0.25)" : "none",
									}}
								>
									{comp}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Номер полиса ДМС</label>
					<input
						type="text" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
						value={patient?.dmsPolicyNumber ?? ""} onChange={(e) => onUpdatePatient?.("dmsPolicyNumber", e.target.value)}
						placeholder="ДМС-2026/00123" disabled={disabled} data-testid="input-dms-policy"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Номер гарантийного письма</label>
					<input
						type="text" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
						value={patient?.dmsGuaranteeLetterNumber ?? ""} onChange={(e) => onUpdatePatient?.("dmsGuaranteeLetterNumber", e.target.value)}
						placeholder="ГП-8841/26" disabled={disabled} data-testid="input-dms-letter-number"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Лимит покрытия (₽)</label>
					<input
						type="number" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
						value={patient?.dmsCoverageLimitRub ?? ""}
						onChange={(e) => {
							const val = e.target.value ? parseFloat(e.target.value) : undefined;
							onUpdatePatient?.("dmsCoverageLimitRub", val);
							onUpdatePatient?.("dmsCoverageLimitKopecks", val ? Math.round(val * 100) : undefined);
						}}
						placeholder="50000" disabled={disabled} data-testid="input-dms-coverage-limit"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Программа ДМС</label>
					<input
						type="text" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
						value={patient?.dmsProgramName ?? ""} onChange={(e) => onUpdatePatient?.("dmsProgramName", e.target.value)}
						placeholder="Стоматология Стандарт" disabled={disabled} data-testid="input-dms-program"
					/>
				</div>
			</div>
		</div>
	);
};
