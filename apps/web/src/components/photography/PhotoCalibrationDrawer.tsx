import React, { useState, useRef, useEffect } from 'react';
import {
	Sliders,
	X,
	RotateCcw,
	RotateCw,
	FlipHorizontal,
	FlipVertical,
	Pipette,
} from 'lucide-react';
import { PhotoProtocolSlotDefinition, PhotoSlotRecord } from './photoGridPresets';
import { findClosestVitaShade, ColorRGB, ShadeMatchResult } from './photoProtocolMath';

export interface PhotoCalibrationDrawerProps {
	slotDef: PhotoProtocolSlotDefinition;
	record: PhotoSlotRecord;
	onClose: () => void;
	onUpdateRecord: (updates: Partial<PhotoSlotRecord>) => void;
}

export const PhotoCalibrationDrawer: React.FC<PhotoCalibrationDrawerProps> = ({
	slotDef,
	record,
	onClose,
	onUpdateRecord,
}) => {
	const [activeGridOverlay, setActiveGridOverlay] = useState<'none' | 'thirds' | 'frankfurt' | 'golden_ratio' | 'esthetic_e'>('none');
	const [dropperActive, setDropperActive] = useState<boolean>(false);
	const [pickedShadeResult, setPickedShadeResult] = useState<ShadeMatchResult | null>(null);
	const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!dropperActive) return;
		const canvas = editorCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
		const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

		try {
			const pixel = ctx.getImageData(x, y, 1, 1).data;
			const r = pixel[0] ?? 0;
			const g = pixel[1] ?? 0;
			const b = pixel[2] ?? 0;
			const rgb: ColorRGB = { r, g, b };
			const result = findClosestVitaShade(rgb, 'all');
			setPickedShadeResult(result);
			onUpdateRecord({ detectedVitaShade: result.shade.code });
		} catch (err) {
			console.error('Error picking color from canvas:', err);
		}
	};

	useEffect(() => {
		if (!record.imageUrl) return;

		const canvas = editorCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.save();

			ctx.translate(canvas.width / 2, canvas.height / 2);

			const rotRad = ((record.rotationDegrees || 0) * Math.PI) / 180;
			ctx.rotate(rotRad);
			ctx.scale(record.flipHorizontal ? -1 : 1, record.flipVertical ? -1 : 1);

			const b = 100 + (record.brightness || 0);
			const c = 100 + (record.contrast || 0);
			ctx.filter = `brightness(${b}%) contrast(${c}%)`;

			ctx.drawImage(img, -img.width / 2, -img.height / 2);
			ctx.restore();

			// Draw Grid Overlays
			if (activeGridOverlay === 'thirds') {
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
				ctx.lineWidth = Math.max(2, Math.round(canvas.width / 400));
				ctx.beginPath();
				ctx.moveTo(canvas.width / 3, 0); ctx.lineTo(canvas.width / 3, canvas.height);
				ctx.moveTo((2 * canvas.width) / 3, 0); ctx.lineTo((2 * canvas.width) / 3, canvas.height);
				ctx.moveTo(0, canvas.height / 3); ctx.lineTo(canvas.width, canvas.height / 3);
				ctx.moveTo(0, (2 * canvas.height) / 3); ctx.lineTo(canvas.width, (2 * canvas.height) / 3);
				ctx.stroke();
			} else if (activeGridOverlay === 'frankfurt') {
				ctx.strokeStyle = '#06b6d4';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(0, canvas.height * 0.45);
				ctx.lineTo(canvas.width, canvas.height * 0.45);
				ctx.moveTo(canvas.width / 2, 0);
				ctx.lineTo(canvas.width / 2, canvas.height);
				ctx.stroke();

				ctx.fillStyle = '#06b6d4';
				ctx.font = 'bold 16px sans-serif';
				ctx.fillText('Франкфуртская горизонталь', 20, canvas.height * 0.45 - 10);
				ctx.fillText('Срединно-лицевая линия', canvas.width / 2 + 10, 30);
			} else if (activeGridOverlay === 'golden_ratio') {
				ctx.strokeStyle = '#eab308';
				ctx.lineWidth = 2.5;
				ctx.setLineDash([8, 6]);
				const midX = canvas.width / 2;
				const smileY = canvas.height * 0.6;
				ctx.beginPath();
				ctx.ellipse(midX, smileY, canvas.width * 0.25, canvas.height * 0.15, 0, 0, Math.PI);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = '#eab308';
				ctx.font = 'bold 14px sans-serif';
				ctx.fillText('Золотое сечение улыбки (1 : 0.618 : 0.382)', midX - 140, smileY + 40);
			} else if (activeGridOverlay === 'esthetic_e') {
				ctx.strokeStyle = '#ec4899';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(canvas.width * 0.65, canvas.height * 0.2);
				ctx.lineTo(canvas.width * 0.55, canvas.height * 0.85);
				ctx.stroke();
				ctx.fillStyle = '#ec4899';
				ctx.font = 'bold 15px sans-serif';
				ctx.fillText('Линия Риккетса (E-Line)', canvas.width * 0.65 + 10, canvas.height * 0.25);
			}
		};
		img.src = record.imageUrl;
	}, [record, activeGridOverlay]);

	return (
		<div className="photo-editor-overlay" role="dialog" aria-modal="true">
			<div className="photo-editor-modal">
				{/* Editor Header */}
				<div className="photo-protocol-header">
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Sliders size={18} />
						<span style={{ fontWeight: 700, fontSize: '16px' }}>
							Калибровка кадра: {slotDef.titleRu}
						</span>
					</div>
					<button
						className="photo-touch-btn"
						onClick={onClose}
						aria-label="Закрыть редактор"
					>
						<X size={18} />
					</button>
				</div>

				{/* Editor Workspace */}
				<div className="photo-editor-content">
					{/* Canvas Pane */}
					<div className="photo-editor-canvas-pane">
						<canvas
							ref={editorCanvasRef}
							onClick={handleCanvasClick}
							style={{
								maxWidth: '100%',
								maxHeight: '100%',
								objectFit: 'contain',
								cursor: dropperActive ? 'crosshair' : 'default'
							}}
						/>
					</div>

					{/* Sidebar Controls */}
					<div className="photo-editor-sidebar">
						{/* 1. Quick Transformations */}
						<div>
							<h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px 0' }}>
								Трансформация & Зеркало
							</h4>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
								<button
									className="photo-touch-btn"
									onClick={() => {
										onUpdateRecord({ rotationDegrees: ((record.rotationDegrees || 0) - 90 + 360) % 360 });
									}}
								>
									<RotateCcw size={14} /> -90°
								</button>
								<button
									className="photo-touch-btn"
									onClick={() => {
										onUpdateRecord({ rotationDegrees: ((record.rotationDegrees || 0) + 90) % 360 });
									}}
								>
									<RotateCw size={14} /> +90°
								</button>
								<button
									className={`photo-touch-btn ${record.flipHorizontal ? 'primary' : ''}`}
									onClick={() => {
										onUpdateRecord({ flipHorizontal: !record.flipHorizontal });
									}}
									title="Отражение по горизонтали (зеркало)"
								>
									<FlipHorizontal size={14} /> Отразить H
								</button>
								<button
									className={`photo-touch-btn ${record.flipVertical ? 'primary' : ''}`}
									onClick={() => {
										onUpdateRecord({ flipVertical: !record.flipVertical });
									}}
								>
									<FlipVertical size={14} /> Отразить V
								</button>
							</div>
						</div>

						{/* 2. Overlays & Grids */}
						<div>
							<h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px 0' }}>
								Эстетические сетки & Оси
							</h4>
							<select
								value={activeGridOverlay}
								onChange={(e) => setActiveGridOverlay(e.target.value as any)}
								style={{
									width: '100%',
									minHeight: '40px',
									padding: '6px 10px',
									borderRadius: '8px',
									border: '1px solid var(--line, #cbd5e1)',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									fontSize: '13px',
									fontWeight: 600
								}}
							>
								<option value="none">Без сетки</option>
								<option value="thirds">Правило третей</option>
								<option value="frankfurt">Франкфуртская горизонталь & Центр</option>
								<option value="golden_ratio">Золотое сечение улыбки (1.618)</option>
								<option value="esthetic_e">Линия Риккетса (E-Line)</option>
							</select>
						</div>

						{/* 3. Color & Light Adjustments */}
						<div>
							<h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px 0' }}>
								Яркость и Контраст
							</h4>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
										<span>Яркость</span>
										<span>{record.brightness || 0}</span>
									</div>
									<input
										type="range"
										min="-50"
										max="50"
										value={record.brightness || 0}
										onChange={(e) => onUpdateRecord({ brightness: parseInt(e.target.value, 10) })}
										style={{ width: '100%' }}
									/>
								</div>
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
										<span>Контраст</span>
										<span>{record.contrast || 0}</span>
									</div>
									<input
										type="range"
										min="-50"
										max="50"
										value={record.contrast || 0}
										onChange={(e) => onUpdateRecord({ contrast: parseInt(e.target.value, 10) })}
										style={{ width: '100%' }}
									/>
								</div>
							</div>
						</div>

						{/* 4. VITA Shade Matcher Dropper */}
						<div className="shade-matching-box">
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '13px', fontWeight: 700 }}>
									Определение оттенка VITA
								</span>
								<button
									className={`photo-touch-btn ${dropperActive ? 'primary' : ''}`}
									style={{ minHeight: '36px', padding: '4px 10px', fontSize: '12px' }}
									onClick={() => setDropperActive(!dropperActive)}
								>
									<Pipette size={14} />
									{dropperActive ? 'Пипетка активна' : 'Выбрать точку'}
								</button>
							</div>

							{pickedShadeResult ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
									<div className="shade-swatch-row">
										<div
											className="shade-color-chip"
											style={{
												background: `rgb(${pickedShadeResult.shade.rgb.r}, ${pickedShadeResult.shade.rgb.g}, ${pickedShadeResult.shade.rgb.b})`
											}}
										/>
										<div>
											<div style={{ fontSize: '14px', fontWeight: 800 }}>
												{pickedShadeResult.shade.code} ({pickedShadeResult.shade.nameRu})
											</div>
											<div style={{ fontSize: '11px', color: 'var(--muted, #64748b)' }}>
												{pickedShadeResult.deltaEQualityRu}
											</div>
										</div>
									</div>
									<div style={{ fontSize: '11px', color: 'var(--muted, #64748b)' }}>
										{pickedShadeResult.shade.descriptionRu}
									</div>
								</div>
							) : (
								<div style={{ fontSize: '12px', color: 'var(--muted, #64748b)' }}>
									Активируйте пипетку и кликните по поверхности эмали центрального резца.
								</div>
							)}
						</div>

						{/* Close button */}
						<button
							className="photo-touch-btn primary"
							style={{ marginTop: 'auto' }}
							onClick={onClose}
						>
							Готово
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
