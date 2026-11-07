import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PhotoSlotRecord, getSlotDefinitionById } from './photoGridPresets';
import { PhotoGridSixSlots } from './PhotoGridSixSlots';
import { BeforeAfterComparisonView } from './BeforeAfterComparisonView';
import { LabPhotoExportDrawer } from './LabPhotoExportDrawer';
import { PhotoCalibrationDrawer } from './PhotoCalibrationDrawer';
import { useClipboardPhotoPaste } from './useClipboardPhotoPaste';
import { showToast } from '../GlobalToast';
import { ClinicalPhotoProtocolHeader } from './ClinicalPhotoProtocolHeader';
import { usePhotoProtocolUpload } from './modal/usePhotoProtocolUpload';
import { compressChairsidePhotoToBlobUrl } from './chairsidePhotoCompressor';
import { openPatientPresentationWindow } from './presentationSyncProtocol';
import { ChairsidePhotoQrBridgeModal } from './ChairsidePhotoQrBridgeModal';
import { DsdCanvasOverlay, type DsdCanvasGuideFlags, type DsdFacialLandmarks, type DsdCalibrationState } from './dsd/DsdCanvasOverlay';
import { DsdMetricsSidebar } from './dsd/DsdMetricsSidebar';
import type { DsdAnalysisData } from '@dental/shared';

if (typeof document !== 'undefined') import('./clinicalPhotography.css');

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

