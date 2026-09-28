import React from "react";
import {
	UploadCloud,
	MoreVertical,
	RotateCw,
	FlipHorizontal,
	ZoomIn,
	ZoomOut,
	Trash2,
} from "lucide-react";
import type {
	OrthodonticAngleDefinition,
	OrthodonticPhotoSlot,
} from "@dental/shared";

export interface OrthoPhotoSlotCardProps {
	angle: OrthodonticAngleDefinition;
	slot?: OrthodonticPhotoSlot | undefined;
	globalGuidelinesEnabled: boolean;
	isDragOver: boolean;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onTriggerUpload: () => void;
	onRotate: (e: React.MouseEvent) => void;
	onFlipHorizontal: (e: React.MouseEvent) => void;
	onZoomChange: (delta: number, e: React.MouseEvent) => void;
	onDelete: (e: React.MouseEvent) => void;
}

export const OrthoPhotoSlotCard: React.FC<OrthoPhotoSlotCardProps> = ({
	angle,
	slot,
	globalGuidelinesEnabled,
	isDragOver,
	isMenuOpen,
	onToggleMenu,
	onDragOver,
	onDragLeave,
	onDrop,
	onTriggerUpload,
	onRotate,
	onFlipHorizontal,
	onZoomChange,
	onDelete,
}) => {
	const hasPhoto = Boolean(slot && slot.imageUrl);
	const showGuides = globalGuidelinesEnabled && (slot?.guidelineOverlayEnabled ?? true);

	return (
		<div
			className={`ortho-slot-card ${hasPhoto ? "has-photo" : ""} ${isDragOver ? "drag-over" : ""} ${
				isMenuOpen ? "!overflow-visible z-20" : ""
			}`}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			data-testid={`photo-slot-${angle.id}`}
		>
			{/* Slot Header */}
			<div className="ortho-slot-header">
				<div className="ortho-slot-title-wrap">
					<span className="ortho-slot-num">{angle.sequenceNumber}</span>
					<span className="ortho-slot-title" title={angle.titleRu}>
						{angle.titleRu}
					</span>
				</div>
				<span className="ortho-slot-category-badge">
					{angle.category === "intraoral" ? "Зубы" : "Лицо"}
				</span>
			</div>

			{/* Slot Viewport */}
			<div
				className="ortho-slot-viewport"
				onClick={() => {
					if (!hasPhoto) onTriggerUpload();
				}}
			>
				{hasPhoto && slot?.imageUrl ? (
					<>
						<img
							src={slot.imageUrl}
							alt={angle.titleRu}
							loading="lazy"
							decoding="async"
							className="ortho-slot-img"
							style={{
								transform: `rotate(${slot.rotationDegrees || 0}deg) scale(${slot.zoom || 1}) ${
									slot.flipHorizontal ? "scaleX(-1)" : ""
								} ${slot.flipVertical ? "scaleY(-1)" : ""}`,
								filter: `brightness(${(slot.brightness || 0) + 100}%) contrast(${
									(slot.contrast || 0) + 100
								}%)`,
							}}
						/>

						{/* Clinical Guidelines Overlay */}
						{showGuides && (
							<div className="ortho-guide-overlay">
								{/* Vertical Facial/Dental Midline */}
								<div className="ortho-guide-midline" />
								{/* Horizontal Occlusal Plane */}
								<div className="ortho-guide-occlusal" />
								{/* Thirds guide */}
								<div className="ortho-guide-thirds-h1" />
								<div className="ortho-guide-thirds-h2" />
							</div>
						)}
					</>
				) : (
					<div className="ortho-dropzone-empty">
						<UploadCloud className="ortho-dropzone-icon" />
						<span className="ortho-dropzone-label">Загрузить фото</span>
						<span className="ortho-dropzone-hint">{angle.shortLabelRu}</span>
					</div>
				)}
			</div>

			{/* Slot Controls Bar */}
			<div className="ortho-slot-controls flex items-center justify-between gap-1.5 px-3 py-1.5 min-h-[38px] relative">
				<button
					type="button"
					onClick={onTriggerUpload}
					className="ortho-slot-btn h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all cursor-pointer shrink-0"
					title={hasPhoto ? "Заменить снимок" : "Загрузить снимок"}
					data-testid={`upload-btn-${angle.id}`}
				>
					<UploadCloud size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>{hasPhoto ? "Заменить" : "Загрузить"}</span>
				</button>

				{hasPhoto ? (
					<div className="relative">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onToggleMenu();
							}}
							className={`ortho-slot-btn w-7 h-7 inline-flex items-center justify-center rounded-md border transition-all cursor-pointer ${
								isMenuOpen
									? "border-[var(--teal,#0d9488)] bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)]"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:border-[var(--teal,#0d9488)]"
							}`}
							title="Действия со снимком"
							aria-label="Действия со снимком"
							aria-expanded={isMenuOpen}
							data-testid={`slot-menu-btn-${angle.id}`}
						>
							<MoreVertical size={14} />
						</button>

						{isMenuOpen && (
							<div
								className="absolute right-0 bottom-full mb-1.5 z-40 w-52 p-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
								role="menu"
								onClick={(e) => e.stopPropagation()}
							>
								<button
									type="button"
									onClick={onRotate}
									className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									title="Повернуть на 90°"
								>
									<RotateCw size={13} className="text-[var(--muted,#64748b)] shrink-0" />
									<span className="flex-1">Повернуть на 90°</span>
									{slot?.rotationDegrees ? (
										<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
											{slot.rotationDegrees}°
										</span>
									) : null}
								</button>

								<button
									type="button"
									onClick={onFlipHorizontal}
									className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
										slot?.flipHorizontal
											? "bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)]"
											: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)]"
									}`}
									role="menuitem"
									title="Отразить по горизонтали"
								>
									<FlipHorizontal size={13} className="text-[var(--muted,#64748b)] shrink-0" />
									<span className="flex-1">Отразить по горизонтали</span>
									{slot?.flipHorizontal ? (
										<span className="text-[10px] font-bold text-[var(--teal,#0d9488)]">Вкл</span>
									) : null}
								</button>

								<button
									type="button"
									onClick={(e) => onZoomChange(0.2, e)}
									className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									title="Увеличить (+20%)"
								>
									<ZoomIn size={13} className="text-[var(--muted,#64748b)] shrink-0" />
									<span className="flex-1">Увеличить (+20%)</span>
									<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
										{Math.round((slot?.zoom || 1) * 100)}%
									</span>
								</button>

								<button
									type="button"
									onClick={(e) => onZoomChange(-0.2, e)}
									className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									title="Уменьшить (-20%)"
								>
									<ZoomOut size={13} className="text-[var(--muted,#64748b)] shrink-0" />
									<span className="flex-1">Уменьшить (-20%)</span>
								</button>

								<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />

								<button
									type="button"
									onClick={onDelete}
									className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									title="Удалить снимок"
									data-testid={`delete-btn-${angle.id}`}
								>
									<Trash2 size={13} className="text-rose-500 shrink-0" />
									<span>Удалить снимок</span>
								</button>
							</div>
						)}
					</div>
				) : (
					<span
						className="text-[10px] text-[var(--muted,#64748b)] truncate max-w-[140px]"
						title={angle.requiredEquipmentRu}
					>
						{angle.requiredEquipmentRu.slice(0, 24)}...
					</span>
				)}
			</div>
		</div>
	);
};

export default OrthoPhotoSlotCard;
