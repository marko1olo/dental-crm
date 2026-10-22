import { useRef, useCallback, useState } from "react";
import { updateSlotPhoto, removeSlotPhoto, type OrthodonticPhotoSession, type OrthodonticAngleId } from "@dental/shared";

interface UseOrthoSlotActionsProps {
	session: OrthodonticPhotoSession;
	setSession: React.Dispatch<React.SetStateAction<OrthodonticPhotoSession>>;
}

export function useOrthoSlotActions({ session, setSession }: UseOrthoSlotActionsProps) {
	const [dragOverSlotId, setDragOverSlotId] = useState<OrthodonticAngleId | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentUploadingAngleRef = useRef<OrthodonticAngleId | null>(null);

	const handleFileSelect = useCallback((angleId: OrthodonticAngleId, file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const resultUrl = e.target?.result as string;
			setSession((prev) =>
				updateSlotPhoto(prev, angleId, {
					imageUrl: resultUrl,
					capturedAt: new Date().toISOString(),
					rotationDegrees: 0,
					flipHorizontal: false,
					flipVertical: false,
					brightness: 0,
					contrast: 0,
					zoom: 1,
					panX: 0,
					panY: 0,
					guidelineOverlayEnabled: true,
				}),
			);
		};
		reader.readAsDataURL(file);
	}, [setSession]);

	const triggerUploadForAngle = (angleId: OrthodonticAngleId) => {
		currentUploadingAngleRef.current = angleId;
		fileInputRef.current?.click();
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && currentUploadingAngleRef.current) {
			handleFileSelect(currentUploadingAngleRef.current, file);
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleDrop = (e: React.DragEvent, angleId: OrthodonticAngleId) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverSlotId(null);
		const file = e.dataTransfer.files?.[0];
		if (file) handleFileSelect(angleId, file);
	};

	const handleRotateSlot = (angleId: OrthodonticAngleId, e: React.MouseEvent) => {
		e.stopPropagation();
		const currentDeg = session.slots[angleId]?.rotationDegrees || 0;
		setSession((prev) => updateSlotPhoto(prev, angleId, { rotationDegrees: (currentDeg + 90) % 360 }));
	};

	const handleFlipHorizontal = (angleId: OrthodonticAngleId, e: React.MouseEvent) => {
		e.stopPropagation();
		const currentSlot = session.slots[angleId];
		setSession((prev) => updateSlotPhoto(prev, angleId, { flipHorizontal: !currentSlot?.flipHorizontal }));
	};

	const handleZoomChange = (angleId: OrthodonticAngleId, delta: number, e: React.MouseEvent) => {
		e.stopPropagation();
		const currentZoom = session.slots[angleId]?.zoom || 1;
		const nextZoom = Math.min(3, Math.max(0.5, Math.round((currentZoom + delta) * 10) / 10));
		setSession((prev) => updateSlotPhoto(prev, angleId, { zoom: nextZoom }));
	};

	const handleDeletePhoto = (angleId: OrthodonticAngleId, e: React.MouseEvent) => {
		e.stopPropagation();
		setSession((prev) => removeSlotPhoto(prev, angleId));
	};

	return {
		dragOverSlotId,
		setDragOverSlotId,
		fileInputRef,
		triggerUploadForAngle,
		handleFileInputChange,
		handleDrop,
		handleRotateSlot,
		handleFlipHorizontal,
		handleZoomChange,
		handleDeletePhoto,
	};
}
