import React from "react";
import {
	Printer,
	X,
	FileText,
	ShieldCheck,
	Receipt,
	Scissors,
} from "lucide-react";
import type { FastPrintDocType } from "./types";

interface FastPrintHeaderProps {
	readonly titleId: string;
	readonly activeDocType: FastPrintDocType;
	readonly setActiveDocType: (type: FastPrintDocType) => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const FastPrintHeader: React.FC<FastPrintHeaderProps> = ({
	titleId,
	activeDocType,
	setActiveDocType,
	onPrint,
	onClose,
}) => (
	<>
		<div
			className="fast-print-mobile-handle-wrap fast-print-no-print"
			aria-hidden="true"
		>
			<div className="fast-print-mobile-handle" />
		</div>

		<div className="fast-print-header fast-print-no-print">
			<div className="fast-print-brand-group">
				<Printer size={16} className="fast-print-brand-icon" />
				<span
					id={titleId}
					className="fast-print-title"
					data-statutory="Приказ 834н"
				>
					Медицинская карта приёма
				</span>
			</div>

			<div className="fast-print-tabs-strip" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={activeDocType === "partisan_insert_043u"}
					data-testid="print-tab-insert043u"
					onClick={() => setActiveDocType("partisan_insert_043u")}
					className={`fast-print-tab-btn ${activeDocType === "partisan_insert_043u" ? "active" : ""}`}
				>
					<Scissors size={13} />
					<span>Вкладыш в карту</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeDocType === "form043u"}
					data-testid="print-tab-form043u"
					onClick={() => setActiveDocType("form043u")}
					className={`fast-print-tab-btn ${activeDocType === "form043u" ? "active" : ""}`}
				>
					<FileText size={13} />
					<span>Карта приёма</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeDocType === "act_and_receipt"}
					data-testid="print-tab-act"
					onClick={() => setActiveDocType("act_and_receipt")}
					className={`fast-print-tab-btn ${activeDocType === "act_and_receipt" ? "active" : ""}`}
				>
					<Receipt size={13} />
					<span>Акт и чек</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeDocType === "treatment_estimate"}
					data-testid="print-tab-estimate"
					onClick={() => setActiveDocType("treatment_estimate")}
					className={`fast-print-tab-btn ${activeDocType === "treatment_estimate" ? "active" : ""}`}
				>
					<ShieldCheck size={13} />
					<span>Смета</span>
				</button>
			</div>

			<div className="fast-print-actions-group">
				<button
					type="button"
					data-testid="btn-execute-fast-print"
					onClick={onPrint}
					className="primary-button h-9 min-h-[36px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 fast-print-desktop-only"
					title="Мгновенный вывод на принтер (0 мс)"
				>
					<Printer size={14} />
					<span>Печать</span>
				</button>
				<button
					type="button"
					data-testid="btn-close-fast-print"
					onClick={onClose}
					className="icon-button secondary-button w-9 h-9 min-h-[36px] rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
					aria-label="Закрыть окно печати"
					title="Закрыть предпросмотр"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	</>
);
