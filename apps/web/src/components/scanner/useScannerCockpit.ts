/**
 * useScannerCockpit.ts
 *
 * Clean root facade hook for Document Scanner Cockpit.
 * Composes specialized camera, capture, presets, and patient intake sub-hooks.
 */

import { useCallback, useEffect, useRef } from "react";
import { useCameraStream } from "./hooks/useCameraStream";
import { useDocumentPresets } from "./hooks/useDocumentPresets";
import { usePatientIntake } from "./hooks/usePatientIntake";
import { usePhotoCapture } from "./hooks/usePhotoCapture";
export type { NewPatientIntakeDraft, ScannerAttachmentSummary, ScannerPatientSummary } from "./scannerTypes";

export function useScannerCockpit() {
	const presets = useDocumentPresets();
	const stream = useCameraStream(true, true);
	const activeVideoRef = useRef<HTMLVideoElement | null>(null);

	const onCaptureDone = useCallback(() => {
		stream.stopCamera();
		presets.runOcrAnalysis(presets.selectedDocType);
	}, [presets, stream]);

	const onRetakePhoto = useCallback(() => {
		presets.resetOcr();
		void stream.startCamera(activeVideoRef.current);
	}, [presets, stream]);

	const capture = usePhotoCapture(onCaptureDone, onRetakePhoto);
	activeVideoRef.current = capture.videoRef.current;

	const intake = usePatientIntake(
		capture.capturedBlob,
		presets.preset.shortTitle,
		presets.extractedPassport,
		presets.extractedOms,
		presets.extractedSnils,
	);

	useEffect(() => {
		if (capture.isCapturing) {
			void stream.startCamera(capture.videoRef.current);
		} else {
			stream.stopCamera(capture.videoRef.current);
		}
	}, [capture.isCapturing, capture.videoRef, stream]);

	const processFile = useCallback(
		(file: File) => {
			capture.processFile(file, (hint) => {
				stream.stopCamera();
				presets.runOcrAnalysis(presets.selectedDocType, hint);
			});
		},
		[capture, presets, stream],
	);

	return {
		...presets,
		...stream,
		...capture,
		...intake,
		processFile,
	};
}
