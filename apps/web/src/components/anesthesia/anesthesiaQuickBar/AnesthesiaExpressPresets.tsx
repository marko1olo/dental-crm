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
	onNurseQuickDisposal?: ((count: number) => void) | undefined;
}

const PRESET_BTN_CLASS =
	"secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-xs font-semibold text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98 shrink-0 whitespace-nowrap";

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
	onApplySeptanestInfiltration,
	onWriteoffAntishockKit,
	onOpenEmergencyProtocol,
}: AnesthesiaExpressPresetsProps) {
	return (
		<>
			{/* Preset 1: Убистезин форте (1.7 мл) — Артикаин 1:100 000 */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyUbistesinForte || onApplyStandardNormPreset || onApplyUltracainForteCombined}
				className={PRESET_BTN_CLASS}
				title="Норма: Артикаин 1:100k — Убистезин форте 1:100 000 (1 карпула 1.7 мл), глубокая анестезия"
				data-testid="anesthesia-dose-norm-preset"
			>
				<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Убистезин форте (1.7 мл)</span>
			</button>

			{/* Preset 2: Убистезин (1.7 мл) — Артикаин 1:200 000 */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyUbistesin || onApplyInfiltrationArticaine200k}
				className={PRESET_BTN_CLASS}
				title="Убистезин: Артикаин 4% 1:200 000 (1 карпула 1.7 мл), щадящий адреналин"
				data-testid="anesthesia-preset-infiltration-articaine-200k"
			>
				<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Убистезин (1.7 мл)</span>
			</button>

			{/* Preset 3: Скандонест 3% (без адреналина) */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyScandonestCardio}
				className={PRESET_BTN_CLASS}
				title="Кардио-защита: Мепивакаин 3% (Скандонест 3% без адреналина, 1.7 мл)"
				data-testid="anesthesia-preset-scandonest-cardio"
			>
				<CheckCircle2 size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
				<span>Скандонест 3% (без адреналина)</span>
			</button>

			{/* Preset 4: Септанест */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplySeptanestInfiltration || onApplyMandibularArticaine100k}
				className={PRESET_BTN_CLASS}
				title="Септанест: Артикаин 4% с адреналином 1:100 000 (1 карпула 1.7 мл)"
				data-testid="anesthesia-preset-mandibular-articaine-100k"
			>
				<CheckCircle2 size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
				<span>Септанест</span>
			</button>

			{/* Preset 5: Экстренная укладка «🚨 АНТИШОК» */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => { onWriteoffAntishockKit?.(); onOpenEmergencyProtocol?.(); }}
				className="inline-flex items-center gap-1.5 border border-rose-500/60 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold rounded-lg px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 text-xs transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
				title="Экстренная помощь: списание набора первой помощи и открытие протокола 112"
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
