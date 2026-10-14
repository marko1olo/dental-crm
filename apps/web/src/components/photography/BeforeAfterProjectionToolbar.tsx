import React from 'react';
import { Link as LinkIcon } from 'lucide-react';

export interface ComparisonProjection {
	readonly id: string;
	readonly labelRu: string;
}

export interface BeforeAfterProjectionToolbarProps {
	readonly projections: readonly ComparisonProjection[];
	readonly beforeSlotId: string;
	readonly afterSlotId: string;
	readonly isCurrentPairLinked: boolean;
	readonly onSelectProjection: (id: string) => void;
	readonly onPairCurrent: () => void;
	readonly onUnpairCurrent: () => void;
}

export const BeforeAfterProjectionToolbar: React.FC<BeforeAfterProjectionToolbarProps> = ({
	projections,
	beforeSlotId,
	afterSlotId,
	isCurrentPairLinked,
	onSelectProjection,
	onPairCurrent,
	onUnpairCurrent,
}) => {
	return (
		<div style={{
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			gap: '8px',
			flexWrap: 'wrap',
			width: '100%',
			maxWidth: '1100px',
			background: 'var(--paper, #ffffff)',
			padding: '8px 14px',
			borderRadius: '12px',
			border: '1px solid var(--line, #e2e8f0)',
		}}>
			<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
				Проекция:
			</span>
			<div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
				{projections.map((p) => {
					const isSelected = beforeSlotId === p.id && afterSlotId === p.id;
					return (
						<button
							key={p.id}
							type="button"
							className={`photo-touch-btn ${isSelected ? 'primary' : ''}`}
							onClick={() => onSelectProjection(p.id)}
							style={{
								minHeight: '34px',
								padding: '4px 10px',
								fontSize: '12px',
								borderRadius: '6px',
								fontWeight: isSelected ? 700 : 500,
							}}
						>
							{p.labelRu}
						</button>
					);
				})}
			</div>

			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				{isCurrentPairLinked ? (
					<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '4px',
								fontSize: '11px',
								fontWeight: 700,
								padding: '4px 8px',
								borderRadius: '6px',
								background: 'rgba(34, 197, 94, 0.15)',
								color: 'var(--green, #16a34a)',
							}}
						>
							<LinkIcon size={12} /> Спарено (DentalPin)
						</span>
						<button
							type="button"
							className="photo-touch-btn danger"
							onClick={onUnpairCurrent}
							style={{ minHeight: '32px', padding: '3px 8px', fontSize: '11px' }}
							title="Разорвать связь пары До/После"
						>
							Отвязать
						</button>
					</div>
				) : (
					<button
						type="button"
						className="photo-touch-btn"
						onClick={onPairCurrent}
						style={{ minHeight: '32px', padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
						title="Связать выбранные кадры До и После как эталонную пару (paired_document_id)"
					>
						<LinkIcon size={12} /> Спарить До/После
					</button>
				)}
			</div>
		</div>
	);
};
