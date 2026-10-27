import { Save } from "lucide-react";
import React from "react";

export interface PatientDetailsFooterProps {
	readonly isSaving: boolean;
	readonly onSave: () => void;
	readonly onClose: () => void;
}

export const PatientDetailsFooter: React.FC<PatientDetailsFooterProps> = ({
	isSaving,
	onSave,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] shrink-0 gap-3 pb-[max(12px,env(safe-area-inset-bottom))] print:hidden">
			<span className="text-[11px] text-[var(--muted)] hidden md:inline">
				Автономия врача: сохранение доступно в любой момент без блокирующих полей
			</span>

			<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] sm:min-h-[32px] h-9 sm:h-8 px-4 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs select-none"
				>
					Отмена
				</button>

				{/* КНОПКА СОХРАНЕНИЯ СТРОГО БЕЗ DISABLED (Мандат 8e, 1 Primary CTA) */}
				<button
					type="button"
					data-testid="btn-save-patient-details"
					onClick={onSave}
					className="min-h-[44px] sm:min-h-[32px] h-9 sm:h-8 px-5 flex-1 sm:flex-initial bg-[var(--teal)] text-white hover:opacity-95 text-xs font-bold rounded-lg shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5 transition-all active:scale-98 select-none"
				>
					<Save className="w-4 h-4 shrink-0" />
					<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
				</button>
			</div>
		</div>
	);
};
