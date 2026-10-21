import React from "react";
import { Layers, X } from "lucide-react";

export interface CreateStageModalHeaderProps {
	readonly onClose: () => void;
}

export const CreateStageModalHeader: React.FC<CreateStageModalHeaderProps> = ({
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between p-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
			<div className="flex items-center gap-2.5">
				<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal)]/20">
					<Layers size={18} />
				</div>
				<div>
					<h3 id="create-stage-modal-title" className="text-sm font-black text-[var(--ink,#0f172a)]">
						Новый этап плана лечения
					</h3>
					<p className="text-[11px] text-[var(--muted,#64748b)]">
						Выберите профиль или создайте индивидуальный этап
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
				aria-label="Закрыть окно"
			>
				<X size={18} />
			</button>
		</div>
	);
};
