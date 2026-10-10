import React from "react";
import { PatientAllergySafetyBanner } from "../PatientAllergySafetyBanner";
import { PatientDuplicateAlert } from "../PatientDuplicateAlert";

// Root container anchor: data-testid="patient-workspace-view"
export interface PatientWorkspaceHeaderProps {
	patientId: string;
	patientName?: string | null | undefined;
	currentPatient?: any;
	patientCardNumber?: string | null | undefined;
	patientBalanceRub?: number | null | undefined;
}

export const PatientWorkspaceHeader: React.FC<PatientWorkspaceHeaderProps> = React.memo(
	({
		patientId,
		patientName,
		currentPatient,
		patientCardNumber,
		patientBalanceRub,
	}) => {
		return (
			<>
				{/* Clinical Safety & Allergy Red-Flag Emergency Banner (Zero Noise when clean, Mandates 8d, 8p) */}
				<PatientAllergySafetyBanner
					patientId={patientId}
					patientName={patientName}
					profile={currentPatient?.anamnesis || currentPatient?.notes}
					notes={
						typeof currentPatient?.anamnesis === "string"
							? currentPatient.anamnesis
							: currentPatient?.notes
					}
					showModalButton={true}
					hideWhenClean={true}
				/>

				{/* Patient Duplicate Alert Guard */}
				<PatientDuplicateAlert patientId={patientId} />

				<div className="flex items-center gap-2 min-w-0 flex-wrap">
					<span className="text-sm md:text-base font-black text-[var(--ink)] truncate">
						{patientName || "Карточка пациента"}
					</span>
					<span className="text-xs font-mono font-bold text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-0.5 rounded-md border border-[var(--line)] shrink-0">
						{patientCardNumber ? `Карта: ${patientCardNumber}` : patientId ? `№ ${String(patientId || "").slice(0, 8)}` : "—"}
					</span>
					{typeof patientBalanceRub === "number" && (
						<span
							className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
								patientBalanceRub < 0
									? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
									: patientBalanceRub > 0
										? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
							}`}
							title={`Текущий баланс пациента: ${patientBalanceRub.toLocaleString("ru-RU")} ₽`}
							data-testid="patient-workspace-balance-badge"
						>
							Баланс: {patientBalanceRub > 0 ? "+" : ""}{patientBalanceRub.toLocaleString("ru-RU")} ₽
						</span>
					)}
				</div>
			</>
		);
	},
);
PatientWorkspaceHeader.displayName = "PatientWorkspaceHeader";
