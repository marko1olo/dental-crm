import type { ReactElement } from "react";
import {
	Activity,
	BarChart2,
	FileText,
	Image as ImageIcon,
	Stethoscope,
} from "lucide-react";

export type VisitSubViewTab =
	| "emk"
	| "odontogram"
	| "anamnesis"
	| "perio"
	| "diagnostics";

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
			className="visit-sub-nav-tabs flex items-center gap-2 my-2 sm:my-3 overflow-x-auto whitespace-nowrap scrollbar-none w-full max-w-full pb-1 shrink-0 overscroll-x-contain"
			role="tablist"
			aria-label="Разделы визита"
		>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "emk"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "emk" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "emk" ? "var(--teal-dark)" : undefined,
					color: visitSubViewTab === "emk" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("emk")}
			>
				<FileText size={15} className="shrink-0" />
				<span>ЭМК и Диктовка</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "odontogram"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "odontogram" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "odontogram" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "odontogram" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("odontogram")}
			>
				<Activity size={15} className="shrink-0" />
				<span>Зубная формула и Дневник</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "anamnesis"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "anamnesis" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "anamnesis" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "anamnesis" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("anamnesis")}
			>
				<Stethoscope size={15} className="shrink-0" />
				<span>Анамнез и Жалобы</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "perio"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "perio" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "perio" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "perio" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("perio")}
			>
				<BarChart2 size={15} className="shrink-0" />
				<span>Пародонтология и Зондирование</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "diagnostics"}
				className={`secondary-button shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "diagnostics" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "diagnostics" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "diagnostics" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("diagnostics")}
			>
				<ImageIcon size={15} className="shrink-0" />
				<span>Рентгены и Диагностика</span>
			</button>
		</div>
	);
}
