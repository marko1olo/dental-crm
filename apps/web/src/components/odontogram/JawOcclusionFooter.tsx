import type React from "react";
import { Check, Zap } from "lucide-react";
import type {
	JawFindingPreset,
	JawOrOcclusionTarget,
} from "./jawOcclusionTypes";

export interface JawOcclusionFooterProps {
	readonly onClose: () => void;
	readonly selectedPreset: JawFindingPreset | undefined;
	readonly activeTab: JawOrOcclusionTarget;
	readonly currentPresets: readonly JawFindingPreset[];
	readonly onApplyPreset: (preset: JawFindingPreset) => void;
}

export const JawOcclusionFooter: React.FC<JawOcclusionFooterProps> = ({
	onClose,
	selectedPreset,
	activeTab,
	currentPresets,
	onApplyPreset,
}) => {
	const handleApply = () => {
		const defaultNormPresetId =
			activeTab === "JU"
				? "ju_norm"
				: activeTab === "JL"
					? "jl_norm"
					: "c_orthognathic";
		const presetToApply =
			selectedPreset ||
			currentPresets.find((p) => p.id === defaultNormPresetId) ||
			currentPresets.find((p) => p.isNorm) ||
			currentPresets[0];
		if (presetToApply) onApplyPreset(presetToApply);
	};

	return (
		<div className="flex items-center justify-between p-4 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ink-muted,#64748b)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={handleApply}
				className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-dark,#0f766e)]"
				data-testid="jaw-modal-apply-btn"
			>
				{selectedPreset ? <Check size={14} /> : <Zap size={14} />}
				<span>
					{selectedPreset ? "Внести в карту" : "Физиологическая норма"}
				</span>
			</button>
		</div>
	);
};
