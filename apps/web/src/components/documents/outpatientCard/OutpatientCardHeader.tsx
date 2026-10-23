import React from "react";
import { FileText, Printer, Download, X } from "lucide-react";

export interface OutpatientCardHeaderProps {
	ptFullName: string;
	ptCardNumber: string;
	todayRu: string;
	isClosedOrSigned: boolean;
	isPrinting: boolean;
	onPrint: () => void;
	onDownloadPdf: () => void;
	onClose: () => void;
}

export const OutpatientCardHeader: React.FC<OutpatientCardHeaderProps> = ({
	ptFullName,
	ptCardNumber,
	todayRu,
	isClosedOrSigned,
	isPrinting,
	onPrint,
	onDownloadPdf,
	onClose,
}) => {
	return (
		<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
					<FileText size={18} />
				</div>
				<div>
					<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
						<span>Медицинская карта пациента · Медицинская карта приёма</span>
						<span
							className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
								isClosedOrSigned
									? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
									: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
							}`}
						>
							{isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
						</span>
					</h2>
					<p className="text-[12px] text-[var(--muted)]">
						Пациент: <strong>{ptFullName}</strong> · Карта: <strong>{ptCardNumber}</strong> · {todayRu}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onPrint}
					className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
					data-testid="outpatient-card-print-btn"
					title="Распечатать медицинскую карту приёма"
				>
					<Printer size={15} />
					<span>Печать карты приёма</span>
				</button>

				<button
					type="button"
					onClick={onDownloadPdf}
					className="secondary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
					data-testid="outpatient-card-pdf-btn"
					title="Сохранить в PDF"
				>
					<Download size={15} />
					<span>Экспорт PDF</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
					data-testid="outpatient-card-close-btn"
					aria-label="Закрыть окно"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};
