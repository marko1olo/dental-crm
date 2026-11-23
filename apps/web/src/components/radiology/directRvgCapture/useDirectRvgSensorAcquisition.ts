import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { SAMPLE_PATIENT_RVG_URL } from "../types";
import {
	SENSOR_MODELS,
	type ProjectionAngleType,
	type SensorCaptureStatus,
} from "../directRvgTypes";
import {
	POPULAR_RVG_SENSORS,
	readRadiologyFileForCapture,
	validateRadiologyUploadFile,
} from "../directRvgFileValidation";
import {
	UNIVERSAL_SENSOR_CATALOG,
	autoDetectConnectedSensor,
	testSensorConnection,
} from "../UniversalSensorGateway";
import type { RvgSensorDeviceOption } from "./types";
import { VisiographPacsWatcherService } from "../../../services/hardware/visiographPacsWatcher";
import { useWebsocket } from "../../../hooks/useWebsocket";

export interface UseDirectRvgSensorAcquisitionProps {
	readonly initialImageUrl?: string | undefined;
	readonly isDemo: boolean;
	readonly patientId?: string | undefined;
	readonly onCaptureReady?: ((imageUrl: string) => void) | undefined;
	readonly onTeethDetected?: ((teeth: string[], projection?: ProjectionAngleType | undefined) => void) | undefined;
	readonly onClinicalNoteDetected?: ((note: string) => void) | undefined;
}

