import React, { useState, useRef } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord, getSlotDefinitionById } from './photoGridPresets';
import { calculateSplitClipPath, clamp } from './photoProtocolMath';

export interface BeforeAfterComparisonViewProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	beforeSlotId: string;
	afterSlotId: string;
	onBeforeSlotChange: (id: string) => void;
	onAfterSlotChange: (id: string) => void;
}

export const BeforeAfterComparisonView: React.FC<BeforeAfterComparisonViewProps> = ({
	preset,
	slotsData,
	beforeSlotId,
	afterSlotId,
	onBeforeSlotChange,
	onAfterSlotChange,
}) => {
	const [comparisonType, setComparisonType] = useState<'split' | 'side_by_side' | 'blend'>('split');
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [blendOpacity, setBlendOpacity] = useState<number>(0.5);
	const isDraggingSplitRef = useRef(false);

	const beforeSlotRecord = slotsData[beforeSlotId] || { slotId: beforeSlotId };
	const afterSlotRecord = slotsData[afterSlotId] || { slotId: afterSlotId };

	const handleSplitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingSplitRef.current = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		updateSplitFromPointer(e);
	};

	const handleSplitPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingSplitRef.current) return;
		updateSplitFromPointer(e);
	};

	const handleSplitPointerUp = () => {
		isDraggingSplitRef.current = false;
	};

	const updateSplitFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
		const container = e.currentTarget.getBoundingClientRect();
		const relativeX = e.clientX - container.left;
		const percent = clamp((relativeX / container.width) * 100, 0, 100);
		setSplitPercent(Math.round(percent));
	};

	return (
		<div className="ba-comparison-view">
			{/* Controls Bar */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '900px', flexWrap: 'wrap', gap: '12px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
								fontSize: '13px',
								fontWeight: 600
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
								fontSize: '13px',
								fontWeight: 600
							}}
						>
							{preset.slots.map(s => (
								<option key={s.id} value={s.id}>{s.shortLabelRu}</option>
							))}
						</select>
					</div>
				</div>

				{/* Mode Buttons */}
				<div style={{ display: 'flex', gap: '6px', background: 'var(--surface, #f1f5f9)', padding: '4px', borderRadius: '8px' }}>
					<button
						className={`photo-touch-btn ${comparisonType === 'split' ? 'primary' : ''}`}
						onClick={() => setComparisonType('split')}
						style={{ minHeight: '36px', padding: '4px 12px' }}
					>
						Сплит-слайдер
					</button>
					<button
						className={`photo-touch-btn ${comparisonType === 'side_by_side' ? 'primary' : ''}`}
						onClick={() => setComparisonType('side_by_side')}
						style={{ minHeight: '36px', padding: '4px 12px' }}
					>
						Бок о бок
					</button>
					<button
						className={`photo-touch-btn ${comparisonType === 'blend' ? 'primary' : ''}`}
						onClick={() => setComparisonType('blend')}
						style={{ minHeight: '36px', padding: '4px 12px' }}
					>
						Наложение
					</button>
				</div>
			</div>

			{/* 1. Split Slider */}
			{comparisonType === 'split' && (
				<div
					className="ba-slider-container"
					onPointerDown={handleSplitPointerDown}
					onPointerMove={handleSplitPointerMove}
					onPointerUp={handleSplitPointerUp}
				>
					{beforeSlotRecord.imageUrl ? (
						<img
							src={beforeSlotRecord.imageUrl}
							alt="До лечения"
							className="ba-image-layer"
						/>
					) : (
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
							Кадр «До» не загружен
						</div>
					)}

					{afterSlotRecord.imageUrl && (
						<img
							src={afterSlotRecord.imageUrl}
							alt="После лечения"
							className="ba-image-layer"
							style={{
								clipPath: calculateSplitClipPath(splitPercent, 'vertical')
							}}
						/>
					)}

					<div className="ba-handle-line" style={{ left: `${splitPercent}%` }}>
						<div className="ba-handle-circle">
							<MoveHorizontal size={20} />
						</div>
					</div>

					<div className="ba-pill-tag before">ДО: {getSlotDefinitionById(beforeSlotId)?.shortLabelRu}</div>
					<div className="ba-pill-tag after">ПОСЛЕ: {getSlotDefinitionById(afterSlotId)?.shortLabelRu} ({splitPercent}%)</div>
				</div>
			)}

			{/* 2. Side-by-side */}
			{comparisonType === 'side_by_side' && (
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '1000px', height: '480px' }}>
					<div style={{ background: '#020617', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						{beforeSlotRecord.imageUrl ? (
							<img src={beforeSlotRecord.imageUrl} alt="До" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
						) : <span style={{ color: '#64748b' }}>Нет кадра «До»</span>}
						<div className="ba-pill-tag before">ДО</div>
					</div>
					<div style={{ background: '#020617', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						{afterSlotRecord.imageUrl ? (
							<img src={afterSlotRecord.imageUrl} alt="После" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
						) : <span style={{ color: '#64748b' }}>Нет кадра «После»</span>}
						<div className="ba-pill-tag after">ПОСЛЕ</div>
					</div>
				</div>
			)}

			{/* 3. Overlay Blend */}
			{comparisonType === 'blend' && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '900px' }}>
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
					<div style={{ position: 'relative', width: '100%', height: '500px', background: '#020617', borderRadius: '12px', overflow: 'hidden' }}>
						{beforeSlotRecord.imageUrl && (
							<img src={beforeSlotRecord.imageUrl} alt="До" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
						)}
						{afterSlotRecord.imageUrl && (
							<img src={afterSlotRecord.imageUrl} alt="После" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: blendOpacity }} />
						)}
					</div>
				</div>
			)}
		</div>
	);
};
