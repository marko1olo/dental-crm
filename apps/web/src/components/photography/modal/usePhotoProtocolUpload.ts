import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateUuidV7 } from '@dental/shared';
import { PhotoProtocolPreset, PhotoSlotRecord, EXPRESS_6_SLOT_PROTOCOL, getPresetById } from '../photoGridPresets';
import { compressChairsidePhotoToBlobUrl } from '../chairsidePhotoCompressor';
import { showToast } from '../../GlobalToast';
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from '../../../lib/denteRequestHeaders';
import { clientLogger } from '../../../services/logging/clientLogger';

export interface UsePhotoProtocolUploadProps {
	patientId?: string | undefined;
	visitId?: string | undefined;
	toothCode?: string | number | undefined;
	initialSlots?: Record<string, PhotoSlotRecord> | undefined;
	initialPresetId?: string | undefined;
	onSaveProtocol?: ((slots: Record<string, PhotoSlotRecord>, presetId: string) => void) | undefined;
	onClose: () => void;
}

export function usePhotoProtocolUpload(
	props: UsePhotoProtocolUploadProps,
	externalBlobUrlsRef?: React.MutableRefObject<Set<string>>,
) {
	const {
		patientId,
		visitId,
		toothCode,
		initialSlots = {},
		initialPresetId,
		onSaveProtocol,
		onClose,
	} = props;

	const [activePreset, setActivePreset] = useState<PhotoProtocolPreset>(() =>
		initialPresetId ? getPresetById(initialPresetId) : EXPRESS_6_SLOT_PROTOCOL,
	);
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>(() => {
		if (!toothCode) return initialSlots;
		const seeded: Record<string, PhotoSlotRecord> = { ...initialSlots };
		for (const [k, v] of Object.entries(seeded)) if (!v.toothCode) seeded[k] = { ...v, toothCode };
		return seeded;
	});
	const [isSaving, setIsSaving] = useState(false);
	const [uploadingSlotIds, setUploadingSlotIds] = useState<Set<string>>(new Set());
	const [activeViewMode, setActiveViewMode] = useState<'grid' | 'comparison' | 'export' | 'dsd'>('grid');
	const [activeFilter, setActiveFilter] = useState<'all' | 'extraoral' | 'intraoral'>('all');
	const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<string | null>(null);
	const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentSlotRef = useRef<string | null>(null);
	const fallbackBlobUrlsRef = useRef<Set<string>>(new Set());
	const createdBlobUrlsRef = externalBlobUrlsRef || fallbackBlobUrlsRef;

	// Сброс состояния слотов при переключении пациента для исключения кросс-пациентной утечки (Мандат 8aq, D-9)
	useEffect(() => {
		setSlotsData(initialSlots || {});
	}, [patientId]);

	// Гидратация сохраненного фотопротокола из PostgreSQL 18 через Fastify API (Мандат 8aq / PHO-03)
	useEffect(() => {
		if (!patientId || Object.keys(initialSlots).length > 0) return;
		let isCancelled = false;

		const fetchSavedProtocol = async () => {
			try {
				const res = await fetch(`/api/patients/${patientId}/photo-protocol`, {
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (isCancelled || !data?.protocol?.slots) return;

				const loadedSlots = (data.protocol.slots || {}) as Record<string, PhotoSlotRecord>;
				setSlotsData(loadedSlots);

				if (data.protocol.presetId && !initialPresetId) {
					setActivePreset(getPresetById(data.protocol.presetId));
				}
			} catch (err) {
				// В офлайн-режиме мягко пробуем localStorage
				try {
					const cached = localStorage.getItem(`dente_photo_protocol_${patientId}`);
					if (cached && !isCancelled) {
						const parsed = JSON.parse(cached);
						if (parsed.slots) setSlotsData(parsed.slots);
						if (parsed.presetId && !initialPresetId) setActivePreset(getPresetById(parsed.presetId));
					}
				} catch {
					// ignore
				}
			}
		};

		void fetchSavedProtocol();
		return () => {
			isCancelled = true;
		};
	}, [patientId, initialSlots, initialPresetId]);

	useEffect(() => () => {
		if (!externalBlobUrlsRef) {
			createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
			createdBlobUrlsRef.current.clear();
		}
	}, [externalBlobUrlsRef, createdBlobUrlsRef]);

	const updateSlotRecord = useCallback((slotId: string, updates: Partial<PhotoSlotRecord>) => {
		setSlotsData((prev) => ({
			...prev,
			[slotId]: { ...(prev[slotId] || { slotId, ...(toothCode ? { toothCode } : {}) }), ...updates },
		}));
	}, [toothCode]);

	const uploadPhotoToBackend = useCallback(async (slotId: string, blob: Blob, rawFilename: string) => {
		if (!visitId && !patientId) {
			// Офлайн-буфер кабинета для снимков без активного пациента (Дефект 3 / Мандат 8e)
			try {
				const reader = new FileReader();
				reader.onloadend = () => {
					if (typeof reader.result === 'string') {
						const draftKey = `dente_unassigned_photo_${slotId}_${Date.now()}`;
						localStorage.setItem(draftKey, reader.result);
					}
				};
				reader.readAsDataURL(blob);
			} catch (storageErr) {
				clientLogger.debug('Не удалось сохранить временный снимок фотопротокола в localStorage', storageErr, { module: 'usePhotoProtocolUpload' });
			}
			return null;
		}
		try {
			const url = visitId ? `/api/files/visits/${visitId}/attachments` : `/api/files/patients/${patientId}/attachments`;
			const fd = new FormData();
			fd.append('file', blob, rawFilename.endsWith('.webp') ? rawFilename : `${rawFilename}.webp`);
			const res = await fetch(url, {
				method: 'POST',
				headers: denteClinicalMutationHeaders({
					'Idempotency-Key': generateUuidV7(),
				}),
				body: fd,
			});
			return res.ok ? ((await res.json())?.file?.url || null) : null;
		} catch {
			return null;
		}
	}, [visitId, patientId]);

	const handleUpload = async (slotId: string, file: File) => {
		try {
			setUploadingSlotIds((prev) => new Set(prev).add(slotId));
			const comp = await compressChairsidePhotoToBlobUrl(file, { maxDimension: 1920, quality: 0.85 }).catch(() => null);
			const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(blobUrl);

			// Дефект 1: previewUrl для быстрого рендеринга в UI, но НЕ imageUrl, чтобы blob: не улетел в базу данных
			updateSlotRecord(slotId, {
				previewUrl: blobUrl,
				isUploading: true,
				uploadedAt: new Date().toISOString(),
				...(toothCode ? { toothCode } : {}),
			});

			const uploadBlob = comp ? comp.blob : file;
			const serverUrl = await uploadPhotoToBackend(slotId, uploadBlob, file.name);

			if (serverUrl) {
				updateSlotRecord(slotId, {
					imageUrl: serverUrl,
					isUploading: false,
				});
			} else {
				// В офлайн-режиме или при сохранении без пациента отмечаем завершение загрузки
				updateSlotRecord(slotId, {
					isUploading: false,
				});
				if (!patientId && !visitId) {
					showToast('Снимок сохранён во временный буфер кабинета (нет активного пациента)', 'info');
				}
			}
		} catch (err) {
			clientLogger.error('Upload error', err, { module: 'usePhotoProtocolUpload' });
			showToast('Ошибка при обработке изображения. Попробуйте другой формат.', 'error');
			updateSlotRecord(slotId, { isUploading: false });
		} finally {
			setUploadingSlotIds((prev) => {
				const next = new Set(prev);
				next.delete(slotId);
				return next;
			});
		}
	};

	const handleSaveProtocol = useCallback(async () => {
		// Очистка от временных blob: URL и служебных полей перед отправкой в PostgreSQL 18 (Дефект 1 / Мандат 8aq)
		const sanitizedSlots: Record<string, PhotoSlotRecord> = {};
		for (const [key, slot] of Object.entries(slotsData)) {
			const slotCopy: PhotoSlotRecord = { ...slot };
			delete slotCopy.previewUrl;
			delete slotCopy.isUploading;
			if (slotCopy.imageUrl && slotCopy.imageUrl.startsWith('blob:')) {
				delete slotCopy.imageUrl;
			}
			sanitizedSlots[key] = slotCopy;
		}

		setIsSaving(true);
		let persistedInDb = false;

		// 1. Персистентность в PostgreSQL 18 через Fastify API (Мандат 8aq / PHO-03)
		if (patientId) {
			try {
				const res = await fetch(`/api/patients/${patientId}/photo-protocol`, {
					method: 'POST',
					headers: {
						...denteClinicalMutationHeaders(),
						'Content-Type': 'application/json',
						'Idempotency-Key': generateUuidV7(),
					},
					body: JSON.stringify({
						presetId: activePreset.id,
						slots: sanitizedSlots,
						visitId: visitId || null,
						stage: 'before',
					}),
				});
				if (res.ok) {
					persistedInDb = true;
				} else {
					clientLogger.warn('Failed to save photo protocol to Fastify API', { status: res.status, patientId }, { module: 'usePhotoProtocolUpload' });
				}
			} catch (e) {
				clientLogger.warn('Network issue saving photo protocol to Fastify API, falling back to local cache', e, { module: 'usePhotoProtocolUpload' });
			}
		}

		// 2. Офлайн-бэкап и события для совместимости call sites
		try {
			localStorage.setItem(`dente_photo_protocol_${patientId || 'chairside'}`, JSON.stringify({
				presetId: activePreset.id,
				slots: sanitizedSlots,
				savedAt: new Date().toISOString(),
				persistedInDb,
			}));
			window.dispatchEvent(new CustomEvent('dente-photo-protocol-saved', {
				detail: { patientId, visitId, slots: sanitizedSlots, presetId: activePreset.id, persistedInDb },
			}));
		} catch (e) {
			clientLogger.warn('Failed to persist photo protocol to localStorage', e, { module: 'usePhotoProtocolUpload' });
		}

		if (onSaveProtocol) {
			onSaveProtocol(sanitizedSlots, activePreset.id);
		}

		setIsSaving(false);
		showToast(
			persistedInDb
				? 'Клинический фотопротокол сохранён в базе данных'
				: patientId
					? 'Фотопротокол сохранён локально (ошибка синхронизации с сервером)'
					: 'Фотопротокол сохранён локально',
			persistedInDb || !patientId ? 'success' : 'warning',
			3000,
		);
		onClose();
	}, [onSaveProtocol, slotsData, activePreset.id, patientId, visitId, onClose]);

	return {
		activePreset,
		setActivePreset,
		slotsData,
		setSlotsData,
		isSaving,
		hasActiveUploads: uploadingSlotIds.size > 0,
		uploadingSlotIds,
		activeViewMode,
		setActiveViewMode,
		activeFilter,
		setActiveFilter,
		selectedSlotForEdit,
		setSelectedSlotForEdit,
		dragOverSlotId,
		setDragOverSlotId,
		fileInputRef,
		currentSlotRef,
		createdBlobUrlsRef,
		updateSlotRecord,
		uploadPhotoToBackend,
		handleUpload,
		handleSaveProtocol,
	};
}
