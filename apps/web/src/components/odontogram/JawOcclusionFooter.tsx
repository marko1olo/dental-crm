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
				className="min-h-[44px] sm:min-h-[32px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] transition-colors cursor-pointer"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={handleApply}
				className={`min-h-[44px] sm:min-h-[32px] px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${selectedPreset ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
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
