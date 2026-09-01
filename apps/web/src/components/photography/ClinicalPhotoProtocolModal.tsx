import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
	Camera,
	CheckCircle,
	X,
	Grid,
	FileText,
	MoveHorizontal
} from 'lucide-react';
import './clinicalPhotography.css';
import {
	PhotoProtocolPreset,
	PhotoSlotRecord,
	STANDARD_12_SLOT_PROTOCOL,
	CLINICAL_PROTOCOLS_REGISTRY,
	getPresetById,
	getSlotDefinitionById
} from './photoGridPresets';
import { PhotoSlotCard } from './PhotoSlotCard';
import { BeforeAfterComparisonView } from './BeforeAfterComparisonView';
import { PhotoCalibrationDrawer } from './PhotoCalibrationDrawer';
import { PhotoCollageExportSheet } from './PhotoCollageExportSheet';
import { decodeHeicImage } from '../../services/imaging/heicDecoder';

export interface ClinicalPhotoProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	clinicName?: string;
	initialSlots?: Record<string, PhotoSlotRecord>;
	onSaveProtocol?: (slots: Record<string, PhotoSlotRecord>, presetId: string) => void;
}

const EMPTY_INITIAL_SLOTS: Record<string, PhotoSlotRecord> = {};

export const ClinicalPhotoProtocolModal: React.FC<ClinicalPhotoProtocolModalProps> = ({
	isOpen,
	onClose,
	patientName = 'Иванов Иван Иванович',
	patientCardNumber = 'К-8492',
	doctorName = 'Д-р Смирнова Е. В.',
	clinicName = 'DENTE CLINIC',
	initialSlots = EMPTY_INITIAL_SLOTS,
	onSaveProtocol
}) => {
	// State
	const [activePreset, setActivePreset] = useState<PhotoProtocolPreset>(STANDARD_12_SLOT_PROTOCOL);
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>(() => initialSlots || EMPTY_INITIAL_SLOTS);
	const [activeViewMode, setActiveViewMode] = useState<'grid' | 'comparison' | 'export'>('grid');
	const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<string | null>(null);
	const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

	// Before/After comparison selection
	const [beforeSlotId, setBeforeSlotId] = useState<string>('portrait_smile');
	const [afterSlotId, setAfterSlotId] = useState<string>('intraoral_frontal_occlusion');

	// File input ref
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentUploadingSlotRef = useRef<string | null>(null);

	useEffect(() => {
		if (initialSlots && Object.keys(initialSlots).length > 0) {
			setSlotsData(initialSlots);
		}
	}, [initialSlots]);

	const getSlotRecord = (slotId: string): PhotoSlotRecord => {
		return slotsData[slotId] || { slotId };
	};

	const updateSlotRecord = (slotId: string, updates: Partial<PhotoSlotRecord>) => {
		setSlotsData(prev => ({
			...prev,
			[slotId]: {
				...(prev[slotId] || { slotId }),
				...updates
			}
		}));
	};

	const handleFileUpload = async (slotId: string, file: File) => {
		try {
			const decoded = await decodeHeicImage(file, {
				targetFormat: "webp",
				quality: 0.94,
				maxDimension: 2048,
				preserveColorProfile: true,
				applyExifRotation: true,
				generateThumbnail: true,
				thumbnailSize: 200,
			});

			updateSlotRecord(slotId, {
				imageUrl: decoded.dataUrl,
				uploadedAt: new Date().toISOString(),
				stage: 'before',
				rotationDegrees: 0,
				flipHorizontal: false,
				flipVertical: false,
				brightness: 0,
				contrast: 0,
				exposure: 0,
				warmth: 0
			});
		} catch (_err) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const resultUrl = e.target?.result as string;
				updateSlotRecord(slotId, {
					imageUrl: resultUrl,
					uploadedAt: new Date().toISOString(),
					stage: 'before',
					rotationDegrees: 0,
					flipHorizontal: false,
					flipVertical: false,
					brightness: 0,
					contrast: 0,
					exposure: 0,
					warmth: 0
				});
			};
			reader.readAsDataURL(file);
		}
	};

	const triggerUploadForSlot = (slotId: string) => {
		currentUploadingSlotRef.current = slotId;
		fileInputRef.current?.click();
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		const file = files && files.length > 0 ? files[0] : null;
		if (file && currentUploadingSlotRef.current) {
			handleFileUpload(currentUploadingSlotRef.current, file);
		}
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const handleDeleteImage = (slotId: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		setSlotsData(prev => {
			const next = { ...prev };
			delete next[slotId];
			return next;
		});
		if (selectedSlotForEdit === slotId) {
			setSelectedSlotForEdit(null);
		}
	};

	const totalUploadedCount = useMemo(() => {
		return Object.values(slotsData).filter(s => !!s.imageUrl).length;
	}, [slotsData]);

	const selectedSlotDef = selectedSlotForEdit ? getSlotDefinitionById(selectedSlotForEdit) : undefined;
	const selectedSlotRec = selectedSlotForEdit ? getSlotRecord(selectedSlotForEdit) : undefined;

	if (!isOpen) return null;

	return (
		<div className="photo-protocol-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="photo-protocol-title">
			<input
				type="file"
				ref={fileInputRef}
				style={{ display: 'none' }}
				accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
				onChange={handleFileInputChange}
			/>

			<div className="photo-protocol-modal">
				{/* Top Header */}
				<div className="photo-protocol-header">
					<div className="photo-protocol-title-group">
						<div className="photo-protocol-badge-icon">
							<Camera size={22} />
						</div>
						<div>
							<h2 id="photo-protocol-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
								Клинический фотопротокол & Фотосетка
							</h2>
							<div style={{ fontSize: '13px', color: 'var(--muted, #64748b)', marginTop: '2px' }}>
								Пациент: <strong style={{ color: 'var(--ink, #0f172a)' }}>{patientName}</strong> ({patientCardNumber}) • Врач: {doctorName}
							</div>
						</div>
					</div>

					{/* Navigation Tabs */}
					<div className="photo-protocol-tabs">
						<button
							className={`photo-protocol-tab-btn ${activeViewMode === 'grid' ? 'active' : ''}`}
							onClick={() => setActiveViewMode('grid')}
						>
							<Grid size={16} />
							Сетка протокола ({totalUploadedCount}/{activePreset.totalSlots})
						</button>
						<button
							className={`photo-protocol-tab-btn ${activeViewMode === 'comparison' ? 'active' : ''}`}
							onClick={() => setActiveViewMode('comparison')}
						>
							<MoveHorizontal size={16} />
							Сравнение До / После
						</button>
						<button
							className={`photo-protocol-tab-btn ${activeViewMode === 'export' ? 'active' : ''}`}
							onClick={() => setActiveViewMode('export')}
						>
							<FileText size={16} />
							Презентация & Коллаж
						</button>
					</div>

					{/* Actions */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						{onSaveProtocol && (
							<button
								className="photo-touch-btn primary"
								onClick={() => onSaveProtocol(slotsData, activePreset.id)}
							>
								<CheckCircle size={16} />
								Сохранить протокол
							</button>
						)}
						<button
							className="photo-touch-btn"
							onClick={onClose}
							title="Закрыть (Esc)"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Body Content */}
				<div className="photo-protocol-body">
					{/* 1. GRID VIEW MODE */}
					{activeViewMode === 'grid' && (
						<>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
									<span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted, #64748b)' }}>
										Протокол:
									</span>
									<select
										value={activePreset.id}
										onChange={(e) => setActivePreset(getPresetById(e.target.value))}
										style={{
											minHeight: '40px',
											padding: '6px 12px',
											borderRadius: '8px',
											border: '1px solid var(--line, #cbd5e1)',
											background: 'var(--paper, #ffffff)',
											color: 'var(--ink, #0f172a)',
											fontSize: '13px',
											fontWeight: 600,
											cursor: 'pointer'
										}}
									>
										{CLINICAL_PROTOCOLS_REGISTRY.map(p => (
											<option key={p.id} value={p.id}>{p.nameRu}</option>
										))}
									</select>
								</div>

								<div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
									<span className="photo-category-pill extraoral">
										Внеротовые: {activePreset.categoryCount.extraoral}
									</span>
									<span className="photo-category-pill intraoral">
										Внутриротовые: {activePreset.categoryCount.intraoral}
									</span>
								</div>
							</div>

							<div className={`photo-slots-grid ${activePreset.totalSlots === 12 ? 'photo-slots-grid-12' : ''}`}>
								{activePreset.slots.map((slotDef) => {
									const record = getSlotRecord(slotDef.id);
									return (
										<PhotoSlotCard
											key={slotDef.id}
											slotDef={slotDef}
											record={record}
											isDragActive={dragOverSlotId === slotDef.id}
											onUploadClick={() => triggerUploadForSlot(slotDef.id)}
											onEditClick={() => setSelectedSlotForEdit(slotDef.id)}
											onDeleteClick={(e) => handleDeleteImage(slotDef.id, e)}
											onDragOver={(e) => {
												e.preventDefault();
												setDragOverSlotId(slotDef.id);
											}}
											onDragLeave={() => setDragOverSlotId(null)}
											onDrop={(e) => {
												e.preventDefault();
												setDragOverSlotId(null);
												const f = e.dataTransfer.files?.[0];
												if (f) handleFileUpload(slotDef.id, f);
											}}
										/>
									);
								})}
							</div>
						</>
					)}

					{/* 2. BEFORE / AFTER COMPARISON */}
					{activeViewMode === 'comparison' && (
						<BeforeAfterComparisonView
							preset={activePreset}
							slotsData={slotsData}
							beforeSlotId={beforeSlotId}
							afterSlotId={afterSlotId}
							clinicName={clinicName}
							patientName={patientName}
							patientCardNumber={patientCardNumber}
							doctorName={doctorName}
							onBeforeSlotChange={setBeforeSlotId}
							onAfterSlotChange={setAfterSlotId}
							onUpdateSlotRecord={updateSlotRecord}
						/>
					)}

					{/* 3. EXPORT & CLINICAL PRESENTATION */}
					{activeViewMode === 'export' && (
						<PhotoCollageExportSheet
							preset={activePreset}
							slotsData={slotsData}
							clinicName={clinicName}
							patientName={patientName}
							patientCardNumber={patientCardNumber}
							doctorName={doctorName}
						/>
					)}
				</div>
			</div>

			{/* Submodal Calibration Drawer */}
			{selectedSlotForEdit && selectedSlotDef && selectedSlotRec && (
				<PhotoCalibrationDrawer
					slotDef={selectedSlotDef}
					record={selectedSlotRec}
					onClose={() => setSelectedSlotForEdit(null)}
					onUpdateRecord={(updates) => updateSlotRecord(selectedSlotForEdit, updates)}
				/>
			)}
		</div>
	);
};

export default ClinicalPhotoProtocolModal;
