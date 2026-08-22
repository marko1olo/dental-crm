import React from 'react';
import { Camera, Sliders, Upload, Trash2, FlipHorizontal, RotateCw } from 'lucide-react';
import { PhotoProtocolSlotDefinition, PhotoSlotRecord } from './photoGridPresets';

export interface PhotoSlotCardProps {
	slotDef: PhotoProtocolSlotDefinition;
	record: PhotoSlotRecord;
	isDragActive: boolean;
	onUploadClick: () => void;
	onEditClick: () => void;
	onDeleteClick: (e: React.MouseEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
}

export const PhotoSlotCard: React.FC<PhotoSlotCardProps> = ({
	slotDef,
	record,
	isDragActive,
	onUploadClick,
	onEditClick,
	onDeleteClick,
	onDragOver,
	onDragLeave,
	onDrop,
}) => {
	const hasImage = !!record.imageUrl;

	return (
		<div
			className={`photo-slot-card ${hasImage ? 'has-image' : ''} ${isDragActive ? 'drag-active' : ''}`}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			{/* Slot Card Header */}
			<div className="photo-slot-header">
				<span style={{ fontWeight: 700 }}>{slotDef.shortLabelRu}</span>
				<span className={`photo-category-pill ${slotDef.category}`}>
					{slotDef.category === 'extraoral' ? 'Лицо' : 'Окклюзия'}
				</span>
			</div>

			{/* Viewport / Dropzone */}
			<div
				className="photo-slot-viewport"
				onClick={() => !hasImage && onUploadClick()}
			>
				{hasImage ? (
					<div className="photo-image-container">
						<img
							src={record.imageUrl}
							alt={slotDef.titleRu}
							className="photo-image-preview"
							style={{
								transform: `rotate(${record.rotationDegrees || 0}deg) scaleX(${record.flipHorizontal ? -1 : 1}) scaleY(${record.flipVertical ? -1 : 1})`,
								filter: `brightness(${100 + (record.brightness || 0)}%) contrast(${100 + (record.contrast || 0)}%)`
							}}
						/>

						{/* Mini Badges Overlay */}
						<div className="photo-slot-badges">
							{record.flipHorizontal && (
								<span className="photo-mini-badge">
									<FlipHorizontal size={10} /> Зеркало (H)
								</span>
							)}
							{(record.rotationDegrees || 0) !== 0 && (
								<span className="photo-mini-badge">
									<RotateCw size={10} /> {record.rotationDegrees}°
								</span>
							)}
							{record.detectedVitaShade && (
								<span className="photo-mini-badge shade-badge">
									VITA {record.detectedVitaShade}
								</span>
							)}
						</div>
					</div>
				) : (
					<div className="photo-silhouette-guide">
						<svg viewBox="0 0 200 200" className="photo-silhouette-svg">
							<path d={slotDef.silhouetteSvgPath} />
						</svg>
						<div className="photo-silhouette-label">
							Нажмите или перетащите фото
						</div>
						<div style={{ fontSize: '11px', color: 'var(--muted, #94a3b8)' }}>
							{slotDef.magnification} • {slotDef.recommendedAspectRatio}
						</div>
					</div>
				)}
			</div>

			{/* Slot Card Action Footer */}
			<div className="photo-slot-actions">
				{hasImage ? (
					<>
						<button
							className="photo-touch-btn"
							onClick={onEditClick}
							title="Настроить / Кадрировать / VITA оттенок"
						>
							<Sliders size={15} />
							Настроить
						</button>
						<div style={{ display: 'flex', gap: '4px' }}>
							<button
								className="photo-touch-btn"
								onClick={onUploadClick}
								title="Заменить снимок"
							>
								<Upload size={14} />
							</button>
							<button
								className="photo-touch-btn danger"
								onClick={onDeleteClick}
								title="Удалить"
							>
								<Trash2 size={14} />
							</button>
						</div>
					</>
				) : (
					<button
						className="photo-touch-btn primary"
						style={{ width: '100%' }}
						onClick={onUploadClick}
					>
						<Camera size={15} />
						Загрузить кадр
					</button>
				)}
			</div>
		</div>
	);
};
