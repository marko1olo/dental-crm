import { IntraoralCameraModal } from "../../photography/IntraoralCameraModal";
import { BeforeAfterSplitter } from "../BeforeAfterSplitter";
import type { DiaryPrintPhoto } from "./useVisitDiaryPhotoUploadState";
import { useVisitDiaryPhotoUploadState } from "./useVisitDiaryPhotoUploadState";
import { VisitDiaryPhotoActionsToolbar } from "./VisitDiaryPhotoActionsToolbar";
import { VisitDiaryPhotoThumbnailGrid } from "./VisitDiaryPhotoThumbnailGrid";

export type { DiaryPrintPhoto };

export interface VisitDiaryPhotoUploadProps {
	visitId: string;
	diaryId: string | null;
	isLocked: boolean;
	onPrintPhotosChange?: (photos: readonly DiaryPrintPhoto[]) => void;
}

export function VisitDiaryPhotoUpload({
	visitId,
	diaryId,
	isLocked,
	onPrintPhotosChange,
}: VisitDiaryPhotoUploadProps) {
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
		onPrintPhotosChange,
	});

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
			/>

			{/* Модальное окно прямого захвата с интраоральной камеры (WebRTC) */}
			<IntraoralCameraModal
				isOpen={isCameraModalOpen}
				onClose={() => setIsCameraModalOpen(false)}
				onCapturePhoto={uploadBlobAttachment}
			/>

			{/* Интерактивный режим сравнения До/После для экрана пациента */}
			{isBeforeAfterOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-4xl">
						<BeforeAfterSplitter
							photos={splitterPhotos}
							onClose={() => setIsBeforeAfterOpen(false)}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
