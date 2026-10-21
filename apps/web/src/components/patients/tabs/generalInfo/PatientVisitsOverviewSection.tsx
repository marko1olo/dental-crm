import { FileCheck, History, Plus } from "lucide-react";
import React from "react";
import { PatientHistoryTab } from "../../PatientHistoryTab";
import { PatientFinanceTab } from "../PatientFinanceTab";
import type { PatientVisitsOverviewSectionProps } from "./types";

export const PatientVisitsOverviewSection: React.FC<PatientVisitsOverviewSectionProps> =
	React.memo(function PatientVisitsOverviewSection({
		patient,
		disabled = false,
		clinicalTimelineVisits,
		onUpdatePatient,
		onNavigateToVisit,
		onNewAppointment,
		onOpenTaxCertificate,
	}) {
		return (
			<div className="flex flex-col gap-4 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-wrap gap-2">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-500/20">
							<History className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-sm font-bold m-0 text-[var(--ink)]">
								История приёмов и финансовый баланс
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Финансовый статус, депозиты, семейный кошелек и хронология
								клинических визитов
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{onOpenTaxCertificate && (
							<button
								type="button"
								onClick={onOpenTaxCertificate}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
								data-testid="btn-patient-tax-deduction-tab"
								title="Оформить справку для налогового вычета (13%)"
							>
								<FileCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Справка для вычета (13%)</span>
							</button>
						)}
						<button
							type="button"
							onClick={() => onNewAppointment?.(patient?.id || undefined)}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 bg-[var(--teal)] hover:opacity-95 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 select-none"
							data-testid="btn-quick-new-appointment"
						>
							<Plus className="w-3.5 h-3.5 shrink-0" />
							<span>Записать на прием</span>
						</button>
					</div>
				</div>

				<PatientFinanceTab
					patient={patient}
					onUpdateBalance={(newBal) =>
						onUpdatePatient?.("patientBalanceRub", newBal)
					}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
					onOpenTaxCertificate={onOpenTaxCertificate}
					disabled={disabled}
				/>

				<div className="flex flex-col gap-2.5">
					<PatientHistoryTab
						patientId={patient?.id}
						patientName={patient?.fullName}
						visits={clinicalTimelineVisits}
						onNavigateToVisit={onNavigateToVisit}
						onNewAppointment={onNewAppointment}
					/>
				</div>
			</div>
		);
	});

export default PatientVisitsOverviewSection;
