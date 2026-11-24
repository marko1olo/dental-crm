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
		<div className="flex flex-col gap-3 w-full items-center">
			<div className="flex justify-between items-center flex-wrap gap-2 w-full">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">До:</span>
					<select
						value={beforeSlotId}
						onChange={(e) => onBeforeSlotChange?.(e.target.value)}
						className="h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
					>
						{preset.slots.map((s) => (
							<option key={s.id} value={s.id}>
								{s.shortLabelRu}
							</option>
						))}
					</select>
					<span className="text-xs font-semibold text-[var(--ink-muted)]">После:</span>
					<select
						value={afterSlotId}
						onChange={(e) => onAfterSlotChange?.(e.target.value)}
						className="h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
					>
						{preset.slots.map((s) => (
							<option key={s.id} value={s.id}>
								{s.shortLabelRu}
							</option>
						))}
					</select>
				</div>
				<div className="flex gap-1.5 items-center flex-wrap">
					<div className="p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] inline-flex items-center gap-1">
						<button
							type="button"
							onClick={() => setViewMode('split')}
							className={`h-7 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
								viewMode === 'split'
									? 'bg-[var(--paper)] text-[var(--ink)] shadow-xs'
									: 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
							}`}
						>
							<MoveHorizontal className="w-3.5 h-3.5 shrink-0" /> Сплит
						</button>
						<button
							type="button"
							onClick={() => setViewMode('side_by_side')}
							className={`h-7 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
								viewMode === 'side_by_side'
									? 'bg-[var(--paper)] text-[var(--ink)] shadow-xs'
									: 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
							}`}
						>
							<Columns className="w-3.5 h-3.5 shrink-0" /> Рядом
						</button>
						<button
							type="button"
							onClick={() => setViewMode('blend')}
							className={`h-7 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
								viewMode === 'blend'
									? 'bg-[var(--paper)] text-[var(--ink)] shadow-xs'
									: 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
							}`}
						>
							<Layers className="w-3.5 h-3.5 shrink-0" /> Наложение
						</button>
					</div>
					<button
						type="button"
						data-testid="btn-patient-presentation-popout"
						onClick={handlePopout}
						title="Экран пациента"
						className="h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
					>
						<ExternalLink className="w-3.5 h-3.5 shrink-0" /> Экран
					</button>
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