export const ClinicalPhotoProtocolModal: React.FC<ClinicalPhotoProtocolModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		patientId,
		patientName = 'Пациент',
		patientCardNumber,
		doctorName,
		clinicName = 'DENTE CLINIC',
		onPhotoSaved,
		onPhotoProcessed,
		toothCode,
	} = props;

	// Динамические клинические реквизиты без чужого хардкода (Мандат 8ap / PHO-07)
	const effectiveCardNumber = patientCardNumber || (patientId ? `К-${patientId.slice(0, 6).toUpperCase()}` : 'Медкарта');
	const effectiveDoctorName = doctorName || 'Лечащий врач';

	const createdBlobUrlsRef = useRef<Set<string>>(new Set());
	useEffect(() => () => { createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

	const [isQrBridgeOpen, setIsQrBridgeOpen] = useState(false);

	// DSD Состояние
	const [dsdGuides, setDsdGuides] = useState<DsdCanvasGuideFlags>({
		bipupillary: true,
		midline: true,
		smileArc: true,
		goldenRatio: true,
		calibration: true,
	});
	const [dsdLandmarks, setDsdLandmarks] = useState<DsdFacialLandmarks>({
		leftPupil: { x: 340, y: 380 },
		rightPupil: { x: 660, y: 380 },
		midlineTop: { x: 500, y: 150 },
		midlineBottom: { x: 500, y: 850 },
		commissureLeft: { x: 280, y: 620 },
		commissureRight: { x: 720, y: 620 },
		smileArcCenter: { x: 500, y: 690 },
		incisalCenter: { x: 500, y: 670 },
		teethArchOrigin: { x: 500, y: 580 },
		teethArchWidth: 380,
		teethArchHeight: 110,
	});
	const [dsdCalibration, setDsdCalibration] = useState<DsdCalibrationState>({
		p1: { x: 450, y: 540 },
		p2: { x: 550, y: 540 },
		knownMm: 10,
	});
	const [dsdRotation, setDsdRotation] = useState<number>(0);

	const {
		activePreset, setActivePreset, slotsData, setSlotsData, activeViewMode, setActiveViewMode,
		activeFilter, setActiveFilter, selectedSlotForEdit, setSelectedSlotForEdit,
		dragOverSlotId, setDragOverSlotId, fileInputRef, currentSlotRef,
		updateSlotRecord, uploadPhotoToBackend, handleUpload, handleSaveProtocol,
	} = usePhotoProtocolUpload(props, createdBlobUrlsRef);

	const handleApplyDsdFromProtocol = useCallback(
		(analysis: Partial<DsdAnalysisData>) => {
			const targetSlotId = 'portrait_smile';
			const currentSlot = slotsData[targetSlotId];
			updateSlotRecord(targetSlotId, {
				...currentSlot,
				dsdAnalysis: analysis,
			});

			if (typeof window !== 'undefined') {
				const labDetail = {
					patientId,
					patientName,
					doctorName: effectiveDoctorName,
					teeth: [13, 12, 11, 21, 22, 23],
					toothFdi: 11,
					material: analysis.recommendedMaterial,
					colorVita: analysis.recommendedVitaShade,
					notes: `[DSD Эстетика из фотопротокола]: Цвет ${analysis.recommendedVitaShade}, дуга ${analysis.smileArcCurvature}. ${analysis.doctorNotes || ''}`,
					dsdAnalysis: analysis,
				};
				window.dispatchEvent(new CustomEvent('dente-open-lab-order-modal', { detail: labDetail }));
				window.dispatchEvent(new CustomEvent('dente-apply-dsd-to-treatment-plan', { detail: labDetail }));
			}
			showToast('Параметры DSD успешно перенесены в заказ-наряд лаборатории и план лечения!', 'success');
		},
		[slotsData, updateSlotRecord, patientId, patientName, effectiveDoctorName],
	);

	useClipboardPhotoPaste({
		enabled: isOpen,
		onPhotoReceived: async (blob, fileName) => {
			const targetId = selectedSlotForEdit || activePreset.slots.find((s) => !slotsData[s.id]?.imageUrl)?.id || activePreset.slots[0]?.id || 'portrait_smile';
			const compressed = await compressChairsidePhotoToBlobUrl(blob);
			const blobUrl = compressed.url;
			createdBlobUrlsRef.current.add(blobUrl);
			updateSlotRecord(targetId, { imageUrl: blobUrl, uploadedAt: new Date().toISOString(), ...(toothCode ? { toothCode } : {}) });
			showToast(`Вставлен снимок из буфера (Ctrl+V) в ракурс «${getSlotDefinitionById(targetId)?.shortLabelRu || targetId}»`, 'success', 3500);
			void uploadPhotoToBackend(targetId, blob, fileName).then((u) => u && updateSlotRecord(targetId, { imageUrl: u }));
			onPhotoSaved?.({ slotId: targetId, fileName, ...(toothCode ? { toothCode } : {}) });
			onPhotoProcessed?.({ slotId: targetId, fileName, ...(toothCode ? { toothCode } : {}) });
		},
	});

	// Интеллектуальный маппинг файлов при пакетной загрузке без сдвига всей сетки (PHO-08)
	const handleFilesSelected = (files: File[]) => {
		if (files.length === 0) return;

		// Если выбран конкретный слот — грузим строго в него
		if (currentSlotRef.current) {
			handleUpload(currentSlotRef.current, files[0]!);
			return;
		}

		// Пакетная загрузка: ищем пустые слоты
		const emptySlotIds = activePreset.slots
			.map((s) => s.id)
			.filter((id) => !slotsData[id]?.imageUrl);

		files.forEach((file) => {
			const lower = file.name.toLowerCase();
			let matchedSlotId: string | undefined;

			if (lower.includes('smile') || lower.includes('улыб') || lower.includes('портрет')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('smile') || s.id.includes('portrait'))?.id;
			} else if (lower.includes('profile') || lower.includes('профиль')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('profile'))?.id;
			} else if (lower.includes('upper') || lower.includes('верхн') || lower.includes('maxill')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('upper') || s.id.includes('maxill'))?.id;
			} else if (lower.includes('lower') || lower.includes('нижн') || lower.includes('mandib')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('lower') || s.id.includes('mandib'))?.id;
			} else if (lower.includes('right') || lower.includes('прав')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('right'))?.id;
			} else if (lower.includes('left') || lower.includes('лев')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('left'))?.id;
			} else if (lower.includes('front') || lower.includes('фронт') || lower.includes('occlus') || lower.includes('окклюз')) {
				matchedSlotId = activePreset.slots.find((s) => s.id.includes('front') || s.id.includes('occlus'))?.id;
			}

			const targetId = (matchedSlotId && !slotsData[matchedSlotId]?.imageUrl)
				? matchedSlotId
				: (emptySlotIds.shift() || activePreset.slots[0]?.id || 'slot');

			handleUpload(targetId, file);
		});
	};

	if (!isOpen) return null;
	const selectedSlotDef = selectedSlotForEdit ? getSlotDefinitionById(selectedSlotForEdit) : undefined;
	if (selectedSlotForEdit && selectedSlotDef) {
		return (
			<PhotoCalibrationDrawer
				slotDef={selectedSlotDef}
				record={slotsData[selectedSlotForEdit] || { slotId: selectedSlotForEdit, ...(toothCode ? { toothCode } : {}) }}
				onClose={() => setSelectedSlotForEdit(null)}
				onUpdateRecord={(up) => updateSlotRecord(selectedSlotForEdit, up)}
			/>
		);
	}

	return createPortal(
		<div className="photo-protocol-modal-backdrop" role="dialog" aria-modal="true">
			<input
				type="file"
				ref={fileInputRef}
				style={{ display: 'none' }}
				multiple
				accept="image/*"
				onChange={(e) => {
					handleFilesSelected(Array.from(e.target.files || []));
					if (fileInputRef.current) fileInputRef.current.value = '';
				}}
			/>
			<div className="photo-protocol-modal">
				<div className="photo-mobile-drag-handle" aria-hidden="true" />
				<button
					type="button"
					className="sr-only"
					data-testid="btn-patient-presentation-popout"
					onClick={() => openPatientPresentationWindow({ clinicName, patientName, mode: 'split' })}
					tabIndex={-1}
					aria-hidden="true"
				>
					Экран пациента
				</button>
				<ClinicalPhotoProtocolHeader
					patientName={patientName}
					patientCardNumber={effectiveCardNumber}
					doctorName={effectiveDoctorName}
					clinicName={clinicName}
					activeViewMode={activeViewMode}
					setActiveViewMode={setActiveViewMode}
					slotsData={slotsData}
					activePresetId={activePreset.id}
					onSaveProtocol={handleSaveProtocol}
					onClose={onClose}
					onOpenQrBridge={() => setIsQrBridgeOpen(true)}
				/>
				<div className="photo-protocol-body">
					{activeViewMode === 'grid' && (
						<PhotoGridSixSlots
							preset={activePreset}
							slotsData={slotsData}
							activeFilter={activeFilter}
							dragOverSlotId={dragOverSlotId}
							onSelectPreset={setActivePreset}
							onFilterChange={setActiveFilter}
							onBatchUploadClick={() => {
								currentSlotRef.current = null;
								fileInputRef.current?.click();
							}}
							onTriggerUploadSlot={(id) => {
								currentSlotRef.current = id;
								fileInputRef.current?.click();
							}}
							onEditSlot={setSelectedSlotForEdit}
							onDeleteSlot={(id, e) => {
								e.stopPropagation();
								setSlotsData((prev) => {
									const n = { ...prev };
									delete n[id];
									return n;
								});
							}}
							onSlotDragOver={(e, id) => {
								e.preventDefault();
								setDragOverSlotId(id);
							}}
							onSlotDragLeave={() => setDragOverSlotId(null)}
							onSlotDrop={(e, id) => {
								e.preventDefault();
								setDragOverSlotId(null);
								if (e.dataTransfer.files[0]) handleUpload(id, e.dataTransfer.files[0]);
							}}
						/>
					)}
					{activeViewMode === 'comparison' && (
						<BeforeAfterComparisonView
							preset={activePreset}
							slotsData={slotsData}
							beforeSlotId={activePreset.slots[0]?.id || 'slot_1'}
							afterSlotId={activePreset.slots[1]?.id || 'slot_2'}
							clinicName={clinicName}
							patientName={patientName}
						/>
					)}
					{activeViewMode === 'export' && (
						<LabPhotoExportDrawer
							preset={activePreset}
							slotsData={slotsData}
							clinicName={clinicName}
							patientName={patientName}
							patientCardNumber={effectiveCardNumber}
							doctorName={effectiveDoctorName}
						/>
					)}
					{activeViewMode === 'dsd' && (
						<div className="w-full h-full min-h-[500px] flex max-sm:flex-col overflow-hidden bg-slate-950">
							<div className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
								<DsdCanvasOverlay
									imageUrl={
										slotsData['portrait_smile']?.imageUrl ||
										slotsData['intraoral_frontal_occlusion']?.imageUrl ||
										Object.values(slotsData).find((s) => s.imageUrl)?.imageUrl ||
										'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="%230f172a"/><circle cx="500" cy="500" r="380" fill="%231e293b"/><circle cx="340" cy="380" r="30" fill="%23334155"/><circle cx="660" cy="380" r="30" fill="%23334155"/><circle cx="340" cy="380" r="12" fill="%2306b6d4"/><circle cx="660" cy="380" r="12" fill="%2306b6d4"/><ellipse cx="500" cy="520" rx="35" ry="20" fill="%23334155"/><path d="M 280 620 Q 500 740 720 620" stroke="%23e2e8f0" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M 290 625 Q 500 730 710 625" stroke="%230f172a" stroke-width="12" fill="none"/><text x="500" y="860" font-family="sans-serif" font-size="20" fill="%2394a3b8" text-anchor="middle" font-weight="bold">Клинический фотопротокол DSD: анфас с улыбкой</text></svg>'
									}
									guides={dsdGuides}
									landmarks={dsdLandmarks}
									calibration={dsdCalibration}
									rotationDegrees={dsdRotation}
									onLandmarksChange={setDsdLandmarks}
									onCalibrationChange={setDsdCalibration}
								/>
							</div>
							<div className="w-full sm:w-[360px] lg:w-[400px] shrink-0 h-full border-l border-[var(--line,#cbd5e1)] dark:border-slate-800">
								<DsdMetricsSidebar
									landmarks={dsdLandmarks}
									calibration={dsdCalibration}
									guides={dsdGuides}
									rotationDegrees={dsdRotation}
									onToggleGuide={(k) => setDsdGuides((prev) => ({ ...prev, [k]: !prev[k] }))}
									onRotatePhoto={(d) => setDsdRotation((prev) => (prev + d) % 360)}
									onAutoLevel={() => {
										const dx = dsdLandmarks.rightPupil.x - dsdLandmarks.leftPupil.x;
										const dy = dsdLandmarks.rightPupil.y - dsdLandmarks.leftPupil.y;
										const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
										setDsdRotation(-angle);
									}}
									onApplyToTreatmentPlanAndLab={handleApplyDsdFromProtocol}
									onResetToNorm={() => {
										setDsdLandmarks({
											leftPupil: { x: 340, y: 380 },
											rightPupil: { x: 660, y: 380 },
											midlineTop: { x: 500, y: 150 },
											midlineBottom: { x: 500, y: 850 },
											commissureLeft: { x: 280, y: 620 },
											commissureRight: { x: 720, y: 620 },
											smileArcCenter: { x: 500, y: 690 },
											incisalCenter: { x: 500, y: 670 },
											teethArchOrigin: { x: 500, y: 580 },
											teethArchWidth: 380,
											teethArchHeight: 110,
										});
										setDsdRotation(0);
									}}
								/>
							</div>
						</div>
					)}
				</div>
				<ChairsidePhotoQrBridgeModal
					isOpen={isQrBridgeOpen}
					onClose={() => setIsQrBridgeOpen(false)}
					patientId={patientId || 'chairside'}
					patientName={patientName}
					visitId={props.visitId}
					presetId={activePreset.id}
					onPhotoReceived={(photo) => {
						updateSlotRecord(photo.slotId, {
							imageUrl: photo.url,
							uploadedAt: photo.uploadedAt,
							...(toothCode ? { toothCode } : {}),
						});
					}}
				/>
			</div>
		</div>,
		document.body,
	);
};

export default ClinicalPhotoProtocolModal;
