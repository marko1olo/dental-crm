import React from "react";
import type { OrthodonticAngleDefinition, OrthodonticPhotoSlot } from "@dental/shared";
import { OrthoSlotViewport } from "./orthoModal/OrthoSlotViewport";
import { OrthoPhotoSlotControls } from "./orthoModal/OrthoPhotoSlotControls";

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
			<div className="ortho-slot-header">
				<div className="ortho-slot-title-wrap">
					<span className="ortho-slot-num">{angle.sequenceNumber}</span>
					<span className="ortho-slot-title" title={angle.titleRu}>{angle.titleRu}</span>
				</div>
				<span className="ortho-slot-category-badge">{angle.category === "intraoral" ? "Зубы" : "Лицо"}</span>
			</div>

			<OrthoSlotViewport angle={angle} slot={slot} hasPhoto={hasPhoto} showGuides={showGuides} onTriggerUpload={onTriggerUpload} />

			<OrthoPhotoSlotControls
				angle={angle}
				slot={slot}
				hasPhoto={hasPhoto}
				isMenuOpen={isMenuOpen}
				onToggleMenu={onToggleMenu}
				onTriggerUpload={onTriggerUpload}
				onRotate={onRotate}
				onFlipHorizontal={onFlipHorizontal}
				onZoomChange={onZoomChange}
				onDelete={onDelete}
			/>
		</div>
	);
};

export default OrthoPhotoSlotCard;
