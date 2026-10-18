import React from "react";
import { Coins, Download, Printer, X } from "lucide-react";

export interface StagePaymentModalHeaderProps {
	readonly planTitle: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly onDownloadCsv: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const StagePaymentModalHeader: React.FC<StagePaymentModalHeaderProps> = ({
	planTitle,
	patientName,
	patientId,
	onDownloadCsv,
	onPrint,
	onClose,
}) => {
	return (
		<header className="stage-payment-header">
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]">
					<Coins className="h-5 w-5" />
				</div>
				<div>
					<h2 className="text-lg font-bold tracking-tight text-[var(--ink,#0f172a)] flex items-center gap-2">
						Студия поэтапной оплаты и Эскроу
						<span className="rounded-full bg-[var(--teal-soft,var(--paper-soft))] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal-dark,var(--teal))]">
							ГК РФ ст. 709/711
						</span>
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)]">
						{patientName} ({patientId}) • {planTitle}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onDownloadCsv}
					className="stage-action-btn secondary no-print h-9 px-4 text-[13px]"
					title="Экспорт в CSV (RFC 4180)"
				>
					<Download className="h-4 w-4" />
					<span>CSV</span>
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="stage-action-btn secondary no-print h-9 px-4 text-[13px]"
					title="Печать текущей вкладки"
				>
					<Printer className="h-4 w-4" />
					<span>Печать</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] transition no-print"
					aria-label="Закрыть"
				>
					<X className="h-5 w-5" />
				</button>
			</div>
		</header>
	);
};
