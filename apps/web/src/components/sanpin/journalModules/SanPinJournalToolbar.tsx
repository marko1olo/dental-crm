import React from "react";
import type { SanPinJournalPeriod } from "./sanpinJournalTypes";
import { SanPinJournalToolbarFilters } from "./SanPinJournalToolbarFilters";
import { SanPinJournalToolbarActions } from "./SanPinJournalToolbarActions";

export interface SanPinJournalToolbarProps {
	readonly selectedAutoclave: string;
	readonly onSelectAutoclave: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly isAutofilling: boolean;
	readonly onAutofillNorms: () => void;
	readonly onPrintSterilizationLog?: (() => void) | undefined;
	readonly onPrintForm257?: (() => void) | undefined;
	readonly onExportCsv: () => void;
	readonly onOpenEquipmentModal?: (() => void) | undefined;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly period?: SanPinJournalPeriod | undefined;
	readonly onPeriodChange?: ((p: SanPinJournalPeriod) => void) | undefined;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121", cycleName?: string) => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

export const SanPinJournalToolbar: React.FC<SanPinJournalToolbarProps> = ({
	selectedAutoclave,
	onSelectAutoclave,
	searchQuery,
	onSearchChange,
	isAutofilling,
	onAutofillNorms,
	onPrintSterilizationLog,
	onPrintForm257,
	onExportCsv,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
	period = "day",
	onPeriodChange,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	return (
		<div
			className="sanpin-journal-toolbar"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: "8px 12px",
				borderRadius: 8,
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				maxWidth: "100%",
				overflowX: "clip",
			}}
		>
			<SanPinJournalToolbarFilters
				selectedAutoclave={selectedAutoclave}
				onSelectAutoclave={onSelectAutoclave}
				searchQuery={searchQuery}
				onSearchChange={onSearchChange}
				period={period}
				onPeriodChange={onPeriodChange}
			/>

			<SanPinJournalToolbarActions
				isAutofilling={isAutofilling}
				onAutofillNorms={onAutofillNorms}
				onPrintSterilizationLog={onPrintSterilizationLog || onPrintForm257}
				onPrintForm257={onPrintSterilizationLog || onPrintForm257}
				onExportCsv={onExportCsv}
				onOpenEquipmentModal={onOpenEquipmentModal}
				onOpenNewCycleModal={onOpenNewCycleModal}
				onQuickBatchNorm={onQuickBatchNorm}
				onQuickPsoNorm={onQuickPsoNorm}
			/>
		</div>
	);
};

export default SanPinJournalToolbar;
