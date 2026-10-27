import { Check, Stethoscope } from "lucide-react";
import React from "react";

export interface MobilePatientTopBarProps {
	readonly onBack: () => void;
	readonly patientCoreDirty?: boolean | undefined;
	readonly patientCoreSaveState?: ("idle" | "saving" | "saved" | "error") | undefined;
	readonly savePatientCore?: (() => Promise<any> | void) | undefined;
	readonly onStartVisit: () => void;
}

export function MobilePatientTopBar({
	onBack,
	patientCoreDirty = false,
	patientCoreSaveState = "idle",
	savePatientCore,
	onStartVisit,
}: MobilePatientTopBarProps) {
	return (
		<header className="mobile-patient-top-bar" data-testid="mobile-patient-top-bar">
			<button
				type="button"
				className="mobile-patient-back-btn"
				onClick={onBack}
				aria-label="Вернуться к списку пациентов"
				data-testid="mobile-patient-back-btn"
			>
				<span className="text-base leading-none">&larr;</span>
				<span>Пациенты</span>
			</button>

			<div className="flex items-center gap-1.5 shrink-0">
				{patientCoreDirty && (
					<button
						type="button"
						onClick={savePatientCore}
						disabled={patientCoreSaveState === "saving"}
						className="min-h-[44px] px-3 rounded-xl bg-teal-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
						data-testid="mobile-save-patient-btn"
					>
						<Check size={14} />
						<span>{patientCoreSaveState === "saving" ? "Сохранение..." : "Сохранить"}</span>
					</button>
				)}
				<button
					type="button"
					onClick={onStartVisit}
					className="min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
					data-testid="mobile-quick-visit-btn"
				>
					<Stethoscope size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Приём</span>
				</button>
			</div>
		</header>
	);
}
