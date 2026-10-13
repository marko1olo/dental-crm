import React from "react";
import {
	AlertOctagon,
	Calendar,
	Edit3,
	FileCheck,
	FileText,
	Phone,
	Printer,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientSafetyEvaluationResult } from "../safetyMath";
import type { PatientCardActiveTab } from "./patientCardTypes";

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
						{/* Initials Avatar */}
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
								{/* Statutory Legal Badges (ПП РФ № 736 & 323-ФЗ ст. 20) */}
								{contractStatus === "issued" ? (
									<span
										className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
										title="Договор на оказание платных медицинских услуг подписан (ПП РФ № 736)"
										data-testid="badge-contract-status"
									>
										<FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
										<span>Договор: Подписан</span>
									</span>
								) : contractStatus === "draft" ? (
									<span
										className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
										title="Договор сформирован как черновик и ожидает подписания"
										data-testid="badge-contract-status"
									>
										<FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
										<span>Договор: Черновик</span>
									</span>
								) : (
									<span
										className="px-2 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] text-xs font-medium inline-flex items-center gap-1 shrink-0"
										title="Договор с пациентом не оформлен"
										data-testid="badge-contract-status"
									>
										<FileText className="w-3.5 h-3.5 opacity-60" />
										<span>Договор: Не оформлен</span>
									</span>
								)}

								{consentStatus === "issued" ? (
									<span
										className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
										title="Информированное добровольное согласие (ИДС) подписано (323-ФЗ ст. 20, Приказ 1051н)"
										data-testid="badge-consent-status"
									>
										<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
										<span>ИДС: Подписано</span>
									</span>
								) : consentStatus === "draft" ? (
									<span
										className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
										title="ИДС сформировано как черновик и ожидает подписания"
										data-testid="badge-consent-status"
									>
										<FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
										<span>ИДС: Черновик</span>
									</span>
								) : (
									<span
										className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
										title="Требуется оформление и подписание ИДС перед приёмом (323-ФЗ ст. 20)"
										data-testid="badge-consent-status"
									>
										<ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
										<span>ИДС: Требуется</span>
									</span>
								)}
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
										<a
											href={`tel:${patientData.phone}`}
											className="hover:underline text-[var(--ink)] font-medium"
										>
											{patientData.phone}
										</a>
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Quick Actions Header */}
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

				{/* Somatic Safety Alert Banner (if risk flags present) */}
				{safetyEvaluation.activeFlags.length > 0 && (
					<div
						className={`p-3 rounded-xl flex items-center justify-between gap-2.5 border text-xs ${
							safetyEvaluation.hasCriticalStopFlags
								? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
								: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
						}`}
						role="alert"
					>
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<AlertOctagon
								className={`w-4 h-4 shrink-0 ${
									safetyEvaluation.hasCriticalStopFlags
										? "text-rose-600 dark:text-rose-400 animate-pulse"
										: "text-amber-600 dark:text-amber-400"
								}`}
							/>
							<div className="flex items-center gap-1.5 flex-wrap">
								<strong className="text-[11px] uppercase tracking-wider">
									{safetyEvaluation.hasCriticalStopFlags
										? "Критический стоп-фактор:"
										: "Клиническое предупреждение:"}
								</strong>
								{safetyEvaluation.activeFlags.map((flag) => (
									<span
										key={flag.id}
										className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-white/40 dark:bg-black/30 border border-current"
									>
										{flag.shortBadge || flag.titleRu}
									</span>
								))}
							</div>
						</div>
						<button
							type="button"
							onClick={() => onSelectTab("anamnesis")}
							className="text-xs font-bold underline cursor-pointer shrink-0"
						>
							Детали
						</button>
					</div>
				)}
			</>
		);
	},
);

PatientCardHeader.displayName = "PatientCardHeader";
