import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { DentalSyringe } from '../../icons/DentalIcons';
import { AnesthesiaSegmentedDoseButtons } from './AnesthesiaSegmentedDoseButtons';

export interface AnesthesiaExpressPresetsProps {
	disabled: boolean;
	selectedCarpulesCount?: number | undefined;
	onApplyCarpules: (count: number) => void;
	onApplyInfiltrationArticaine200k?: (() => void) | undefined;
	onApplyMandibularArticaine100k?: (() => void) | undefined;
	onApplyStandardNormPreset?: (() => void) | undefined;
	onApplyUltracainForteCombined?: (() => void) | undefined;
	onApplyScandonestCardio?: (() => void) | undefined;
	onWriteoffAntishockKit?: (() => void) | undefined;
	onOpenEmergencyProtocol?: (() => void) | undefined;
	onNurseQuickDisposal: (count: number) => void;
}

const PRESET_BTN_CLASS =
	"inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-8.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-xs font-bold text-[var(--ink)] transition-all shadow-2xs touch-manipulation cursor-pointer active:scale-98 shrink-0 whitespace-nowrap";

export function AnesthesiaExpressPresets({
	disabled,
	selectedCarpulesCount = 1.0,
	onApplyCarpules,
	onApplyInfiltrationArticaine200k,
	onApplyMandibularArticaine100k,
	onApplyStandardNormPreset,
	onApplyUltracainForteCombined,
	onApplyScandonestCardio,
	onWriteoffAntishockKit,
	onOpenEmergencyProtocol,
	onNurseQuickDisposal,
}: AnesthesiaExpressPresetsProps) {
	return (
		<>
			{/* Preset 1: Инфильтрационная Артикаин 1:200 000 */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyInfiltrationArticaine200k || onApplyStandardNormPreset}
				className={PRESET_BTN_CLASS}
				title="Инфильтрационная: Артикаин 4% 1:200 000 (1 карпула 1.7 мл), щадящий адреналин"
				data-testid="anesthesia-preset-infiltration-articaine-200k"
			>
				<CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Инфильтрация 1:200k (1.7 мл)</span>
			</button>
			{/* Preset 2: Проводниковая (Мандибулярная) Артикаин 1:100 000 */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyMandibularArticaine100k || onApplyUltracainForteCombined}
				className={PRESET_BTN_CLASS}
				title="Проводниковая (Мандибулярная): Артикаин 4% 1:100 000 (1 карпула 1.7 мл)"
				data-testid="anesthesia-preset-mandibular-articaine-100k"
			>
				<CheckCircle2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Мандибулярная 1:100k (1.7 мл)</span>
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
				<CheckCircle2 size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
				<span>Скандонест 3% (без адреналина)</span>
			</button>
			{/* Preset 4: Экстренная укладка «🚨 АНТИШОК» */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => { onWriteoffAntishockKit?.(); onOpenEmergencyProtocol?.(); }}
				className="inline-flex items-center gap-1.5 border border-rose-500/60 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-black rounded-lg px-2.5 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-8.5 text-xs transition-all shadow-2xs touch-manipulation cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
				title="Экстренная помощь: списание набора первой помощи и открытие протокола 112"
				data-testid="anesthesia-btn-antishock-emergency"
			>
				<AlertTriangle size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
				<span>АНТИШОК</span>
			</button>
			{/* Backward Compatibility Preset: Норма Артикаин 1:100k */}
			<button
				type="button"
				disabled={disabled}
				onClick={onApplyStandardNormPreset}
				className={PRESET_BTN_CLASS}
				title="Норма: Артикаин 4% 1:100 000 (1.7 мл), аспирация (-), аллергий нет"
				data-testid="anesthesia-dose-norm-preset"
			>
				<DentalSyringe size={13} className="text-blue-500 dark:text-blue-300 shrink-0" />
				<span>Норма: Артикаин 1:100k</span>
			</button>
			<AnesthesiaSegmentedDoseButtons
				disabled={disabled}
				selectedCarpulesCount={selectedCarpulesCount}
				onApplyCarpules={onApplyCarpules}
			/>
			{/* Nurse Quick Disposal */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => onNurseQuickDisposal(1.0)}
				className={PRESET_BTN_CLASS}
				title="Списать пустые карпулы анестетика по FEFO (расход сверх остатка)"
				data-testid="nurse-quick-carpule-disposal"
			>
				<Trash2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Списать карпулу (FEFO)</span>
			</button>
		</>
	);
}
