import React from "react";
import type { OrthodonticAngleDefinition, OrthodonticAngleId, OrthodonticPhotoSession } from "@dental/shared";
import { OrthoPhotoSlotCard } from "../OrthoPhotoSlotCard";

interface Ortho8SlotGridProps {
	filteredAngles: readonly OrthodonticAngleDefinition[];
	session: OrthodonticPhotoSession;
	dragOverSlotId: OrthodonticAngleId | null;
	openMenuSlotId: OrthodonticAngleId | null;
	globalGuidelinesEnabled: boolean;
	setOpenMenuSlotId: React.Dispatch<React.SetStateAction<OrthodonticAngleId | null>>;
	setDragOverSlotId: (id: OrthodonticAngleId | null) => void;
	handleDrop: (e: React.DragEvent, angleId: OrthodonticAngleId) => void;
	triggerUploadForAngle: (angleId: OrthodonticAngleId) => void;
	handleRotateSlot: (angleId: OrthodonticAngleId, e: React.MouseEvent) => void;
	handleFlipHorizontal: (angleId: OrthodonticAngleId, e: React.MouseEvent) => void;
	handleZoomChange: (angleId: OrthodonticAngleId, delta: number, e: React.MouseEvent) => void;
	handleDeletePhoto: (angleId: OrthodonticAngleId, e: React.MouseEvent) => void;
}

export const Ortho8SlotGrid: React.FC<Ortho8SlotGridProps> = ({
	filteredAngles,
	session,
	dragOverSlotId,
	openMenuSlotId,
	globalGuidelinesEnabled,
	setOpenMenuSlotId,
	setDragOverSlotId,
	handleDrop,
	triggerUploadForAngle,
	handleRotateSlot,
	handleFlipHorizontal,
	handleZoomChange,
	handleDeletePhoto,
}) => {
	return (
		<div className="ortho-8-grid">
			{filteredAngles.map((angle) => {
				const slot = session.slots[angle.id];
				const isDragOver = dragOverSlotId === angle.id;

				return (
					<OrthoPhotoSlotCard
						key={angle.id}
						angle={angle}
						slot={slot}
						globalGuidelinesEnabled={globalGuidelinesEnabled}
						isDragOver={isDragOver}
						isMenuOpen={openMenuSlotId === angle.id}
						onToggleMenu={() =>
							setOpenMenuSlotId((prev) => (prev === angle.id ? null : angle.id))
						}
						onDragOver={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setDragOverSlotId(angle.id);
						}}
						onDragLeave={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setDragOverSlotId(null);
						}}
						onDrop={(e) => handleDrop(e, angle.id)}
						onTriggerUpload={() => triggerUploadForAngle(angle.id)}
						onRotate={(e) => handleRotateSlot(angle.id, e)}
						onFlipHorizontal={(e) => handleFlipHorizontal(angle.id, e)}
						onZoomChange={(delta, e) => handleZoomChange(angle.id, delta, e)}
						onDelete={(e) => {
							setOpenMenuSlotId(null);
							handleDeletePhoto(angle.id, e);
						}}
					/>
				);
			})}
		</div>
	);
};
