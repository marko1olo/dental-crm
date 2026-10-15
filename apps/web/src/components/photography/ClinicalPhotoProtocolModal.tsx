import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X, Grid, FileText, MoveHorizontal, ExternalLink } from 'lucide-react';
import { CheekRetractor } from '../icons/DentalIcons';
import './clinicalPhotography.css';
import { PhotoProtocolPreset, PhotoSlotRecord, STANDARD_12_SLOT_PROTOCOL, getSlotDefinitionById } from './photoGridPresets';
import { PhotoGridSixSlots } from './PhotoGridSixSlots';
import { BeforeAfterComparisonView } from './BeforeAfterComparisonView';
import { LabPhotoExportDrawer } from './LabPhotoExportDrawer';
import { PhotoCalibrationDrawer } from './PhotoCalibrationDrawer';
import { compressChairsidePhotoToBlobUrl } from './chairsidePhotoCompressor';
import { openPatientPresentationWindow } from './presentationSyncProtocol';
import { useClipboardPhotoPaste } from './useClipboardPhotoPaste';
import { showToast } from '../GlobalToast';
import { denteAdminSecretRequestHeaders } from '../../lib/denteRequestHeaders';

export interface ClinicalPhotoProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	visitId?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	clinicName?: string;
	initialSlots?: Record<string, PhotoSlotRecord>;
	initialPresetId?: string;
	initialStage?: 'before' | 'during' | 'after' | 'followup';
	onSaveProtocol?: (slots: Record<string, PhotoSlotRecord>, presetId: string) => void;
	onPhotoSaved?: (res: unknown) => void;
	onPhotoProcessed?: (res: unknown) => void;
}

export const ClinicalPhotoProtocolModal: React.FC<ClinicalPhotoProtocolModalProps> = ({
	isOpen, onClose, patientId, visitId, patientName = '', patientCardNumber = 'К-8492',
	doctorName = 'Д-р Смирнова Е. В.', clinicName = 'DENTE CLINIC', initialSlots = {}, onSaveProtocol, onPhotoSaved, onPhotoProcessed,
}) => {
	const [activePreset, setActivePreset] = useState<PhotoProtocolPreset>(STANDARD_12_SLOT_PROTOCOL);
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>(initialSlots);
	const [activeViewMode, setActiveViewMode] = useState<'grid' | 'comparison' | 'export'>('grid');
	const [activeFilter, setActiveFilter] = useState<'all' | 'extraoral' | 'intraoral'>('all');
	const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<string | null>(null);
	const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentSlotRef = useRef<string | null>(null);
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	useEffect(() => () => { createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); createdBlobUrlsRef.current.clear(); }, []);

	const updateSlotRecord = useCallback((slotId: string, updates: Partial<PhotoSlotRecord>) => {
		setSlotsData((prev) => ({ ...prev, [slotId]: { ...(prev[slotId] || { slotId }), ...updates } }));
	}, []);

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
		const comp = await compressChairsidePhotoToBlobUrl(file, { maxDimension: 1920, quality: 0.85 }).catch(() => null);
		const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
		createdBlobUrlsRef.current.add(blobUrl);
		updateSlotRecord(slotId, { imageUrl: blobUrl, uploadedAt: new Date().toISOString() });
		if (comp) void uploadPhotoToBackend(slotId, comp.blob, file.name).then((u) => u && updateSlotRecord(slotId, { imageUrl: u }));
	};

	useClipboardPhotoPaste({
		enabled: isOpen,
		onPhotoReceived: async (compressedBlob, fileName) => {
			const targetId = selectedSlotForEdit || activePreset.slots.find((s) => !slotsData[s.id]?.imageUrl)?.id || activePreset.slots[0]?.id || 'portrait_smile';
			const blobUrl = URL.createObjectURL(compressedBlob);
			createdBlobUrlsRef.current.add(blobUrl);
			updateSlotRecord(targetId, { imageUrl: blobUrl, uploadedAt: new Date().toISOString() });
			showToast(`Вставлен снимок из буфера (Ctrl+V) в ракурс «${getSlotDefinitionById(targetId)?.shortLabelRu || targetId}»`, 'success', 3500);
			void uploadPhotoToBackend(targetId, compressedBlob, fileName).then((u) => u && updateSlotRecord(targetId, { imageUrl: u }));
			onPhotoSaved?.({ slotId: targetId, fileName }); onPhotoProcessed?.({ slotId: targetId, fileName });
		},
	});

	if (!isOpen) return null;
	const selectedSlotDef = selectedSlotForEdit ? getSlotDefinitionById(selectedSlotForEdit) : undefined;
	if (selectedSlotForEdit && selectedSlotDef) {
		return <PhotoCalibrationDrawer slotDef={selectedSlotDef} record={slotsData[selectedSlotForEdit] || { slotId: selectedSlotForEdit }} onClose={() => setSelectedSlotForEdit(null)} onUpdateRecord={(up) => updateSlotRecord(selectedSlotForEdit, up)} />;
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
				<div className="photo-protocol-header">
					<div className="photo-protocol-title-group">
						<div className="photo-protocol-badge-icon"><CheekRetractor size={22} /></div>
						<div><h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Клинический фотопротокол</h2><div style={{ fontSize: '13px', color: 'var(--muted, #64748b)' }}>Пациент: <strong>{patientName}</strong> ({patientCardNumber}) • Врач: {doctorName}</div></div>
					</div>
					<div className="photo-protocol-tabs">
						<button type="button" className={`photo-protocol-tab-btn ${activeViewMode === 'grid' ? 'active' : ''}`} onClick={() => setActiveViewMode('grid')}><Grid size={16} /> Сетка</button>
						<button type="button" className={`photo-protocol-tab-btn ${activeViewMode === 'comparison' ? 'active' : ''}`} onClick={() => setActiveViewMode('comparison')}><MoveHorizontal size={16} /> Сравнение</button>
						<button type="button" className={`photo-protocol-tab-btn ${activeViewMode === 'export' ? 'active' : ''}`} onClick={() => setActiveViewMode('export')}><FileText size={16} /> В ЗТЛ</button>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<button type="button" className="photo-touch-btn" data-testid="btn-patient-presentation-popout" onClick={() => openPatientPresentationWindow({ clinicName, patientName, mode: 'split' })} title="Экран пациента"><ExternalLink size={16} /> Экран</button>
						{onSaveProtocol && <button type="button" className="photo-touch-btn primary" onClick={() => onSaveProtocol(slotsData, activePreset.id)}><CheckCircle size={16} /> Сохранить</button>}
						<button type="button" className="photo-touch-btn" onClick={onClose} title="Закрыть"><X size={18} /></button>
					</div>
				</div>
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
