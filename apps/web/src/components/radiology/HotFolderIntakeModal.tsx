import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { FolderSync, Wifi, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { HotFolderIntakeModalProps } from "./hotFolderTypes";
import { HotFolderImageCanvas } from "./HotFolderImageCanvas";
import {
	HotFolderDirectoryConfig, HotFolderIncomingQueueList,
	HotFolderIntakeFooterActions, HotFolderPatientMatcher, useHotFolderIntakeLogic,
} from "./hotFolderIntake";
if (typeof document !== "undefined") { import("./hotFolderIntake.css"); }

export * from "./hotFolderTypes";
export * from "./hotFolderIntake";

export const HotFolderIntakeModal: React.FC<HotFolderIntakeModalProps> = ({
	isOpen, onClose, patientId = "PAT-001", patientName = "Пациент",
	patientCardNumber = "043/у-2026/891", doctorName = "Лечащий врач",
	activeToothFdi, onAttachToEmr, onExportDicom, onSendToLab,
}) => {
	const modalId = useId();
	const [flipV, setFlipV] = useState<boolean>(false);
	const logic = useHotFolderIntakeLogic({
		patientId, patientName, patientCardNumber, doctorName, activeToothFdi, flipV, setFlipV, onAttachToEmr,
	});

	useEffect(() => {
		if (!isOpen) return;
		const handlePaste = (e: ClipboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			const items = e.clipboardData?.items;
			if (!items) return;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item && item.kind === "file") {
					const file = item.getAsFile();
					if (file) {
						e.preventDefault();
						logic.handleDropFile(file);
						showToast("Снимок успешно вставлен из буфера обмена (Ctrl+V)", "success");
						break;
					}
				}
			}
		};
		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [isOpen, logic.handleDropFile]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="hfi-modal-overlay" role="dialog" aria-modal="true" aria-labelledby={`${modalId}-title`}
			data-testid="hotfolder-intake-modal-overlay" onMouseMove={logic.handleMouseMoveCanvas} onMouseUp={logic.handleMouseUpCanvas}
		>
			<div className="hfi-modal-shell" data-testid="hotfolder-intake-modal">
				<header className="hfi-modal-header">
					<div className="hfi-header-left">
						<div className="hfi-header-icon-box"><FolderSync className="w-5 h-5" /></div>
						<div className="hfi-header-info">
							<div className="hfi-header-title-row">
								<h2 id={`${modalId}-title`} className="hfi-header-title">Папка автозахвата снимков (радиовизиография и ОПТГ)</h2>
								<span className="hfi-header-badge" title="Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB" data-testid="hfi-non-conflicting-badge">
									<Wifi className="w-3 h-3 text-emerald-400" />
									<span>Бесконфликтный автозахват (EzDent-i / Romexis)</span>
								</span>
							</div>
							<p className="hfi-header-subtitle">
								<span>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></span> · <span>Медкарта: <strong className="text-[var(--ink)]">{patientCardNumber}</strong></span> · <span>Врач: {doctorName}</span>
							</p>
						</div>
					</div>
					<div className="hfi-header-actions">
						<button type="button" onClick={onClose} className="hfi-close-btn" data-testid="hfi-close-modal-btn" aria-label="Закрыть модальное окно">
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				<div className="hfi-modal-body">
					<aside className="hfi-left-panel">
						<HotFolderDirectoryConfig
							filteredItemsCount={logic.filteredItems.length} totalItemsCount={logic.hotFolderItems.length} activeSourceFilter={logic.activeSourceFilter}
							isScanning={logic.isScanning} onSourceFilterChange={logic.setActiveSourceFilter} onRescanFolder={logic.handleRescanFolder} freshCount={logic.filteredItems.filter((i) => i.isFresh).length}
						/>
						<HotFolderIncomingQueueList items={logic.filteredItems} activeItemId={logic.activeItem?.id} onSelectItem={logic.setSelectedItemId} onDropFile={logic.handleDropFile} isDragOver={logic.isDragOver} setIsDragOver={logic.setIsDragOver} />
					</aside>

					<HotFolderImageCanvas
						activeItem={logic.activeItem} doseInfo={logic.doseInfo} pan={logic.pan} zoom={logic.zoom} rotation={logic.rotation} flipH={logic.flipH} flipV={flipV}
						brightness={logic.brightness} contrast={logic.contrast} invert={logic.invert} sharpness={logic.sharpness} enamelHighPass={logic.enamelHighPass} pdlSharpening={logic.pdlSharpening}
						activePreset={logic.activePreset} isDragOver={logic.isDragOver} onMouseDownCanvas={logic.handleMouseDownCanvas} onApplyPreset={logic.handleApplyPreset}
						setBrightness={logic.setBrightness} setContrast={logic.setContrast} setInvert={logic.setInvert} setSharpness={logic.setSharpness} setEnamelHighPass={logic.setEnamelHighPass}
						setPdlSharpening={logic.setPdlSharpening} setRotation={logic.setRotation} setFlipH={logic.setFlipH} setFlipV={setFlipV} setZoom={logic.setZoom} onResetView={() => { setFlipV(false); logic.handleResetView(); }}
						onDragOverViewport={(e) => { e.preventDefault(); e.stopPropagation(); logic.setIsDragOver(true); }} onDragLeaveViewport={(e) => { e.preventDefault(); e.stopPropagation(); logic.setIsDragOver(false); }}
						onDropViewport={(e) => { e.preventDefault(); e.stopPropagation(); logic.setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) logic.handleDropFile(f); }}
					/>

					<aside className="hfi-right-panel" data-testid="hfi-right-panel">
						<HotFolderPatientMatcher
							selectedTeeth={logic.selectedTeeth} clinicalPurpose={logic.clinicalPurpose} protocolNote={logic.protocolNote} activeItem={logic.activeItem} patientName={patientName} patientCardNumber={patientCardNumber}
							onToggleTooth={logic.handleToggleTooth} onSelectAllTeeth={logic.handleSelectAllTeeth} onSelectUpperArch={logic.handleSelectUpperArch} onSelectLowerArch={logic.handleSelectLowerArch}
							onSelectFrontal={logic.handleSelectFrontal} onSelectRightMolar={logic.handleSelectRightMolar} onSelectLeftMolar={logic.handleSelectLeftMolar} onSelectTeethBatch={logic.handleSelectTeethBatch} onClinicalPurposeChange={logic.setClinicalPurpose} onProtocolNoteChange={logic.setProtocolNote}
						/>
						<HotFolderIntakeFooterActions activeItem={logic.activeItem} protocolNote={logic.protocolNote} onAttachToEmr={logic.handleAttachToEmr} onExportDicom={onExportDicom} onSendToLab={onSendToLab} />
					</aside>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

