import React from "react";

interface PatientCardModalFooterProps {
	readonly onClose: () => void;
	readonly onSave: () => void;
}

export const PatientCardModalFooter: React.FC<PatientCardModalFooterProps> = ({
	onClose,
	onSave,
}) => (
	<div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] flex-wrap gap-2 print:hidden">
		<span className="text-xs text-[var(--muted)] truncate">
			Медицинская карта пациента • Защита персональных данных
		</span>
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onClose}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs cursor-pointer select-none"
			>
				Закрыть
			</button>
			<button
				type="button"
				data-testid="btn-save-patient-card"
				onClick={onSave}
				className="bg-[var(--teal)] text-[var(--on-teal,white)] hover:opacity-95 min-h-[44px] sm:min-h-[32px] h-8 px-4 text-xs font-bold rounded-lg shadow-xs cursor-pointer select-none transition-all"
			>
				Сохранить
			</button>
		</div>
	</div>
);
