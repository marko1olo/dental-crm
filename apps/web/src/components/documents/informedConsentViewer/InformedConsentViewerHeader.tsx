import { Download, Printer, ShieldCheck, Sparkles, X } from "lucide-react";
import type React from "react";

export interface InformedConsentViewerHeaderProps {
	readonly patientName: string;
	readonly clinicName: string;
	readonly todayRu: string;
	readonly isSigned: boolean;
	readonly isPrinting: boolean;
	readonly onFillNorm: () => void;
	readonly onPrint: () => void;
	readonly onDownloadPdf: () => void;
	readonly onClose: () => void;
}

export const InformedConsentViewerHeader: React.FC<
	InformedConsentViewerHeaderProps
> = ({
	patientName,
	clinicName,
	todayRu,
	isSigned,
	isPrinting,
	onFillNorm,
	onPrint,
	onDownloadPdf,
	onClose,
}) => {
	return (
		<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
					<ShieldCheck size={18} />
				</div>
				<div>
					<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
						<span>Информированное добровольное согласие</span>
						<span
							className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
								isSigned
									? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
									: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
							}`}
						>
							{isSigned ? "ПОДПИСАНО" : "ЧЕРНОВИК"}
						</span>
					</h2>
					<p className="text-[12px] text-[var(--muted)]">
						{patientName} · {todayRu} · {clinicName}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onFillNorm}
					className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
					data-testid="consent-fill-norm-btn"
					title="Заполнить нормативные отметки согласия"
				>
					<Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Заполнить нормой</span>
				</button>

				<button
					type="button"
					onClick={onPrint}
					disabled={isPrinting}
					className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
					data-testid="consent-print-btn"
					title="Печать бланка ИДС"
				>
					<Printer size={14} />
					<span>Печать ИДС</span>
				</button>

				<button
					type="button"
					onClick={onDownloadPdf}
					className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
					data-testid="consent-pdf-btn"
					title="Сохранить в PDF"
				>
					<Download size={14} />
					<span>PDF</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
					data-testid="consent-close-btn"
					aria-label="Закрыть окно"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};

InformedConsentViewerHeader.displayName = "InformedConsentViewerHeader";
