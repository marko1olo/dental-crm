import React from "react";
import { X } from "lucide-react";
import { DentalChairUnit } from "../../icons/DentalIcons";

interface QuickAddChairHeaderProps {
	isEditMode: boolean;
	onClose: () => void;
}

export function QuickAddChairHeader({ isEditMode, onClose }: QuickAddChairHeaderProps): React.ReactElement {
	return (
		<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/20 shrink-0">
					<DentalChairUnit className="w-5 h-5" aria-hidden="true" />
				</div>
				<div>
					<h2
						id="quick-add-chair-modal-title"
						className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] leading-tight"
					>
						{isEditMode ? "Редактировать кресло" : "Добавить кресло в расписание"}
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						{isEditMode ? "Параметры рабочего места и активность" : "Быстрое добавление рабочего места"}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer shrink-0"
				aria-label="Закрыть окно"
				data-testid="quick-add-chair-close-btn"
				style={{ minHeight: "44px", minWidth: "44px" }}
			>
				<X className="w-5 h-5" aria-hidden="true" />
			</button>
		</div>
	);
}
