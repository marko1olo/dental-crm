/**
 * Intraoral / Webcam WebRTC Stream Management Hook
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../../utils/logger';

export const PREFERRED_CAMERA_KEY = 'dente_preferred_camera_device_id';

export function useCameraStream(isOpen: boolean) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
		try {
			return localStorage.getItem(PREFERRED_CAMERA_KEY) || '';
		} catch {
			return '';
		}
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const stopActiveStream = useCallback((mediaStream: MediaStream | null) => {
		if (mediaStream) {
			for (const track of mediaStream.getTracks()) {
				track.stop();
			}
		}
	}, []);

	const refreshDevices = useCallback(async () => {
		try {
			if (!navigator.mediaDevices?.enumerateDevices) return;
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoInputs = devices.filter((d) => d.kind === 'videoinput');
			setVideoDevices(videoInputs);

			if (videoInputs.length > 0 && !videoInputs.some((d) => d.deviceId === selectedDeviceId)) {
				const firstId = videoInputs[0]?.deviceId || '';
				setSelectedDeviceId(firstId);
				try { localStorage.setItem(PREFERRED_CAMERA_KEY, firstId); } catch {}
			}
		} catch (err) {
			logger.error('[IntraoralCamera] Enumerate devices failed', err);
		}
	}, [selectedDeviceId]);

	const startStream = useCallback(async (deviceId?: string) => {
		setIsLoading(true);
		setErrorMessage(null);
		stopActiveStream(stream);
		setStream(null);

		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('Браузер не поддерживает видеозахват WebRTC (getUserMedia)');
			}
			const videoConstraints: MediaTrackConstraints = {
				width: { ideal: 1920, min: 640 },
				height: { ideal: 1080, min: 480 },
			};
			if (deviceId) {
				videoConstraints.deviceId = { exact: deviceId };
			} else {
				videoConstraints.facingMode = { ideal: 'environment' };
			}
			const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
			setStream(newStream);
			if (videoRef.current) {
				videoRef.current.srcObject = newStream;
			}
			await refreshDevices();
		} catch (err) {
			logger.error('[IntraoralCamera] getUserMedia failed', err);
			const errStr = err instanceof Error ? err.message : String(err);
			setErrorMessage(
				errStr.includes('NotAllowedError') || errStr.includes('Permission')
					? 'Доступ к камере заблокирован. Разрешите доступ к видеокамере в настройках браузера.'
					: `Не удалось запустить видеокамеру: ${errStr}`,
			);
		} finally {
			setIsLoading(false);
		}
	}, [stream, stopActiveStream, refreshDevices]);

	useEffect(() => {
		if (isOpen) {
			void startStream(selectedDeviceId);
		} else {
			stopActiveStream(stream);
			setStream(null);
		}
		return () => { stopActiveStream(stream); };
	}, [isOpen]);

	const handleDeviceSelect = (deviceId: string) => {
		setSelectedDeviceId(deviceId);
		try { localStorage.setItem(PREFERRED_CAMERA_KEY, deviceId); } catch {}
		void startStream(deviceId);
	};

	return {
		videoRef, stream, videoDevices, selectedDeviceId, isLoading, errorMessage,
		startStream, stopActiveStream, handleDeviceSelect,
	};
}
