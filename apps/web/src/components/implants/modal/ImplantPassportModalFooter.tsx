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
		<footer className="implant-passport-actions">
			<div
				className="text-xs text-[var(--muted)] truncate min-w-0 flex-1"
				title={`${brand} Ø ${diameterMm} × ${lengthMm} мм · ${torqueNcm} Н·см`}
			>
				{brand} Ø {diameterMm} × {lengthMm} мм · {torqueNcm} Н·см
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onPrint}
					className="secondary-button"
					data-testid="btn-print-implant-passport-footer implant-print-passport-btn"
					title="Распечатать паспорт имплантата / гарантийный сертификат"
				>
					<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Печать паспорта</span>
				</button>

				<button
					type="button"
					onClick={onSave}
					className="primary-button"
					data-testid="btn-save-implant-passport btn-passport-insert-diary implant-save-passport-btn implant-insert-diary-btn"
					title="Сохранить паспорт имплантата и внести протокол в дневник приёма"
				>
					<CheckCircle2 size={16} className="shrink-0" />
					<span>Сохранить паспорт имплантата · В дневник приёма</span>
				</button>
			</div>
		</footer>
	);
};
