import React from "react";
import { UploadCloud } from "lucide-react";
import type { OrthodonticAngleDefinition, OrthodonticPhotoSlot } from "@dental/shared";

interface OrthoSlotViewportProps {
	angle: OrthodonticAngleDefinition;
	slot?: OrthodonticPhotoSlot | undefined;
	hasPhoto: boolean;
	showGuides: boolean;
	onTriggerUpload: () => void;
}

export const OrthoSlotViewport: React.FC<OrthoSlotViewportProps> = ({
	angle,
	slot,
	hasPhoto,
	showGuides,
	onTriggerUpload,
}) => {
	return (
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
							<div className="ortho-guide-midline" />
							<div className="ortho-guide-occlusal" />
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
	);
};
