import { AlertTriangle, Users } from "lucide-react";
import React from "react";

export interface PatientDuplicateConflictAlertProps {
	readonly duplicateConflict?: {
		message: string;
		existingPatientId?: string;
		isNameOnlyDuplicate?: boolean;
	} | null | undefined;
	readonly onCreateAsNewDuplicate?: (() => void) | undefined;
	readonly onSelectExistingPatient: (id: string) => void;
}

export function PatientDuplicateConflictAlert({
	duplicateConflict,
	onCreateAsNewDuplicate,
	onSelectExistingPatient,
}: PatientDuplicateConflictAlertProps) {
	if (!duplicateConflict) return null;

	return (
		<div
			className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-950 dark:text-amber-100 text-xs space-y-2 mt-2 animate-in fade-in"
			data-testid="duplicate-conflict-banner"
			role="alert"
		>
			<div className="flex items-start gap-2">
				<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
				<div className="space-y-0.5">
					<p className="font-bold m-0 text-amber-900 dark:text-amber-200">
						{duplicateConflict.isNameOnlyDuplicate
							? "В базе уже есть пациент с таким ФИО (возможный тёзка)"
							: "Пациент с такими данными уже зарегистрирован"}
					</p>
					<p className="m-0 text-[var(--muted)]">
						{duplicateConflict.message ||
							"Во избежание дубликатов проверьте существующую карту. Если это другой человек, подтвердите регистрацию новой карты."}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2 pl-6 pt-1 flex-wrap">
				{onCreateAsNewDuplicate && (
					<button
						type="button"
						onClick={onCreateAsNewDuplicate}
						className="px-3 py-1.5 rounded-lg text-xs font-bold !bg-amber-600 !text-white hover:!bg-amber-700 transition-all cursor-pointer shadow-sm min-h-[32px] flex items-center gap-1.5"
						data-testid="allow-duplicate-create-btn"
					>
						<Users size={14} />
						<span>Это другой человек (однофамилец) — Создать новую карту</span>
					</button>
				)}
				{duplicateConflict.existingPatientId && (
					<button
						type="button"
						onClick={() => onSelectExistingPatient(duplicateConflict.existingPatientId!)}
						className="px-3 py-1.5 rounded-lg text-xs font-semibold !bg-[var(--teal)] !text-white hover:brightness-110 transition-all cursor-pointer shadow-sm min-h-[32px]"
						data-testid="open-conflict-existing-patient-btn"
					>
						Открыть найденную карту
					</button>
				)}
			</div>
		</div>
	);
}
