import React from "react";

export const CompletedServicesChecklistEmpty: React.FC = () => {
	return (
		<div
			data-testid="completed-services-checklist"
			className="completed-services-checklist bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-3"
		>
			<h4 className="m-0 mb-1 text-sm font-semibold text-[var(--ink)]">
				Отметка выполненного по плану лечения
			</h4>
			<p
				className="m-0 text-xs text-slate-500 dark:text-slate-400"
				role="status"
				aria-live="polite"
			>
				Приём ещё не открыт, поэтому отмечать выполненное не по чему: отметка
				записывается в карту конкретного приёма. Запишите пациента и начните
				приём в разделе «Записи» — план лечения и экспресс-услуги появятся
				здесь.
			</p>
		</div>
	);
};
