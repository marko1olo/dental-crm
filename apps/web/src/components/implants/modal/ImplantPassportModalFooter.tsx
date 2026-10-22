import React from "react";
import { CheckCircle2, Printer } from "lucide-react";

export interface ImplantPassportModalFooterProps {
	readonly brand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly onPrint: () => void;
	readonly onSave: () => void;
}

export const ImplantPassportModalFooter: React.FC<ImplantPassportModalFooterProps> = ({
	brand,
	diameterMm,
	lengthMm,
	torqueNcm,
	onPrint,
	onSave,
}) => {
	return (
		<footer className="implant-passport-actions flex items-center justify-between gap-3 p-3 bg-[var(--paper-soft)] border-t border-[var(--line)]">
			<div
				className="text-xs text-[var(--muted)] truncate min-w-0 flex-1 hidden sm:block"
				title={`${brand} Ø ${diameterMm} × ${lengthMm} мм · ${torqueNcm} Н·см`}
			>
				{brand} Ø {diameterMm} × {lengthMm} мм · {torqueNcm} Н·см
			</div>

			<div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
				<button
					type="button"
					onClick={onPrint}
					className="secondary-button min-h-[36px] sm:min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5"
					data-testid="btn-print-implant-passport-footer implant-print-passport-btn"
					title="Распечатать паспорт имплантата / гарантийный сертификат"
				>
					<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="hidden sm:inline">Печать паспорта</span>
					<span className="sm:hidden">Печать</span>
				</button>

				<button
					type="button"
					onClick={onSave}
					className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 flex-1 sm:flex-initial"
					data-testid="btn-save-implant-passport btn-passport-insert-diary implant-save-passport-btn implant-insert-diary-btn"
					title="Зафиксировать протокол имплантации и внести в дневник приёма"
				>
					<CheckCircle2 size={16} className="shrink-0" />
					<span className="hidden sm:inline">✓ Зафиксировать протокол имплантации</span>
					<span className="sm:hidden">✓ Зафиксировать</span>
				</button>
			</div>
		</footer>
	);
};

export default ImplantPassportModalFooter;
