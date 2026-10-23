/**
 * PerioExpressHeader.tsx — Шапка экспресс-скрининга пародонта (электронный зонд, перенос в карту).
 * Архитектурный слой Layer 4: Express Header (Мандат 8b, <= 120 строк).
 */

import { Check, ChevronDown, ChevronUp, FileText } from "lucide-react";
import React from "react";
import { PerioProbe } from "../../icons/DentalIcons";

export interface PerioExpressHeaderProps {
	readonly readOnly?: boolean | undefined;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
	readonly insertStatus: boolean;
	readonly onInsertToProtocol: () => void;
	readonly isTier3ProbingExpanded: boolean;
	readonly onToggleTier3Probing: () => void;
}

export const PerioExpressHeader: React.FC<PerioExpressHeaderProps> = React.memo(({
	readOnly = false,
	isProbeKeyboardEnabled,
	onToggleProbeKeyboard,
	insertStatus,
	onInsertToProtocol,
	isTier3ProbingExpanded,
	onToggleTier3Probing,
}) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-teal-500/20">
			<div className="flex items-center gap-2 min-w-0">
				<PerioProbe size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<h4 className="text-sm font-black text-teal-900 dark:text-teal-300 truncate">
					Экспресс-скрининг пародонта PSR / CPITN (ВОЗ / СтАР) и клинические протоколы
				</h4>
			</div>

			<div className="flex items-center gap-2.5 flex-wrap">
				<label
					className="flex items-center gap-2 cursor-pointer select-none text-[12px] font-semibold px-2.5 h-8 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]/60 transition-colors"
					title="Включить перехват Numpad и клавиш электронного зонда (по умолчанию выключен)"
				>
					<input
						type="checkbox"
						checked={isProbeKeyboardEnabled}
						onChange={(e) => onToggleProbeKeyboard(e.target.checked)}
						className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-500"
						data-testid="perio-probe-keyboard-toggle"
					/>
					<span className="text-[12px]">Режим электронного зонда / Numpad</span>
				</label>

				{!readOnly && (
					<button
						type="button"
						onClick={onInsertToProtocol}
						className="secondary-button !min-h-[32px] !h-8 !px-3 text-xs shrink-0"
						title="Внести текущее заключение пародонтограммы в дневник приёма"
						data-testid="perio-express-insert-043-btn"
					>
						{insertStatus ? <Check size={14} className="text-emerald-500" /> : <FileText size={14} className="text-teal-600 dark:text-teal-400" />}
						<span>{insertStatus ? "Внесено в дневник!" : "Внести в дневник"}</span>
					</button>
				)}

				<button
					type="button"
					onClick={onToggleTier3Probing}
					className="secondary-button !min-h-[32px] !h-8 !px-3 text-xs shrink-0"
					data-testid="perio-tier3-toggle-header-btn"
				>
					<span>{isTier3ProbingExpanded ? "Скрыть детальные точки" : "6 точек на зуб (по требованию)"}</span>
					{isTier3ProbingExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
				</button>
			</div>
		</div>
	);
});

PerioExpressHeader.displayName = "PerioExpressHeader";
