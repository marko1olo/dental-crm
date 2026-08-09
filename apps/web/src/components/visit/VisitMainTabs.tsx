import type { ReactElement } from "react";

export type VisitSubViewTab = "emk" | "odontogram" | "diagnostics";

export interface VisitMainTabsProps {
	visitSubViewTab: VisitSubViewTab;
	setVisitSubViewTab: (tab: VisitSubViewTab) => void;
}

/**
 * VisitMainTabs component for main navigation tabs in Visit view.
 * Solves 3-Line Text Wrapping on Visit Tabs (Defect 5) by utilizing font-size adjustments,
 * padding, text-nowrap, flex shrink-0, and horizontal scrolling (`overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2`)
 * for mobile viewports to prevent awkward 3-line vertical button wrapping.
 */
export function VisitMainTabs({
	visitSubViewTab,
	setVisitSubViewTab,
}: VisitMainTabsProps): ReactElement {
	return (
		<div
			className="visit-sub-nav-tabs flex items-center gap-2 my-4 overflow-x-auto whitespace-nowrap scrollbar-none w-full max-w-full pb-1 shrink-0"
			role="tablist"
			aria-label="Разделы визита"
		>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "emk"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-4 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${visitSubViewTab === "emk" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "emk" ? "var(--teal-dark)" : undefined,
					color: visitSubViewTab === "emk" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("emk")}
			>
				📝 ЭМК и Диктовка
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "odontogram"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-4 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${visitSubViewTab === "odontogram" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "odontogram" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "odontogram" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("odontogram")}
			>
				🦷 Зубная формула и Дневник
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "diagnostics"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-4 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${visitSubViewTab === "diagnostics" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "diagnostics" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "diagnostics" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("diagnostics")}
			>
				🖼️ Рентгены и Диагностика
			</button>
		</div>
	);
}
