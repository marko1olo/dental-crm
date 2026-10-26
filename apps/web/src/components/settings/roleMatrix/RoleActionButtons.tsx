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
			className="sticky bottom-0 z-20 -mx-4 sm:mx-0 p-3 sm:p-3.5 mt-2 rounded-none sm:rounded-xl bg-[var(--paper-strong)]/90 backdrop-blur-md border-t sm:border border-[var(--line)] shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0"
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

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onReset}
					className="px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
					title="Сбросить права выбранной роли к заводскому стандарту DENTE"
				>
					<RotateCcw size={14} className="text-[var(--muted)]" />
					<span>Сбросить к стандарту</span>
				</button>

				{/* Primary CTA: NEVER disabled (Mandates 8e, 8n) */}
				<button
					type="button"
					onClick={onSave}
					className="px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[var(--teal)] text-[var(--on-teal)] hover:bg-[var(--teal-dark)] shadow-xs cursor-pointer touch-manipulation flex items-center justify-center gap-2 flex-1 sm:flex-initial"
					data-testid="save-role-permissions-button"
				>
					<Save size={14} />
					<span>{isSaving ? "Сохранение..." : "Сохранить права"}</span>
				</button>
			</div>
		</div>
	);
};
