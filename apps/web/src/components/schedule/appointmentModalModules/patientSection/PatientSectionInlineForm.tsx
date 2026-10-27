/**
 * PatientSectionInlineForm.tsx — Inline quick patient creation form (Name + Phone).
 * Mandates 8e, 8n: Doctor autonomy, buttons NEVER disabled.
 */

import React from "react";
import { Check, UserPlus } from "lucide-react";

interface PatientSectionInlineFormProps {
	newPatientFullName: string;
	setNewPatientFullName: (name: string) => void;
	newPatientPhone: string;
	setNewPatientPhone: (phone: string) => void;
	isCreatingInlinePatient: boolean;
	handleCreateInlinePatient: () => void;
	setIsInlineNewPatient: (val: boolean) => void;
}

export function PatientSectionInlineForm({
	newPatientFullName,
	setNewPatientFullName,
	newPatientPhone,
	setNewPatientPhone,
	isCreatingInlinePatient,
	handleCreateInlinePatient,
	setIsInlineNewPatient,
}: PatientSectionInlineFormProps) {
	return (
		<div
			className="p-3.5 rounded-2xl border border-[var(--teal)]/40 bg-[var(--teal-soft,var(--paper-soft))] space-y-3 animate-fade-in shadow-2xs"
			data-testid="appointment-inline-new-patient-panel"
		>
			<div className="flex items-center justify-between text-xs font-bold text-[var(--teal-dark,var(--teal))]">
				<span className="flex items-center gap-1.5 text-sm">
					<UserPlus size={15} />
					Быстрый пациент: ФИО + Телефон
				</span>
				<button
					type="button"
					onClick={() => setIsInlineNewPatient(false)}
					className="text-[var(--muted)] hover:text-[var(--ink)] font-semibold transition-colors cursor-pointer text-xs px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 min-h-[36px]"
					data-testid="appointment-quick-patient-cancel-btn"
				>
					Отмена
				</button>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<div>
					<input
						type="text"
						value={newPatientFullName}
						onChange={(e) => setNewPatientFullName(e.target.value)}
						placeholder="ФИО пациента *"
						className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
						data-testid="appointment-quick-patient-name"
						autoFocus
					/>
				</div>
				<div>
					<input
						type="tel"
						value={newPatientPhone}
						onChange={(e) => setNewPatientPhone(e.target.value)}
						placeholder="+7 (___) ___-__-__"
						className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium font-mono"
						data-testid="appointment-quick-patient-phone"
					/>
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/50">
				<span className="text-[11px] text-[var(--muted)]">
					Пациент сразу сохранится в базе и прикрепится к записи.
				</span>
				<button
					type="button"
					onClick={() => handleCreateInlinePatient()}
					disabled={false}
					aria-busy={isCreatingInlinePatient}
					className="h-8.5 min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-white hover:brightness-105 active:scale-95 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition-all"
					data-testid="appointment-quick-patient-save-btn"
				>
					<Check size={14} className="stroke-[2.5]" />
					<span>{isCreatingInlinePatient ? "Создание..." : "Создать и прикрепить"}</span>
				</button>
			</div>
		</div>
	);
}
