import { useRef, useCallback, useState, useEffect } from "react";
import { updateSlotPhoto, removeSlotPhoto, type OrthodonticPhotoSession, type OrthodonticAngleId } from "@dental/shared";
import { compressChairsidePhotoToBlobUrl } from "../../photography/chairsidePhotoCompressor";

interface UseOrthoSlotActionsProps {
	session: OrthodonticPhotoSession;
	setSession: React.Dispatch<React.SetStateAction<OrthodonticPhotoSession>>;
}

export function useOrthoSlotActions({ session, setSession }: UseOrthoSlotActionsProps) {
	const [dragOverSlotId, setDragOverSlotId] = useState<OrthodonticAngleId | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentUploadingAngleRef = useRef<OrthodonticAngleId | null>(null);
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	// Освобождение Blob URL из памяти браузера при размонтировании (ликвидация утечек памяти PHO-04)
	useEffect(() => {
		const urls = createdBlobUrlsRef.current;
		return () => {
			urls.forEach((u) => URL.revokeObjectURL(u));
			urls.clear();
		};
	}, []);

	const handleFileSelect = useCallback(async (angleId: OrthodonticAngleId, file: File) => {
		try {
			// Клиентская аппаратная компрессия до 1920x1080 (WebP/JPEG) с очисткой текстур GPU
			// Предотвращает раздувание памяти Base64 до 400 МБ на слабых мониторах врача (PHO-04)
			const comp = await compressChairsidePhotoToBlobUrl(file, {
				maxDimension: 1920,
				quality: 0.85,
			}).catch(() => null);

			const resultUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(resultUrl);

			setSession((prev) => {
				const existingUrl = prev.slots[angleId]?.imageUrl;
				if (existingUrl?.startsWith("blob:")) {
					URL.revokeObjectURL(existingUrl);
					createdBlobUrlsRef.current.delete(existingUrl);
				}
				return updateSlotPhoto(prev, angleId, {
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
				});
			});
		} catch (err) {
			console.error("[useOrthoSlotActions] Failed to compress ortho photo:", err);
		}
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
		setSession((prev) => {
			const existingUrl = prev.slots[angleId]?.imageUrl;
			if (existingUrl?.startsWith("blob:")) {
				URL.revokeObjectURL(existingUrl);
				createdBlobUrlsRef.current.delete(existingUrl);
			}
			return removeSlotPhoto(prev, angleId);
		});
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
