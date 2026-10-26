/**
 * DocumentCameraScannerModal.tsx
 *
 * Clean root facade modal for live document scanning, aspect-ratio framing,
 * and direct attachment upload to patient medical records.
 */

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { ScannerAttachmentActions } from "./cameraModal/ScannerAttachmentActions";
import { ScannerCameraViewport } from "./cameraModal/ScannerCameraViewport";
import { renderPresetIcon, ScannerDocumentPresets } from "./cameraModal/ScannerDocumentPresets";
import { ScannerImageControls } from "./cameraModal/ScannerImageControls";
import { useScannerModalState } from "./cameraModal/useScannerModalState";

export interface DocumentCameraScannerModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly onClose: () => void;
	readonly onAttachmentUploaded?: () => void;
}

export const DocumentCameraScannerModal: React.FC<DocumentCameraScannerModalProps> = ({
	isOpen, patientId, patientName, onClose, onAttachmentUploaded,
}) => {
	const m = useScannerModalState(isOpen, patientId, onClose, onAttachmentUploaded);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") m.handleModalClose(); };
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, m]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
			data-testid="document-camera-scanner-modal" role="dialog" aria-modal="true" aria-label="Сканирование документов"
			onClick={(e) => { if (e.target === e.currentTarget) m.handleModalClose(); }}
		>
			<div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl overflow-hidden">
				<div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2.5">
						<span className="flex items-center justify-center text-[var(--teal)] shrink-0" aria-hidden="true">
							{renderPresetIcon(m.preset.icon, 20)}
						</span>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)]">Сканирование документов · {m.preset.shortTitle}</h3>
							<p className="text-xs text-[var(--muted)]">{patientName ? `Пациент: ${patientName}` : "Прикрепление к электронной медкарте"}</p>
						</div>
					</div>
					<button type="button" onClick={m.handleModalClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer" aria-label="Закрыть сканер">
						<X size={20} />
					</button>
				</div>
				<ScannerDocumentPresets selectedDocType={m.selectedDocType} onSelectDocType={m.setSelectedDocType} availableCameras={m.availableCameras} selectedCameraId={m.selectedCameraId} onSelectCameraId={m.setSelectedCameraId} />
				<ScannerCameraViewport videoRef={m.videoRef} canvasRef={m.canvasRef} fileInputRef={m.fileInputRef} isCapturing={m.isCapturing} cameraError={m.cameraError} preset={m.preset} capturedDataUrl={m.capturedDataUrl} capturedBlob={m.capturedBlob} isDragOver={m.isDragOver} onDragOver={(e) => { e.preventDefault(); m.setIsDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); m.setIsDragOver(false); }} onDrop={(e) => { e.preventDefault(); m.setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) m.processFile(f); }} onFileChange={m.handleFileChange} />
				<ScannerImageControls filterMode={m.filterMode} onFilterChange={m.setFilterMode} ocrSummary={m.ocrSummary} />
				<ScannerAttachmentActions isCapturing={m.isCapturing} cameraError={m.cameraError} rotationDeg={m.rotationDeg} isUploading={m.isUploading} onCapture={m.handleCapture} onRetake={m.handleRetake} onRotate={m.handleRotate} onOpenFile={() => m.fileInputRef.current?.click()} onSaveAttachment={() => void m.handleSaveAttachment()} />
			</div>
		</div>
	);
};
export default DocumentCameraScannerModal;
