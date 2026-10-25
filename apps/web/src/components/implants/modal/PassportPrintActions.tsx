/**
 * PassportPrintActions.tsx — Панель действий печати гарантийного паспорта и фиксации протокола (Мандаты 8am, 8e).
 * Ровно 1 Primary CTA, 36px на десктопе, >= 44px на мобильных устройствах, четкие рамки и паддинги.
 */
import React from "react";
import { CheckCircle2, Printer, Wrench } from "lucide-react";

export interface PassportPrintActionsProps {
	readonly brand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly screwdriverType?: string | undefined;
	readonly onPrint: () => void;
	readonly onSave: () => void;
	readonly className?: string | undefined;
}

export const PassportPrintActions: React.FC<PassportPrintActionsProps> = ({
	brand,
	diameterMm,
	lengthMm,
	torqueNcm,
	screwdriverType,
	onPrint,
	onSave,
	className = "",
}) => {
	return (
		<footer
			className={`implant-passport-actions flex items-center justify-between gap-3 p-3 bg-[var(--paper-soft)] border-t border-[var(--line)] ${className}`.trim()}
		>
			<div
				className="text-xs text-[var(--muted)] truncate min-w-0 flex-1 hidden sm:flex items-center gap-2"
				title={`${brand} Ø ${diameterMm} × ${lengthMm} мм · ${torqueNcm} Н·см${screwdriverType ? ` · ${screwdriverType}` : ""}`}
			>
				<span className="font-semibold text-[var(--ink)]">{brand}</span>
				<span>Ø {diameterMm} × {lengthMm} мм</span>
				<span className="text-[var(--line-strong,#94a3b8)]">|</span>
				<span>{torqueNcm} Н·см</span>
				{screwdriverType && (
					<>
						<span className="text-[var(--line-strong,#94a3b8)]">|</span>
						<span className="inline-flex items-center gap-1">
							<Wrench size={12} className="text-[var(--muted)] shrink-0" />
							<span className="font-mono text-[11px]">{screwdriverType}</span>
						</span>
					</>
				)}
			</div>

			<div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
				<button
					type="button"
					onClick={onPrint}
					className="secondary-button min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
					data-testid="btn-print-implant-passport-footer implant-print-passport-btn"
					title="Распечатать паспорт имплантата с QR-кодом лота и гарантией остеоинтеграции"
				>
					<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="hidden sm:inline">Печать паспорта</span>
					<span className="sm:hidden">Печать</span>
				</button>

				<button
					type="button"
					onClick={onSave}
					className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer"
					data-testid="btn-save-implant-passport btn-passport-insert-diary implant-save-passport-btn implant-insert-diary-btn"
					title="Зафиксировать протокол имплантации и внести в дневник приёма (без блокировок)"
				>
					<CheckCircle2 size={16} className="shrink-0" />
					<span className="hidden sm:inline">✓ Зафиксировать протокол имплантации</span>
					<span className="sm:hidden">✓ Зафиксировать</span>
				</button>
			</div>
		</footer>
	);
};

export default PassportPrintActions;
