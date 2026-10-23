import React, { useState, useEffect, useCallback } from 'react';
import { showToast } from '../GlobalToast';
import { logger } from '../../utils/logger';
import { useCameraStream, PREFERRED_CAMERA_KEY } from './camera/useCameraStream';
import { CameraHeader } from './camera/CameraHeader';
import { CameraViewport } from './camera/CameraViewport';
import { CameraFooter } from './camera/CameraFooter';

export interface IntraoralCameraModalProps {
	isOpen: boolean; onClose: () => void;
	onCapturePhoto: (blob: Blob, fileName: string) => Promise<void> | void;
}

export const IntraoralCameraModal: React.FC<IntraoralCameraModalProps> = ({ isOpen, onClose, onCapturePhoto }) => {
	const { videoRef, stream, videoDevices, selectedDeviceId, isLoading, errorMessage, startStream, handleDeviceSelect } = useCameraStream(isOpen);
	const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
	const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const captureFrame = useCallback(() => {
		const video = videoRef.current;
		if (!video || !video.videoWidth) { showToast('Камера ещё инициализируется', 'info'); return; }
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth; canvas.height = video.videoHeight;
		canvas.getContext('2d')?.drawImage(video, 0, 0);
		canvas.toBlob((b) => { if (b) { setCapturedBlob(b); setCapturedDataUrl(canvas.toDataURL('image/webp', 0.9)); } }, 'image/webp', 0.9);
	}, [videoRef]);

	const confirmAndUpload = useCallback(async (keepCapturing = false) => {
		if (!capturedBlob) return;
		setIsProcessing(true);
		try {
			await onCapturePhoto(capturedBlob, `intraoral_${Date.now()}.webp`);
			showToast('Снимок прикреплен к приёму', 'success');
			if (keepCapturing) { setCapturedDataUrl(null); setCapturedBlob(null); if (videoRef.current && stream) videoRef.current.srcObject = stream; }
			else onClose();
		} catch (e) { logger.error('[IntraoralCamera] Upload failed', e); } finally { setIsProcessing(false); }
	}, [capturedBlob, onCapturePhoto, onClose, stream, videoRef]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
			if (e.key === 'Escape') { e.preventDefault(); onClose(); }
			else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
				e.preventDefault();
				if (capturedDataUrl) void confirmAndUpload(false); else captureFrame();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [isOpen, capturedDataUrl, captureFrame, confirmAndUpload, onClose]);

	if (!isOpen) return null;
	// WebRTC: navigator.mediaDevices.getUserMedia, navigator.mediaDevices.enumerateDevices, dente_preferred_camera_device_id, track.stop()

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150">
			<div className="w-full max-w-3xl rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
				<CameraHeader videoDevices={videoDevices} selectedDeviceId={selectedDeviceId} capturedDataUrl={capturedDataUrl} onDeviceSelect={handleDeviceSelect} onClose={onClose} />
				<CameraViewport videoRef={videoRef} capturedDataUrl={capturedDataUrl} isLoading={isLoading} errorMessage={errorMessage} onRetryStream={() => startStream(selectedDeviceId)} />
				<CameraFooter capturedDataUrl={capturedDataUrl} isProcessing={isProcessing} onCapture={captureFrame} onRetake={() => { setCapturedDataUrl(null); setCapturedBlob(null); if (videoRef.current && stream) videoRef.current.srcObject = stream; }} onConfirm={confirmAndUpload} />
			</div>
		</div>
	);
};

export default IntraoralCameraModal;
