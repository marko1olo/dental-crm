/**
 * ImplantStudioHeader.tsx — Эргономичная шапка и навигация хирургической студии DENTE CRM.
 * Поддерживает Apple HIG Bottom Sheet (drag handle), touch-target >= 44x44px,
 * интуитивные бейджи торка и навигацию по 4 вкладкам (Мандаты 8e, 8am, 8ze).
 */

import React from "react";
import { Award, FileText, HeartHandshake, Stethoscope, X } from "lucide-react";
import type { ImplantStudioTab } from "./useImplantologyStudioState";

export interface ImplantStudioHeaderProps {
	readonly titleId: string;
	readonly toothFdi: number;
	readonly patientName: string;
	readonly doctorName: string;
	readonly activeTab: ImplantStudioTab;
	readonly torqueNcm: number;
	readonly onTabChange: (tab: ImplantStudioTab) => void;
	readonly onClose: () => void;
}

const STUDIO_TABS: readonly {
	readonly id: ImplantStudioTab;
	readonly label: string;
	readonly icon: React.FC<{ size?: number; className?: string }>;
}[] = [
	{ id: "protocol", label: "1. Протокол", icon: Stethoscope },
	{ id: "passport", label: "2. Паспорт имплантата", icon: Award },
	{ id: "diary", label: "3. В дневник (SOAP)", icon: FileText },
	{ id: "memo", label: "4. Памятка пациенту", icon: HeartHandshake },
];

export const ImplantStudioHeader: React.FC<ImplantStudioHeaderProps> = ({
	titleId,
	toothFdi,
	patientName,
	doctorName,
	activeTab,
	torqueNcm,
	onTabChange,
	onClose,
}) => {
	return (
		<>
			{/* Apple HIG Bottom Sheet Drag Handle (36x5px) */}
			<div className="implant-sheet-drag-handle" aria-hidden="true" />

			{/* Шапка модального окна */}
			<header className="implant-passport-header-bar flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
				<div className="implant-passport-header-title flex items-center gap-2.5 min-w-0 flex-1 pr-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Stethoscope size={18} />
					</div>
					<div className="flex-1 min-w-0">
						<h2 id={titleId} className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug">
							Хирургический протокол имплантации · Зуб #{toothFdi}
						</h2>
						<p className="text-[11px] text-[var(--muted)] truncate">
							Пациент: <span className="font-medium text-[var(--ink)]">{patientName}</span> · {doctorName}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] bg-transparent transition-all cursor-pointer border border-transparent shrink-0"
					aria-label="Закрыть"
					data-testid="btn-close-implant-studio"
				>
					<X size={18} />
				</button>
			</header>

			{/* Навигационная полоса табов */}
			<nav
				className="implant-tabs-nav flex items-center gap-1.5 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0 overflow-x-auto"
				role="tablist"
				aria-label="Вкладки хирургической студии"
			>
				{STUDIO_TABS.map((t) => {
					const Icon = t.icon;
					const isSel = activeTab === t.id;
					return (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={isSel}
							onClick={() => onTabChange(t.id)}
							className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-all shrink-0 whitespace-nowrap ${
								isSel
									? "bg-[var(--paper)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] shadow-xs"
									: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
							}`}
							data-testid={`implant-tab-${t.id}`}
						>
							<Icon size={14} className="shrink-0" />
							<span>{t.id === "protocol" ? `1. Протокол (${torqueNcm} Н·см)` : t.label}</span>
						</button>
					);
				})}
			</nav>
		</>
	);
};

export default ImplantStudioHeader;
