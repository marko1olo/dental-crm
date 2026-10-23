import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
	PhotoProtocolPreset,
	PhotoSlotRecord,
	EXPRESS_6_SLOT_PROTOCOL,
	getPresetById,
	getSlotDefinitionById,
} from './photoGridPresets';
import { PhotoGridSixSlots } from './PhotoGridSixSlots';
import { BeforeAfterComparisonView } from './BeforeAfterComparisonView';
import { LabPhotoExportDrawer } from './LabPhotoExportDrawer';
import { PhotoCalibrationDrawer } from './PhotoCalibrationDrawer';
import { compressChairsidePhotoToBlobUrl } from './chairsidePhotoCompressor';
import { useClipboardPhotoPaste } from './useClipboardPhotoPaste';
import { showToast } from '../GlobalToast';
import { denteAdminSecretRequestHeaders } from '../../lib/denteRequestHeaders';
import { ClinicalPhotoProtocolHeader } from './ClinicalPhotoProtocolHeader';

if (typeof document !== 'undefined') {
	import('./clinicalPhotography.css');
}

export interface ClinicalPhotoProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	visitId?: string | undefined;
	toothCode?: string | number | undefined;
	patientName?: string | undefined;
	patientCardNumber?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	initialSlots?: Record<string, PhotoSlotRecord> | undefined;
	initialPresetId?: string | undefined;
	initialStage?: 'before' | 'during' | 'after' | 'followup' | undefined;
	onSaveProtocol?: ((slots: Record<string, PhotoSlotRecord>, presetId: string) => void) | undefined;
	onPhotoSaved?: ((res: unknown) => void) | undefined;
	onPhotoProcessed?: ((res: unknown) => void) | undefined;
}

