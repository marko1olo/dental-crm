import React, { useEffect, useRef } from "react";
import { CheckCircle2, ChevronDown, MoreVertical, Printer } from "lucide-react";
import { printConsolidatedBinderAction } from "./sanpinConsolidatedExportHelpers";
import { SanpinHeaderTitleKpi } from "./header/SanpinHeaderTitleKpi";
import { SanpinHeaderOptionsMenu } from "./header/SanpinHeaderOptionsMenu";

export interface SanpinRegistersHeaderProps {
	readonly summary: any;
	readonly showExpandedKpi: boolean;
	readonly onToggleExpandedKpi: () => void;
	readonly autofillPeriod: "day" | "week" | "month";
	readonly setAutofillPeriod: (period: "day" | "week" | "month") => void;
	readonly autoFilling: boolean;
	readonly onAutofillByPeriod: (period: "day" | "week" | "month") => void;
	readonly exportContext: { auth?: any; appLogic?: any };
	readonly isExportMenuOpen: boolean;
	readonly setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onRefreshSummary: () => void;
	readonly onAutofillShift: () => void;
	readonly onOpenRetroactiveBatchModal: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onOpenSterilizationLogModal?: () => void;
	readonly onOpenJournal257Modal?: () => void;
}

export const SanpinRegistersHeader: React.FC<SanpinRegistersHeaderProps> = ({
	summary, showExpandedKpi, onToggleExpandedKpi, autofillPeriod, setAutofillPeriod,
	autoFilling, onAutofillByPeriod, exportContext, isExportMenuOpen, setIsExportMenuOpen,
	onRefreshSummary, onAutofillShift, onOpenRetroactiveBatchModal, onOpenKraftModal,
	onOpenSterilizationLogModal, onOpenJournal257Modal,
}) => {
	const handleOpenLogModal = onOpenSterilizationLogModal || onOpenJournal257Modal || (() => {});
	const exportMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
				setIsExportMenuOpen(false);
			}
		};
		if (isExportMenuOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExportMenuOpen, setIsExportMenuOpen]);

	return (
		<div className="sanpin-header">
			<SanpinHeaderTitleKpi summary={summary} onToggleExpandedKpi={onToggleExpandedKpi} />

			<div className="sanpin-header-actions">
				<button
					type="button"
					onClick={onAutofillShift}
					aria-busy={autoFilling}
					className="primary-button sanpin-btn-primary-cta h-9 min-h-[36px] rounded-xl bg-[var(--primary,#0d9488)] hover:opacity-90 text-white shadow-xs px-3.5 text-[13px] font-medium sm:inline-flex hidden items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer touch-manipulation"
					data-testid="sanpin-shift-close-primary-btn"
					data-action="shift-close"
					title="Зафиксировать смену стерилизации в 1 клик (автоклавы 134°C, азопирам 100% норма, пакетное списание расходников)"
				>
					<CheckCircle2 size={15} className="shrink-0 text-white" />
					<span>{autoFilling ? "Фиксация..." : "Зафиксировать смену стерилизации"}</span>
				</button>

				<button
					type="button"
					onClick={() => printConsolidatedBinderAction(exportContext)}
					className="secondary-button sanpin-btn-export-cta sanpin-desktop-only-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer touch-manipulation"
					data-testid="sanpin-print-form257-btn"
					data-action="print-form257"
					title="Печать сводного журнала контроля автоклавирования"
				>
					<Printer size={14} className="shrink-0" />
					<span>Печать журнала</span>
				</button>

				<div ref={exportMenuRef} className="sanpin-options-menu-wrap">
					<button
						type="button"
						onClick={() => setIsExportMenuOpen((p) => !p)}
						className="secondary-button sanpin-btn-options h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer touch-manipulation"
						aria-expanded={isExportMenuOpen}
						data-testid="sanpin-options-dropdown-btn"
					>
						<MoreVertical size={14} className="shrink-0" />
						<span className="sanpin-desktop-only-label">Опции</span>
						<ChevronDown size={12} className={`sanpin-chevron-icon ${isExportMenuOpen ? "sanpin-chevron-icon--open" : ""}`} />
					</button>

					{isExportMenuOpen && (
						<SanpinHeaderOptionsMenu
							onClose={() => setIsExportMenuOpen(false)}
							autofillPeriod={autofillPeriod} setAutofillPeriod={setAutofillPeriod}
							onAutofillByPeriod={onAutofillByPeriod} autoFilling={autoFilling}
							onRefreshSummary={onRefreshSummary} onAutofillShift={onAutofillShift}
							onOpenRetroactiveBatchModal={onOpenRetroactiveBatchModal}
							onOpenKraftModal={onOpenKraftModal}
							onOpenSterilizationLogModal={handleOpenLogModal}
							onOpenJournal257Modal={handleOpenLogModal}
							exportContext={exportContext}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default SanpinRegistersHeader;
