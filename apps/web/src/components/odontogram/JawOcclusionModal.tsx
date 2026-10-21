import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, Zap } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { JawOrOcclusionTarget, JawFindingPreset, JawOcclusionModalProps } from "./jawOcclusionTypes";
import { UPPER_JAW_PRESETS, LOWER_JAW_PRESETS, OCCLUSION_PRESETS } from "./jawOcclusionPresets";
import { JawOcclusionHeader } from "./JawOcclusionHeader";
import { JawOcclusionTabs } from "./JawOcclusionTabs";
import { JawOcclusionPresetCard } from "./JawOcclusionPresetCard";

export * from "./jawOcclusionPresets";

export const JawOcclusionModal: React.FC<JawOcclusionModalProps> = ({
	isOpen,
	onClose,
	initialTarget = "JU",
	onApply,
}) => {
	const [activeTab, setActiveTab] = useState<JawOrOcclusionTarget>(initialTarget);
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");
	const [customComment, setCustomComment] = useState<string>("");

	useEffect(() => {
		if (isOpen) {
			setActiveTab(initialTarget);
			setSelectedPresetId("");
			setCustomComment("");
		}
	}, [isOpen, initialTarget]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const currentPresets = activeTab === "JU" ? UPPER_JAW_PRESETS : activeTab === "JL" ? LOWER_JAW_PRESETS : OCCLUSION_PRESETS;
	const targetLabelRu = activeTab === "JU" ? "Верхняя челюсть (JU / Maxilla)" : activeTab === "JL" ? "Нижняя челюсть (JL / Mandibula)" : "Центральное соотношение / Прикус (C)";
	const targetShortTitle = activeTab === "JU" ? "Верхняя челюсть" : activeTab === "JL" ? "Нижняя челюсть" : "Прикус";
	const selectedPreset = currentPresets.find((p) => p.id === selectedPresetId);

	const handleApplyPreset = useCallback((preset: JawFindingPreset) => {
		const fullSoap = customComment.trim() ? `${preset.soapStatusLocalis} Примечание: ${customComment.trim()}.` : preset.soapStatusLocalis;
		try {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					targetCode: activeTab,
					targetNameRu: targetShortTitle,
					title: preset.titleRu,
					soap: { statusLocalis: fullSoap, diagnosis: preset.titleRu, recommendations: preset.recommendedPlanRu || undefined },
					mode: "smart_append",
					immediate: true,
				},
			}));
		} catch { /* Fallback */ }

		onApply?.({
			code: activeTab,
			nameRu: targetShortTitle,
			titleRu: preset.titleRu,
			soapText: fullSoap,
			...(preset.mkb10Code ? { mkb10Code: preset.mkb10Code } : {}),
		});

		showToast(`Зафиксировано: ${targetShortTitle} — ${preset.titleRu}`, preset.isNorm ? "success" : "info");
		onClose();
	}, [activeTab, customComment, onApply, onClose, targetShortTitle]);

	const handle1ClickNorm = useCallback(() => {
		const normPreset = currentPresets.find((p) => p.isNorm) ?? currentPresets[0];
		if (normPreset) handleApplyPreset(normPreset);
	}, [currentPresets, handleApplyPreset]);

	if (!isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-[4px] flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-label={`Диагностика: ${targetLabelRu}`}
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
			data-testid="jaw-occlusion-modal-overlay"
		>
			<div className="w-full max-w-2xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp" onClick={(e) => e.stopPropagation()} data-testid="jaw-occlusion-modal">
				<JawOcclusionHeader targetLabelRu={targetLabelRu} onApplyNorm={handle1ClickNorm} onClose={onClose} />
				<JawOcclusionTabs activeTab={activeTab} onSelectTab={(t) => { setActiveTab(t); setSelectedPresetId(""); }} />

				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
					<div className="text-xs font-black uppercase text-[var(--odontogram-ink-muted,#64748b)] tracking-wider">Выберите клиническое состояние или патологию:</div>
					<div className="flex flex-col gap-2">
						{currentPresets.map((preset) => (
							<JawOcclusionPresetCard key={preset.id} preset={preset} isSelected={selectedPresetId === preset.id} onSelect={setSelectedPresetId} />
						))}
					</div>
					<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--odontogram-border-subtle,#e2e8f0)]">
						<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)]">Дополнительное клиническое примечание к дневнику (опционально):</label>
						<input type="text" value={customComment} onChange={(e) => setCustomComment(e.target.value)} placeholder="Например: умеренная болезненность в ретромолярной области, плотный контакт..." className="w-full min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl border border-[var(--odontogram-border,#cbd5e1)] bg-[var(--odontogram-paper,#ffffff)] text-xs text-[var(--odontogram-ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-indigo-500" data-testid="jaw-modal-custom-comment-input" />
					</div>
				</div>

				<div className="flex items-center justify-between p-4 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
					<button type="button" onClick={onClose} className="min-h-[44px] sm:min-h-[32px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] transition-colors cursor-pointer">Отмена</button>
					<button type="button" onClick={() => {
						const defaultNormPresetId = activeTab === "JU" ? "ju_norm" : activeTab === "JL" ? "jl_norm" : "c_orthognathic";
						const presetToApply = selectedPreset || currentPresets.find((p) => p.id === defaultNormPresetId) || currentPresets.find((p) => p.isNorm) || currentPresets[0];
						if (presetToApply) handleApplyPreset(presetToApply);
					}} className={`min-h-[44px] sm:min-h-[32px] px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${selectedPreset ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`} data-testid="jaw-modal-apply-btn">
						{selectedPreset ? <Check size={14} /> : <Zap size={14} />}
						<span>{selectedPreset ? "Внести в карту" : "Физиологическая норма"}</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") return createPortal(content, document.body);
	return content;
};
