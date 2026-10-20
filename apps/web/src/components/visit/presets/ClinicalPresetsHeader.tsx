import { BookOpen, ChevronDown, ChevronUp, PlusCircle, Zap } from "lucide-react";
import React from "react";

export interface ClinicalPresetsHeaderProps {
	readonly currentTooth: number | null;
	readonly isCollapsed: boolean;
	readonly onToggleCollapse: () => void;
	readonly onOpenTemplatesModal?: (() => void) | undefined;
	readonly onOpenPriceSearch?: (() => void) | undefined;
	readonly protocolsCount?: number | undefined;
	readonly rightNode?: React.ReactNode | undefined;
}

export const ClinicalPresetsHeader: React.FC<ClinicalPresetsHeaderProps> = ({
	currentTooth,
	isCollapsed,
	onToggleCollapse,
	onOpenTemplatesModal,
	onOpenPriceSearch,
	protocolsCount = 10,
	rightNode,
}) => {
	const btnStyle = "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center gap-1.5 cursor-pointer";

	return (
		<div className="flex items-center justify-between gap-2 min-w-0 h-8 sm:h-9">
			<div className="flex items-center gap-2 min-w-0 shrink-0">
				<div className="w-6 h-6 rounded-md bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal)] flex items-center justify-center shrink-0">
					<Zap size={14} />
				</div>
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] tracking-tight whitespace-nowrap">
					Клинические протоколы
				</h4>
				{currentTooth && (
					<span className="text-xs font-bold px-2 py-0.5 rounded-md border border-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal-dark,var(--teal,#0f766e))]" data-testid="badge-collapsed-active-tooth">
						Зуб {currentTooth}
					</span>
				)}
				<span className="text-[11px] font-medium text-[var(--muted)] hidden sm:inline">
					({protocolsCount} протоколов)
				</span>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 ml-auto">
				{rightNode}
				{onOpenTemplatesModal && (
					<button
						type="button"
						onClick={onOpenTemplatesModal}
						className={btnStyle}
						data-testid="btn-open-soap-templates-modal-bar"
						title="Полный реестр клинических протоколов Минздрава РФ (1 142 протокола)"
					>
						<BookOpen size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="hidden md:inline">Реестр протоколов (1 142)</span>
					</button>
				)}
				{onOpenPriceSearch && (
					<button
						type="button"
						onClick={onOpenPriceSearch}
						className={btnStyle}
						data-testid="btn-quick-add-from-pricelist"
						title="Каталог услуг"
					>
						<PlusCircle size={13} className="shrink-0 text-[var(--muted)]" />
						<span className="hidden md:inline">Каталог услуг</span>
					</button>
				)}
				<button
					type="button"
					onClick={onToggleCollapse}
					className={btnStyle}
					data-testid="btn-toggle-presets-bar-collapse"
					title={isCollapsed ? "Развернуть клинические протоколы" : "Свернуть панель протоколов"}
				>
					{isCollapsed ? <ChevronDown size={13} className="shrink-0 text-[var(--teal)]" /> : <ChevronUp size={13} className="shrink-0 text-[var(--muted)]" />}
					<span>{isCollapsed ? "Развернуть" : "Свернуть"}</span>
				</button>
			</div>
		</div>
	);
};
