import { CheckCircle2, Syringe } from "lucide-react";
import { useState } from "react";
import { AnesthesiaHeaderRow } from "./anesthesiaQuickBar/AnesthesiaHeaderRow";
import { AnesthesiaPresetsRow } from "./anesthesiaQuickBar/AnesthesiaPresetsRow";
import { AnesthesiaVolumeSelector } from "./anesthesiaQuickBar/AnesthesiaVolumeSelector";
import { createAnesthesiaPresetHandlers } from "./anesthesiaQuickBar/anesthesiaPresetHandlers";
import type { AnesthesiaQuickBarProps } from "./anesthesiaQuickBar/types";
import { useAnesthesiaQuickBar } from "./anesthesiaQuickBar/useAnesthesiaQuickBar";
import "./anesthesia.css";

export { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocolsReception";
export type {
	AnesthesiaPatientMemoParams,
	AnesthesiaQuickBarProps,
} from "./anesthesiaQuickBar/types";
export {
	formatAnesthesiaPatientMemo,
	PRIMARY_ANESTHETIC_DRUGS,
	WEIGHT_PRESETS,
	WEIGHT_QUICK_PRESETS,
} from "./anesthesiaQuickBar/types";

export function AnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const bar = useAnesthesiaQuickBar(props);
	const [lastAppliedText, setLastAppliedText] = useState<string | null>(null);
	const [isAspirationNegative, setIsAspirationNegative] =
		useState<boolean>(true);

	const presets = createAnesthesiaPresetHandlers(
		bar,
		props,
		setLastAppliedText,
	);

	const handleApplyCurrentSelection = () => {
		if (props.disabled) return;
		bar.handleApplyCarpules(bar.selectedCarpulesCount);
		setLastAppliedText(
			`${bar.selectedDrugInfo.tradeNamesRu[0] || "Анестезия"} — ${bar.selectedCarpulesCount} карп.`,
		);
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			<AnesthesiaHeaderRow
				disabled={props.disabled}
				targetToothNumberFdi={props.targetToothNumberFdi}
				patientWeightKg={bar.patientWeightKg}
				hasLidocaineAllergy={props.hasLidocaineAllergy}
				hasArticaineAllergy={props.hasArticaineAllergy}
				hasSulfiteAllergy={props.hasSulfiteAllergy}
				hasBronchialAsthma={props.hasBronchialAsthma}
				isCardioRisk={bar.isCardioRisk}
				techniqueId={bar.techniqueId}
				onSelectTechnique={bar.setTechniqueId}
				onOpenEmergencyProtocol={props.onOpenEmergencyProtocol}
			/>
			<AnesthesiaPresetsRow
				disabled={props.disabled}
				selectedDrugId={bar.selectedDrugId}
				onApplyUltracain200k={presets.handleApplyUltracain200k}
				onApplyUltracainForte={presets.handleApplyUltracainForte}
				onApplyScandonestCardio={presets.handleApplyScandonestCardio}
				onApplyNoAnesthesia={presets.handleApplyNoAnesthesia}
			/>
			<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
				<AnesthesiaVolumeSelector
					disabled={props.disabled}
					selectedCarpulesCount={bar.selectedCarpulesCount}
					onSelectCarpulesCount={bar.setSelectedCarpulesCount}
					isAspirationNegative={isAspirationNegative}
					onToggleAspirationNegative={() => setIsAspirationNegative((v) => !v)}
				/>
				<button
					type="button"
					disabled={props.disabled}
					onClick={handleApplyCurrentSelection}
					className="primary-button inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
					title={`Применить анестезию (${bar.selectedCarpulesCount} карп. в карту)`}
					data-testid="btn-apply-anesthesia-to-card"
				>
					<Syringe size={14} className="shrink-0" />
					<span>Применить анестезию</span>
				</button>
			</div>
			<div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-[var(--muted)]">
				<span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
					<CheckCircle2 size={12} className="shrink-0" />
					<span>Стандартная терапевтическая дозировка — безопасно</span>
				</span>
				{lastAppliedText && (
					<span className="truncate max-w-[400px] text-[var(--ink-secondary)] italic">
						Внесено в протокол: {lastAppliedText}
					</span>
				)}
			</div>
			{bar.activeToastMessage && (
				<div className="anesthesia-quick-toast" role="status">
					<CheckCircle2 size={16} />
					<span>{bar.activeToastMessage}</span>
				</div>
			)}
		</div>
	);
}
