import React from "react";

export const PhasedStageEmptyState: React.FC = () => {
	return (
		<div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)] p-6 text-center">
			<div className="text-sm font-bold text-[var(--ink)]">
				В плане пока нет назначенных клинических позиций
			</div>
			<p className="mt-1 text-xs text-[var(--ink-muted)] max-w-md mx-auto">
				Отметьте патологии на зубной формуле или выберите готовый клинический протокол, чтобы автоматически сформировать 4-этапный план лечения с расчетом по каталогу стоматологических услуг.
			</p>
			<div className="mt-3 flex justify-center gap-2">
				<button
					type="button"
					onClick={() => {
						if (typeof window !== "undefined") {
							window.dispatchEvent(new CustomEvent("dente-focus-odontogram"));
						}
					}}
					className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[36px]"
				>
					Сформировать из зубной формулы
				</button>
			</div>
		</div>
	);
};
