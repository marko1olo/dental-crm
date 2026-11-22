/**
 * SurgeryHubFooter.tsx — Подвал хирургического хаба у кресла (DENTE CRM).
 * Ровно 1 Primary CTA кнопка (Мандат 8d/8al/8am), телеметрия и печать.
 */

import React from "react";
import { Printer } from "lucide-react";
import type { SurgeryScenarioConfig } from "../surgeryCatalogData";

export interface SurgeryHubFooterProps {
	readonly scenarioConfig: SurgeryScenarioConfig;
	readonly selectedTeeth: readonly number[];
	readonly toothFdi: number;
	readonly onPrint: () => void;
	readonly onSave: () => void;
}

export const SurgeryHubFooter: React.FC<SurgeryHubFooterProps> = ({
	scenarioConfig,
	selectedTeeth,
	toothFdi,
	onPrint,
	onSave,
}) => {
	const teethCount = selectedTeeth.length || 1;
	const teethLabel = selectedTeeth.length > 1 ? selectedTeeth.join(", #") : String(toothFdi);
	const totalPriceFormatted = (scenarioConfig.defaultPriceRub * teethCount).toLocaleString("ru-RU");

	return (
		<footer className="surgery-hub-footer">
			<div className="surgery-hub-footer-telemetry text-xs text-[var(--muted)] min-w-0 flex-1 hidden sm:flex items-center gap-2 flex-wrap">
				<span className="font-semibold text-[var(--ink)]">
					{scenarioConfig.titleRu} #{teethLabel}
				</span>
				<span>|</span>
				<span>{totalPriceFormatted} ₽</span>
				<span>|</span>
				<span className="text-[var(--primary)] font-medium">Протокол готов к записи</span>
			</div>
			<div className="surgery-hub-footer-buttons flex items-center gap-2.5 w-full sm:w-auto justify-end">
				<button
					type="button"
					onClick={onPrint}
					className="secondary-btn min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center gap-1.5"
					data-testid="btn-print-surgery-hub-footer"
				>
					<Printer size={15} className="shrink-0" />
					<span className="hidden sm:inline">Печать документа</span>
					<span className="sm:hidden">Печать</span>
				</button>
				{/* СТРОГО ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 */}
				<button
					type="button"
					onClick={onSave}
					className="surgery-primary-cta"
					data-testid="btn-save-chairside-surgery"
				>
					<span className="hidden sm:inline">✓ Зафиксировать операцию и внести в карту приёма &gt;</span>
					<span className="sm:hidden">✓ Зафиксировать операцию &gt;</span>
				</button>
			</div>
		</footer>
	);
};
