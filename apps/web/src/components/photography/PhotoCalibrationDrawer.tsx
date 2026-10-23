import React, { useState } from 'react';
import { RotateCw, FlipHorizontal, Sun, Sliders, Check } from 'lucide-react';
import { PhotoProtocolSlotDefinition, PhotoSlotRecord } from './photoGridPresets';

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
	const [selectedShade, setSelectedShade] = useState(record.detectedVitaShade || 'A2');
	const quickShades = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2', 'BL1', 'BL2'];

	const handleRotate = () => {
		const nextRot = ((record.rotationDegrees || 0) + 90) % 360;
		onUpdateRecord({ rotationDegrees: nextRot });
	};

	const handleFlip = () => {
		onUpdateRecord({ flipHorizontal: !record.flipHorizontal });
	};

	const handleShade = (code: string) => {
		setSelectedShade(code);
		onUpdateRecord({ detectedVitaShade: code });
	};

	return (
		<div className="photo-calibration-drawer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--paper, #fff)', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{slotDef.titleRu}</h3>
					<span style={{ fontSize: '12px', color: 'var(--muted, #64748b)' }}>Быстрая настройка ракурса и цвета</span>
				</div>
				<button type="button" className="photo-touch-btn primary" onClick={onClose} style={{ minHeight: '34px', minWidth: '44px', padding: '4px 12px', fontSize: '12px', fontWeight: 700 }}>
					<Check size={14} /> Готово
				</button>
			</div>

			{record.imageUrl && (
				<div style={{ position: 'relative', width: '100%', height: '240px', background: '#020617', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<img
						src={record.imageUrl}
						alt={slotDef.titleRu}
						style={{
							maxHeight: '100%',
							maxWidth: '100%',
							objectFit: 'contain',
							transform: `rotate(${record.rotationDegrees || 0}deg) scaleX(${record.flipHorizontal ? -1 : 1})`,
							filter: `brightness(${100 + (record.brightness || 0)}%) contrast(${100 + (record.contrast || 0)}%)`,
						}}
					/>
				</div>
			)}

			<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
				<button type="button" className="photo-touch-btn" onClick={handleRotate} style={{ minHeight: '36px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
					<RotateCw size={14} /> Повернуть 90° ({record.rotationDegrees || 0}°)
				</button>
				<button type="button" className={`photo-touch-btn ${record.flipHorizontal ? 'primary' : ''}`} onClick={handleFlip} style={{ minHeight: '36px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
					<FlipHorizontal size={14} /> Зеркало
				</button>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
				<div>
					<label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Яркость: {record.brightness || 0}%</label>
					<input type="range" min="-50" max="50" value={record.brightness || 0} onChange={(e) => onUpdateRecord({ brightness: parseInt(e.target.value, 10) })} style={{ width: '100%' }} />
				</div>
				<div>
					<label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Контраст: {record.contrast || 0}%</label>
					<input type="range" min="-50" max="50" value={record.contrast || 0} onChange={(e) => onUpdateRecord({ contrast: parseInt(e.target.value, 10) })} style={{ width: '100%' }} />
				</div>
			</div>

			<div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
				<label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink, #0f172a)' }}>Привязка к зубу FDI:</label>
				<input
					type="text"
					placeholder="Напр. 16, 21, 36..."
					value={record.toothCode ? String(record.toothCode) : ''}
					onChange={(e) => onUpdateRecord({ toothCode: e.target.value.trim() })}
					data-testid="input-photo-tooth-code"
					style={{
						width: '120px',
						minHeight: '32px',
						padding: '4px 8px',
						borderRadius: '6px',
						border: '1px solid var(--line, #cbd5e1)',
						background: 'var(--paper, #fff)',
						color: 'var(--ink, #0f172a)',
						fontSize: '12px',
						fontWeight: 700,
					}}
				/>
				<span style={{ fontSize: '11px', color: 'var(--muted, #64748b)' }}>(прикрепление к зубной формуле)</span>
			</div>

			<div>
				<div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink, #0f172a)' }}>Цвет VITA: {selectedShade}</div>
				<div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
					{quickShades.map((sh) => (
						<button key={sh} type="button" className={`photo-touch-btn ${selectedShade === sh ? 'primary' : ''}`} onClick={() => handleShade(sh)} style={{ minHeight: '32px', minWidth: '40px', fontSize: '11px', fontWeight: 700, padding: '2px 6px' }}>
							{sh}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};

export default PhotoCalibrationDrawer;
