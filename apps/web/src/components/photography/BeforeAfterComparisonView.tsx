import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
	MoveHorizontal,
	MoveVertical,
	Eye,
	Sliders,
	RotateCw,
	RotateCcw,
	ZoomIn,
	ZoomOut,
	Sparkles,
	Printer,
	Download,
	Layers,
	FileText,
	Check,
	Maximize2
} from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord, getSlotDefinitionById } from './photoGridPresets';
import {
	calculateSplitClipPath,
	clamp,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	generateCollageWatermarkText,
	calculateCollageDimensions,
	CollageFormatType,
} from './photoProtocolMath';
import { IncisalAlignmentGuideOverlay, GuideOverlayType } from './IncisalAlignmentGuideOverlay';
import { VitaShadeSelector } from './VitaShadeSelector';

export interface BeforeAfterComparisonViewProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	beforeSlotId: string;
	afterSlotId: string;
	clinicName?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	onBeforeSlotChange: (id: string) => void;
	onAfterSlotChange: (id: string) => void;
	onUpdateSlotRecord?: (slotId: string, updates: Partial<PhotoSlotRecord>) => void;
}

export const BeforeAfterComparisonView: React.FC<BeforeAfterComparisonViewProps> = ({
	preset,
	slotsData,
	beforeSlotId,
	afterSlotId,
	clinicName = 'DENTE CLINIC',
	patientName = 'Иванов Иван Иванович',
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

	// Alignment Guides state
	const [activeGuides, setActiveGuides] = useState<Record<GuideOverlayType, boolean>>({
		bipupillary: false,
		incisal: false,
		midline: false,
		golden_ratio: false,
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

	// 1-Click High-Res Canvas Export
	const exportCollageToPng = useCallback(() => {
		setIsExporting(true);
		const dimensions = calculateCollageDimensions(exportFormat);
		const canvas = document.createElement('canvas');
		canvas.width = dimensions.widthPx;
		canvas.height = dimensions.heightPx;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			setIsExporting(false);
			return;
		}

		// Background
		ctx.fillStyle = '#0f172a';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Header area with Watermark
		const headerHeight = Math.round(canvas.height * 0.12);
		ctx.fillStyle = '#1e293b';
		ctx.fillRect(0, 0, canvas.width, headerHeight);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 36px sans-serif';
		ctx.fillText(clinicName, 40, 55);

		ctx.font = '22px sans-serif';
		ctx.fillStyle = '#94a3b8';
		ctx.fillText('Клинический протокол До / После (AACD / DSD стандарт)', 40, 95);

		// Patient watermark details on top right
		ctx.font = 'bold 20px sans-serif';
		ctx.fillStyle = '#f8fafc';
		ctx.textAlign = 'right';
		ctx.fillText(`Пациент: ${patientName} (${patientCardNumber})`, canvas.width - 40, 50);
		ctx.font = '18px sans-serif';
		ctx.fillStyle = '#94a3b8';
		ctx.fillText(`Врач: ${doctorName} • ${new Date().toLocaleDateString('ru-RU')}`, canvas.width - 40, 85);
		ctx.fillText(`Оттенки VITA: ДО ${beforeShade} -> ПОСЛЕ ${afterShade}`, canvas.width - 40, 115);
		ctx.textAlign = 'left';

		// Draw Image Layers side by side
		const contentY = headerHeight + 30;
		const contentHeight = canvas.height - contentY - 60;
		const colWidth = (canvas.width - 90) / 2;

		const imgBefore = new Image();
		imgBefore.crossOrigin = 'anonymous';
		const imgAfter = new Image();
		imgAfter.crossOrigin = 'anonymous';

		let loadedCount = 0;
		const renderImages = () => {
			loadedCount++;
			if (loadedCount >= 2) {
				// Draw Before Image
				if (imgBefore.width > 0) {
					ctx.drawImage(imgBefore, 30, contentY, colWidth, contentHeight);
					ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
					ctx.fillRect(40, contentY + 20, 220, 40);
					ctx.fillStyle = '#38bdf8';
					ctx.font = 'bold 22px sans-serif';
					ctx.fillText(`ДО: ${getSlotDefinitionById(beforeSlotId)?.shortLabelRu || 'До'} (${beforeShade})`, 50, contentY + 48);
				}

				// Draw After Image
				if (imgAfter.width > 0) {
					ctx.drawImage(imgAfter, 30 + colWidth + 30, contentY, colWidth, contentHeight);
					ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
					ctx.fillRect(30 + colWidth + 40, contentY + 20, 240, 40);
					ctx.fillStyle = '#4ade80';
					ctx.font = 'bold 22px sans-serif';
					ctx.fillText(`ПОСЛЕ: ${getSlotDefinitionById(afterSlotId)?.shortLabelRu || 'После'} (${afterShade})`, 30 + colWidth + 50, contentY + 48);
				}

				// Bottom Watermark bar
				const watermarkText = generateCollageWatermarkText(clinicName, patientName, patientCardNumber, doctorName);
				ctx.fillStyle = '#090d16';
				ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
				ctx.fillStyle = '#64748b';
				ctx.font = '15px sans-serif';
				ctx.fillText(watermarkText, 40, canvas.height - 15);

				// Trigger download
				const dataUrl = canvas.toDataURL('image/png');
				const link = document.createElement('a');
				link.download = `PhotoProtocol_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
				link.href = dataUrl;
				link.click();
				setIsExporting(false);
				setShowExportModal(false);
			}
		};

		imgBefore.onload = renderImages;
		imgBefore.onerror = renderImages;
		imgAfter.onload = renderImages;
		imgAfter.onerror = renderImages;

		imgBefore.src = beforeSlotRecord.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231e293b" width="100%" height="100%"/><text fill="%2364748b" x="50%" y="50%" text-anchor="middle">Кадр До</text></svg>';
		imgAfter.src = afterSlotRecord.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231e293b" width="100%" height="100%"/><text fill="%2364748b" x="50%" y="50%" text-anchor="middle">Кадр После</text></svg>';
	}, [exportFormat, clinicName, patientName, patientCardNumber, doctorName, beforeShade, afterShade, beforeSlotRecord.imageUrl, afterSlotRecord.imageUrl, beforeSlotId, afterSlotId]);

	return (
		<div className="ba-comparison-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
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
							onChange={(e) => onBeforeSlotChange(e.target.value)}
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
							onChange={(e) => onAfterSlotChange(e.target.value)}
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
			{showFineTune && (
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
					width: '100%',
					maxWidth: '1100px',
					background: 'var(--surface, #f8fafc)',
					border: '1px solid var(--line, #e2e8f0)',
					borderRadius: '12px',
					padding: '12px 16px',
				}}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<Eye size={16} style={{ color: 'var(--brand-500, #2563eb)' }} />
							<span style={{ fontSize: '13px', fontWeight: 700 }}>
								Ориентиры и направляющие сетки (Aesthetic Guides):
							</span>
						</div>

						<button
							type="button"
							className="photo-touch-btn"
							onClick={resetAlignment}
							style={{ fontSize: '12px', minHeight: '34px', minWidth: '44px', padding: '4px 10px' }}
						>
							Сбросить выравнивание
						</button>
					</div>

					{/* Guide Toggles */}
					<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
						<button
							type="button"
							className={`photo-touch-btn ${activeGuides.bipupillary ? 'primary' : ''}`}
							onClick={() => toggleGuide('bipupillary')}
							style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
						>
							Межзрачковая линия
						</button>
						<button
							type="button"
							className={`photo-touch-btn ${activeGuides.incisal ? 'primary' : ''}`}
							onClick={() => toggleGuide('incisal')}
							style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
						>
							Резцовый край
						</button>
						<button
							type="button"
							className={`photo-touch-btn ${activeGuides.midline ? 'primary' : ''}`}
							onClick={() => toggleGuide('midline')}
							style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
						>
							Срединная линия
						</button>
						<button
							type="button"
							className={`photo-touch-btn ${activeGuides.golden_ratio ? 'primary' : ''}`}
							onClick={() => toggleGuide('golden_ratio')}
							style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
						>
							Золотое сечение
						</button>
						<button
							type="button"
							className={`photo-touch-btn ${activeGuides.thirds ? 'primary' : ''}`}
							onClick={() => toggleGuide('thirds')}
							style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
						>
							Сетка третей
						</button>
					</div>

					{/* Angle & Scale Sliders */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '4px' }}>
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
								<span>Крен зрачковой линии:</span>
								<span>{bipupillaryTilt > 0 ? `+${bipupillaryTilt}°` : `${bipupillaryTilt}°`}</span>
							</div>
							<input
								type="range"
								min="-15"
								max="15"
								step="0.5"
								value={bipupillaryTilt}
								onChange={(e) => setBipupillaryTilt(parseFloat(e.target.value))}
								style={{ width: '100%' }}
							/>
						</div>

						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
								<span>Крен резцовой линии:</span>
								<span>{incisalCanting > 0 ? `+${incisalCanting}°` : `${incisalCanting}°`}</span>
							</div>
							<input
								type="range"
								min="-15"
								max="15"
								step="0.5"
								value={incisalCanting}
								onChange={(e) => setIncisalCanting(parseFloat(e.target.value))}
								style={{ width: '100%' }}
							/>
						</div>

						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
								<span>Масштаб (Zoom):</span>
								<span>{Math.round(zoomScale * 100)}%</span>
							</div>
							<input
								type="range"
								min="1.0"
								max="2.5"
								step="0.05"
								value={zoomScale}
								onChange={(e) => setZoomScale(parseFloat(e.target.value))}
								style={{ width: '100%' }}
							/>
						</div>
					</div>
				</div>
			)}

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
						background: '#020617',
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
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
							Кадр «До» не загружен
						</div>
					)}

					{/* After Image Layer with Split Clip */}
					{afterSlotRecord.imageUrl && (
						<img
							src={afterSlotRecord.imageUrl}
							alt="После лечения"
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
								background: '#ffffff',
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
									background: '#ffffff',
									color: '#0f172a',
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
								background: '#ffffff',
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
									background: '#ffffff',
									color: '#0f172a',
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
							color: '#38bdf8',
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
							color: '#4ade80',
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

			{/* Mode B: Side by Side */}
			{comparisonType === 'side_by_side' && (
				<div style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: '16px',
					width: '100%',
					maxWidth: '1100px',
					height: '520px',
				}}>
					<div style={{ background: '#020617', borderRadius: '16px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						{beforeSlotRecord.imageUrl ? (
							<img src={beforeSlotRecord.imageUrl} alt="До" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
						) : <span style={{ color: '#64748b' }}>Нет кадра «До»</span>}
						<div className="ba-pill-tag before" style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.8)', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
							ДО ({beforeShade})
						</div>
					</div>

					<div style={{ background: '#020617', borderRadius: '16px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						{afterSlotRecord.imageUrl ? (
							<img src={afterSlotRecord.imageUrl} alt="После" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
						) : <span style={{ color: '#64748b' }}>Нет кадра «После»</span>}
						<div className="ba-pill-tag after" style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(15, 23, 42, 0.8)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
							ПОСЛЕ ({afterShade})
						</div>
					</div>
				</div>
			)}

			{/* Mode C: Blend Overlay */}
			{comparisonType === 'blend' && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '1100px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
						<span style={{ fontSize: '13px', fontWeight: 600 }}>Прозрачность наложения:</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={blendOpacity}
							onChange={(e) => setBlendOpacity(parseFloat(e.target.value))}
							style={{ flex: 1 }}
						/>
						<span style={{ fontSize: '13px', fontWeight: 700 }}>{Math.round(blendOpacity * 100)}%</span>
					</div>

					<div style={{ position: 'relative', width: '100%', height: '520px', background: '#020617', borderRadius: '16px', overflow: 'hidden' }}>
						{beforeSlotRecord.imageUrl && (
							<img src={beforeSlotRecord.imageUrl} alt="До" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
						)}
						{afterSlotRecord.imageUrl && (
							<img src={afterSlotRecord.imageUrl} alt="После" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: blendOpacity }} />
						)}
					</div>
				</div>
			)}

			{/* 5. 1-Click Export Modal */}
			{showExportModal && (
				<div
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(15, 23, 42, 0.8)',
						backdropFilter: 'blur(6px)',
						zIndex: 99999,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '20px',
					}}
					role="dialog"
					aria-modal="true"
				>
					<div style={{
						background: 'var(--paper, #ffffff)',
						color: 'var(--ink, #0f172a)',
						borderRadius: '16px',
						border: '1px solid var(--line, #e2e8f0)',
						width: '100%',
						maxWidth: '560px',
						padding: '24px',
						display: 'flex',
						flexDirection: 'column',
						gap: '18px',
						boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
					}}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
								<Download size={20} style={{ color: 'var(--brand-500, #2563eb)' }} />
								<h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
									Экспорт клинического коллажа
								</h3>
							</div>
							<button
								type="button"
								className="photo-touch-btn"
								onClick={() => setShowExportModal(false)}
								style={{ minHeight: '36px', minWidth: '44px', padding: '4px 8px' }}
							>
								✕
							</button>
						</div>

						<p style={{ fontSize: '13px', color: 'var(--muted, #64748b)', margin: 0 }}>
							Генерация презентационного листа с водяным знаком клиники, ФИО пациента ({patientName}), датой и сопоставлением оттенков VITA ({beforeShade} → {afterShade}).
						</p>

						{/* Format Selection */}
						<div>
							<label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
								Формат экспорта:
							</label>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
								{[
									{ id: '16_9_hd', label: 'Презентация 16:9 Full HD (1920x1080) — Идеально для экрана и ТВ' },
									{ id: 'A4_landscape', label: 'Лист A4 Альбомный (297x210 мм, 300 DPI) — Для печати' },
									{ id: 'A4_portrait', label: 'Лист A4 Портретный (210x297 мм, 300 DPI) — Для истории болезни 043/у' },
								].map((fmt) => (
									<label
										key={fmt.id}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '10px',
											padding: '10px 14px',
											borderRadius: '8px',
											border: exportFormat === fmt.id ? '2px solid var(--brand-500, #2563eb)' : '1px solid var(--line, #cbd5e1)',
											background: exportFormat === fmt.id ? 'rgba(37, 99, 235, 0.06)' : 'var(--paper, #ffffff)',
											cursor: 'pointer',
											fontSize: '13px',
											fontWeight: 600,
											minHeight: '44px',
										}}
									>
										<input
											type="radio"
											name="exportFormat"
											value={fmt.id}
											checked={exportFormat === fmt.id}
											onChange={() => setExportFormat(fmt.id as CollageFormatType)}
										/>
										<span>{fmt.label}</span>
									</label>
								))}
							</div>
						</div>

						{/* Actions */}
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
							<button
								type="button"
								className="photo-touch-btn"
								onClick={() => setShowExportModal(false)}
								style={{ minHeight: '44px', minWidth: '44px' }}
							>
								Отмена
							</button>

							<button
								type="button"
								className="photo-touch-btn primary"
								onClick={exportCollageToPng}
								disabled={isExporting}
								style={{ minHeight: '44px', minWidth: '44px', padding: '8px 20px', fontWeight: 700 }}
							>
								<Download size={16} />
								{isExporting ? 'Экспорт...' : 'Скачать PNG'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
