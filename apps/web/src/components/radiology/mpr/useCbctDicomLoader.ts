import React, { useCallback, useRef, useState } from "react";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import type { DentalArchCurve } from "../dentalCurveEngine";
import {
	autoDetectDentalArch,
	findOcclusalZPlane,
} from "../dentalCurveEngine";
import {
	buildVolumeFromDicomFiles,
	buildVolumeFromDicomZip,
	buildVolumeFromDicomweb,
} from "../realDicomVolumeLoader";
import { showToast } from "../../GlobalToast";

export interface UseCbctDicomLoaderParams {
	jawType: "mandible" | "maxilla";
	resolvedPatientName: string;
	setVolume: React.Dispatch<React.SetStateAction<CbctVoxelVolume | null>>;
	setLoadedSliceCount: React.Dispatch<React.SetStateAction<number>>;
	setPatientDisplayName: React.Dispatch<React.SetStateAction<string>>;
	setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
	setWindowLevel: React.Dispatch<React.SetStateAction<number>>;
	setArchCurve: React.Dispatch<React.SetStateAction<DentalArchCurve>>;
	setShowDentalArch: React.Dispatch<React.SetStateAction<boolean>>;
	setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
}

export function useCbctDicomLoader(params: UseCbctDicomLoaderParams) {
	const {
		jawType,
		resolvedPatientName,
		setVolume,
		setLoadedSliceCount,
		setPatientDisplayName,
		setWindowWidth,
		setWindowLevel,
		setArchCurve,
		setShowDentalArch,
		setCrosshairMm,
	} = params;

	const [dicomLoadingStatus, setDicomLoadingStatus] = useState<string | null>(null);
	const [dicomProgress, setDicomProgress] = useState<number>(0);
	const [isDragOverWindow, setIsDragOverWindow] = useState<boolean>(false);

	const folderInputRef = useRef<HTMLInputElement | null>(null);
	const zipInputRef = useRef<HTMLInputElement | null>(null);

	const alignArchAndCrosshair = useCallback((vol: CbctVoxelVolume) => {
		const arch = autoDetectDentalArch(vol, jawType);
		setArchCurve(arch);
		setShowDentalArch(true);
		const occlusalZMm = findOcclusalZPlane(vol, jawType);
		let archCenterX = 0;
		let archCenterY = 0;
		if (arch.splinePointsMm.length > 0) {
			const midIdx = Math.floor(arch.splinePointsMm.length / 2);
			archCenterX = arch.splinePointsMm[midIdx]?.x ?? 0;
			archCenterY = arch.splinePointsMm[midIdx]?.y ?? 0;
		} else if (arch.anchors.length > 0) {
			const midAnchor = arch.anchors[Math.floor(arch.anchors.length / 2)];
			archCenterX = midAnchor?.positionMm.x ?? 0;
			archCenterY = midAnchor?.positionMm.y ?? 0;
		}
		setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
		return arch;
	}, [jawType, setArchCurve, setShowDentalArch, setCrosshairMm]);

	const handleDicomFilesChange = useCallback(
		async (files: File[] | FileList | null | undefined) => {
			if (!files) return;
			const fileArray = Array.from(files);
			if (fileArray.length === 0) return;

			const zipFile = fileArray.find((f) => f.name.toLowerCase().endsWith(".zip"));
			if (zipFile) {
				setDicomLoadingStatus("Распаковка ZIP-архива КТ...");
				setDicomProgress(5);
				try {
					const buf = await zipFile.arrayBuffer();
					const vol = await buildVolumeFromDicomZip(buf, (pct, msg) => {
						setDicomProgress(pct);
						setDicomLoadingStatus(msg);
					});

					setVolume(vol);
					setLoadedSliceCount(vol.dimensions.depth);
					if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
					if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
					alignArchAndCrosshair(vol);
					setDicomLoadingStatus(null);
					showToast(`Загружен ZIP-архив КТ: ${vol.dimensions.depth} срезов, дуга ОПТГ авто-выровнена`, "success");
				} catch (err: unknown) {
					setDicomLoadingStatus(null);
					showToast(err instanceof Error ? err.message : "Ошибка архива", "error");
				}
				return;
			}

			const dcmFiles = fileArray.filter(
				(f) => f.name.toLowerCase().endsWith(".dcm") || f.name.toLowerCase().endsWith(".dicom") || !f.name.includes("."),
			);

			if (dcmFiles.length === 0) {
				showToast("В выбранных файлах не найдено файлов DICOM (.dcm)", "error");
				return;
			}

			setDicomLoadingStatus(`Загрузка ${dcmFiles.length} срезов DICOM...`);
			setDicomProgress(5);

			try {
				const vol = await buildVolumeFromDicomFiles(dcmFiles, (pct, msg) => {
					setDicomProgress(pct);
					setDicomLoadingStatus(msg);
				});

				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setPatientDisplayName(resolvedPatientName);
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				const arch = alignArchAndCrosshair(vol);
				setDicomLoadingStatus(null);
				showToast(`Загружена серия DICOM (${resolvedPatientName}): авто-детектор дуги сформировал дугу ОПТГ (${arch.totalArcLengthMm.toFixed(1)} мм)`, "success");
			} catch (err: unknown) {
				setDicomLoadingStatus(null);
				const msg = err instanceof Error ? err.message : "Ошибка чтения DICOM";
				showToast(msg, "error");
			}
		},
		[alignArchAndCrosshair, resolvedPatientName, setLoadedSliceCount, setPatientDisplayName, setVolume, setWindowLevel, setWindowWidth],
	);

	const handleLoadFromDicomweb = useCallback(
		async (studyUid: string, seriesUid: string) => {
			setDicomLoadingStatus("Загрузка исследования из DICOMweb...");
			setDicomProgress(5);
			try {
				const vol = await buildVolumeFromDicomweb(studyUid, seriesUid, {
					onProgress: (pct, msg) => {
						setDicomProgress(pct);
						setDicomLoadingStatus(msg);
					},
				});
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setPatientDisplayName(resolvedPatientName);
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				alignArchAndCrosshair(vol);
				setDicomLoadingStatus(null);
				showToast(`Загружено КТ из DICOMweb: ${vol.dimensions.depth} срезов`, "success");
			} catch (err: unknown) {
				setDicomLoadingStatus(null);
				const msg = err instanceof Error ? err.message : "Ошибка DICOMweb";
				showToast(msg, "error");
			}
		},
		[alignArchAndCrosshair, resolvedPatientName, setLoadedSliceCount, setPatientDisplayName, setVolume, setWindowLevel, setWindowWidth],
	);

	const handleSelectDicomFolder = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleDicomFilesChange(e.target.files);
		},
		[handleDicomFilesChange],
	);

	const handleSelectDicomZip = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleDicomFilesChange(e.target.files);
		},
		[handleDicomFilesChange],
	);

	const handleDropFiles = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOverWindow(false);
			if (e.dataTransfer.files) {
				handleDicomFilesChange(e.dataTransfer.files);
			}
		},
		[handleDicomFilesChange],
	);

	return {
		dicomLoadingStatus,
		dicomProgress,
		isDragOverWindow,
		setIsDragOverWindow,
		folderInputRef,
		zipInputRef,
		handleDicomFilesChange,
		handleLoadFromDicomweb,
		handleSelectDicomFolder,
		handleSelectDicomZip,
		handleDropFiles,
	};
}
