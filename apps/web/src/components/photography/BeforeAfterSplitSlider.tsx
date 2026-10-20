import React, { useState, useRef, useCallback } from 'react';
import { MoveHorizontal, MoveVertical, RefreshCw } from 'lucide-react';
import { calculateSplitClipPath, calculateWiperWheelDelta, calculateKeyboardWiperDelta } from './photoProtocolMath';
import { DEMO_BEFORE_SMILE_SVG, DEMO_AFTER_SMILE_SVG } from './patientPresentationDemoData';

export interface BeforeAfterSplitSliderProps {
	beforeImageUrl?: string | undefined;
	afterImageUrl?: string | undefined;
	beforeLabel?: string | undefined;
	afterLabel?: string | undefined;
	beforeShade?: string | undefined;
	afterShade?: string | undefined;
	onSwap?: (() => void) | undefined;
}

export const BeforeAfterSplitSlider: React.FC<BeforeAfterSplitSliderProps> = ({
	beforeImageUrl,
	afterImageUrl,
	beforeLabel = 'До лечения',
	afterLabel = 'После лечения',
	beforeShade,
	afterShade,
	onSwap,
}) => {
	const [splitPercent, setSplitPercent] = useState(50);
	const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
	const containerRef = useRef<HTMLDivElement | null>(null);

	const beforeSrc = beforeImageUrl || DEMO_BEFORE_SMILE_SVG;
	const afterSrc = afterImageUrl || DEMO_AFTER_SMILE_SVG;

	const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (e.buttons !== 1 || !containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const pct = orientation === 'vertical'
			? ((e.clientX - rect.left) / rect.width) * 100
			: ((e.clientY - rect.top) / rect.height) * 100;
		setSplitPercent(Math.max(2, Math.min(98, Math.round(pct))));
	}, [orientation]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
			setSplitPercent((p) => calculateKeyboardWiperDelta(p, e.key, e.shiftKey));
		}
	};

	const clipPathStyle = calculateSplitClipPath(splitPercent, orientation);

	return (
		<div className="ba-split-slider-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span style={{ fontSize: '13px', fontWeight: 700 }}>Сплит До/После: {splitPercent}%</span>
					{beforeShade && afterShade && (
						<span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: 'var(--surface, #f1f5f9)', fontWeight: 600 }}>
							VITA {beforeShade} → {afterShade}
						</span>
					)}
				</div>
				<div style={{ display: 'flex', gap: '4px' }}>
					<button type="button" className={`photo-touch-btn ${orientation === 'vertical' ? 'primary' : ''}`} onClick={() => setOrientation('vertical')} style={{ minHeight: '34px', minWidth: '44px', padding: '4px 8px' }} title="Вертикальный сплит"><MoveHorizontal size={14} /></button>
					<button type="button" className={`photo-touch-btn ${orientation === 'horizontal' ? 'primary' : ''}`} onClick={() => setOrientation('horizontal')} style={{ minHeight: '34px', minWidth: '44px', padding: '4px 8px' }} title="Горизонтальный сплит"><MoveVertical size={14} /></button>
					{onSwap && <button type="button" className="photo-touch-btn" onClick={onSwap} style={{ minHeight: '34px', minWidth: '44px', padding: '4px 8px' }} title="Поменять местами"><RefreshCw size={14} /></button>}
				</div>
			</div>

			<div
				ref={containerRef}
				className="ba-slider-container"
				tabIndex={0}
				role="slider"
				aria-valuenow={splitPercent}
				onPointerMove={handlePointerMove}
				onWheel={(e) => setSplitPercent((p) => calculateWiperWheelDelta(p, e.deltaY))}
				onKeyDown={handleKeyDown}
				style={{
					position: 'relative',
					width: '100%',
					height: '480px',
					background: 'var(--paper-strong, #020617)',
					borderRadius: '12px',
					overflow: 'hidden',
					cursor: orientation === 'vertical' ? 'ew-resize' : 'ns-resize',
					userSelect: 'none',
					touchAction: 'none',
				}}
			>
				<img src={beforeSrc} alt={beforeLabel} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
				<div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
					{beforeLabel} {beforeShade ? `(${beforeShade})` : ''}
				</div>

				<img src={afterSrc} alt={afterLabel} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', clipPath: clipPathStyle }} />
				<div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
					{afterLabel} {afterShade ? `(${afterShade})` : ''}
				</div>

				<div style={{
					position: 'absolute',
					...(orientation === 'vertical' ? { top: 0, bottom: 0, left: `${splitPercent}%`, width: '2px', transform: 'translateX(-50%)' } : { left: 0, right: 0, top: `${splitPercent}%`, height: '2px', transform: 'translateY(-50%)' }),
					background: 'var(--primary, #0d9488)',
					boxShadow: '0 0 8px rgba(13,148,136,0.8)',
					pointerEvents: 'none',
				}}>
					<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary, #0d9488)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
						{orientation === 'vertical' ? <MoveHorizontal size={14} /> : <MoveVertical size={14} />}
					</div>
				</div>
			</div>
		</div>
	);
};

export default BeforeAfterSplitSlider;
