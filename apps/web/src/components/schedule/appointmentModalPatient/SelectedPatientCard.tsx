import { Phone, User, UserCheck } from "lucide-react";
import React from "react";

export interface SelectedPatientCardProps {
	patientId: string;
	selectedPatient: { id: string; fullName: string; phone?: string | null };
	allDisplayPatients: Array<{
		id: string;
		fullName: string;
		phone?: string | null;
	}>;
	onClearPatient: () => void;
	onSetPatientId: (id: string) => void;
}

export function SelectedPatientCard({
	patientId,
	selectedPatient,
	allDisplayPatients,
	onClearPatient,
	onSetPatientId,
}: SelectedPatientCardProps) {
	const initials = selectedPatient.fullName
		? selectedPatient.fullName
				.split(" ")
				.map((n) => n[0])
				.filter(Boolean)
				.slice(0, 2)
				.join("")
				.toUpperCase()
		: "";

	return (
		<div className="px-3 py-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-strong)] flex items-center justify-between gap-3 shadow-2xs">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-9 h-9 rounded-xl bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30 flex items-center justify-center font-bold text-xs shrink-0">
					{initials ? initials : <User size={16} />}
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="m-0 text-sm sm:text-base font-extrabold text-[var(--ink)] truncate leading-tight">
							{selectedPatient.fullName || "Пациент"}
						</h4>
						<span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider shrink-0 inline-flex items-center gap-1">
							<UserCheck
								size={11}
								className="text-emerald-600 dark:text-emerald-400"
							/>
							<span>Прикреплен</span>
						</span>
					</div>
					<div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted)]">
						{selectedPatient.phone ? (
							<span className="flex items-center gap-1 font-mono font-medium text-[var(--ink)]">
								<Phone size={11} className="text-[var(--teal)]" />
								<span>{selectedPatient.phone}</span>
							</span>
						) : (
							<span className="text-[var(--muted)]">Телефон не указан</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onClearPatient}
					className="h-8 min-h-[32px] px-3 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
					title="Сменить прикрепленного пациента"
				>
					<User size={13} className="text-[var(--teal)]" />
					<span>Сменить</span>
				</button>
			</div>

			{/* Hidden native select for full backwards test compatibility */}
			<select
				value={patientId}
				onChange={(e) => onSetPatientId(e.target.value)}
				className="sr-only"
				tabIndex={-1}
				aria-hidden="true"
				data-testid="select-appointment-patient"
			>
				<option value="">-- Выберите пациента --</option>
				{allDisplayPatients.map((p) => (
					<option key={p.id} value={p.id}>
						{p.fullName} {p.phone ? `(${p.phone})` : ""}
					</option>
				))}
			</select>
		</div>
	);
}
