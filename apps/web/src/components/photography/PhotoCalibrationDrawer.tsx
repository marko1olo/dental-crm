import React, { useState, useRef, useEffect } from 'react';
import {
	Sliders,
	X,
	RotateCcw,
	RotateCw,
	FlipHorizontal,
	FlipVertical,
	Check,
	Camera,
	Palette,
} from 'lucide-react';
import { PhotoProtocolSlotDefinition, PhotoSlotRecord } from './photoGridPresets';
import {
	createVitaPhysicalTabReference,
	VitaPhysicalTabReference,
} from './photoProtocolMath';
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VitaShade,
	VitaSystemType,
} from './vitaShadesCatalog';

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
	const [activeGridOverlay, setActiveGridOverlay] = useState<'none' | 'thirds' | 'frankfurt'>('none');
	const [selectedSystem, setSelectedSystem] = useState<VitaSystemType>('classical');
	const [selectedShadeCode, setSelectedShadeCode] = useState<string>(record.detectedVitaShade || 'A2');
	const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const activeTabRef: VitaPhysicalTabReference = createVitaPhysicalTabReference(selectedShadeCode);

	const handleSelectShade = (code: string) => {
		setSelectedShadeCode(code);
		onUpdateRecord({ detectedVitaShade: code });
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
			}
		};
		img.src = record.imageUrl;

		return () => {
			img.onload = null;
			img.src = "";
			if (canvas) {
				canvas.width = 0;
				canvas.height = 0;
			}
		};
	}, [record, activeGridOverlay]);

	const shadesList: VitaShade[] = selectedSystem === 'classical' ? VITA_CLASSICAL_SHADES : VITA_3D_MASTER_SHADES;

	return (
		<div className="photo-editor-overlay" role="dialog" aria-modal="true">
			<div className="photo-editor-modal">
				{/* Editor Header: 1 row, 32-36px height */}
				<div className="photo-protocol-header" style={{ minHeight: '36px', height: '36px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Sliders size={18} />
						<span style={{ fontWeight: 700, fontSize: '15px' }}>
							Калибровка кадра: {slotDef.titleRu}
						</span>
					</div>
					<button
						className="photo-touch-btn"
						onClick={onClose}
						aria-label="Закрыть редактор"
						style={{ minHeight: '32px', minWidth: '32px', padding: '4px' }}
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
							style={{
								maxWidth: '100%',
								maxHeight: '100%',
								objectFit: 'contain',
								cursor: 'default',
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
									style={{ minHeight: '44px' }}
									onClick={() => {
										onUpdateRecord({ rotationDegrees: ((record.rotationDegrees || 0) - 90 + 360) % 360 });
									}}
								>
									<RotateCcw size={15} /> -90°
								</button>
								<button
									className="photo-touch-btn"
									style={{ minHeight: '44px' }}
									onClick={() => {
										onUpdateRecord({ rotationDegrees: ((record.rotationDegrees || 0) + 90) % 360 });
									}}
								>
									<RotateCw size={15} /> +90°
								</button>
								<button
									className={`photo-touch-btn ${record.flipHorizontal ? 'primary' : ''}`}
									style={{ minHeight: '44px' }}
									onClick={() => {
										onUpdateRecord({ flipHorizontal: !record.flipHorizontal });
									}}
									title="Отражение по горизонтали (зеркало)"
								>
									<FlipHorizontal size={15} /> Отразить H
								</button>
								<button
									className={`photo-touch-btn ${record.flipVertical ? 'primary' : ''}`}
									style={{ minHeight: '44px' }}
									onClick={() => {
										onUpdateRecord({ flipVertical: !record.flipVertical });
									}}
								>
									<FlipVertical size={15} /> Отразить V
								</button>
							</div>
						</div>

						{/* 2. Clinical Orthopedic Grids (Mandates 8i, 8k) */}
						<div>
							<h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px 0' }}>
								Ортопедические сетки & Ориентиры
							</h4>
							<select
								value={activeGridOverlay}
								onChange={(e) => setActiveGridOverlay(e.target.value as 'none' | 'thirds' | 'frankfurt')}
								style={{
									width: '100%',
									minHeight: '44px',
									padding: '8px 12px',
									borderRadius: '8px',
									border: '1px solid var(--line, #cbd5e1)',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									fontSize: '13px',
									fontWeight: 600,
								}}
							>
								<option value="none">Без сетки</option>
								<option value="thirds">Правило третей (композиция лица)</option>
								<option value="frankfurt">Франкфуртская горизонталь & Срединная линия</option>
							</select>
						</div>

						{/* 3. Color & Light Adjustments */}
						<div>
							<h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px 0' }}>
								Экспозиция кадра
							</h4>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
										<span>Яркость</span>
										<span style={{ fontWeight: 600 }}>{record.brightness || 0}</span>
									</div>
									<input
										type="range"
										min="-50"
										max="50"
										value={record.brightness || 0}
										onChange={(e) => onUpdateRecord({ brightness: parseInt(e.target.value, 10) })}
										style={{ width: '100%', minHeight: '24px' }}
									/>
								</div>
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
										<span>Контраст</span>
										<span style={{ fontWeight: 600 }}>{record.contrast || 0}</span>
									</div>
									<input
										type="range"
										min="-50"
										max="50"
										value={record.contrast || 0}
										onChange={(e) => onUpdateRecord({ contrast: parseInt(e.target.value, 10) })}
										style={{ width: '100%', minHeight: '24px' }}
									/>
								</div>
							</div>
						</div>

						{/* 4. Physical VITA Tab Reference for Dental Lab (ZTL) — Mandates 8i, 8k */}
						<div className="shade-matching-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
									<Palette size={16} />
									<span style={{ fontSize: '13px', fontWeight: 700 }}>
										Эталон расцветки VITA для ЗТЛ
									</span>
								</div>
								<div style={{ display: 'flex', gap: '4px' }}>
									<button
										type="button"
										className={`photo-touch-btn ${selectedSystem === 'classical' ? 'primary' : ''}`}
										style={{ minHeight: '32px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}
										onClick={() => setSelectedSystem('classical')}
									>
										Classical
									</button>
									<button
										type="button"
										className={`photo-touch-btn ${selectedSystem === '3d_master' ? 'primary' : ''}`}
										style={{ minHeight: '32px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}
										onClick={() => setSelectedSystem('3d_master')}
									>
										3D-Master
									</button>
								</div>
							</div>

							{/* Physical Shade Swatches Grid */}
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(5, 1fr)',
									gap: '4px',
									maxHeight: '130px',
									overflowY: 'auto',
									padding: '2px',
								}}
							>
								{shadesList.map((s) => {
									const isSelected = s.code.toUpperCase() === selectedShadeCode.toUpperCase();
									return (
										<button
											key={s.code}
											type="button"
											className="photo-touch-btn"
											onClick={() => handleSelectShade(s.code)}
											style={{
												minHeight: '36px',
												padding: '2px 4px',
												display: 'flex',
												flexDirection: 'column',
												alignItems: 'center',
												justifyContent: 'center',
												background: isSelected ? 'var(--primary, #0d9488)' : 'var(--paper-soft, #f8fafc)',
												color: isSelected ? '#ffffff' : 'var(--ink, #0f172a)',
												border: isSelected ? '2px solid var(--primary-strong, #0f766e)' : '1px solid var(--line, #e2e8f0)',
												borderRadius: '6px',
												position: 'relative',
											}}
											title={`${s.code}: ${s.nameRu} — ${s.descriptionRu}`}
										>
											<span
												style={{
													width: '18px',
													height: '10px',
													borderRadius: '2px',
													background: `rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})`,
													border: '1px solid rgba(0,0,0,0.15)',
													marginBottom: '2px',
												}}
											/>
											<span style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1 }}>
												{s.code}
											</span>
										</button>
									);
								})}
							</div>

							{/* Active Physical Tab Details Card */}
							<div
								style={{
									padding: '8px 10px',
									borderRadius: '8px',
									background: 'var(--paper-soft, #f1f5f9)',
									border: '1px solid var(--line, #cbd5e1)',
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
								}}
							>
								<div
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										background: `rgb(${activeTabRef.shade.rgb.r}, ${activeTabRef.shade.rgb.g}, ${activeTabRef.shade.rgb.b})`,
										border: '1px solid rgba(0,0,0,0.2)',
										flexShrink: 0,
									}}
								/>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
										<span>{activeTabRef.shade.code}</span>
										<span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted, #64748b)' }}>
											({activeTabRef.shade.nameRu})
										</span>
									</div>
									<div style={{ fontSize: '11px', color: 'var(--muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
										{activeTabRef.shade.descriptionRu}
									</div>
								</div>
								<Check size={16} style={{ color: 'var(--primary, #0d9488)', flexShrink: 0 }} />
							</div>

							{/* Clinical Reminder under Mandates 8i, 8k */}
							<div
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: '6px',
									padding: '6px 8px',
									borderRadius: '6px',
									background: 'rgba(13, 148, 136, 0.08)',
									border: '1px solid rgba(13, 148, 136, 0.2)',
									fontSize: '11px',
									color: 'var(--ink, #0f172a)',
									lineHeight: 1.3,
								}}
							>
								<Camera size={14} style={{ color: 'var(--primary, #0d9488)', marginTop: '2px', flexShrink: 0 }} />
								<span>
									В наряд ЗТЛ передается эталон по физической расцветке. Для точного соответствия сделайте снимок с образцом у режущего края эмали при том же освещении.
								</span>
							</div>
						</div>

						{/* Close button */}
						<button
							className="photo-touch-btn primary"
							style={{ marginTop: 'auto', minHeight: '44px', fontWeight: 700 }}
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
