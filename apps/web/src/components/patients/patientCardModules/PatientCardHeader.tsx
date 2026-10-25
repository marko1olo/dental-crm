import React from "react";
import { Calendar, Edit3, Phone, Printer, ShieldCheck } from "lucide-react";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientSafetyEvaluationResult } from "../safetyMath";
import type { PatientCardActiveTab } from "./patientCardTypes";
import { PatientLegalBadges } from "./PatientLegalBadges";
import { PatientHeaderSafetyAlert } from "./PatientHeaderSafetyAlert";

export interface PatientCardHeaderProps {
	patientData: PatientGeneralInfo;
	initials: string;
	ageString: string;
	contractStatus: "issued" | "draft" | "none";
	consentStatus: "issued" | "draft" | "none";
	safetyEvaluation: PatientSafetyEvaluationResult;
	onApplyNorm: () => void;
	onPrint: () => void;
	onEditPatient?: (() => void) | undefined;
	onSelectTab: (tab: PatientCardActiveTab) => void;
}

export const PatientCardHeader: React.FC<PatientCardHeaderProps> = React.memo(
	function PatientCardHeader({
		patientData,
		initials,
		ageString,
		contractStatus,
		consentStatus,
		safetyEvaluation,
		onApplyNorm,
		onPrint,
		onEditPatient,
		onSelectTab,
	}) {
		return (
			<>
				<div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
					<div className="flex items-center gap-3.5 min-w-0">
						<div className="w-12 h-12 rounded-2xl bg-teal-600 dark:bg-teal-700 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm select-none">
							{initials}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-black text-[var(--ink)] m-0 truncate">
									{patientData.fullName || "Пациент без имени"}
								</h2>
								{patientData.cardNumber && (
									<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
										{patientData.cardNumber}
									</span>
								)}
								<PatientLegalBadges contractStatus={contractStatus} consentStatus={consentStatus} />
							</div>
							<div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap mt-0.5">
								{patientData.birthDate && (
									<span className="flex items-center gap-1">
										<Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
										<span>{patientData.birthDate}</span>
										{ageString && <span>({ageString})</span>}
									</span>
								)}
								{patientData.phone && (
									<span className="flex items-center gap-1">
										<Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
										<a href={`tel:${patientData.phone}`} className="hover:underline text-[var(--ink)] font-medium">
											{patientData.phone}
										</a>
									</span>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onApplyNorm}
							className="min-h-[40px] px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
							title="Зафиксировать физиологическую норму"
							data-testid="btn-patient-card-somatic-norm"
						>
							<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							<span>✓ Норма</span>
						</button>

						<button
							type="button"
							onClick={onPrint}
							className="min-h-[40px] px-3 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
							title="Распечатать медицинскую карту"
							data-testid="btn-patient-card-print-043"
						>
							<Printer className="w-4 h-4 text-[var(--muted)]" />
							<span>Медкарта</span>
						</button>

						{onEditPatient && (
							<button
								type="button"
								onClick={onEditPatient}
								className="min-h-[40px] px-3 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
								title="Редактировать данные"
							>
								<Edit3 className="w-4 h-4 text-[var(--muted)]" />
								<span>Правка</span>
							</button>
						)}
					</div>
				</div>

				<PatientHeaderSafetyAlert safetyEvaluation={safetyEvaluation} onSelectTab={onSelectTab} />
			</>
		);
	},
);

PatientCardHeader.displayName = "PatientCardHeader";