export function useDirectRvgSensorAcquisition({
	initialImageUrl,
	isDemo,
	patientId,
	onCaptureReady,
	onTeethDetected,
	onClinicalNoteDetected,
}: UseDirectRvgSensorAcquisitionProps) {
	const defaultImage = useMemo(() => {
		if (initialImageUrl !== undefined) return initialImageUrl;
		if (isDemo) return SAMPLE_PATIENT_RVG_URL;
		return "";
	}, [initialImageUrl, isDemo]);

	const [sensorStatus, setSensorStatus] = useState<SensorCaptureStatus>(
		isDemo ? "ready" : "not_detected"
	);
	const [selectedSensorModel, setSelectedSensorModel] = useState<string>(
		isDemo ? "vatech_ezsensor_hd" : "none"
	);
	const [acquisitionProgress, setAcquisitionProgress] = useState<number>(0);
	const [isDetectingSensor, setIsDetectingSensor] = useState<boolean>(false);
	const [sensorHealthStatus, setSensorHealthStatus] = useState<string>(
		isDemo
			? "Ожидание снимка (Hot Folder / Автоподхват) — Vatech EzSensor HD"
			: "Датчик не обнаружен (подключите USB-визиограф или выберите сетевую папку)"
	);
	const [capturedImage, setCapturedImage] = useState<string>(defaultImage);
	const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);

	// WebSocket connection for real-time IMAGING_STUDY_INGESTED broadcast (<50ms auto-capture)
	const wsUrl = useMemo(() => {
		const configured = import.meta.env?.VITE_WS_URL;
		if (configured) return configured;
		if (typeof window === "undefined") return "";
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	}, []);

	const { lastMessage } = useWebsocket(wsUrl);

	// Ingest incoming study from WebSocket broker
	useEffect(() => {
		if (!lastMessage) return;
		if (lastMessage.type === "IMAGING_STUDY_INGESTED") {
			VisiographPacsWatcherService.handleWebSocketImagingIngested(lastMessage.payload);
		}
	}, [lastMessage]);

	// Subscribe to Visiograph / PACS watcher events (both local folder watch & WebSocket ingested)
	useEffect(() => {
		VisiographPacsWatcherService.bindToActivePatient(patientId);
		void VisiographPacsWatcherService.startWatching();

		const unsubscribe = VisiographPacsWatcherService.onNewScanDetected((scanEvent) => {
			if (patientId && scanEvent.patientId && scanEvent.patientId !== patientId) {
				return;
			}
			const imgUrl = scanEvent.filePath || scanEvent.thumbnailDataUri;
			if (imgUrl) {
				setCapturedImage(imgUrl);
				setSensorStatus("captured");
				setAcquisitionProgress(100);
				setSensorHealthStatus(`Снимок получен: ${scanEvent.fileName}`);
				onCaptureReady?.(imgUrl);
				if (scanEvent.toothCode) {
					onTeethDetected?.([scanEvent.toothCode]);
				}
				showToast(`Снимок визиографа получен: ${scanEvent.fileName}`, "success");
			}
		});

		return () => {
			unsubscribe();
		};
	}, [patientId, onCaptureReady, onTeethDetected]);

	// Direct File Upload & Ingestion State
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState<boolean>(false);

	const handleOpenCatalog = useCallback(() => setIsCatalogOpen(true), []);
	const handleCloseCatalog = useCallback(() => setIsCatalogOpen(false), []);
	const handleSelectSensorFromCatalog = useCallback((sensor: { id: string; name: string }) => {
		setSelectedSensorModel(sensor.id);
		setSensorStatus("ready");
		setSensorHealthStatus(`Выбран из каталога: ${sensor.name}`);
		setIsCatalogOpen(false);
		showToast(`Выбран датчик: ${sensor.name}`, "success");
	}, []);

	const handleAutoDetectSensor = useCallback(async () => {
		setIsDetectingSensor(true);
		try {
			const res = await autoDetectConnectedSensor();
			setSelectedSensorModel(res.sensorModelId);
			setSensorHealthStatus(res.statusMessage);
			setSensorStatus(res.isDetected ? "ready" : "not_detected");
			if (res.isDetected) {
				showToast(res.statusMessage, "success");
			} else {
				showToast(res.statusMessage, "info");
			}
		} catch {
			setSensorStatus("not_detected");
			setSensorHealthStatus("Датчик не обнаружен. Проверьте USB или сетевую папку (Hot Folder)");
			showToast("Датчик не обнаружен", "info");
		} finally {
			setIsDetectingSensor(false);
		}
	}, []);

	const handleTestSensorConnection = useCallback(async () => {
		const res = await testSensorConnection(selectedSensorModel);
		setSensorHealthStatus(res.statusText);
		if (res.isReady) {
			setSensorStatus("ready");
			showToast(`${res.statusText} (${res.latencyMs} мс)`, "success");
		} else {
			setSensorStatus("not_detected");
			showToast(res.statusText, "info");
		}
	}, [selectedSensorModel]);

	// Popular sensors merged with SENSOR_MODELS and UNIVERSAL_SENSOR_CATALOG
	const availableSensors = useMemo<RvgSensorDeviceOption[]>(() => {
		const list: RvgSensorDeviceOption[] = [...SENSOR_MODELS];
		for (const u of UNIVERSAL_SENSOR_CATALOG) {
			if (!list.some((existing) => existing.id === u.id)) {
				list.push({
					id: u.id,
					name: u.name,
					resolution: u.resolution,
					pixelSpacing: u.pixelSpacing,
					brandName: u.brandName,
				});
			}
		}
		for (const s of POPULAR_RVG_SENSORS) {
			if (!list.some((existing) => existing.id === s.id)) {
				list.push({
					id: s.id,
					name: s.name,
					resolution: s.resolution,
					pixelSpacing: s.pixelSpacing,
				});
			}
		}
		return list;
	}, []);

	// Trigger physical or instant x-ray exposure capture (<50ms instant capture)
	const handleTriggerCapture = useCallback(() => {
		if (sensorStatus === "acquiring") return;
		if (initialImageUrl) {
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			setCapturedImage(initialImageUrl);
			onCaptureReady?.(initialImageUrl);
			showToast("Снимок успешно получен с датчика RVG", "success");
			return;
		}
		if (isDemo) {
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			setCapturedImage(SAMPLE_PATIENT_RVG_URL);
			onCaptureReady?.(SAMPLE_PATIENT_RVG_URL);
			showToast("Демо-режим: демонстрационный снимок RVG получен", "success");
			return;
		}
		showToast("Датчик ожидает физической экспозиции рентген-аппарата или загрузки файла", "info");
	}, [sensorStatus, initialImageUrl, isDemo, onCaptureReady]);

	const handleLoadDemo = useCallback(() => {
		setCapturedImage(SAMPLE_PATIENT_RVG_URL);
		setSensorStatus("captured");
		onCaptureReady?.(SAMPLE_PATIENT_RVG_URL);
	}, [onCaptureReady]);

	const handleProcessFile = useCallback(
		async (file: File) => {
			const validation = validateRadiologyUploadFile(file);
			if (!validation.isValid) {
				showToast(
					`Неподдерживаемый формат файла: ${file.name}. Поддерживаются: DICOM (.dcm), TIFF, PNG, JPG, BMP`,
					"error",
				);
				return false;
			}

			try {
				const res = await readRadiologyFileForCapture(file);
				if (res.matchedSensorId) setSelectedSensorModel(res.matchedSensorId);
				if (res.detectedTeeth && res.detectedTeeth.length > 0) {
					onTeethDetected?.(res.detectedTeeth, res.suggestedProjection);
				}
				setCapturedImage(res.imageUrl);
				setSensorStatus("captured");
				setAcquisitionProgress(100);
				onCaptureReady?.(res.imageUrl);
				if (res.clinicalNote) {
					onClinicalNoteDetected?.(res.clinicalNote);
				}
				showToast(`Снимок ${file.name} успешно загружен`, "success");
				return true;
			} catch {
				showToast(`Ошибка чтения файла: ${file.name}`, "error");
				return false;
			}
		},
		[onTeethDetected, onCaptureReady, onClinicalNoteDetected],
	);

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && files[0]) {
			void handleProcessFile(files[0]);
		}
		e.target.value = "";
	};

	const handleViewportDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleViewportDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleViewportDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		const files = e.dataTransfer.files;
		if (files && files.length > 0 && files[0]) {
			void handleProcessFile(files[0]);
		}
	};

	return {
		sensorStatus,
		setSensorStatus,
		selectedSensorModel,
		setSelectedSensorModel,
		acquisitionProgress,
		isDetectingSensor,
		sensorHealthStatus,
		handleAutoDetectSensor,
		handleTestSensorConnection,
		availableSensors,
		capturedImage,
		setCapturedImage,
		handleTriggerCapture,
		handleLoadDemo,
		fileInputRef,
		isDragOver,
		handleFileInputChange,
		handleViewportDragOver,
		handleViewportDragLeave,
		handleViewportDrop,
		handleProcessFile,
		isCatalogOpen,
		handleOpenCatalog,
		handleCloseCatalog,
		handleSelectSensorFromCatalog,
	};
}
