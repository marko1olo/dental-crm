import React from "react";
import { Package } from "lucide-react";

export const AccordionEmptyState: React.FC = () => {
	return (
		<div className="p-8 text-center rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] flex flex-col items-center justify-center gap-2">
			<Package size={28} className="text-[var(--tp-primary)] opacity-50" />
			<span className="font-bold text-sm text-[var(--tp-text-main)]">
				В данном варианте пока нет клинических этапов
			</span>
			<span>
				Добавьте этапы лечения или выберите готовый клинический пакет СтАР
			</span>
		</div>
	);
};
