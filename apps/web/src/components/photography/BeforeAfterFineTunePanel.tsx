import React from 'react';
import { Eye } from 'lucide-react';
import type { GuideOverlayType } from './IncisalAlignmentGuideOverlay';

export interface BeforeAfterFineTunePanelProps {
	isOpen: boolean;
	activeGuides: Record<GuideOverlayType, boolean>;
	onToggleGuide: (guide: GuideOverlayType) => void;
	bipupillaryTilt: number;
	onBipupillaryTiltChange: (val: number) => void;
	incisalCanting: number;
	onIncisalCantingChange: (val: number) => void;
	zoomScale: number;
	onZoomScaleChange: (val: number) => void;
	onResetAlignment: () => void;
}

export const BeforeAfterFineTunePanel: React.FC<BeforeAfterFineTunePanelProps> = ({
	isOpen,
	activeGuides,
	onToggleGuide,
	bipupillaryTilt,
	onBipupillaryTiltChange,
	incisalCanting,
	onIncisalCantingChange,
	zoomScale,
	onZoomScaleChange,
	onResetAlignment,
}) => {
	if (!isOpen) return null;

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '12px',
				width: '100%',
				maxWidth: '1100px',
				background: 'var(--surface, #f8fafc)',
				border: '1px solid var(--line, #e2e8f0)',
				borderRadius: '12px',
				padding: '12px 16px',
			}}
		>
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
					onClick={onResetAlignment}
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
					onClick={() => onToggleGuide('bipupillary')}
					style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
				>
					Межзрачковая линия
				</button>
				<button
					type="button"
					className={`photo-touch-btn ${activeGuides.incisal ? 'primary' : ''}`}
					onClick={() => onToggleGuide('incisal')}
					style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
				>
					Резцовый край
				</button>
				<button
					type="button"
					className={`photo-touch-btn ${activeGuides.midline ? 'primary' : ''}`}
					onClick={() => onToggleGuide('midline')}
					style={{ minHeight: '44px', minWidth: '44px', fontSize: '12px' }}
				>
					Срединная линия
				</button>
				<button
					type="button"
					className={`photo-touch-btn ${activeGuides.thirds ? 'primary' : ''}`}
					onClick={() => onToggleGuide('thirds')}
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
						onChange={(e) => onBipupillaryTiltChange(parseFloat(e.target.value))}
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
						onChange={(e) => onIncisalCantingChange(parseFloat(e.target.value))}
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
						onChange={(e) => onZoomScaleChange(parseFloat(e.target.value))}
						style={{ width: '100%' }}
					/>
				</div>
			</div>
		</div>
	);
};

export default BeforeAfterFineTunePanel;
