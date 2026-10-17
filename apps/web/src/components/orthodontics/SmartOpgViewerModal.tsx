import React, { useState, useEffect, useCallback } from "react";
import { opgAiInferenceService, type OpgAiInferenceResponse } from "./opgAiInferenceService";
import { showToast } from "../GlobalToast";
import {
	type SmartOpgViewerModalProps, SmartOpgHeader, SmartOpgMobileTabs,
	SmartOpgToolbar, SmartOpgViewport, SmartOpgDetails, SmartOpgFooter,
} from "./smartOpgModal";

export type { SmartOpgViewerModalProps };

export const SmartOpgViewerModal: React.FC<SmartOpgViewerModalProps> = ({
	isOpen, onClose, imageUrl, onApplyOdontogram, patientName = "Темур",
}) => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [result, setResult] = useState<OpgAiInferenceResponse | null>(null);
	const [showFdiLabels, setShowFdiLabels] = useState<boolean>(true);
	const [showPathologies, setShowPathologies] = useState<boolean>(true);
	const [isPatientMode, setIsPatientMode] = useState<boolean>(false);
	const [zoom, setZoom] = useState<number>(1.0);
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
	const [isApplied, setIsApplied] = useState<boolean>(false);
	const [mobileTab, setMobileTab] = useState<"image" | "details">("image");
	const activeImage = imageUrl || "/models/sample_opg_temur.png";

	useEffect(() => {
		if (!isOpen) return;
		let isCancelled = false;
		setIsLoading(true); setIsApplied(false);
		opgAiInferenceService.runInference(activeImage, { allowFallback: true })
			.then((res) => { if (!isCancelled) { setResult(res); setIsLoading(false); } })
			.catch(() => { if (!isCancelled) setIsLoading(false); });
		return () => { isCancelled = true; };
	}, [isOpen, activeImage]);

	const handleApply = useCallback(() => {
		if (isLoading) { showToast("Выполняется анализ панорамного снимка нейросетью...", "info"); return; }
		if (!result) { showToast("Снимок не загружен или анализ недоступен", "warning"); return; }
		if (onApplyOdontogram) {
			onApplyOdontogram(result.analysis.teeth);
			setIsApplied(true); setTimeout(() => setIsApplied(false), 2500);
		}
	}, [isLoading, result, onApplyOdontogram]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6" role="dialog" aria-modal="true" data-testid="smart-opg-viewer-modal">
			<div className="relative flex flex-col w-full max-w-7xl h-[94vh] max-h-[950px] bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden text-[var(--ink)]">
				<SmartOpgHeader patientName={patientName} backendLabel={result?.backendLabel} onClose={onClose} />
				<SmartOpgMobileTabs mobileTab={mobileTab} onSelectTab={setMobileTab} />
				<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
					<div className={`flex-1 relative flex flex-col bg-black/90 overflow-hidden ${mobileTab === "image" ? "flex" : "hidden lg:flex"}`}>
						<SmartOpgToolbar
							showFdiLabels={showFdiLabels} onToggleFdiLabels={() => setShowFdiLabels((p) => !p)}
							showPathologies={showPathologies} onTogglePathologies={() => setShowPathologies((p) => !p)}
							isPatientMode={isPatientMode} onTogglePatientMode={() => setIsPatientMode((p) => !p)}
							onZoomIn={() => setZoom((z) => Math.min(2.0, z + 0.15))}
							onZoomOut={() => setZoom((z) => Math.max(0.7, z - 0.15))}
							onResetZoom={() => setZoom(1.0)}
						/>
						<SmartOpgViewport
							isLoading={isLoading} activeImage={activeImage} zoom={zoom} analysis={result?.analysis}
							selectedTooth={selectedTooth} onSelectTooth={setSelectedTooth} showFdiLabels={showFdiLabels}
							showPathologies={showPathologies} isPatientMode={isPatientMode}
						/>
						<SmartOpgFooter variant="mobile" isApplied={isApplied} onApply={handleApply} onSwitchToDetails={() => setMobileTab("details")} />
					</div>
					<aside className={`w-full lg:w-96 bg-[var(--paper-soft)] border-t lg:border-t-0 lg:border-l border-[var(--line)] flex flex-col shrink-0 min-h-0 ${mobileTab === "details" ? "flex flex-1" : "hidden lg:flex"}`}>
						<SmartOpgDetails analysis={result?.analysis} selectedTooth={selectedTooth} />
						<SmartOpgFooter variant="desktop" isApplied={isApplied} onApply={handleApply} />
					</aside>
				</div>
			</div>
		</div>
	);
};
