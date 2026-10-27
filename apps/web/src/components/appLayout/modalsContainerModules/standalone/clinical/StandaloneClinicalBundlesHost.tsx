import React, { useState } from "react";
import { Package, Stethoscope } from "lucide-react";
import { StandaloneTreatmentPlanWorkspaceShell } from "../StandaloneTreatmentPlanWorkspaceShell";
import { ChairsideDiagnosisPackageCard } from "../../../../../components/visit/ChairsideDiagnosisPackageCard";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import { showToast } from "../../../../../components/GlobalToast";

export interface StandaloneClinicalBundlesHostProps {
	readonly onClose: () => void;
}

export const StandaloneClinicalBundlesHost: React.FC<StandaloneClinicalBundlesHostProps> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl() || "pat-bundles-primary";
	const patientName = useLauncherPatientName(patientId) || "Смирнова Анна Сергеевна";
	const [activeTooth, setActiveTooth] = useState<string>("16");

	return (
		<StandaloneTreatmentPlanWorkspaceShell
			title="Готовые пакеты клинических услуг — Chairside Diagnosis Packages"
			onClose={onClose}
		>
			<div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-4" data-testid="clinical-bundles-workspace">
				<div className="p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-600/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
							<Package size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-bold text-sm sm:text-base text-[var(--ink,#0f172a)]">
									{patientName}
								</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-600/15 text-teal-700 dark:text-teal-300 font-bold">
									Зуб #{activeTooth}
								</span>
							</div>
							<div className="text-xs text-[var(--muted,#64748b)]">
								1-клик выбор пакета по диагнозу МКБ-10 · Точный расчёт в копейках
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{["16", "26", "36", "46", "11", "21"].map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => setActiveTooth(tooth)}
								className={`secondary-button min-h-[36px] sm:min-h-[32px] h-9 sm:h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
									activeTooth === tooth
										? "bg-teal-600 text-white border-teal-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
							>
								#{tooth}
							</button>
						))}
					</div>
				</div>

				<ChairsideDiagnosisPackageCard
					selectedTooth={activeTooth}
					patientId={patientId}
					visitId="visit-active-session"
					onApplyPackageToPlan={(lines) => {
						showToast(`Внесено в карту приёма: ${lines.length} позиций`, "success", 3000);
					}}
					onExportDirectToCashier={(payload) => {
						showToast(`Сформирован чек: ${payload.itemsCount} позиций на ${payload.totalRub} ₽`, "success", 3000);
					}}
				/>
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};
