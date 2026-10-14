import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { clamp } from './photoProtocolMath';

export interface BeforeAfterFloatingZoomBarProps {
	readonly zoomScale: number;
	readonly setZoomScale: React.Dispatch<React.SetStateAction<number>>;
	readonly setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export const BeforeAfterFloatingZoomBar: React.FC<BeforeAfterFloatingZoomBarProps> = ({
	zoomScale,
	setZoomScale,
	setPanOffset,
}) => {
	return (
		<div
			className="ba-floating-zoom-bar"
			style={{
				position: 'absolute',
				bottom: '16px',
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'inline-flex',
				alignItems: 'center',
				gap: '4px',
				background: 'rgba(15, 23, 42, 0.88)',
				padding: '4px 8px',
				borderRadius: '24px',
				zIndex: 35,
				boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
				border: '1px solid rgba(255,255,255,0.15)',
				backdropFilter: 'blur(8px)',
			}}
		>
			<button
				type="button"
				className="photo-touch-btn"
				onClick={(e) => {
					e.stopPropagation();
					setZoomScale((z) => clamp(Math.round((z - 0.25) * 100) / 100, 0.5, 4.0));
				}}
				title="Уменьшить масштаб"
				aria-label="Уменьшить масштаб"
				data-testid="btn-zoom-out"
				style={{
					minWidth: '32px',
					minHeight: '32px',
					padding: '4px',
					color: '#ffffff',
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<ZoomOut size={16} />
			</button>
			<button
				type="button"
				className="photo-touch-btn"
				onClick={(e) => {
					e.stopPropagation();
					setZoomScale(1.0);
					setPanOffset({ x: 0, y: 0 });
				}}
				title="Сбросить масштаб 100%"
				aria-label="Сбросить масштаб 100%"
				data-testid="btn-zoom-reset"
				style={{
					minHeight: '32px',
					padding: '2px 8px',
					color: '#ffffff',
					fontSize: '11px',
					fontWeight: 700,
					background: zoomScale === 1.0 ? 'rgba(255,255,255,0.15)' : 'transparent',
					borderRadius: '12px',
					border: 'none',
					cursor: 'pointer',
				}}
			>
				{Math.round(zoomScale * 100)}%
			</button>
			<button
				type="button"
				className="photo-touch-btn"
				onClick={(e) => {
					e.stopPropagation();
					setZoomScale((z) => clamp(Math.round((z + 0.25) * 100) / 100, 0.5, 4.0));
				}}
				title="Увеличить масштаб"
				aria-label="Увеличить масштаб"
				data-testid="btn-zoom-in"
				style={{
					minWidth: '32px',
					minHeight: '32px',
					padding: '4px',
					color: '#ffffff',
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<ZoomIn size={16} />
			</button>
		</div>
	);
};
