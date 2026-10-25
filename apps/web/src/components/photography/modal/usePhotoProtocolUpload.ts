import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoProtocolPreset, PhotoSlotRecord, EXPRESS_6_SLOT_PROTOCOL, getPresetById } from '../photoGridPresets';
import { compressChairsidePhotoToBlobUrl } from '../chairsidePhotoCompressor';
import { showToast } from '../../GlobalToast';
import { denteAdminSecretRequestHeaders } from '../../../lib/denteRequestHeaders';

export interface UsePhotoProtocolUploadProps {
	patientId?: string | undefined; visitId?: string | undefined; toothCode?: string | number | undefined;
	initialSlots?: Record<string, PhotoSlotRecord> | undefined; initialPresetId?: string | undefined;
	onSaveProtocol?: ((slots: Record<string, PhotoSlotRecord>, presetId: string) => void) | undefined;
	onClose: () => void;
}

export function usePhotoProtocolUpload(props: UsePhotoProtocolUploadProps, externalBlobUrlsRef?: React.MutableRefObject<Set<string>>) {
	const { patientId, visitId, toothCode, initialSlots = {}, initialPresetId, onSaveProtocol, onClose } = props;
	const [activePreset, setActivePreset] = useState<PhotoProtocolPreset>(() =>
		initialPresetId ? getPresetById(initialPresetId) : EXPRESS_6_SLOT_PROTOCOL,
	);
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>(() => {
		if (!toothCode) return initialSlots;
		const seeded: Record<string, PhotoSlotRecord> = { ...initialSlots };
		for (const [k, v] of Object.entries(seeded)) if (!v.toothCode) seeded[k] = { ...v, toothCode };
		return seeded;
	});
	const [activeViewMode, setActiveViewMode] = useState<'grid' | 'comparison' | 'export'>('grid');
	const [activeFilter, setActiveFilter] = useState<'all' | 'extraoral' | 'intraoral'>('all');
	const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<string | null>(null);
	const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentSlotRef = useRef<string | null>(null);
	const fallbackBlobUrlsRef = useRef<Set<string>>(new Set());
	const createdBlobUrlsRef = externalBlobUrlsRef || fallbackBlobUrlsRef;

	useEffect(() => () => {
		if (!externalBlobUrlsRef) {
			createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
			createdBlobUrlsRef.current.clear();
		}
	}, [externalBlobUrlsRef, createdBlobUrlsRef]);

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
			updateSlotRecord(slotId, { imageUrl: blobUrl, uploadedAt: new Date().toISOString(), ...(toothCode ? { toothCode } : {}) });
			const uploadBlob = comp ? comp.blob : file;
			void uploadPhotoToBackend(slotId, uploadBlob, file.name).then((u) => u && updateSlotRecord(slotId, { imageUrl: u }));
		} catch (err) {
			console.error('[ClinicalPhotoProtocolModal] Upload error:', err);
			showToast('Ошибка при обработке изображения. Попробуйте другой формат.', 'error');
		}
	};

	const handleSaveProtocol = useCallback(() => {
		if (onSaveProtocol) {
			onSaveProtocol(slotsData, activePreset.id);
		} else {
			try {
				localStorage.setItem(`dente_photo_protocol_${patientId || 'chairside'}`, JSON.stringify({
					presetId: activePreset.id, slots: slotsData, savedAt: new Date().toISOString(),
				}));
				window.dispatchEvent(new CustomEvent('dente-photo-protocol-saved', {
					detail: { patientId, visitId, slots: slotsData, presetId: activePreset.id },
				}));
			} catch (e) { console.warn('Failed to persist photo protocol to localStorage', e); }
		}
		showToast('Клинический фотопротокол сохранён', 'success', 3000);
		onClose();
	}, [onSaveProtocol, slotsData, activePreset.id, patientId, visitId, onClose]);

	return {
		activePreset, setActivePreset, slotsData, setSlotsData, activeViewMode, setActiveViewMode,
		activeFilter, setActiveFilter, selectedSlotForEdit, setSelectedSlotForEdit,
		dragOverSlotId, setDragOverSlotId, fileInputRef, currentSlotRef, createdBlobUrlsRef,
		updateSlotRecord, uploadPhotoToBackend, handleUpload, handleSaveProtocol,
	};
}
