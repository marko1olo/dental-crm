import React, { useMemo } from 'react';
import { UploadCloud } from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord, CLINICAL_PROTOCOLS_REGISTRY } from './photoGridPresets';
import { PhotoSlotCard } from './PhotoSlotCard';

export interface PhotoGridSixSlotsProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	activeFilter: 'all' | 'extraoral' | 'intraoral';
	dragOverSlotId: string | null;
	onSelectPreset: (preset: PhotoProtocolPreset) => void;
	onFilterChange: (filter: 'all' | 'extraoral' | 'intraoral') => void;
	onBatchUploadClick: () => void;
	onTriggerUploadSlot: (slotId: string) => void;
	onEditSlot: (slotId: string) => void;
	onDeleteSlot: (slotId: string, e: React.MouseEvent) => void;
	onSlotDragOver: (e: React.DragEvent, slotId: string) => void;
	onSlotDragLeave: () => void;
	onSlotDrop: (e: React.DragEvent, slotId: string) => void;
}

export const PhotoGridSixSlots: React.FC<PhotoGridSixSlotsProps> = ({
	preset,
	slotsData,
	activeFilter,
	dragOverSlotId,
	onSelectPreset,
	onFilterChange,
	onBatchUploadClick,
	onTriggerUploadSlot,
	onEditSlot,
	onDeleteSlot,
	onSlotDragOver,
	onSlotDragLeave,
	onSlotDrop,
}) => {
	const visibleSlots = useMemo(() => {
		if (activeFilter === 'extraoral') return preset.slots.filter((s) => s.category === 'extraoral');
		if (activeFilter === 'intraoral') return preset.slots.filter((s) => s.category === 'intraoral');
		return preset.slots;
	}, [preset.slots, activeFilter]);

	return (
		<div className="photo-grid-six-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
			<div className="photo-grid-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
					<span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>Пресет:</span>
					<div style={{ display: 'flex', gap: '4px', background: 'var(--surface, #f1f5f9)', padding: '2px', borderRadius: '8px' }}>
						{CLINICAL_PROTOCOLS_REGISTRY.slice(0, 3).map((p) => (
							<button
								key={p.id}
								type="button"
								className={`photo-touch-btn ${preset.id === p.id ? 'primary' : ''}`}
								onClick={() => onSelectPreset(p)}
								style={{ minHeight: '34px', minWidth: '44px', padding: '4px 10px', fontSize: '12px' }}
							>
								{p.shortNameRu}
							</button>
						))}
					</div>
					<button
						type="button"
						className="photo-touch-btn"
						data-testid="btn-batch-photo-upload"
						onClick={onBatchUploadClick}
						title="Пакетная загрузка снимков"
						style={{ minHeight: '34px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
					>
						<UploadCloud size={16} />
						Пакетная загрузка
					</button>
				</div>
				<div style={{ display: 'flex', gap: '4px' }}>
					{(['all', 'extraoral', 'intraoral'] as const).map((filter) => (
						<button
							key={filter}
							type="button"
							className={`photo-touch-btn ${activeFilter === filter ? 'primary' : ''}`}
							onClick={() => onFilterChange(filter)}
							style={{ minHeight: '34px', minWidth: '44px', padding: '4px 8px', fontSize: '11px' }}
						>
							{filter === 'all' ? 'Все' : filter === 'extraoral' ? 'Лицо' : 'Окклюзия'}
						</button>
					))}
				</div>
			</div>

			<div className="photo-slots-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', width: '100%' }}>
				{visibleSlots.map((slotDef) => (
					<PhotoSlotCard
						key={slotDef.id}
						slotDef={slotDef}
						record={slotsData[slotDef.id] || { slotId: slotDef.id }}
						isDragActive={dragOverSlotId === slotDef.id}
						onUploadClick={() => onTriggerUploadSlot(slotDef.id)}
						onEditClick={() => onEditSlot(slotDef.id)}
						onDeleteClick={(e) => onDeleteSlot(slotDef.id, e)}
						onDragOver={(e) => onSlotDragOver(e, slotDef.id)}
						onDragLeave={onSlotDragLeave}
						onDrop={(e) => onSlotDrop(e, slotDef.id)}
					/>
				))}
			</div>
		</div>
	);
};

export default PhotoGridSixSlots;
