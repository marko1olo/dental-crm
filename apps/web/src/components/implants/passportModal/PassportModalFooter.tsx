/**
 * PassportModalFooter.tsx — Подвал модального окна паспорта имплантата.
 * Ровно 2 кнопки действий по закону Миллера и Мандату 8am (Secondary CTA Печать, Primary CTA Зафиксировать).
 * Кнопки НИКОГДА не блокируются (Мандат 8e), сенсорный минимум >= 44px (Мандат 8ze).
 */

import React from "react";
import { Printer, Wrench } from "lucide-react";

export interface PassportModalFooterProps {
	readonly selectedBrand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly screwdriverType?: string | undefined;
	readonly screwdriverAliasRu?: string | undefined;
	readonly onPrintPassport: () => void;
	readonly onSaveProtocol: () => void;
}

export const PassportModalFooter: React.FC<PassportModalFooterProps> = ({
	selectedBrand,
	diameterMm,
	lengthMm,
	torqueNcm,
	screwdriverType = "Hex 1.2 mm",
	screwdriverAliasRu = "Шестигранник 1.2 мм",
	onPrintPassport,
	onSaveProtocol,
}) => {
	return (
		<footer className="implant-passport-actions flex items-center justify-between gap-3 p-3 bg-[var(--paper-soft)] border-t border-[var(--line)] shrink-0">
			<div
				className="text-xs text-[var(--muted)] truncate min-w-0 flex-1 hidden sm:flex items-center gap-2"
				title={`${selectedBrand} Ø ${diameterMm} × ${lengthMm} мм · ${torqueNcm} Н·см · ${screwdriverAliasRu}`}
			>
				<span className="font-semibold text-[var(--ink)]">{selectedBrand}</span>
				<span>Ø {diameterMm} × {lengthMm} мм</span>
				<span className="text-[var(--line-strong,#94a3b8)]">|</span>
				<span>{torqueNcm} Н·см</span>
				<span className="text-[var(--line-strong,#94a3b8)]">|</span>
				<span className="inline-flex items-center gap-1">
					<Wrench size={12} className="text-[var(--muted)] shrink-0" />
					<span className="font-mono text-[11px]">{screwdriverType}</span>
				</span>
			</div>

			<div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
				<button
					type="button"
					onClick={onPrintPassport}
					className="secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-[0.98] transition-all"
					data-testid="btn-print-implant-passport-footer"
					title="Распечатать паспорт имплантата с QR-кодом лота и гарантией остеоинтеграции (формат А5)"
				>
					<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="implant-btn-label-desktop">Печать паспорта</span>
					<span className="implant-btn-label-mobile">Печать</span>
				</button>

				<button
					type="button"
					onClick={onSaveProtocol}
					className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer bg-[var(--teal,#0d9488)] text-white hover:bg-[#0f766e] active:scale-[0.98] shadow-sm transition-all"
					data-testid="btn-save-implant-passport"
					title="Зафиксировать протокол имплантации и внести в дневник приёма (без блокировок)"
				>
					<span className="implant-btn-label-desktop">✓ Зафиксировать протокол имплантации</span>
					<span className="implant-btn-label-mobile">✓ Зафиксировать</span>
				</button>
			</div>
		</footer>
	);
};

export default PassportModalFooter;
