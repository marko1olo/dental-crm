import React, { useState, useEffect, useMemo } from "react";
import type { DiaryPrintPhoto } from "./useVisitDiaryPhotoUploadState";
import { useVisitDiaryPhotoUploadState } from "./useVisitDiaryPhotoUploadState";
import { VisitDiaryPhotoActionsToolbar } from "./VisitDiaryPhotoActionsToolbar";
import { VisitDiaryPhotoThumbnailGrid } from "./VisitDiaryPhotoThumbnailGrid";
import { VisitDiaryPhotoModals } from "./VisitDiaryPhotoModals";

export type { DiaryPrintPhoto };

export interface VisitDiaryPhotoUploadProps {
	visitId: string;
	diaryId: string | null;
	isLocked: boolean;
	patientId?: string;
	patientName?: string;
	onPrintPhotosChange?: (photos: readonly DiaryPrintPhoto[]) => void;
}

export function VisitDiaryPhotoUpload({
	visitId,
	diaryId,
	isLocked,
	patientId = "chairside",
	patientName = "Пациент",
	onPrintPhotosChange,
}: VisitDiaryPhotoUploadProps) {
	const [isQrBridgeOpen, setIsQrBridgeOpen] = useState(false);
	const [isDsdModalOpen, setIsDsdModalOpen] = useState(false);
	const [activeDsdPhotoUrl, setActiveDsdPhotoUrl] = useState<string | null>(null);

	const {
		attachments,
		isUploading,
		isCameraModalOpen,
		setIsCameraModalOpen,
		isBeforeAfterOpen,
		setIsBeforeAfterOpen,
		zoomPhoto,
		setZoomPhoto,
		loadState,
		selectedPrintIds,
		photoObjectUrls,
		unreadablePhotoIds,
		reloadAttachments,
		uploadBlobAttachment,
		handlePhotoUpload,
		handleDeletePhoto,
		togglePrintSelection,
		splitterPhotos,
	} = useVisitDiaryPhotoUploadState({
		visitId,
		diaryId,
		isLocked,
		...(onPrintPhotosChange ? { onPrintPhotosChange } : {}),
	});

	// Слушаем глобальное событие открытия DSD студии из тулбара или других вкладок
	useEffect(() => {
		const handleDsdOpen = (e: Event) => {
			const detail = (e as CustomEvent<{ photoUrl?: string }>).detail;
			if (detail?.photoUrl) {
				setActiveDsdPhotoUrl(detail.photoUrl);
			}
			setIsDsdModalOpen(true);
		};
		window.addEventListener("dente:open-dsd", handleDsdOpen);
		return () => window.removeEventListener("dente:open-dsd", handleDsdOpen);
	}, []);

	// Список доступных фотографий пациента для DSD студии
	const dsdPatientPhotos = useMemo(() => {
		return attachments
			.filter((att) => Boolean(photoObjectUrls[att.id]))
			.map((att) => ({
				id: att.id,
				url: photoObjectUrls[att.id]!,
				label: att.name,
			}));
	}, [attachments, photoObjectUrls]);

	return (
		<div className="space-y-2 lg:col-span-2">
			<VisitDiaryPhotoActionsToolbar
				isLocked={isLocked}
				diaryId={diaryId}
				attachmentsCount={attachments.length}
				isUploading={isUploading}
				onCameraOpen={() => setIsCameraModalOpen(true)}
				onBeforeAfterOpen={() => setIsBeforeAfterOpen(true)}
				onFileInputChange={handlePhotoUpload}
				onQrBridgeOpen={() => setIsQrBridgeOpen(true)}
				onDsdOpen={() => {
					setActiveDsdPhotoUrl(null);
					setIsDsdModalOpen(true);
				}}
			/>

			<VisitDiaryPhotoThumbnailGrid
				attachments={attachments}
				photoObjectUrls={photoObjectUrls}
				unreadablePhotoIds={unreadablePhotoIds}
				loadState={loadState}
				selectedPrintIds={selectedPrintIds}
				isLocked={isLocked}
				diaryId={diaryId}
				zoomPhoto={zoomPhoto}
				onZoomChange={setZoomPhoto}
				onTogglePrint={togglePrintSelection}
				onDeletePhoto={handleDeletePhoto}
				onReload={reloadAttachments}
				onDsdPhotoOpen={(photo) => {
					setActiveDsdPhotoUrl(photo.url);
					setIsDsdModalOpen(true);
				}}
			/>

			<VisitDiaryPhotoModals
				isDsdModalOpen={isDsdModalOpen}
				onCloseDsd={() => {
					setIsDsdModalOpen(false);
					setActiveDsdPhotoUrl(null);
				}}
				patientId={patientId}
				patientName={patientName}
				visitId={visitId}
				initialDsdPhotoUrl={activeDsdPhotoUrl}
				dsdPatientPhotos={dsdPatientPhotos}
				onDsdApplySuccess={() => {
					void reloadAttachments();
				}}
				isQrBridgeOpen={isQrBridgeOpen}
				onCloseQrBridge={() => setIsQrBridgeOpen(false)}
				onQrPhotoReceived={() => {
					void reloadAttachments();
				}}
				isCameraModalOpen={isCameraModalOpen}
				onCloseCameraModal={() => setIsCameraModalOpen(false)}
				onCaptureCameraPhoto={uploadBlobAttachment}
				isBeforeAfterOpen={isBeforeAfterOpen}
				onCloseBeforeAfter={() => setIsBeforeAfterOpen(false)}
				splitterPhotos={splitterPhotos}
			/>
		</div>
	);
}
