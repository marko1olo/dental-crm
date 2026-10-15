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

	const guides: { id: GuideOverlayType; label: string }[] = [
		{ id: 'bipupillary', label: 'Межзрачковая линия' },
		{ id: 'incisal', label: 'Резцовый край' },
		{ id: 'midline', label: 'Срединная линия' },
		{ id: 'thirds', label: 'Сетка третей' },
	];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '1100px', background: 'var(--surface, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '12px 16px' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Eye size={16} style={{ color: 'var(--brand-500, #2563eb)' }} />
					<span style={{ fontSize: '13px', fontWeight: 700 }}>Ориентиры и направляющие сетки:</span>
				</div>
				<button type="button" className="photo-touch-btn" onClick={onResetAlignment} style={{ fontSize: '12px', minHeight: '34px', minWidth: '44px', padding: '4px 10px' }}>
					Сбросить выравнивание
				</button>
			</div>

			<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
				{guides.map((g) => (
					<button key={g.id} type="button" className={`photo-touch-btn ${activeGuides[g.id] ? 'primary' : ''}`} onClick={() => onToggleGuide(g.id)} style={{ minHeight: '38px', minWidth: '44px', fontSize: '12px' }}>
						{g.label}
					</button>
				))}
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '2px' }}>
				<div>
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
						<span>Крен зрачков:</span><span>{bipupillaryTilt > 0 ? `+${bipupillaryTilt}°` : `${bipupillaryTilt}°`}</span>
					</div>
					<input type="range" min="-15" max="15" step="0.5" value={bipupillaryTilt} onChange={(e) => onBipupillaryTiltChange(parseFloat(e.target.value))} style={{ width: '100%' }} />
				</div>
				<div>
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
						<span>Крен резцов:</span><span>{incisalCanting > 0 ? `+${incisalCanting}°` : `${incisalCanting}°`}</span>
					</div>
					<input type="range" min="-15" max="15" step="0.5" value={incisalCanting} onChange={(e) => onIncisalCantingChange(parseFloat(e.target.value))} style={{ width: '100%' }} />
				</div>
				<div>
					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
						<span>Масштаб:</span><span>{Math.round(zoomScale * 100)}%</span>
					</div>
					<input type="range" min="1.0" max="2.5" step="0.05" value={zoomScale} onChange={(e) => onZoomScaleChange(parseFloat(e.target.value))} style={{ width: '100%' }} />
				</div>
			</div>
		</div>
	);
};

export default BeforeAfterFineTunePanel;
