import React from "react";
import { IntraoralCameraModal } from "../../photography/IntraoralCameraModal";
import { ChairsidePhotoQrBridgeModal } from "../../photography/ChairsidePhotoQrBridgeModal";
import { DsdAestheticStudioModal, type DsdPatientPhotoOption } from "../../photography/dsd/DsdAestheticStudioModal";
import { BeforeAfterSplitter, type BeforeAfterSplitterPhotoItem } from "../BeforeAfterSplitter";

export interface VisitDiaryPhotoModalsProps {
	readonly isDsdModalOpen: boolean;
	readonly onCloseDsd: () => void;
	readonly patientId: string;
	readonly patientName: string;
	readonly visitId: string;
	readonly initialDsdPhotoUrl?: string | null;
	readonly dsdPatientPhotos: readonly DsdPatientPhotoOption[];
	readonly onDsdApplySuccess: () => void;

	readonly isQrBridgeOpen: boolean;
	readonly onCloseQrBridge: () => void;
	readonly onQrPhotoReceived: () => void;

	readonly isCameraModalOpen: boolean;
	readonly onCloseCameraModal: () => void;
	readonly onCaptureCameraPhoto: (blob: Blob, fileName?: string) => Promise<void>;

	readonly isBeforeAfterOpen: boolean;
	readonly onCloseBeforeAfter: () => void;
	readonly splitterPhotos: readonly BeforeAfterSplitterPhotoItem[];
}

export function VisitDiaryPhotoModals({
	isDsdModalOpen,
	onCloseDsd,
	patientId,
	patientName,
	visitId,
	initialDsdPhotoUrl,
	dsdPatientPhotos,
	onDsdApplySuccess,
	isQrBridgeOpen,
	onCloseQrBridge,
	onQrPhotoReceived,
	isCameraModalOpen,
	onCloseCameraModal,
	onCaptureCameraPhoto,
	isBeforeAfterOpen,
	onCloseBeforeAfter,
	splitterPhotos,
}: VisitDiaryPhotoModalsProps) {
	return (
		<>
			{/* Digital Smile Design (DSD) Эстетическая студия Wheeler 2.5D (PHO-02) */}
			<DsdAestheticStudioModal
				key={`dsd-${patientId}`}
				isOpen={isDsdModalOpen}
				onClose={onCloseDsd}
				patientId={patientId}
				patientName={patientName}
				visitId={visitId}
				{...(initialDsdPhotoUrl || dsdPatientPhotos[0]?.url
					? { initialPhotoUrl: initialDsdPhotoUrl || dsdPatientPhotos[0]?.url }
					: {})}
				patientPhotos={dsdPatientPhotos as DsdPatientPhotoOption[]}
				onApplySuccess={onDsdApplySuccess}
			/>

			{/* Мобильный QR-мост загрузки со смартфона врача (Chairside QR Bridge PHO-01) */}
			<ChairsidePhotoQrBridgeModal
				key={`qr-${patientId}`}
				isOpen={isQrBridgeOpen}
				onClose={onCloseQrBridge}
				patientId={patientId}
				patientName={patientName}
				visitId={visitId}
				onPhotoReceived={onQrPhotoReceived}
			/>

			{/* Модальное окно прямого захвата с интраоральной камеры (WebRTC) */}
			<IntraoralCameraModal
				isOpen={isCameraModalOpen}
				onClose={onCloseCameraModal}
				onCapturePhoto={onCaptureCameraPhoto}
			/>

			{/* Интерактивный режим сравнения До/После для экрана пациента */}
			{isBeforeAfterOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-4xl">
						<BeforeAfterSplitter
							photos={splitterPhotos}
							onClose={onCloseBeforeAfter}
						/>
					</div>
				</div>
			)}
		</>
	);
}
