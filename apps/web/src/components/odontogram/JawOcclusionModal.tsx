import type React from "react";
import { createPortal } from "react-dom";
import { JawOcclusionFooter } from "./JawOcclusionFooter";
import { JawOcclusionHeader } from "./JawOcclusionHeader";
import { JawOcclusionPresetCard } from "./JawOcclusionPresetCard";
import { JawOcclusionTabs } from "./JawOcclusionTabs";
import type { JawOcclusionModalProps } from "./jawOcclusionTypes";
import { useJawOcclusionModalLogic } from "./useJawOcclusionModalLogic";

export * from "./jawOcclusionPresets";

export const JawOcclusionModal: React.FC<JawOcclusionModalProps> = ({
	isOpen,
	onClose,
	initialTarget = "JU",
	onApply,
}) => {
	const logic = useJawOcclusionModalLogic(
		isOpen,
		initialTarget,
		onClose,
		onApply,
	);

	if (!isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-[4px] flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-label={`Диагностика: ${logic.targetLabelRu}`}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="jaw-occlusion-modal-overlay"
		>
			<div
				className="w-full max-w-2xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
				data-testid="jaw-occlusion-modal"
			>
				<JawOcclusionHeader
					targetLabelRu={logic.targetLabelRu}
					onApplyNorm={logic.handle1ClickNorm}
					onClose={onClose}
				/>
				<JawOcclusionTabs
					activeTab={logic.activeTab}
					onSelectTab={(t) => {
						logic.setActiveTab(t);
						logic.setSelectedPresetId("");
					}}
				/>

				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
					<div className="text-xs font-black uppercase text-[var(--odontogram-ink-muted,#64748b)] tracking-wider">
						Выберите клиническое состояние или патологию:
					</div>
					<div className="flex flex-col gap-2">
						{logic.currentPresets.map((preset) => (
							<JawOcclusionPresetCard
								key={preset.id}
								preset={preset}
								isSelected={logic.selectedPresetId === preset.id}
								onSelect={logic.setSelectedPresetId}
							/>
						))}
					</div>
					<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--odontogram-border-subtle,#e2e8f0)]">
						<label
							htmlFor="jaw-modal-custom-comment"
							className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)]"
						>
							Дополнительное клиническое примечание к дневнику (опционально):
						</label>
						<input
							id="jaw-modal-custom-comment"
							type="text"
							value={logic.customComment}
							onChange={(e) => logic.setCustomComment(e.target.value)}
							placeholder="Например: умеренная болезненность в ретромолярной области, плотный контакт..."
							className="w-full min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl border border-[var(--odontogram-border,#cbd5e1)] bg-[var(--odontogram-paper,#ffffff)] text-xs text-[var(--odontogram-ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
							data-testid="jaw-modal-custom-comment-input"
						/>
					</div>
				</div>

				<JawOcclusionFooter
					onClose={onClose}
					selectedPreset={logic.selectedPreset}
					activeTab={logic.activeTab}
					currentPresets={logic.currentPresets}
					onApplyPreset={logic.handleApplyPreset}
				/>
			</div>
		</div>
	);

	if (typeof document !== "undefined")
		return createPortal(content, document.body);
	return content;
};
