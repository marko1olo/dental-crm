import React from 'react';
import { Camera } from 'lucide-react';
import type { PhotoSlotRecord } from './photoGridPresets';

export interface BeforeAfterBlendViewProps {
	beforeSlotRecord: PhotoSlotRecord;
	afterSlotRecord: PhotoSlotRecord;
	blendOpacity: number;
	onBlendOpacityChange: (val: number) => void;
}

export const BeforeAfterBlendView: React.FC<BeforeAfterBlendViewProps> = ({
	beforeSlotRecord,
	afterSlotRecord,
	blendOpacity,
	onBlendOpacityChange,
}) => {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '1100px' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
				<span style={{ fontSize: '13px', fontWeight: 600 }}>Прозрачность наложения:</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={blendOpacity}
					onChange={(e) => onBlendOpacityChange(parseFloat(e.target.value))}
					style={{ flex: 1 }}
				/>
				<span style={{ fontSize: '13px', fontWeight: 700 }}>{Math.round(blendOpacity * 100)}%</span>
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
