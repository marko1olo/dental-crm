import { Printer, Receipt } from "lucide-react";
import React from "react";

export interface CatalogExpressBarProps {
	onFastPrintPrimaryIntake: () => void;
	onOpenTax: () => void;
}

export function CatalogExpressBar({
	onFastPrintPrimaryIntake,
	onOpenTax,
}: CatalogExpressBarProps): React.JSX.Element {
	return (
		<div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal,#0d9488)]/5 flex-wrap">
			<div className="flex items-center gap-2">
				<span className="font-bold text-xs text-[var(--teal,#0d9488)]">
					Экспресс-оформление пациента:
				</span>
				<span className="text-xs text-[var(--muted,#64748b)]">
					Формирование комплекта для ручной или электронной подписи без лишних
					переходов
				</span>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					data-testid="btn-fast-print-intake-package-1click"
					onClick={onFastPrintPrimaryIntake}
					className="secondary-button inline-flex items-center gap-1.5 min-h-[36px] h-9 px-3.5 rounded-lg border border-[var(--teal,#0d9488)] bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] text-xs font-semibold hover:bg-[var(--teal,#0d9488)]/10 transition-colors cursor-pointer"
					title="Распечатать сразу весь пакет первичного приёма: Договор + ИДС + Согласие на обработку персданных"
				>
					<Printer size={15} className="shrink-0" aria-hidden="true" />
					<span>Печать первичного пакета документов</span>
				</button>
				<button
					type="button"
					data-testid="btn-catalog-open-tax-quick"
					onClick={onOpenTax}
					className="secondary-button inline-flex items-center gap-1.5 min-h-[36px] h-9 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-semibold hover:border-[var(--teal,#0d9488)] transition-colors cursor-pointer"
					title="Справка об оплате медицинских услуг для налогового вычета (13% НДФЛ)"
				>
					<Receipt size={15} className="shrink-0 text-[var(--teal,#0d9488)]" aria-hidden="true" />
					<span>Справка для налогового вычета (13% НДФЛ)</span>
				</button>
			</div>
		</div>
	);
}
