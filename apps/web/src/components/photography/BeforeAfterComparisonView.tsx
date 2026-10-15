import React, { useState } from 'react';
import { MoveHorizontal, Columns, Layers, ExternalLink } from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord } from './photoGridPresets';
import { BeforeAfterSplitSlider } from './BeforeAfterSplitSlider';
import { BeforeAfterSideBySideView } from './BeforeAfterSideBySideView';
import { BeforeAfterBlendView } from './BeforeAfterBlendView';
import { openPatientPresentationWindow } from './presentationSyncProtocol';

export interface BeforeAfterComparisonViewProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	beforeSlotId: string;
	afterSlotId: string;
	beforePhotoUrl?: string;
	afterPhotoUrl?: string;
	clinicName?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	onBeforeSlotChange?: (id: string) => void;
	onAfterSlotChange?: (id: string) => void;
	onUpdateSlotRecord?: (slotId: string, updates: Partial<PhotoSlotRecord>) => void;
}

export const BeforeAfterComparisonView: React.FC<BeforeAfterComparisonViewProps> = ({
	preset, slotsData, beforeSlotId, afterSlotId, beforePhotoUrl, afterPhotoUrl,
	clinicName = 'DENTE CLINIC', patientName = '', onBeforeSlotChange, onAfterSlotChange,
}) => {
	const [viewMode, setViewMode] = useState<'split' | 'side_by_side' | 'blend'>('split');
	const [zoomScale, setZoomScale] = useState(1.0);
	const [blendOpacity, setBlendOpacity] = useState(0.5);

	const beforeRec = slotsData[beforeSlotId] || { slotId: beforeSlotId };
	const afterRec = slotsData[afterSlotId] || { slotId: afterSlotId };
	const beforeImg = beforePhotoUrl || beforeRec.imageUrl;
	const afterImg = afterPhotoUrl || afterRec.imageUrl;

	const handlePopout = () => {
		openPatientPresentationWindow({
			beforeImageUrl: beforeImg, afterImageUrl: afterImg, beforeShade: beforeRec.detectedVitaShade,
			afterShade: afterRec.detectedVitaShade, blendOpacity, mode: viewMode === 'blend' ? 'blend' : 'split',
			clinicName, patientName,
		});
	};

	return (
		<div className="before-after-view-root" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
					<span style={{ fontSize: '12px', fontWeight: 700 }}>До:</span>
					<select value={beforeSlotId} onChange={(e) => onBeforeSlotChange?.(e.target.value)} style={{ minHeight: '34px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '12px' }}>
						{preset.slots.map((s) => <option key={s.id} value={s.id}>{s.shortLabelRu}</option>)}
					</select>
					<span style={{ fontSize: '12px', fontWeight: 700 }}>После:</span>
					<select value={afterSlotId} onChange={(e) => onAfterSlotChange?.(e.target.value)} style={{ minHeight: '34px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '12px' }}>
						{preset.slots.map((s) => <option key={s.id} value={s.id}>{s.shortLabelRu}</option>)}
					</select>
				</div>
				<div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
					<button type="button" className={`photo-touch-btn ${viewMode === 'split' ? 'primary' : ''}`} onClick={() => setViewMode('split')} style={{ minHeight: '34px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><MoveHorizontal size={14} /> Сплит</button>
					<button type="button" className={`photo-touch-btn ${viewMode === 'side_by_side' ? 'primary' : ''}`} onClick={() => setViewMode('side_by_side')} style={{ minHeight: '34px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><Columns size={14} /> Рядом</button>
					<button type="button" className={`photo-touch-btn ${viewMode === 'blend' ? 'primary' : ''}`} onClick={() => setViewMode('blend')} style={{ minHeight: '34px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><Layers size={14} /> Наложение</button>
					<button type="button" className="photo-touch-btn" data-testid="btn-patient-presentation-popout" onClick={handlePopout} title="Экран пациента" style={{ minHeight: '34px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><ExternalLink size={14} /> Экран</button>
				</div>
			</div>

			{viewMode === 'split' && (
				<BeforeAfterSplitSlider beforeImageUrl={beforeImg} afterImageUrl={afterImg} beforeLabel={preset.slots.find((s) => s.id === beforeSlotId)?.shortLabelRu || 'До'} afterLabel={preset.slots.find((s) => s.id === afterSlotId)?.shortLabelRu || 'После'} beforeShade={beforeRec.detectedVitaShade} afterShade={afterRec.detectedVitaShade} onSwap={() => { onBeforeSlotChange?.(afterSlotId); onAfterSlotChange?.(beforeSlotId); }} />
			)}
			{viewMode === 'side_by_side' && (
				<BeforeAfterSideBySideView beforeSlotRecord={beforeRec} afterSlotRecord={afterRec} beforeSlotId={beforeSlotId} afterSlotId={afterSlotId} beforeShade={beforeRec.detectedVitaShade || 'A3'} afterShade={afterRec.detectedVitaShade || 'A1'} zoomScale={zoomScale} beforeRotation={beforeRec.rotationDegrees || 0} afterRotation={afterRec.rotationDegrees || 0} panOffset={{ x: 0, y: 0 }} onZoomIn={() => setZoomScale((z) => Math.min(2.5, z + 0.2))} onZoomOut={() => setZoomScale((z) => Math.max(0.5, z - 0.2))} onResetAlignment={() => setZoomScale(1.0)} />
			)}
			{viewMode === 'blend' && (
				<BeforeAfterBlendView beforeSlotRecord={beforeRec} afterSlotRecord={afterRec} blendOpacity={blendOpacity} onBlendOpacityChange={setBlendOpacity} clinicName={clinicName} patientName={patientName} />
			)}
		</div>
	);
};

export default BeforeAfterComparisonView;
