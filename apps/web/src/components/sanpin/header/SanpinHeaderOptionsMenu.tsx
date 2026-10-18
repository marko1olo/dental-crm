import React from "react";
import {
	Award,
	Download,
	FileBadge,
	FileSpreadsheet,
	Gauge,
	Printer,
	QrCode,
	RotateCcw,
	Sparkles,
} from "lucide-react";
import {
	printConsolidatedBinderAction,
	exportConsolidatedCsvAction,
} from "../sanpinConsolidatedExportHelpers";

export interface SanpinHeaderOptionsMenuProps {
	readonly onClose: () => void;
	readonly autofillPeriod: "day" | "week" | "month";
	readonly setAutofillPeriod: (period: "day" | "week" | "month") => void;
	readonly onAutofillByPeriod: (period: "day" | "week" | "month") => void;
	readonly autoFilling: boolean;
	readonly onRefreshSummary: () => void;
	readonly onAutofillShift: () => void;
	readonly onOpenRetroactiveBatchModal: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly exportContext: { auth?: any; appLogic?: any };
}

export const SanpinHeaderOptionsMenu: React.FC<SanpinHeaderOptionsMenuProps> = ({
	onClose,
	autofillPeriod,
	setAutofillPeriod,
	onAutofillByPeriod,
	autoFilling,
	onRefreshSummary,
	onAutofillShift,
	onOpenRetroactiveBatchModal,
	onOpenKraftModal,
	onOpenJournal257Modal,
	exportContext,
}) => {
	return (
		<div className="sanpin-options-dropdown" role="menu">
			<button type="button" role="menuitem" onClick={() => { onClose(); onRefreshSummary(); }} className="sanpin-dropdown-item">
				<RotateCcw size={15} color="var(--teal)" className="shrink-0" />
				<span>Обновить сводку смены</span>
			</button>

			<div className="sanpin-dropdown-divider" />
			<div className="sanpin-dropdown-section-label">Период автопилота:</div>
			<div className="sanpin-dropdown-period-group">
				{(["day", "week", "month"] as const).map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => { setAutofillPeriod(p); onAutofillByPeriod(p); onClose(); }}
						className={`sanpin-btn-secondary sanpin-dropdown-period-btn ${autofillPeriod === p ? "active" : ""}`}
						data-testid={`sanpin-period-${p}-btn`}
					>
						{p === "day" ? "День" : p === "week" ? "Неделя" : "Месяц"}
					</button>
				))}
			</div>

			<div className="sanpin-dropdown-divider" />
			<button type="button" role="menuitem" onClick={() => { onClose(); onAutofillShift(); }} aria-busy={autoFilling} className="sanpin-dropdown-item">
				<Sparkles size={15} color="var(--teal)" className="shrink-0" />
				<span>{autoFilling ? "Оформление..." : "Завершить и закрыть смену"}</span>
			</button>

			<button type="button" role="menuitem" onClick={() => { onClose(); onOpenRetroactiveBatchModal(); }} className="sanpin-dropdown-item" data-testid="open-retroactive-batch-header-btn">
				<Gauge size={15} color="var(--teal)" className="shrink-0" />
				<span>Пакетное закрытие (за период)</span>
			</button>

			<button type="button" role="menuitem" onClick={() => { onClose(); printConsolidatedBinderAction(exportContext); }} className="sanpin-dropdown-item" data-testid="print-consolidated-binder-btn">
				<FileBadge size={15} color="var(--teal)" className="shrink-0" />
				<span>Отчет для Роспотребнадзора</span>
			</button>

			<button type="button" role="menuitem" onClick={() => { onClose(); exportConsolidatedCsvAction(exportContext); }} className="sanpin-dropdown-item" data-testid="export-consolidated-csv-btn">
				<Download size={15} color="var(--ok-fg)" className="shrink-0" />
				<span>Сводный архив (CSV)</span>
			</button>

			<button type="button" role="menuitem" onClick={() => { onClose(); onOpenKraftModal(); }} className="sanpin-dropdown-item" data-testid="open-kraft-studio-header-btn">
				<QrCode size={15} color="var(--teal)" className="shrink-0" />
				<span>Маркировочный лист партии</span>
			</button>

			<button type="button" role="menuitem" onClick={() => { onClose(); onOpenJournal257Modal(); }} className="sanpin-dropdown-item" data-testid="open-journal-257-header-btn">
				<FileSpreadsheet size={15} color="var(--teal)" className="shrink-0" />
				<span>Журнал работы автоклава</span>
			</button>
		</div>
	);
};
