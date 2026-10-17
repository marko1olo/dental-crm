import React from "react";
import { Users } from "lucide-react";
import { useAppStore } from "../../../store/appStore";

export interface TimesheetT13EmptyStateProps {
	readonly onClose: () => void;
}

export const TimesheetT13EmptyState: React.FC<TimesheetT13EmptyStateProps> = ({ onClose }) => {
	return (
		<div className="timesheet-modal-overlay" data-testid="timesheet-t13-modal">
			<div className="timesheet-modal-container max-w-lg mx-auto my-auto p-6 bg-[var(--paper)] rounded-2xl shadow-xl border border-[var(--line)] text-center flex flex-col items-center gap-4">
				<div className="w-14 h-14 rounded-2xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center border border-[var(--teal)]/30">
					<Users className="w-7 h-7" />
				</div>
				<div className="flex flex-col gap-1">
					<h3 className="text-base font-bold text-[var(--ink)]">
						Сотрудники не зарегистрированы в клинике
					</h3>
					<p className="text-xs text-[var(--muted)] max-w-sm">
						Добавьте персонал в разделе «Настройки клиники / Персонал» для формирования и ведения учёта отработанного времени и часов.
					</p>
				</div>
				<div className="flex items-center gap-2 mt-2">
					<button
						type="button"
						onClick={() => {
							useAppStore.getState().setCurrentView("settings");
							useAppStore.getState().setSettingsTab("staff");
							onClose();
						}}
						className="primary-button h-9 px-4 text-xs font-bold"
					>
						Перейти в Настройки / Персонал
					</button>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button h-9 px-4 text-xs font-bold"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
