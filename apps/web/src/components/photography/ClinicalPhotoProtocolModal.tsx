import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PhotoSlotRecord, getSlotDefinitionById } from './photoGridPresets';
import { PhotoGridSixSlots } from './PhotoGridSixSlots';
import { BeforeAfterComparisonView } from './BeforeAfterComparisonView';
import { LabPhotoExportDrawer } from './LabPhotoExportDrawer';
import { PhotoCalibrationDrawer } from './PhotoCalibrationDrawer';
import { useClipboardPhotoPaste } from './useClipboardPhotoPaste';
import { showToast } from '../GlobalToast';
import { ClinicalPhotoProtocolHeader } from './ClinicalPhotoProtocolHeader';
import { compressChairsidePhotoToBlobUrl } from './chairsidePhotoCompressor';
import { usePhotoProtocolUpload } from './modal/usePhotoProtocolUpload';

if (typeof document !== 'undefined') import('./clinicalPhotography.css');

export interface ClinicalPhotoProtocolModalProps {
	isOpen: boolean; onClose: () => void;
	patientId?: string | undefined; visitId?: string | undefined; toothCode?: string | number | undefined;
	patientName?: string | undefined; patientCardNumber?: string | undefined; doctorName?: string | undefined; clinicName?: string | undefined;
	initialSlots?: Record<string, PhotoSlotRecord> | undefined; initialPresetId?: string | undefined;
	initialStage?: 'before' | 'during' | 'after' | 'followup' | undefined;
	onSaveProtocol?: ((slots: Record<string, PhotoSlotRecord>, presetId: string) => void) | undefined;
	onPhotoSaved?: ((res: unknown) => void) | undefined; onPhotoProcessed?: ((res: unknown) => void) | undefined;
}

export const ClinicalPhotoProtocolModal: React.FC<ClinicalPhotoProtocolModalProps> = (props) => {
	const { isOpen, onClose, patientName = '', patientCardNumber = 'К-8492', doctorName = 'Д-р Смирнова Е. В.', clinicName = 'DENTE CLINIC', onPhotoSaved, onPhotoProcessed, toothCode } = props;
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());
	useEffect(() => () => { createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
	const {
		activePreset, setActivePreset, slotsData, setSlotsData, activeViewMode, setActiveViewMode,
		activeFilter, setActiveFilter, selectedSlotForEdit, setSelectedSlotForEdit,
		dragOverSlotId, setDragOverSlotId, fileInputRef, currentSlotRef,
		updateSlotRecord, uploadPhotoToBackend, handleUpload, handleSaveProtocol,
	} = usePhotoProtocolUpload(props, createdBlobUrlsRef);

	useClipboardPhotoPaste({
		enabled: isOpen,
		onPhotoReceived: async (blob, fileName) => {
			const targetId = selectedSlotForEdit || activePreset.slots.find((s) => !slotsData[s.id]?.imageUrl)?.id || activePreset.slots[0]?.id || 'portrait_smile';
			const blobUrl = URL.createObjectURL(blob);
			createdBlobUrlsRef.current.add(blobUrl);
			updateSlotRecord(targetId, { imageUrl: blobUrl, uploadedAt: new Date().toISOString(), ...(toothCode ? { toothCode } : {}) });
			showToast(`Вставлен снимок из буфера (Ctrl+V) в ракурс «${getSlotDefinitionById(targetId)?.shortLabelRu || targetId}»`, 'success', 3500);
			void uploadPhotoToBackend(targetId, blob, fileName).then((u) => u && updateSlotRecord(targetId, { imageUrl: u }));
			onPhotoSaved?.({ slotId: targetId, fileName, ...(toothCode ? { toothCode } : {}) });
			onPhotoProcessed?.({ slotId: targetId, fileName, ...(toothCode ? { toothCode } : {}) });
		},
	});

	if (!isOpen) return null;
	const selectedSlotDef = selectedSlotForEdit ? getSlotDefinitionById(selectedSlotForEdit) : undefined;
	if (selectedSlotForEdit && selectedSlotDef) {
		return <PhotoCalibrationDrawer slotDef={selectedSlotDef} record={slotsData[selectedSlotForEdit] || { slotId: selectedSlotForEdit, ...(toothCode ? { toothCode } : {}) }} onClose={() => setSelectedSlotForEdit(null)} onUpdateRecord={(up) => updateSlotRecord(selectedSlotForEdit, up)} />;
	}

	return createPortal(
		<div className="photo-protocol-modal-backdrop" role="dialog" aria-modal="true">
			<input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={(e) => {
				Array.from(e.target.files || []).forEach((f, i) => handleUpload(currentSlotRef.current || activePreset.slots[i % activePreset.slots.length]?.id || 'slot', f));
				if (fileInputRef.current) fileInputRef.current.value = '';
			}} />
			<div className="photo-protocol-modal">
				<div className="photo-mobile-drag-handle" aria-hidden="true" />
				{/* Renders header with data-testid="btn-patient-presentation-popout" */}
				<ClinicalPhotoProtocolHeader patientName={patientName} patientCardNumber={patientCardNumber} doctorName={doctorName} clinicName={clinicName} activeViewMode={activeViewMode} setActiveViewMode={setActiveViewMode} slotsData={slotsData} activePresetId={activePreset.id} onSaveProtocol={handleSaveProtocol} onClose={onClose} />
				<div className="photo-protocol-body">
					{activeViewMode === 'grid' && <PhotoGridSixSlots preset={activePreset} slotsData={slotsData} activeFilter={activeFilter} dragOverSlotId={dragOverSlotId} onSelectPreset={setActivePreset} onFilterChange={setActiveFilter} onBatchUploadClick={() => { currentSlotRef.current = null; fileInputRef.current?.click(); }} onTriggerUploadSlot={(id) => { currentSlotRef.current = id; fileInputRef.current?.click(); }} onEditSlot={setSelectedSlotForEdit} onDeleteSlot={(id, e) => { e.stopPropagation(); setSlotsData((prev) => { const n = { ...prev }; delete n[id]; return n; }); }} onSlotDragOver={(e, id) => { e.preventDefault(); setDragOverSlotId(id); }} onSlotDragLeave={() => setDragOverSlotId(null)} onSlotDrop={(e, id) => { e.preventDefault(); setDragOverSlotId(null); if (e.dataTransfer.files[0]) handleUpload(id, e.dataTransfer.files[0]); }} />}
					{activeViewMode === 'comparison' && <BeforeAfterComparisonView preset={activePreset} slotsData={slotsData} beforeSlotId={activePreset.slots[0]?.id || 'slot_1'} afterSlotId={activePreset.slots[1]?.id || 'slot_2'} clinicName={clinicName} patientName={patientName} />}
					{activeViewMode === 'export' && <LabPhotoExportDrawer preset={activePreset} slotsData={slotsData} clinicName={clinicName} patientName={patientName} patientCardNumber={patientCardNumber} doctorName={doctorName} />}
				</div>
			</div>
		</div>,
		document.body
	);
};
export default ClinicalPhotoProtocolModal;
