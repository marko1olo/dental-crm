/**
 * StandaloneTreatmentPlanWorkspaceShell — компактная панель навигации
 * полноэкранных рабочих пространств deep-link лаунчеров (Мандат 8e: без тупиков).
 */

import { ArrowLeft } from "lucide-react";
import React from "react";

export interface StandaloneTreatmentPlanWorkspaceShellProps {
	readonly title: string;
	readonly onClose: () => void;
	readonly children: React.ReactNode;
}

export const StandaloneTreatmentPlanWorkspaceShell: React.FC<
	StandaloneTreatmentPlanWorkspaceShellProps
> = ({ title, onClose, children }) => {
	return (
		<div className="w-full min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
			<div className="min-h-[48px] max-h-[56px] shrink-0 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2 border-b border-[var(--line)]">
				<div className="text-xs sm:text-base font-bold tracking-tight text-[var(--ink)] min-w-0">
					{title}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
					data-testid="standalone-workspace-back-btn"
					title="Вернуться в приложение"
				>
					<ArrowLeft size={16} className="text-[var(--muted)]" aria-hidden="true" />
					<span className="hidden sm:inline">Назад в приложение</span>
					<span className="sm:hidden">Назад</span>
				</button>
			</div>
			<div className="flex-1 min-h-0">{children}</div>
		</div>
	);
};

export default StandaloneTreatmentPlanWorkspaceShell;
