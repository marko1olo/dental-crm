import React from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import type { PhotoSlotRecord } from './photoGridPresets';
import { openPatientPresentationWindow } from './presentationSyncProtocol';

export interface BeforeAfterBlendViewProps {
	beforeSlotRecord: PhotoSlotRecord;
	afterSlotRecord: PhotoSlotRecord;
	blendOpacity: number;
	onBlendOpacityChange: (val: number) => void;
	clinicName?: string;
	patientName?: string;
	onOpenPatientPresentation?: () => void;
}

export const BeforeAfterBlendView: React.FC<BeforeAfterBlendViewProps> = ({
	beforeSlotRecord,
	afterSlotRecord,
	blendOpacity,
	onBlendOpacityChange,
	clinicName = 'DENTE CLINIC',
	patientName = '',
	onOpenPatientPresentation,
}) => {
	const handlePopout = () => {
		if (onOpenPatientPresentation) {
			onOpenPatientPresentation();
		} else {
			openPatientPresentationWindow({
				beforeImageUrl: beforeSlotRecord.imageUrl,
				afterImageUrl: afterSlotRecord.imageUrl,
				beforeShade: beforeSlotRecord.detectedVitaShade,
				afterShade: afterSlotRecord.detectedVitaShade,
				blendOpacity,
				mode: 'blend',
				clinicName,
				patientName,
			});
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '1100px' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
				<span style={{ fontSize: '13px', fontWeight: 600 }}>Прозрачность наложения:</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={blendOpacity}
					onChange={(e) => onBlendOpacityChange(parseFloat(e.target.value))}
					style={{ flex: 1, minWidth: '160px' }}
				/>
				<span style={{ fontSize: '13px', fontWeight: 700, minWidth: '40px' }}>{Math.round(blendOpacity * 100)}%</span>

				<button
					type="button"
					className="photo-touch-btn"
					data-testid="btn-patient-presentation-popout"
					onClick={handlePopout}
					title="Показать на экране пациента перед креслом (2-й монитор / ТВ)"
					style={{
						minHeight: '34px',
						fontSize: '12px',
						fontWeight: 600,
						display: 'inline-flex',
						alignItems: 'center',
						gap: '6px',
						marginLeft: 'auto',
					}}
				>
					<ExternalLink size={15} />
					Экран пациента
				</button>
			</div>

			<div style={{ position: 'relative', width: '100%', height: '520px', background: 'var(--paper-strong, #020617)', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				{beforeSlotRecord.imageUrl && (
					<img src={beforeSlotRecord.imageUrl} alt="До" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
				)}
				{afterSlotRecord.imageUrl && (
					<img src={afterSlotRecord.imageUrl} alt="После" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: blendOpacity }} />
				)}
				{!beforeSlotRecord.imageUrl && !afterSlotRecord.imageUrl && (
					<div
						data-testid="blend-empty-placeholder"
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '8px',
							color: 'var(--muted, #64748b)',
						}}
					>
						<Camera size={36} style={{ opacity: 0.5 }} />
						<span style={{ fontSize: '13px', fontWeight: 600 }}>Кадры «До» и «После» не загружены</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default BeforeAfterBlendView;
