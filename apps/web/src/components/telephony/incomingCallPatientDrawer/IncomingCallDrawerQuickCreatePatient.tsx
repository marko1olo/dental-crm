import React from "react";
import { AlertCircle, UserCheck } from "lucide-react";

interface IncomingCallDrawerQuickCreatePatientProps {
	isKnownPatient: boolean;
	newPatientNameInput: string;
	onChangeNewPatientNameInput: (val: string) => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
}

export const IncomingCallDrawerQuickCreatePatient: React.FC<IncomingCallDrawerQuickCreatePatientProps> = ({
	isKnownPatient,
	newPatientNameInput,
	onChangeNewPatientNameInput,
	isCreatingPatient,
	onQuickCreatePatient,
}) => {
	if (isKnownPatient) return null;

	return (
		<div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
			<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
				<AlertCircle size={14} className="text-amber-500" />
				<span>Быстрое создание нового пациента (без сброса визита)</span>
			</div>
			<div className="space-y-1.5">
				<input
					type="text"
					value={newPatientNameInput}
					onChange={(e) => onChangeNewPatientNameInput(e.target.value)}
					placeholder="ФИО пациента (по умолчанию: Пациент + телефон)"
					className="w-full h-8 min-h-[32px] px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-xs font-medium text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					data-testid="popup-drawer-new-patient-name-input"
				/>
				<button
					type="button"
					onClick={onQuickCreatePatient}
					disabled={isCreatingPatient}
					className="w-full h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--teal)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
					data-testid="popup-drawer-quick-create-patient-btn"
					title="Создать первичную карту пациента за 5 секунд (без обязательного паспорта и СНИЛС)"
				>
					<UserCheck size={15} />
					<span>
						{isCreatingPatient
							? "Создание карты..."
							: "+ Создать пациента за 5 секунд"}
					</span>
				</button>
			</div>
		</div>
	);
};
