/**
 * DoctorSelectionNotice.tsx — Плашка уведомления о необходимости выбора врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";

export interface DoctorSelectionNoticeProps {
	readonly onClose: () => void;
}

export const DoctorSelectionNotice: React.FC<DoctorSelectionNoticeProps> = ({ onClose }) => {
	return (
		<div
			className="p-4 mb-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex items-center justify-between shadow-sm"
			role="status"
			data-testid="payroll-no-doctor-selected-notice"
		>
			<div className="flex items-center gap-2">
				<span className="text-amber-500 font-bold text-base">ℹ</span>
				<span className="text-sm font-medium">Выберите врача для отображения зарплатной ведомости</span>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="text-xs px-2.5 py-1 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);
};
