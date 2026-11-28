import React, { useState } from "react";
import { Package, X } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { ChairsideDiagnosisPackageCard } from "./ChairsideDiagnosisPackageCard";
import { showToast } from "../GlobalToast";

export interface StandaloneClinicalBundlesHostProps {
	readonly onClose: () => void;
}

export const StandaloneClinicalBundlesHost: React.FC<StandaloneClinicalBundlesHostProps> = ({ onClose }) => {
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const activePatientId = useAppStore((s) => s.activePatientId);
	const patientId = selectedPatientId || activePatientId || "pat-bundles-primary";
	const patientName = patientCoreDraft?.fullName?.trim() || "Пациент приёма";
	const [activeTooth, setActiveTooth] = useState<string>("16");

	return (
		<div className="flex flex-col min-h-full bg-[var(--paper)] text-[var(--ink)]">
			<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--paper)]">
				<h2 className="text-base font-semibold m-0">
					Готовые пакеты клинических услуг
				</h2>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть пакеты клинических услуг"
					className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2 cursor-pointer"
				>
					<X className="w-4 h-4 shrink-0" />
					<span>Закрыть</span>
				</button>
			</div>

			<div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-4" data-testid="clinical-bundles-workspace">
				<div className="p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center shrink-0">
							<Package size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-bold text-sm sm:text-base text-[var(--ink)]">
									{patientName}
								</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold">
									Зуб #{activeTooth}
								</span>
							</div>
							<div className="text-xs text-[var(--ink-muted)]">
								Клинический пакет по диагнозу МКБ-10 · Точный расчёт в копейках
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{["16", "26", "36", "46", "11", "21"].map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => setActiveTooth(tooth)}
								className={`min-h-[36px] sm:min-h-[32px] h-9 sm:h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
									activeTooth === tooth
										? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
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
		</div>
	);
};
