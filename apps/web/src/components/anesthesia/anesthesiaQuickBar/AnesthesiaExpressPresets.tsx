import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnesthesiaSegmentedDoseButtons } from './AnesthesiaSegmentedDoseButtons';

export interface AnesthesiaExpressPresetsProps {
	disabled: boolean;
	selectedCarpulesCount?: number | undefined;
	onApplyCarpules: (count: number) => void;
	onApplyUbistesinForte?: (() => void) | undefined;
	onApplyUbistesin?: (() => void) | undefined;
	onApplyInfiltrationArticaine200k?: (() => void) | undefined;
	onApplyMandibularArticaine100k?: (() => void) | undefined;
	onApplyStandardNormPreset?: (() => void) | undefined;
	onApplyUltracainForteCombined?: (() => void) | undefined;
	onApplyScandonestCardio?: (() => void) | undefined;
	onApplySeptanestInfiltration?: (() => void) | undefined;
	onWriteoffAntishockKit?: (() => void) | undefined;
	onOpenEmergencyProtocol?: (() => void) | undefined;
}

const PRESET_BTN_CLASS =
	"secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-xs font-semibold text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98 shrink-0 whitespace-nowrap";

/**
 * AnesthesiaExpressPresets — Miller's Law 3 Rapid Presets (1 Click)
 * 1. Ultracain D-S Forte 1:100 000 | 2. Ultracain D-S 1:200 000 | 3. Scandonest Plain
 */
export function AnesthesiaExpressPresets({
	disabled,
	selectedCarpulesCount = 1.0,
	onApplyCarpules,
	onApplyUbistesinForte,
	onApplyUbistesin,
	onApplyInfiltrationArticaine200k,
	onApplyMandibularArticaine100k,
	onApplyStandardNormPreset,
	onApplyUltracainForteCombined,
	onApplyScandonestCardio,
	onWriteoffAntishockKit,
	onOpenEmergencyProtocol,
}: AnesthesiaExpressPresetsProps) {
	return (
		<>
			{/* Preset 1: Ультракаин Д-С Форте 1:100 000 (1.7 мл) */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyUltracainForteCombined || onApplyUbistesinForte || onApplyStandardNormPreset}
				className={PRESET_BTN_CLASS}
				title="Норма: Артикаин 1:100k — Ультракаин Д-С Форте 1:100 000 (1 карпула 1.7 мл)"
				data-testid="anesthesia-dose-norm-preset"
			>
				<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Ультракаин Д-С Форте 1:100 000</span>
			</button>

			{/* Preset 2: Ультракаин Д-С 1:200 000 (1.7 мл) */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyInfiltrationArticaine200k || onApplyUbistesin}
				className={PRESET_BTN_CLASS}
				title="Щадящий адреналин: Артикаин 4% 1:200 000 — Ультракаин Д-С (1 карпула 1.7 мл)"
				data-testid="anesthesia-preset-infiltration-articaine-200k"
			>
				<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Ультракаин Д-С 1:200 000</span>
			</button>

			{/* Preset 3: Скандонест без адреналина (1.7 мл) */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyScandonestCardio}
				className={PRESET_BTN_CLASS}
				title="Кардио-защита: Мепивакаин 3% — Скандонест без адреналина (1 карпула 1.7 мл)"
				data-testid="anesthesia-preset-scandonest-cardio"
			>
				<CheckCircle2 size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
				<span>Скандонест без адреналина</span>
			</button>

			{/* Preset 4: Экстренная укладка «🚨 АНТИШОК» */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => { onWriteoffAntishockKit?.(); onOpenEmergencyProtocol?.(); }}
				className="inline-flex items-center gap-1.5 border border-rose-500/60 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold rounded-xl px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 text-xs transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
				title="Экстренная помощь: протокол первой помощи и шок (112)"
				data-testid="anesthesia-btn-antishock-emergency"
			>
				<AlertTriangle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
				<span>АНТИШОК</span>
			</button>

			{/* 1 карпула / 2 карпулы segmented selector */}
			<AnesthesiaSegmentedDoseButtons
				disabled={disabled}
				selectedCarpulesCount={selectedCarpulesCount}
				onApplyCarpules={onApplyCarpules}
			/>
		</>
	);
}
