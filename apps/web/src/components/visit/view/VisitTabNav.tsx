import React from "react";
import type { VisitTabItem, VisitTabNavProps } from "./types";

export const VISIT_VIEW_TABS: VisitTabItem[] = [
	{ id: "odontogram", testId: "visit-subtab-odontogram", label: "1. Зубная формула" },
	{ id: "emk", testId: "visit-subtab-emk", label: "2. Дневник приёма" },
	{ id: "diagnostics", testId: "visit-subtab-diagnostics", label: "3. Диагноз МКБ" },
	{ id: "plan", testId: "visit-subtab-plan", label: "4. План лечения" },
	{ id: "consents", testId: "visit-subtab-consents", label: "Согласия" },
	{ id: "anamnesis", testId: "visit-subtab-anamnesis", label: "Анамнез" },
];

export function VisitTabNav({ activeTab, onTabChange }: VisitTabNavProps) {
	return (
		<div className="relative border-t border-[var(--line)] bg-[var(--paper-soft,rgba(0,0,0,0.02))] rounded-b-xl min-h-[36px] h-[36px]">
			<div className="flex items-center gap-1.5 px-2.5 py-1 overflow-x-auto scrollbar-none flex-nowrap shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
				{VISIT_VIEW_TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						data-testid={tab.testId}
						className={`visit-subtab-btn ${activeTab === tab.id ? "active" : ""}`}
						onClick={() => onTabChange(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>
			{/* Плавный градиентный фейд по правому краю на мобильных экранах для индикации горизонтального скролла */}
			<div
				className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--paper-soft)] to-transparent"
				aria-hidden="true"
			/>
		</div>
	);
}
