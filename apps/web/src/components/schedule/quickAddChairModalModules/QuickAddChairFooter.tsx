import { Check, Copy, Plus } from "lucide-react";

interface QuickAddChairFooterProps {
	isEditMode: boolean;
	isSubmitting: boolean;
	onClose: () => void;
	onSubmit: () => void;
	onDuplicate?: () => void;
}

export function QuickAddChairFooter({
	isEditMode,
	isSubmitting,
	onClose,
	onSubmit,
	onDuplicate,
}: QuickAddChairFooterProps) {
	return (
		<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-2 w-full sm:w-auto">
				<button
					type="button"
					onClick={onClose}
					disabled={false}
					style={{ minHeight: "44px" }}
					data-testid="quick-add-chair-cancel-btn"
					className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer w-full sm:w-auto text-center"
				>
					Отмена
				</button>
				{isEditMode && onDuplicate && (
					<button
						type="button"
						onClick={onDuplicate}
						disabled={false}
						style={{ minHeight: "44px" }}
						data-testid="quick-add-chair-duplicate-btn"
						className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
						title="Создать копию этого кресла"
					>
						<Copy className="w-4 h-4" />
						<span>Дублировать</span>
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={onSubmit}
				disabled={false}
				style={{ minHeight: "44px" }}
				data-testid="quick-add-chair-submit-btn"
				className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-sm font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto text-center"
			>
				{isEditMode ? (
					<Check className="w-4 h-4" />
				) : (
					<Plus className="w-4 h-4" />
				)}
				<span>
					{isSubmitting
						? "Сохраняю..."
						: isEditMode
							? "Сохранить изменения"
							: "+ Добавить кресло"}
				</span>
			</button>
		</div>
	);
}
