/**
 * useCameraStream.ts
 *
 * Camera hardware stream lifecycle hook with USB/UVC device enumeration,
 * facingMode selection, and leak-free track teardown.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useCameraStream(isCapturing = true, isModalOpen = true) {
	const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
	const [selectedCameraId, setSelectedCameraId] = useState<string>("");

	const cameraStreamRef = useRef<MediaStream | null>(null);
	const isMountedRef = useRef<boolean>(true);
	const isOpenRef = useRef<boolean>(isModalOpen);
	isOpenRef.current = isModalOpen;
	const isCapturingRef = useRef<boolean>(isCapturing);
	isCapturingRef.current = isCapturing;

	const enumerateCameras = useCallback(async () => {
		try {
			if (navigator?.mediaDevices?.enumerateDevices) {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoInputs = devices.filter((d) => d.kind === "videoinput");
				setAvailableCameras(videoInputs);
				if (videoInputs.length > 0 && !selectedCameraId && videoInputs[0]?.deviceId) {
					setSelectedCameraId(videoInputs[0].deviceId);
				}
			}
		} catch {}
	}, [selectedCameraId]);

	const stopCamera = useCallback((videoElement?: HTMLVideoElement | null) => {
		if (cameraStreamRef.current) {
			for (const track of cameraStreamRef.current.getTracks()) {
				try { track.stop(); } catch {}
			}
			cameraStreamRef.current = null;
		}
		if (cameraStream) {
			for (const track of cameraStream.getTracks()) {
				try { track.stop(); } catch {}
			}
			setCameraStream(null);
		}
		if (videoElement) {
			try {
				const srcObj = videoElement.srcObject;
				if (srcObj && "getTracks" in (srcObj as MediaStream)) {
					for (const track of (srcObj as MediaStream).getTracks()) { track.stop(); }
				}
			} catch {}
			videoElement.srcObject = null;
		}
	}, [cameraStream]);

	const startCamera = useCallback(async (videoElement?: HTMLVideoElement | null) => {
		setCameraError(null);
		try {
			if (!navigator?.mediaDevices?.getUserMedia) throw new Error("Камера не поддерживается в этом браузере.");
			if (cameraStreamRef.current) {
				for (const track of cameraStreamRef.current.getTracks()) { try { track.stop(); } catch {} }
				cameraStreamRef.current = null;
			}
			const videoConstraints: MediaTrackConstraints = selectedCameraId
				? { deviceId: { exact: selectedCameraId }, width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 } }
				: { facingMode: { ideal: "environment" }, width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 } };

			const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
			if (!isMountedRef.current || !isOpenRef.current || !isCapturingRef.current) {
				for (const track of stream.getTracks()) { try { track.stop(); } catch {} }
				return;
			}
			cameraStreamRef.current = stream;
			setCameraStream(stream);
			if (videoElement) { videoElement.srcObject = stream; await videoElement.play().catch(() => {}); }
			void enumerateCameras();
		} catch (err: unknown) {
			setCameraError(err instanceof Error ? err.message : "Не удалось подключиться к камере. Используйте загрузку файла.");
		}
	}, [enumerateCameras, selectedCameraId]);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			if (cameraStreamRef.current) {
				for (const track of cameraStreamRef.current.getTracks()) { try { track.stop(); } catch {} }
				cameraStreamRef.current = null;
			}
		};
	}, []);

	return {
		cameraStream, setCameraStream, cameraError, setCameraError,
		availableCameras, selectedCameraId, setSelectedCameraId,
		cameraStreamRef, isMountedRef, enumerateCameras, startCamera, stopCamera,
	};
}
