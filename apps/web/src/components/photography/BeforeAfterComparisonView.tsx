import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
	MoveHorizontal,
	MoveVertical,
	Camera,
	Sliders,
	RotateCw,
	RotateCcw,
	ZoomIn,
	ZoomOut,
	Sparkles,
	Download,
	Layers,
	FileText,
	Check,
	Maximize2,
	Link as LinkIcon,
} from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord, getSlotDefinitionById } from './photoGridPresets';
import {
	calculateSplitClipPath,
	clamp,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	CollageFormatType,
} from './photoProtocolMath';
import { exportCollageAsPdf, exportCollageAsPng } from './photoProtocolEngine';
import { IncisalAlignmentGuideOverlay, GuideOverlayType } from './IncisalAlignmentGuideOverlay';
import { VitaShadeSelector } from './VitaShadeSelector';
import { BeforeAfterExportModal } from './BeforeAfterExportModal';
import { BeforeAfterFineTunePanel } from './BeforeAfterFineTunePanel';
import { BeforeAfterSideBySideView } from './BeforeAfterSideBySideView';
import { BeforeAfterBlendView } from './BeforeAfterBlendView';

export interface BeforeAfterComparisonViewProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	beforeSlotId: string;
	afterSlotId: string;
	beforePhotoUrl?: string | undefined;
	afterPhotoUrl?: string | undefined;
	clinicName?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	onBeforeSlotChange?: ((id: string) => void) | undefined;
	onAfterSlotChange?: ((id: string) => void) | undefined;
	onUpdateSlotRecord?: ((slotId: string, updates: Partial<PhotoSlotRecord>) => void) | undefined;
}

