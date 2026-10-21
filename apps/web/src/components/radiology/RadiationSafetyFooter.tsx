import type React from "react";

export const RadiationSafetyFooter: React.FC<{ onClose: () => void }> = ({
	onClose,
}) => {
	return (
		<div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
			<span>
				Фоновый расчет по стандарту радиационной безопасности. Запись в
				медицинскую карту вносится автоматически.
			</span>
			<button
				type="button"
				onClick={onClose}
				className="h-8 px-4 rounded-lg font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);
};
