import React from "react";

interface PatientCardModalFooterProps {
	readonly onClose: () => void;
	readonly onSave: () => void;
}

export const PatientCardModalFooter: React.FC<PatientCardModalFooterProps> = ({
	onClose,
	onSave,
}) => (
	<div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] gap-2.5 print:hidden">
		<span className="hidden sm:inline text-xs text-[var(--muted)] truncate">
			Медицинская карта пациента • Защита персональных данных
		</span>
		<div className="flex items-center gap-2.5 w-full sm:w-auto">
			<button
				type="button"
				onClick={onClose}
				className="flex-1 sm:flex-none border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-[14px] px-5 shadow-xs hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[48px] h-12 text-sm cursor-pointer select-none transition-all active:scale-95"
			>
				Закрыть
			</button>
			<button
				type="button"
				data-testid="btn-save-patient-card"
				onClick={onSave}
				className="flex-1 sm:flex-none border-0 bg-[var(--teal)] text-[var(--on-teal,white)] hover:opacity-95 min-h-[48px] h-12 px-6 text-sm font-bold rounded-[14px] shadow-sm cursor-pointer select-none transition-all active:scale-95"
			>
				Сохранить
			</button>
		</div>
	</div>
);