export const BeforeAfterComparisonView: React.FC<BeforeAfterComparisonViewProps> = ({
	preset,
	slotsData,
	beforeSlotId,
	afterSlotId,
	clinicName = 'DENTE CLINIC',
	patientName = '',
	patientCardNumber = 'К-8492',
	doctorName = 'Д-р Смирнова Е. В.',
	onBeforeSlotChange,
	onAfterSlotChange,
	onUpdateSlotRecord,
}) => {
	// Mode state
	const [comparisonType, setComparisonType] = useState<'split' | 'side_by_side' | 'blend'>('split');
	const [splitDirection, setSplitDirection] = useState<'vertical' | 'horizontal'>('vertical');
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [blendOpacity, setBlendOpacity] = useState<number>(0.5);

	// Alignment Guides state (clean orthopedic guides: bipupillary, incisal, midline, thirds)
	const [activeGuides, setActiveGuides] = useState<Record<GuideOverlayType, boolean>>({
		bipupillary: false,
		incisal: false,
		midline: false,
		thirds: false,
	});
	const [bipupillaryTilt, setBipupillaryTilt] = useState<number>(0);
	const [incisalCanting, setIncisalCanting] = useState<number>(0);

	// Fine-tuning adjustments for Before and After layers
	const [showFineTune, setShowFineTune] = useState<boolean>(false);
	const [beforeRotation, setBeforeRotation] = useState<number>(0);
	const [afterRotation, setAfterRotation] = useState<number>(0);
	const [zoomScale, setZoomScale] = useState<number>(1.0);
	const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// VITA Shade state
	const [showShadePicker, setShowShadePicker] = useState<boolean>(false);
	const [beforeShade, setBeforeShade] = useState<string>('A3');
	const [afterShade, setAfterShade] = useState<string>('BL2');

	// Presentation Export Sheet state
	const [showExportModal, setShowExportModal] = useState<boolean>(false);
	const [exportFormat, setExportFormat] = useState<CollageFormatType>('16_9_hd');
	const [isExporting, setIsExporting] = useState<boolean>(false);

	const isDraggingSplitRef = useRef(false);
	const sliderContainerRef = useRef<HTMLDivElement | null>(null);

	const beforeSlotRecord = slotsData[beforeSlotId] || { slotId: beforeSlotId };
	const afterSlotRecord = slotsData[afterSlotId] || { slotId: afterSlotId };

	useEffect(() => {
		if (beforeSlotRecord.detectedVitaShade) {
			setBeforeShade(beforeSlotRecord.detectedVitaShade);
		}
		if (afterSlotRecord.detectedVitaShade) {
			setAfterShade(afterSlotRecord.detectedVitaShade);
		}
	}, [beforeSlotRecord.detectedVitaShade, afterSlotRecord.detectedVitaShade]);

	useEffect(() => {
		if (!showExportModal) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				setShowExportModal(false);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [showExportModal]);

	const COMPARISON_PROJECTIONS = useMemo(() => [
		{ id: 'portrait_smile', labelRu: 'Анфас улыбка' },
		{ id: 'portrait_rest', labelRu: 'Анфас покой' },
		{ id: 'intraoral_frontal_occlusion', labelRu: 'Фронтальная окклюзия' },
		{ id: 'intraoral_maxillary_occlusal', labelRu: 'Окклюзия в/ч' },
		{ id: 'intraoral_mandibular_occlusal', labelRu: 'Окклюзия н/ч' },
		{ id: 'intraoral_right_buccal', labelRu: 'Боковой правый' },
		{ id: 'intraoral_left_buccal', labelRu: 'Боковой левый' },
		{ id: 'profile_90_smile', labelRu: 'Профиль 90°' },
		{ id: 'intraoral_overjet', labelRu: 'Сагиттальная щель' },
	], []);

	const isCurrentPairLinked = Boolean(
		(beforeSlotRecord.paired_document_id && (beforeSlotRecord.paired_document_id === afterSlotId || beforeSlotRecord.paired_document_id === afterSlotRecord.slotId)) ||
		(beforeSlotRecord.paired_photo_id && (beforeSlotRecord.paired_photo_id === afterSlotId || beforeSlotRecord.paired_photo_id === afterSlotRecord.slotId))
	);

	const handlePairCurrent = () => {
		onUpdateSlotRecord?.(beforeSlotId, {
			paired_document_id: afterSlotId,
			paired_photo_id: afterSlotId,
			stage: 'before',
		});
		onUpdateSlotRecord?.(afterSlotId, {
			paired_document_id: beforeSlotId,
			paired_photo_id: beforeSlotId,
			stage: 'after',
		});
	};

	const handleUnpairCurrent = () => {
		onUpdateSlotRecord?.(beforeSlotId, {
			paired_document_id: null,
			paired_photo_id: null,
		});
		onUpdateSlotRecord?.(afterSlotId, {
			paired_document_id: null,
			paired_photo_id: null,
		});
	};

	// Wiper Slider Pointer Handlers
	const handleSplitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingSplitRef.current = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		updateSplitFromPointer(e);
	};

	const handleSplitPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingSplitRef.current) return;
		updateSplitFromPointer(e);
	};

	const handleSplitPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingSplitRef.current = false;
		try {
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			// ignore if already released
		}
	};

	const updateSplitFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!sliderContainerRef.current) return;
		const container = sliderContainerRef.current.getBoundingClientRect();
		if (splitDirection === 'vertical') {
			const relativeX = e.clientX - container.left;
			const percent = clamp((relativeX / container.width) * 100, 0, 100);
			setSplitPercent(Math.round(percent));
		} else {
			const relativeY = e.clientY - container.top;
			const percent = clamp((relativeY / container.height) * 100, 0, 100);
			setSplitPercent(Math.round(percent));
		}
	};

	// Mouse Wheel Split Handler
	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const newPercent = calculateWiperWheelDelta(splitPercent, e.deltaY, 2);
		setSplitPercent(newPercent);
	};

	// Keyboard Navigation Handler
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
			e.preventDefault();
			const newPercent = calculateKeyboardWiperDelta(splitPercent, e.key, e.shiftKey);
			setSplitPercent(newPercent);
		}
	};

	const toggleGuide = (guideKey: GuideOverlayType) => {
		setActiveGuides(prev => ({
			...prev,
			[guideKey]: !prev[guideKey],
		}));
	};

	const handleBeforeShadeChange = (code: string) => {
		setBeforeShade(code);
		onUpdateSlotRecord?.(beforeSlotId, { detectedVitaShade: code });
	};

	const handleAfterShadeChange = (code: string) => {
		setAfterShade(code);
		onUpdateSlotRecord?.(afterSlotId, { detectedVitaShade: code });
	};

	const resetAlignment = () => {
		setBeforeRotation(0);
		setAfterRotation(0);
		setZoomScale(1.0);
		setPanOffset({ x: 0, y: 0 });
		setBipupillaryTilt(0);
		setIncisalCanting(0);
	};

	// 1-Click High-Res Canvas Export (delegated to canonical photoProtocolEngine)
	const exportCollageToPng = useCallback(async () => {
		if (isExporting) return;
		setIsExporting(true);
		try {
			await exportCollageAsPng({
				clinicName,
				patientName,
				patientCardNumber,
				doctorName,
				beforeTitle: getSlotDefinitionById(beforeSlotId)?.shortLabelRu || 'До',
				afterTitle: getSlotDefinitionById(afterSlotId)?.shortLabelRu || 'После',
				beforeImageUrl: beforeSlotRecord.imageUrl,
				afterImageUrl: afterSlotRecord.imageUrl,
				beforeShade,
				afterShade,
				format: exportFormat,
			});
			setShowExportModal(false);
		} catch (err) {
			console.error('Failed to export collage as PNG', err);
		} finally {
			setIsExporting(false);
		}
	}, [exportFormat, clinicName, patientName, patientCardNumber, doctorName, beforeShade, afterShade, beforeSlotRecord.imageUrl, afterSlotRecord.imageUrl, beforeSlotId, afterSlotId, isExporting]);

	const exportCollageToPdfHandler = useCallback(() => {
		exportCollageAsPdf({
			clinicName,
			patientName,
			patientCardNumber,
			doctorName,
			beforeTitle: getSlotDefinitionById(beforeSlotId)?.shortLabelRu || 'До',
			afterTitle: getSlotDefinitionById(afterSlotId)?.shortLabelRu || 'После',
			beforeImageUrl: beforeSlotRecord.imageUrl,
			afterImageUrl: afterSlotRecord.imageUrl,
			beforeShade,
			afterShade,
			format: exportFormat,
		});
		setShowExportModal(false);
	}, [clinicName, patientName, patientCardNumber, doctorName, beforeSlotId, afterSlotId, beforeSlotRecord.imageUrl, afterSlotRecord.imageUrl, beforeShade, afterShade, exportFormat]);

	return (
		<div className="ba-comparison-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
			{/* 0. 1-Click Projection Selector & DentalPin Pairing Bar */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				flexWrap: 'wrap',
				width: '100%',
				maxWidth: '1100px',
				background: 'var(--paper, #ffffff)',
				padding: '8px 14px',
				borderRadius: '12px',
				border: '1px solid var(--line, #e2e8f0)',
			}}>
				<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
					1-Клик Проекция:
				</span>
				<div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
					{COMPARISON_PROJECTIONS.map((p) => {
						const isSelected = beforeSlotId === p.id && afterSlotId === p.id;
						return (
							<button
								key={p.id}
								type="button"
								className={`photo-touch-btn ${isSelected ? 'primary' : ''}`}
								onClick={() => {
									onBeforeSlotChange?.(p.id);
									onAfterSlotChange?.(p.id);
								}}
								style={{
									minHeight: '34px',
									padding: '4px 10px',
									fontSize: '12px',
									borderRadius: '6px',
									fontWeight: isSelected ? 700 : 500,
								}}
							>
								{p.labelRu}
							</button>
						);
					})}
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{isCurrentPairLinked ? (
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: '4px',
									fontSize: '11px',
									fontWeight: 700,
									padding: '4px 8px',
									borderRadius: '6px',
									background: 'rgba(34, 197, 94, 0.15)',
									color: 'var(--green, #16a34a)',
								}}
							>
								<LinkIcon size={12} /> Спарено (DentalPin)
							</span>
							<button
								type="button"
								className="photo-touch-btn danger"
								onClick={handleUnpairCurrent}
								style={{ minHeight: '32px', padding: '3px 8px', fontSize: '11px' }}
								title="Разорвать связь пары До/После"
							>
								Отвязать
							</button>
						</div>
					) : (
						<button
							type="button"
							className="photo-touch-btn"
							onClick={handlePairCurrent}
							style={{ minHeight: '32px', padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
							title="Связать выбранные кадры До и После как эталонную пару (paired_document_id)"
						>
							<LinkIcon size={12} /> Спарить До/После
						</button>
					)}
				</div>
			</div>

			{/* 1. Main Controls Toolbar */}
			<div style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				width: '100%',
				maxWidth: '1100px',
				flexWrap: 'wrap',
				gap: '12px',
				background: 'var(--paper, #ffffff)',
				padding: '12px 16px',
				borderRadius: '12px',
				border: '1px solid var(--line, #e2e8f0)',
			}}>
				{/* Slots Pickers */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
					<div>
						<label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)', display: 'block' }}>
							ДО (Слева / Снизу):
						</label>
						<select
							value={beforeSlotId}
							onChange={(e) => onBeforeSlotChange?.(e.target.value)}
							style={{
								padding: '6px 10px',
								borderRadius: '8px',
								border: '1px solid var(--line, #cbd5e1)',
								background: 'var(--paper, #ffffff)',
								color: 'var(--ink, #0f172a)',
								fontSize: '13px',
								fontWeight: 600,
								minHeight: '44px',
							}}
						>
							{preset.slots.map(s => (
								<option key={s.id} value={s.id}>{s.shortLabelRu}</option>
							))}
						</select>
					</div>

					<div>
						<label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)', display: 'block' }}>
							ПОСЛЕ (Справа / Сверху):
						</label>
						<select
							value={afterSlotId}
							onChange={(e) => onAfterSlotChange?.(e.target.value)}
							style={{
								padding: '6px 10px',
								borderRadius: '8px',
								border: '1px solid var(--line, #cbd5e1)',
								background: 'var(--paper, #ffffff)',
								color: 'var(--ink, #0f172a)',
								fontSize: '13px',
								fontWeight: 600,
								minHeight: '44px',
							}}
						>
							{preset.slots.map(s => (
								<option key={s.id} value={s.id}>{s.shortLabelRu}</option>
							))}
						</select>
					</div>
				</div>

				{/* Comparison Mode Selector */}
				<div style={{ display: 'flex', gap: '4px', background: 'var(--surface, #f1f5f9)', padding: '4px', borderRadius: '8px' }}>
					<button
						type="button"
						className={`photo-touch-btn ${comparisonType === 'split' ? 'primary' : ''}`}
						onClick={() => setComparisonType('split')}
						style={{ minHeight: '44px', minWidth: '44px', padding: '6px 12px', fontSize: '13px' }}
					>
						Шторка До/После
					</button>
					<button
						type="button"
						className={`photo-touch-btn ${comparisonType === 'side_by_side' ? 'primary' : ''}`}
						onClick={() => setComparisonType('side_by_side')}
						style={{ minHeight: '44px', minWidth: '44px', padding: '6px 12px', fontSize: '13px' }}
					>
						Бок о бок
					</button>
					<button
						type="button"
						className={`photo-touch-btn ${comparisonType === 'blend' ? 'primary' : ''}`}
						onClick={() => setComparisonType('blend')}
						style={{ minHeight: '44px', minWidth: '44px', padding: '6px 12px', fontSize: '13px' }}
					>
						Наложение
					</button>
				</div>

				{/* Quick Action Toggles */}
				<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
					<button
						type="button"
						className={`photo-touch-btn ${showShadePicker ? 'primary' : ''}`}
						onClick={() => setShowShadePicker(!showShadePicker)}
						title="Шкала VITA (A1-D4 / 3D-Master)"
						style={{ minHeight: '44px', minWidth: '44px' }}
					>
						<Sparkles size={16} />
						VITA ({beforeShade}→{afterShade})
					</button>

					<button
						type="button"
						className={`photo-touch-btn ${showFineTune ? 'primary' : ''}`}
						onClick={() => setShowFineTune(!showFineTune)}
						title="Тонкая калибровка выравнивания"
						style={{ minHeight: '44px', minWidth: '44px' }}
					>
						<Sliders size={16} />
						Выравнивание
					</button>

					<button
						type="button"
						className="photo-touch-btn primary"
						onClick={() => setShowExportModal(true)}
						title="1-клик экспорт презентации плана лечения"
						style={{ minHeight: '44px', minWidth: '44px' }}
					>
						<Download size={16} />
						Экспорт коллажа
					</button>
				</div>
			</div>

			{/* 2. VITA Shade Selector Accordion Panel */}
			{showShadePicker && (
				<div style={{ width: '100%', maxWidth: '1100px' }}>
					<VitaShadeSelector
						beforeShadeCode={beforeShade}
						afterShadeCode={afterShade}
						onBeforeShadeChange={handleBeforeShadeChange}
						onAfterShadeChange={handleAfterShadeChange}
					/>
				</div>
			)}

			{/* 3. Incisal & Bipupillary Alignment Toolbar */}
			<BeforeAfterFineTunePanel
				isOpen={showFineTune}
				activeGuides={activeGuides}
				onToggleGuide={toggleGuide}
				bipupillaryTilt={bipupillaryTilt}
				onBipupillaryTiltChange={setBipupillaryTilt}
				incisalCanting={incisalCanting}
				onIncisalCantingChange={setIncisalCanting}
				zoomScale={zoomScale}
				onZoomScaleChange={setZoomScale}
				onResetAlignment={resetAlignment}
			/>

			{/* 4. Interactive Viewport Area */}

			{/* Mode A: Wiper Split Slider */}
			{comparisonType === 'split' && (
				<div
					ref={sliderContainerRef}
					tabIndex={0}
					className="ba-slider-container"
					onPointerDown={handleSplitPointerDown}
					onPointerMove={handleSplitPointerMove}
					onPointerUp={handleSplitPointerUp}
					onWheel={handleWheel}
					onKeyDown={handleKeyDown}
					style={{
						position: 'relative',
						width: '100%',
						maxWidth: '1100px',
						height: '540px',
						background: 'var(--paper-strong, #020617)',
						borderRadius: '16px',
						overflow: 'hidden',
						cursor: 'col-resize',
						outline: 'none',
						userSelect: 'none',
						touchAction: 'none',
					}}
				>
					{/* Before Image Layer */}
					{beforeSlotRecord.imageUrl ? (
						<img
							src={beforeSlotRecord.imageUrl}
							alt="До лечения"
							loading="lazy"
							decoding="async"
							className="ba-image-layer"
							style={{
								position: 'absolute',
								inset: 0,
								width: '100%',
								height: '100%',
								objectFit: 'contain',
								transform: `scale(${zoomScale}) rotate(${beforeRotation}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
								transformOrigin: 'center center',
								transition: 'transform 0.05s linear',
							}}
						/>
					) : (
						<div
							data-testid="before-slot-placeholder"
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
								color: 'var(--muted, #64748b)',
								gap: '8px',
							}}
						>
							<Camera size={36} style={{ opacity: 0.5 }} />
							<span style={{ fontSize: '13px', fontWeight: 600 }}>Кадр «До» не загружен</span>
						</div>
					)}

					{/* After Image Layer with Split Clip */}
					{afterSlotRecord.imageUrl && (
						<img
							src={afterSlotRecord.imageUrl}
							alt="После лечения"
							loading="lazy"
							decoding="async"
							className="ba-image-layer"
							style={{
								position: 'absolute',
								inset: 0,
								width: '100%',
								height: '100%',
								objectFit: 'contain',
								clipPath: calculateSplitClipPath(splitPercent, splitDirection),
								transform: `scale(${zoomScale}) rotate(${afterRotation}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
								transformOrigin: 'center center',
								transition: 'transform 0.05s linear',
							}}
						/>
					)}

					{/* Alignment Guides Overlay */}
					<IncisalAlignmentGuideOverlay
						activeGuides={activeGuides}
						bipupillaryTiltDegrees={bipupillaryTilt}
						incisalCantingDegrees={incisalCanting}
					/>

					{/* Wiper Handle Bar */}
					{splitDirection === 'vertical' ? (
						<div
							className="ba-handle-line"
							style={{
								position: 'absolute',
								top: 0,
								bottom: 0,
								left: `${splitPercent}%`,
								width: '3px',
								background: 'var(--paper, #ffffff)',
								boxShadow: '0 0 10px rgba(0,0,0,0.7)',
								pointerEvents: 'none',
								zIndex: 30,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<div
								className="ba-handle-circle"
								style={{
									width: '44px',
									height: '44px',
									borderRadius: '50%',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
									border: '2px solid var(--brand-500, #2563eb)',
								}}
							>
								<MoveHorizontal size={22} />
							</div>
						</div>
					) : (
						<div
							className="ba-handle-line"
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: `${splitPercent}%`,
								height: '3px',
								background: 'var(--paper, #ffffff)',
								boxShadow: '0 0 10px rgba(0,0,0,0.7)',
								pointerEvents: 'none',
								zIndex: 30,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<div
								className="ba-handle-circle"
								style={{
									width: '44px',
									height: '44px',
									borderRadius: '50%',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
									border: '2px solid var(--brand-500, #2563eb)',
								}}
							>
								<MoveVertical size={22} />
							</div>
						</div>
					)}

					{/* Pills / Tags */}
					<div
						className="ba-pill-tag before"
						style={{
							position: 'absolute',
							bottom: '16px',
							left: '16px',
							background: 'rgba(15, 23, 42, 0.85)',
							color: 'var(--teal-light, #38bdf8)',
							padding: '6px 12px',
							borderRadius: '20px',
							fontSize: '12px',
							fontWeight: 800,
							zIndex: 25,
						}}
					>
						ДО: {getSlotDefinitionById(beforeSlotId)?.shortLabelRu} (VITA {beforeShade})
					</div>

					<div
						className="ba-pill-tag after"
						style={{
							position: 'absolute',
							bottom: '16px',
							right: '16px',
							background: 'rgba(15, 23, 42, 0.85)',
							color: 'var(--green, #4ade80)',
							padding: '6px 12px',
							borderRadius: '20px',
							fontSize: '12px',
							fontWeight: 800,
							zIndex: 25,
						}}
					>
						ПОСЛЕ: {getSlotDefinitionById(afterSlotId)?.shortLabelRu} (VITA {afterShade}) • {splitPercent}%
					</div>
				</div>
			)}

			{/* Mode B: Side by Side (Synchronous Pair View) */}
			{comparisonType === 'side_by_side' && (
				<BeforeAfterSideBySideView
					beforeSlotRecord={beforeSlotRecord}
					afterSlotRecord={afterSlotRecord}
					beforeSlotId={beforeSlotId}
					afterSlotId={afterSlotId}
					beforeShade={beforeShade}
					afterShade={afterShade}
					zoomScale={zoomScale}
					beforeRotation={beforeRotation}
					afterRotation={afterRotation}
					panOffset={panOffset}
					onZoomIn={() => setZoomScale(prev => Math.min(2.5, +(prev + 0.2).toFixed(1)))}
					onZoomOut={() => setZoomScale(prev => Math.max(1.0, +(prev - 0.2).toFixed(1)))}
					onResetAlignment={resetAlignment}
				/>
			)}

			{/* Mode C: Blend Overlay */}
			{comparisonType === 'blend' && (
				<BeforeAfterBlendView
					beforeSlotRecord={beforeSlotRecord}
					afterSlotRecord={afterSlotRecord}
					blendOpacity={blendOpacity}
					onBlendOpacityChange={setBlendOpacity}
				/>
			)}

			{/* 5. 1-Click Export Modal (Anti-Matryoshka: constrained inside workspace) */}
			<BeforeAfterExportModal
				isOpen={showExportModal}
				onClose={() => setShowExportModal(false)}
				patientName={patientName}
				beforeShade={beforeShade}
				afterShade={afterShade}
				exportFormat={exportFormat}
				onExportFormatChange={setExportFormat}
				onExportPdf={exportCollageToPdfHandler}
				onExportPng={exportCollageToPng}
				isExporting={isExporting}
			/>
		</div>
	);
};
