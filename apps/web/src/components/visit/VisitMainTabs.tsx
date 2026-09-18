import React, { type ReactElement } from "react";
import {
	Activity,
	FileText,
	Image as ImageIcon,
	ShieldCheck,
	Stethoscope,
} from "lucide-react";

export type VisitSubViewTab =
	| "emk"
	| "odontogram"
	| "anamnesis"
	| "diagnostics"
	| "consents";

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
			className="visit-sub-nav-tabs flex items-center gap-2 min-h-[34px] sm:h-8 h-8 overflow-x-auto whitespace-nowrap scrollbar-none w-full max-w-full pl-2 pr-8 sm:pr-4 shrink-0 overscroll-x-contain py-0.5"
			role="tablist"
			aria-label="Разделы визита"
		>
			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "odontogram"}
				className={`secondary-button shrink-0 flex-shrink-0 min-w-0 whitespace-nowrap text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 min-h-[34px] h-8 sm:min-h-[32px] sm:h-8 inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "odontogram" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "odontogram" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "odontogram" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("odontogram")}
			>
				<Activity size={14} className="shrink-0" />
				<span className="whitespace-nowrap flex-shrink-0">
					<span className="sm:hidden">Формула</span>
					<span className="hidden sm:inline">Зубная формула и Дневник</span>
				</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "emk"}
				className={`secondary-button shrink-0 flex-shrink-0 min-w-0 whitespace-nowrap text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 min-h-[34px] h-8 sm:min-h-[32px] sm:h-8 inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "emk" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "emk" ? "var(--teal-dark)" : undefined,
					color: visitSubViewTab === "emk" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("emk")}
			>
				<FileText size={14} className="shrink-0" />
				<span className="whitespace-nowrap flex-shrink-0">
					<span className="sm:hidden">043/у</span>
					<span className="hidden sm:inline">ЭМК и Диктовка</span>
				</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "anamnesis"}
				className={`secondary-button shrink-0 flex-shrink-0 min-w-0 whitespace-nowrap text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 min-h-[34px] h-8 sm:min-h-[32px] sm:h-8 inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "anamnesis" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "anamnesis" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "anamnesis" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("anamnesis")}
			>
				<Stethoscope size={14} className="shrink-0" />
				<span className="whitespace-nowrap flex-shrink-0">
					<span className="sm:hidden">Анамнез</span>
					<span className="hidden sm:inline">Анамнез и Жалобы</span>
				</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "diagnostics"}
				className={`secondary-button shrink-0 flex-shrink-0 min-w-0 whitespace-nowrap text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 min-h-[34px] h-8 sm:min-h-[32px] sm:h-8 inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "diagnostics" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "diagnostics" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "diagnostics" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("diagnostics")}
			>
				<ImageIcon size={14} className="shrink-0" />
				<span className="whitespace-nowrap flex-shrink-0">
					<span className="sm:hidden">Рентген</span>
					<span className="hidden sm:inline">Рентгены и Диагностика</span>
				</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={visitSubViewTab === "consents"}
				className={`secondary-button shrink-0 flex-shrink-0 min-w-0 whitespace-nowrap text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 min-h-[34px] h-8 sm:min-h-[32px] sm:h-8 inline-flex items-center justify-center gap-1.5 touch-manipulation focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-none transition-colors ${visitSubViewTab === "consents" ? "active" : ""}`}
				style={{
					background:
						visitSubViewTab === "consents" ? "var(--teal-dark)" : undefined,
					color:
						visitSubViewTab === "consents" ? "var(--on-teal)" : undefined,
				}}
				onClick={() => setVisitSubViewTab("consents")}
			>
				<ShieldCheck size={14} className="shrink-0" />
				<span className="whitespace-nowrap flex-shrink-0">Согласия</span>
			</button>
		</div>
	);
}
