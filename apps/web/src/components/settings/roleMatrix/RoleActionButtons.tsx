/**
 * apps/web/src/components/settings/roleMatrix/RoleActionButtons.tsx
 *
 * Primary CTA & Reset actions (Mandates 8b, 8e, 8n).
 * Strictly <= 120 lines ceiling.
 */

import { Check, RotateCcw, Save } from "lucide-react";
import type React from "react";

interface RoleActionButtonsProps {
	readonly onSave: () => void;
	readonly onReset: () => void;
	readonly isSaving: boolean;
	readonly hasUnsavedChanges: boolean;
	readonly grantedCount: number;
	readonly blockedCount: number;
}

export const RoleActionButtons: React.FC<RoleActionButtonsProps> = ({
	onSave,
	onReset,
	isSaving,
	hasUnsavedChanges,
	grantedCount,
	blockedCount,
}) => {
	return (
		<div
			className="sticky bottom-0 z-20 -mx-4 sm:mx-0 p-3 pb-4 sm:p-3.5 mt-2 rounded-none sm:rounded-xl bg-[var(--paper-strong)]/95 backdrop-blur-md border-t sm:border border-[var(--line)] shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0"
			data-testid="role-action-buttons-bar"
		>
			<div className="flex items-center gap-2">
				<span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--line-subtle)] flex items-center gap-1">
					<Check size={12} className="stroke-[3]" />
					<span>{grantedCount} разрешено</span>
				</span>
				<span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] font-medium border border-[var(--line)]">
					{blockedCount} закрыто
				</span>
				{hasUnsavedChanges && (
					<span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hidden sm:inline">
						• Несохранённые изменения
					</span>
				)}
			</div>

			<div className="flex flex-col-reverse sm:flex-row sm:flex-nowrap items-stretch sm:items-center justify-end gap-2">
				<button
					type="button"
					onClick={onReset}
					className="dente-btn dente-btn-secondary min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium sm:whitespace-nowrap shrink-0 bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer touch-manipulation inline-flex items-center justify-center gap-2"
					title="Сбросить права выбранной роли к заводскому стандарту DENTE"
				>
					<RotateCcw className="w-4 h-4 shrink-0 text-[var(--muted)]" />
					<span>Сбросить к стандарту</span>
				</button>

				{/* Primary CTA: NEVER disabled (Mandates 8e, 8n) */}
				<button
					type="button"
					onClick={onSave}
					className="dente-btn dente-btn-primary min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 px-4 rounded-xl sm:rounded-lg text-sm font-medium sm:whitespace-nowrap shrink-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm cursor-pointer touch-manipulation inline-flex items-center justify-center gap-2"
					data-testid="save-role-permissions-button"
				>
					<Save className="w-4 h-4 shrink-0" />
					<span>{isSaving ? "Сохранение..." : "Сохранить права"}</span>
				</button>
			</div>
		</div>
	);
};
