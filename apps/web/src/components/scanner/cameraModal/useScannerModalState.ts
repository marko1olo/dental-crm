/**
 * useScannerModalState.ts
 *
 * Dedicated modal state machine coordinating camera hardware, capture,
 * filters, presets, and patient attachment upload.
 */

import { useCallback, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { useCameraStream } from "../hooks/useCameraStream";
import { useDocumentPresets } from "../hooks/useDocumentPresets";
import { usePhotoCapture } from "../hooks/usePhotoCapture";

export function useScannerModalState(
	isOpen: boolean,
	patientId: string,
	onClose: () => void,
	onAttachmentUploaded?: () => void,
) {
	const presets = useDocumentPresets();
	const stream = useCameraStream(true, isOpen);

	const onCaptureDone = useCallback(() => {
		stream.stopCamera();
		presets.runOcrAnalysis(presets.selectedDocType);
	}, [presets, stream]);

	const onRetake = useCallback(() => {
		presets.resetOcr();
		void stream.startCamera(capture.videoRef.current);
	}, [presets, stream]);

	const capture = usePhotoCapture(onCaptureDone, onRetake);

	const stopCameraTracks = useCallback(() => {
		stream.stopCamera(capture.videoRef.current);
	}, [capture.videoRef, stream]);

	useEffect(() => {
		if (isOpen && capture.isCapturing) {
			void stream.startCamera(capture.videoRef.current);
		} else {
			stopCameraTracks();
		}
		return () => { stopCameraTracks(); };
	}, [isOpen, capture.isCapturing, stopCameraTracks, stream]);

	const handleModalClose = useCallback(() => {
		stopCameraTracks();
		onClose();
	}, [onClose, stopCameraTracks]);

	const processFile = useCallback(
		(file: File) => {
			capture.processFile(file, (hint) => {
				stopCameraTracks();
				presets.runOcrAnalysis(presets.selectedDocType, hint);
			});
		},
		[capture, presets, stopCameraTracks],
	);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) processFile(file);
			if (e.target) e.target.value = "";
		},
		[processFile],
	);

	const handleSaveAttachment = useCallback(async () => {
		if (!capture.capturedBlob || !patientId) return;
		try {
			const ext = capture.capturedBlob.type === "application/pdf" ? "pdf" : "jpg";
			const fileName = `${presets.preset.shortTitle}_${new Date().toISOString().slice(0, 10)}.${ext}`;
			const formData = new FormData();
			formData.append("file", capture.capturedBlob, fileName);
			const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/attachments`, {
				method: "POST", headers: denteAdminSecretRequestHeaders(), body: formData,
			});
			if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
			showToast(`Документ «${fileName}» прикреплен к медкарте.`, "success", 6000);
			onAttachmentUploaded?.();
			handleModalClose();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось сохранить скан", "error");
		}
	}, [capture.capturedBlob, handleModalClose, onAttachmentUploaded, patientId, presets.preset.shortTitle]);

	return {
		...presets,
		...stream,
		...capture,
		handleModalClose,
		handleFileChange,
		processFile,
		handleSaveAttachment,
	};
}
