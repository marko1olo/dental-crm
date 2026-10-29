import React from "react";
import { Printer, Palette, X } from "lucide-react";

export interface PrintPreviewToolbarProps {
	readonly onOpenBranding: () => void;
	readonly onClosePreview: () => void;
}

export const PrintPreviewToolbar: React.FC<PrintPreviewToolbarProps> = ({
	onOpenBranding,
	onClosePreview,
}) => {
	return (
		<div className="clinical-diary-print-toolbar no-print flex items-center justify-between gap-2 p-3 bg-[var(--paper-soft)] border-b border-[var(--glass-border)]">
			<div className="flex items-center gap-2">
				<Printer className="w-5 h-5 text-[var(--teal)]" />
				<h3 className="text-sm font-bold m-0">Печатная форма медицинской карты</h3>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onOpenBranding}
					className="clinical-diary__btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] text-xs transition-colors"
					title="Настроить оформление бланка, цвета и реквизиты"
				>
					<Palette className="w-4 h-4 text-amber-500" />
					<span>Настроить бланк</span>
				</button>
				<button
					type="button"
					onClick={() => window.print()}
					className="clinical-diary__btn border border-[var(--teal-dark)] bg-[var(--teal)] text-white font-bold rounded-lg px-3 py-1.5 shadow-2xs hover:bg-[var(--teal-dark)] text-xs transition-colors"
					id="clinical-diary-print-btn"
					data-testid="clinical-diary-print"
					data-legacy-testid="form-043-print"
				>
					<Printer className="w-4 h-4" />
					<span>Печать (Ctrl+P)</span>
				</button>
				<button
					type="button"
					onClick={onClosePreview}
					className="clinical-diary__btn clinical-diary__btn--ghost border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] text-xs transition-colors"
					title="Закрыть предпросмотр"
					aria-label="Закрыть окно предпросмотра"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
