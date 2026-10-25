/**
 * apps/web/src/components/settings/DoctorCbctSettingsModal.tsx
 *
 * Lightweight interactive CBCT parameter tuner modal for doctor personal defaults.
 * Layer 5: Canonical Facade & Orchestrator strictly <= 80 lines following Mandate 8b.
 */

import React, { useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { DoctorCbctDefaultSettings } from "../radiology/cbctLutMath";
import { DoctorCbctModalFooter } from "./cbct/DoctorCbctModalFooter";
import { DoctorCbctModalHeader } from "./cbct/DoctorCbctModalHeader";
import { DoctorCbctPreviewCanvas } from "./cbct/DoctorCbctPreviewCanvas";
import { DoctorCbctSlidersColumn } from "./cbct/DoctorCbctSlidersColumn";
import { useDoctorCbctModalState } from "./cbct/useDoctorCbctModalState";
import "../radiology/tuner/cbctTunerStyles.css";

export interface DoctorCbctSettingsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaved?: (settings: DoctorCbctDefaultSettings) => void;
}

export function DoctorCbctSettingsModal({ isOpen, onClose, onSaved }: DoctorCbctSettingsModalProps) {
	const titleId = useId();
	const modalRef = useRef<HTMLDivElement>(null);
	const s = useDoctorCbctModalState(isOpen, onClose, onSaved);

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 cbct-dark-cockpit" data-cbct-cockpit="true" data-theme="dark" style={{ colorScheme: "dark" }} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={modalRef}>
			<div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#090d16] text-slate-100 border border-slate-700/80 shadow-2xl overflow-hidden cbct-dark-cockpit" data-cbct-cockpit="true">
				<DoctorCbctModalHeader titleId={titleId} isCanonical={s.isCanonical} onClose={onClose} />
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
					<DoctorCbctPreviewCanvas
						previewTab={s.previewTab}
						onSelectTab={s.setPreviewTab}
						volume={s.volume}
						isLoading={s.isLoading}
						loadStatus={s.loadStatus}
						axialCanvasRef={s.axialCanvasRef}
						panoCanvasRef={s.panoCanvasRef}
						onAxialWheel={s.handleAxialWheel}
						sliceZIndex={s.sliceZIndex}
						onSliceZChange={s.setSliceZIndex}
						mprThicknessMm={s.mprThicknessMm}
						panoThicknessMm={s.panoThicknessMm}
						onApplyPreset={(ww, wl, g, air) => { s.setWindowWidth(ww); s.setWindowLevel(wl); s.setGamma(g); s.setAirCutoffHU(air); }}
					/>
					<DoctorCbctSlidersColumn
						windowWidth={s.windowWidth}
						onWindowWidthChange={s.setWindowWidth}
						windowLevel={s.windowLevel}
						onWindowLevelChange={s.setWindowLevel}
						gamma={s.gamma}
						onGammaChange={s.setGamma}
						airCutoffHU={s.airCutoffHU}
						onAirCutoffChange={s.setAirCutoffHU}
						mprThicknessMm={s.mprThicknessMm}
						onMprThicknessChange={s.setMprThicknessMm}
						panoThicknessMm={s.panoThicknessMm}
						onPanoThicknessChange={s.setPanoThicknessMm}
					/>
				</div>
				<DoctorCbctModalFooter onResetCanonical={s.handleResetCanonical} onClose={onClose} onSaveDefaults={s.handleSaveDefaults} />
			</div>
		</div>,
		document.body,
	);
}

export default DoctorCbctSettingsModal;
