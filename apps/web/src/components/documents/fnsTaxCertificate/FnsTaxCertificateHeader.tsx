import React from "react";
import { X, Printer, Download, Receipt, FileCheck } from "lucide-react";
import type { Patient } from "@dental/shared";

interface FnsTaxCertificateHeaderProps {
	patient?: Patient | null | undefined;
	selectedYear: number;
	isLoadingPreview: boolean;
	isIssuingDoc: boolean;
	totalNetRub: number;
	onSaveToRegistry: () => void;
	onPrint: () => void;
	onDownloadPdf: () => void;
	onClose: () => void;
}

export const FnsTaxCertificateHeader: React.FC<FnsTaxCertificateHeaderProps> = ({
	patient,
	selectedYear,
	isLoadingPreview,
	isIssuingDoc,
	totalNetRub,
	onSaveToRegistry,
	onPrint,
	onDownloadPdf,
	onClose,
}) => (
	<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
		<div className="flex items-center gap-2.5">
			<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
				<Receipt size={18} />
			</div>
			<div>
				<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight">
					Справка для налогового вычета (ФНС) · 13% НДФЛ
				</h2>
				<p className="text-[12px] text-[var(--muted)]">
					{patient?.fullName || "Пациент"} · Налоговый период: {selectedYear} год
					{isLoadingPreview && " · Загрузка фискальных чеков..."}
				</p>
			</div>
		</div>

		<div className="flex items-center gap-2">
			{patient?.id && (
				<button
					type="button"
					onClick={onSaveToRegistry}
					disabled={isIssuingDoc}
					className="secondary-button hidden sm:inline-flex h-9 min-h-[36px] px-3 text-xs items-center gap-1.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 hover:bg-teal-500/20"
					data-testid="tax-cert-save-registry-btn"
					title="Зарегистрировать справку в реестре документов клиники"
				>
					<FileCheck size={14} />
					<span>{isIssuingDoc ? "Сохранение..." : "В реестр"}</span>
				</button>
			)}

			<button
				type="button"
				onClick={onPrint}
				className="primary-button hidden sm:inline-flex h-9 min-h-[36px] px-3.5 text-xs items-center gap-1.5 rounded-xl cursor-pointer"
				data-testid="tax-cert-print-btn"
				title={
					totalNetRub === 0
						? "Распечатать бланк справки со строками _______ (Мандат 8e)"
						: "Распечатать справку для налогового вычета"
				}
			>
				<Printer size={14} />
				<span>Печать справки</span>
			</button>

			<button
				type="button"
				onClick={onDownloadPdf}
				className="secondary-button hidden sm:inline-flex h-9 min-h-[36px] px-3 text-xs items-center gap-1.5 rounded-xl hover:bg-[var(--paper-soft)] cursor-pointer"
				data-testid="tax-cert-pdf-btn"
				title={totalNetRub === 0 ? "Экспорт бланка справки в PDF (Мандат 8e)" : "Экспорт в PDF"}
			>
				<Download size={14} />
				<span>PDF</span>
			</button>

			<button
				type="button"
				onClick={onClose}
				className="icon-button secondary-button min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-xl hover:bg-[var(--paper)] transition cursor-pointer"
				data-testid="tax-cert-close-btn"
				aria-label="Закрыть окно"
			>
				<X size={18} />
			</button>
		</div>
	</header>
);
