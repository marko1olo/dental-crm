import React from 'react';
import { Camera, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { PhotoSlotRecord } from './photoGridPresets';
import { getSlotDefinitionById } from './photoGridPresets';

export interface BeforeAfterSideBySideViewProps {
	beforeSlotRecord: PhotoSlotRecord;
	afterSlotRecord: PhotoSlotRecord;
	beforeSlotId: string;
	afterSlotId: string;
	beforeShade: string;
	afterShade: string;
	zoomScale: number;
	beforeRotation: number;
	afterRotation: number;
	panOffset: { x: number; y: number };
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetAlignment: () => void;
}

export const BeforeAfterSideBySideView: React.FC<BeforeAfterSideBySideViewProps> = ({
	beforeSlotRecord,
	afterSlotRecord,
	beforeSlotId,
	afterSlotId,
	beforeShade,
	afterShade,
	zoomScale,
	beforeRotation,
	afterRotation,
	panOffset,
	onZoomIn,
	onZoomOut,
	onResetAlignment,
}) => {
	return (
		<div style={{ position: 'relative', width: '100%', maxWidth: '1100px' }}>
			{/* Synchronous Zoom / Pan Float Bar */}
			<div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 30 }}>
				<button
					type="button"
					className="photo-touch-btn"
					style={{ minHeight: '36px', minWidth: '36px', padding: '6px', background: 'rgba(15, 23, 42, 0.85)', color: 'var(--paper, #ffffff)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}
					onClick={onZoomIn}
					title="Синхронно увеличить (Zoom In)"
				>
					<ZoomIn size={16} />
				</button>
				<button
					type="button"
					className="photo-touch-btn"
					style={{ minHeight: '36px', minWidth: '36px', padding: '6px', background: 'rgba(15, 23, 42, 0.85)', color: 'var(--paper, #ffffff)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}
					onClick={onZoomOut}
					title="Синхронно уменьшить (Zoom Out)"
				>
					<ZoomOut size={16} />
				</button>
				<button
					type="button"
					className="photo-touch-btn"
					style={{ minHeight: '36px', minWidth: '36px', padding: '6px', background: 'rgba(15, 23, 42, 0.85)', color: 'var(--paper, #ffffff)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}
					onClick={onResetAlignment}
					title="Сбросить масштаб 1:1"
				>
					<RotateCcw size={16} />
				</button>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: '16px',
					width: '100%',
					height: '520px',
				}}
			>
				<div style={{ background: 'var(--paper-strong, #020617)', borderRadius: '16px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					{beforeSlotRecord.imageUrl ? (
						<img
							src={beforeSlotRecord.imageUrl}
							alt="До лечения"
							loading="lazy"
							decoding="async"
							style={{
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
							data-testid="side-by-side-before-placeholder"
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '8px',
								color: 'var(--muted, #64748b)',
							}}
						>
							<Camera size={32} style={{ opacity: 0.5 }} />
							<span style={{ fontSize: '12px', fontWeight: 600 }}>Нет кадра «До»</span>
						</div>
					)}
					<div className="ba-pill-tag before" style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.85)', color: 'var(--teal-light, #38bdf8)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
						ДО: {getSlotDefinitionById(beforeSlotId)?.shortLabelRu || 'До'} ({beforeShade})
					</div>
				</div>

				<div style={{ background: 'var(--paper-strong, #020617)', borderRadius: '16px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					{afterSlotRecord.imageUrl ? (
						<img
							src={afterSlotRecord.imageUrl}
							alt="После лечения"
							loading="lazy"
							decoding="async"
							style={{
								width: '100%',
								height: '100%',
								objectFit: 'contain',
								transform: `scale(${zoomScale}) rotate(${afterRotation}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
								transformOrigin: 'center center',
								transition: 'transform 0.05s linear',
							}}
						/>
					) : (
						<div
							data-testid="side-by-side-after-placeholder"
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '8px',
								color: 'var(--muted, #64748b)',
							}}
						>
							<Camera size={32} style={{ opacity: 0.5 }} />
							<span style={{ fontSize: '12px', fontWeight: 600 }}>Нет кадра «После»</span>
						</div>
					)}
					<div className="ba-pill-tag after" style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(15, 23, 42, 0.85)', color: 'var(--green, #4ade80)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
						ПОСЛЕ: {getSlotDefinitionById(afterSlotId)?.shortLabelRu || 'После'} ({afterShade})
					</div>
				</div>
			</div>
		</div>
	);
};

export default BeforeAfterSideBySideView;