export const ClinicalPhotoProtocolModal: React.FC<ClinicalPhotoProtocolModalProps> = ({
	isOpen, onClose, patientId, visitId, toothCode, patientName = '', patientCardNumber = 'К-8492',
	doctorName = 'Д-р Смирнова Е. В.', clinicName = 'DENTE CLINIC', initialSlots = {}, initialPresetId,
	onSaveProtocol, onPhotoSaved, onPhotoProcessed,
}) => {
	const [activePreset, setActivePreset] = useState<PhotoProtocolPreset>(() =>
		initialPresetId ? getPresetById(initialPresetId) : EXPRESS_6_SLOT_PROTOCOL,
	);
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>(() => {
		if (!toothCode) return initialSlots;
		const seeded: Record<string, PhotoSlotRecord> = { ...initialSlots };
		for (const [k, v] of Object.entries(seeded)) {
			if (!v.toothCode) seeded[k] = { ...v, toothCode };
		}
		return seeded;
	});
	const [activeViewMode, setActiveViewMode] = useState<'grid' | 'comparison' | 'export'>('grid');
	const [activeFilter, setActiveFilter] = useState<'all' | 'extraoral' | 'intraoral'>('all');
	const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<string | null>(null);
	const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentSlotRef = useRef<string | null>(null);
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	useEffect(() => () => { createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); createdBlobUrlsRef.current.clear(); }, []);

	const updateSlotRecord = useCallback((slotId: string, updates: Partial<PhotoSlotRecord>) => {
		setSlotsData((prev) => ({ ...prev, [slotId]: { ...(prev[slotId] || { slotId, ...(toothCode ? { toothCode } : {}) }), ...updates } }));
	}, [toothCode]);

	const uploadPhotoToBackend = useCallback(async (slotId: string, blob: Blob, rawFilename: string) => {
		if (!visitId && !patientId) return null;
		try {
			const url = visitId ? `/api/files/visits/${visitId}/attachments` : `/api/files/patients/${patientId}/attachments`;
			const fd = new FormData();
			fd.append('file', blob, rawFilename.endsWith('.webp') ? rawFilename : `${rawFilename}.webp`);
			const res = await fetch(url, { method: 'POST', headers: denteAdminSecretRequestHeaders(), body: fd });
			return res.ok ? ((await res.json())?.file?.url || null) : null;
		} catch { return null; }
	}, [visitId, patientId]);

	const handleUpload = async (slotId: string, file: File) => {
		try {
			const comp = await compressChairsidePhotoToBlobUrl(file, { maxDimension: 1920, quality: 0.85 }).catch(() => null);
			const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(blobUrl);
			updateSlotRecord(slotId, {
				imageUrl: blobUrl,
				uploadedAt: new Date().toISOString(),
				...(toothCode ? { toothCode } : {}),
			});
			const uploadBlob = comp ? comp.blob : file;
			void uploadPhotoToBackend(slotId, uploadBlob, file.name).then((u) => u && updateSlotRecord(slotId, { imageUrl: u }));
		} catch (err) {
			console.error('[ClinicalPhotoProtocolModal] Upload error:', err);
			showToast('Ошибка при обработке изображения. Попробуйте другой формат.', 'error');
		}
	};

	useClipboardPhotoPaste({
		enabled: isOpen,
		onPhotoReceived: async (compressedBlob, fileName) => {
			const targetId = selectedSlotForEdit || activePreset.slots.find((s) => !slotsData[s.id]?.imageUrl)?.id || activePreset.slots[0]?.id || 'portrait_smile';
			const blobUrl = URL.createObjectURL(compressedBlob);
			createdBlobUrlsRef.current.add(blobUrl);
			updateSlotRecord(targetId, {
				imageUrl: blobUrl,
				uploadedAt: new Date().toISOString(),
				...(toothCode ? { toothCode } : {}),
			});
			showToast(`Вставлен снимок из буфера (Ctrl+V) в ракурс «${getSlotDefinitionById(targetId)?.shortLabelRu || targetId}»`, 'success', 3500);
			void uploadPhotoToBackend(targetId, compressedBlob, fileName).then((u) => u && updateSlotRecord(targetId, { imageUrl: u }));
			onPhotoSaved?.({ slotId: targetId, fileName, ...(toothCode ? { toothCode } : {}) });
			onPhotoProcessed?.({ slotId: targetId, fileName, ...(toothCode ? { toothCode } : {}) });
		},
	});

	const handleSaveProtocol = useCallback(() => {
		if (onSaveProtocol) {
			onSaveProtocol(slotsData, activePreset.id);
		} else {
			try {
				const storageKey = `dente_photo_protocol_${patientId || 'chairside'}`;
				localStorage.setItem(storageKey, JSON.stringify({
					presetId: activePreset.id,
					slots: slotsData,
					savedAt: new Date().toISOString(),
				}));
				window.dispatchEvent(new CustomEvent('dente-photo-protocol-saved', {
					detail: { patientId, visitId, slots: slotsData, presetId: activePreset.id }
				}));
			} catch (e) {
				console.warn('Failed to persist photo protocol to localStorage', e);
			}
		}
		showToast('Клинический фотопротокол сохранён', 'success', 3000);
		onClose();
	}, [onSaveProtocol, slotsData, activePreset.id, patientId, visitId, onClose]);

	if (!isOpen) return null;
	const selectedSlotDef = selectedSlotForEdit ? getSlotDefinitionById(selectedSlotForEdit) : undefined;
	if (selectedSlotForEdit && selectedSlotDef) {
		return <PhotoCalibrationDrawer slotDef={selectedSlotDef} record={slotsData[selectedSlotForEdit] || { slotId: selectedSlotForEdit, ...(toothCode ? { toothCode } : {}) }} onClose={() => setSelectedSlotForEdit(null)} onUpdateRecord={(up) => updateSlotRecord(selectedSlotForEdit, up)} />;
	}

	return createPortal(
		<div className="photo-protocol-modal-backdrop" role="dialog" aria-modal="true">
			<input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={(e) => {
				const files = Array.from(e.target.files || []);
				files.forEach((f, i) => handleUpload(currentSlotRef.current || activePreset.slots[i % activePreset.slots.length]?.id || 'slot', f));
				if (fileInputRef.current) fileInputRef.current.value = '';
			}} />
			<div className="photo-protocol-modal">
				<div className="photo-mobile-drag-handle" aria-hidden="true" />
				{/* Renders header with data-testid="btn-patient-presentation-popout" */}
				<ClinicalPhotoProtocolHeader
					patientName={patientName}
					patientCardNumber={patientCardNumber}
					doctorName={doctorName}
					clinicName={clinicName}
					activeViewMode={activeViewMode}
					setActiveViewMode={setActiveViewMode}
					slotsData={slotsData}
					activePresetId={activePreset.id}
					onSaveProtocol={handleSaveProtocol}
					onClose={onClose}
				/>
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
