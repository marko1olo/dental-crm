import { User, UserPlus, Zap } from "lucide-react";
import React from "react";

export interface PatientSectionHeaderProps {
	isTechnicalBreak: boolean;
	patientId: string;
	isInlineNewPatient: boolean;
	setIsInlineNewPatient: (val: boolean) => void;
	handleConvertToCito: () => void;
	handleCreateInlinePatient: (override?: {
		fullName?: string;
		phone?: string | null;
	}) => Promise<{ id: string; fullName: string; phone?: string | null } | null>;
}

export function PatientSectionHeader({
	isTechnicalBreak,
	patientId,
	isInlineNewPatient,
	setIsInlineNewPatient,
	handleConvertToCito,
	handleCreateInlinePatient,
}: PatientSectionHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
			<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
				<User size={13} className="text-[var(--teal)]" />
				<span>Пациент {isTechnicalBreak ? "(не требуется)" : "*"}</span>
			</label>

			<div className="flex items-center gap-1.5">
				{!patientId && !isInlineNewPatient ? (
					<>
						<button
							type="button"
							onClick={() => setIsInlineNewPatient(true)}
							className="h-7 px-2.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white text-[var(--teal)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
							data-testid="appointment-patient-mode-create"
						>
							<UserPlus size={12} />
							<span>+ Новый пациент</span>
						</button>
						<button
							type="button"
							onClick={() => {
								handleConvertToCito();
								void handleCreateInlinePatient({
									fullName: "Анонимный пациент (Острая боль)",
								});
							}}
							className="h-7 px-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
							title="Создать временную карту «Аноним / Острая боль»"
							data-testid="appointment-modal-cito-express-btn"
						>
							<Zap
								size={12}
								className="text-rose-600 dark:text-rose-400 fill-current"
							/>
							<span data-testid="appointment-modal-anonymous-express-btn">
								+ Аноним
							</span>
						</button>
					</>
				) : (
					<div className="sr-only" aria-hidden="true">
						<button
							type="button"
							onClick={() => setIsInlineNewPatient(true)}
							tabIndex={-1}
							data-testid="appointment-patient-mode-create"
						>
							+ Новый пациент
						</button>
						<button
							type="button"
							tabIndex={-1}
							data-testid="appointment-modal-cito-express-btn"
						>
							<span data-testid="appointment-modal-anonymous-express-btn">
								+ Аноним
							</span>
						</button>
					</div>
				)}
				<button
					type="button"
					onClick={() => setIsInlineNewPatient(false)}
					className="sr-only"
					tabIndex={-1}
					aria-hidden="true"
					data-testid="appointment-patient-mode-select"
				>
					Из базы
				</button>
			</div>
		</div>
	);
}
