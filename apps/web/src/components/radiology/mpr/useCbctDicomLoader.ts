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
	parseDicomSliceHeader,
	decodeSliceVoxels,
} from "../realDicomVolumeLoader";
import { getSharedCbctWorkerBridge } from "./cbctWorkerBridge";
import type { DecodeDicomSliceTask } from "./cbctWorkerBridge";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";

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
	const activeLoadIdRef = useRef<number>(0);

	const alignArchAndCrosshair = useCallback((vol: CbctVoxelVolume) => {
		const arch = autoDetectDentalArch(vol, jawType);
		setArchCurve(arch);
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
	}, [jawType, setArchCurve, setCrosshairMm]);

	const handleProgressiveVolumeReady = useCallback(
		(previewVol: CbctVoxelVolume, loadId: number) => {
			if (loadId !== activeLoadIdRef.current) return;
			setVolume(previewVol);
			setLoadedSliceCount(previewVol.dimensions.depth);
			if (previewVol.defaultWindowWidth) setWindowWidth(previewVol.defaultWindowWidth);
			if (previewVol.defaultWindowLevel) setWindowLevel(previewVol.defaultWindowLevel);
			alignArchAndCrosshair(previewVol);
		},
		[alignArchAndCrosshair, setLoadedSliceCount, setVolume, setWindowLevel, setWindowWidth],
	);

	const handleDicomFilesChange = useCallback(
		async (files: File[] | FileList | null | undefined) => {
			if (!files) return;
			const fileArray = Array.from(files);
			if (fileArray.length === 0) return;

			const currentLoadId = ++activeLoadIdRef.current;
			const zipFile = fileArray.find((f) => f.name.toLowerCase().endsWith(".zip"));
			if (zipFile) {
				setDicomLoadingStatus("Распаковка ZIP-архива КТ...");
				setDicomProgress(5);
				try {
					const buf = await zipFile.arrayBuffer();
					const vol = await buildVolumeFromDicomZip(buf, {
						onProgress: (pct, msg) => {
							if (currentLoadId !== activeLoadIdRef.current) return;
							setDicomProgress(pct);
							setDicomLoadingStatus(msg);
						},
						onProgressiveVolumeReady: (preview) => handleProgressiveVolumeReady(preview, currentLoadId),
						workerBridge: getSharedCbctWorkerBridge(),
						enableProgressiveLOD: true,
					});

					if (currentLoadId !== activeLoadIdRef.current) return;
					setVolume(vol);
					setLoadedSliceCount(vol.dimensions.depth);
					if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
					if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
					alignArchAndCrosshair(vol);
					setDicomLoadingStatus(null);
					showToast(`Загружен ZIP-архив КТ: ${vol.dimensions.depth} срезов, дуга ОПТГ авто-выровнена`, "success");
				} catch (err: unknown) {
					if (currentLoadId !== activeLoadIdRef.current) return;
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
				const vol = await buildVolumeFromDicomFiles(dcmFiles, {
					onProgress: (pct, msg) => {
						if (currentLoadId !== activeLoadIdRef.current) return;
						setDicomProgress(pct);
						setDicomLoadingStatus(msg);
					},
					onProgressiveVolumeReady: (preview) => handleProgressiveVolumeReady(preview, currentLoadId),
					workerBridge: getSharedCbctWorkerBridge(),
					enableProgressiveLOD: true,
				});

				if (currentLoadId !== activeLoadIdRef.current) return;
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setPatientDisplayName(resolvedPatientName);
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				const arch = alignArchAndCrosshair(vol);
				setDicomLoadingStatus(null);
				showToast(`Загружена серия DICOM (${resolvedPatientName}): авто-детектор дуги сформировал дугу ОПТГ (${arch.totalArcLengthMm.toFixed(1)} мм)`, "success");
			} catch (err: unknown) {
				if (currentLoadId !== activeLoadIdRef.current) return;
				setDicomLoadingStatus(null);
				const msg = err instanceof Error ? err.message : "Ошибка чтения DICOM";
				showToast(msg, "error");
			}
		},
		[alignArchAndCrosshair, handleProgressiveVolumeReady, resolvedPatientName, setLoadedSliceCount, setPatientDisplayName, setVolume, setWindowLevel, setWindowWidth],
	);

	const handleLoadFromDicomweb = useCallback(
		async (studyUid: string, seriesUid: string) => {
			const currentLoadId = ++activeLoadIdRef.current;
			setDicomLoadingStatus("Загрузка исследования из DICOMweb...");
			setDicomProgress(5);
			try {
				const authHeaders = getDenteAuthHeaders();
				const vol = await buildVolumeFromDicomweb(studyUid, seriesUid, {
					headers: authHeaders,
					onProgress: (pct, msg) => {
						if (currentLoadId !== activeLoadIdRef.current) return;
						setDicomProgress(pct);
						setDicomLoadingStatus(msg);
					},
					onProgressiveVolumeReady: (preview) => handleProgressiveVolumeReady(preview, currentLoadId),
					workerBridge: getSharedCbctWorkerBridge(),
					enableProgressiveLOD: true,
				});
				if (currentLoadId !== activeLoadIdRef.current) return;
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setPatientDisplayName(resolvedPatientName);
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				alignArchAndCrosshair(vol);
				setDicomLoadingStatus(null);
				showToast(`Загружено КТ из DICOMweb: ${vol.dimensions.depth} срезов`, "success");
			} catch (err: unknown) {
				if (currentLoadId !== activeLoadIdRef.current) return;
				setDicomLoadingStatus(null);
				const msg = err instanceof Error ? err.message : "Ошибка DICOMweb";
				showToast(msg, "error");
			}
		},
		[alignArchAndCrosshair, handleProgressiveVolumeReady, resolvedPatientName, setLoadedSliceCount, setPatientDisplayName, setVolume, setWindowLevel, setWindowWidth],
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

interface DemoCbctManifest {
	readonly seriesDescription?: string;
	readonly patientName?: string;
	readonly sliceCount?: number;
	readonly voxelSpacing?: readonly [number, number, number];
	readonly slices: readonly string[];
}

	const handleLoadDemoVolume = useCallback(async () => {
		setDicomLoadingStatus("Чтение манифеста многосрезовой 3D КЛКТ...");
		setDicomProgress(5);
		try {
			// 1. Fetch manifest.json
			let manifest: DemoCbctManifest | null = null;

			try {
				const res = await fetch("/radiology/demo_cbct/manifest.json");
				if (res.ok) {
					const data = (await res.json()) as unknown;
					if (
						data &&
						typeof data === "object" &&
						"slices" in data &&
						Array.isArray((data as { slices: unknown }).slices)
					) {
						manifest = data as DemoCbctManifest;
					}
				}
			} catch {
				// manifest fetch failed, will fallback to single slice
			}

			// If manifest is available with slices
			if (manifest && manifest.slices.length > 0) {
				const totalSlices = manifest.slices.length;
				const currentLoadId = ++activeLoadIdRef.current;
				const demoPatientName = manifest.patientName || "3D КЛКТ исследование";

				// 2. INSTANT FIRST SLICE (Z=156):
				// Fetch and decode central slice immediately for instant 2D Axial viewport paint (< 1-2s)
				const midIdx = Math.floor(totalSlices / 2);
				setDicomLoadingStatus(`Загрузка центрального среза КТ (Z=${midIdx + 1})...`);
				setDicomProgress(8);

				const centerSliceName = manifest.slices[midIdx]!;
				const centerUrl = centerSliceName.startsWith("/") || centerSliceName.startsWith("http")
					? centerSliceName
					: `/radiology/demo_cbct/${centerSliceName}`;

				const centerRes = await fetch(centerUrl);
				if (!centerRes.ok) throw new Error(`Не удалось загрузить центральный срез: ${centerRes.statusText}`);
				const centerBuf = await centerRes.arrayBuffer();

				if (currentLoadId !== activeLoadIdRef.current) return;

				const centerHeader = parseDicomSliceHeader(centerBuf);
				const width = centerHeader.cols;
				const height = centerHeader.rows;
				const sliceVoxelCount = width * height;
				const totalVoxels = width * height * totalSlices;
				const voxelData = new Int16Array(totalVoxels);

				const isSigned = centerHeader.pixelRepresentation === 1;
				const bitsStored = centerHeader.bitsStored > 0 && centerHeader.bitsStored <= 16 ? centerHeader.bitsStored : 16;
				const slope = Number.isFinite(centerHeader.rescaleSlope) && centerHeader.rescaleSlope > 0 ? centerHeader.rescaleSlope : 1.0;
				const intercept = Number.isFinite(centerHeader.rescaleIntercept) ? centerHeader.rescaleIntercept : 0.0;
				const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
				const intIntercept = intercept | 0;
				const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
				const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
				const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

				const offset = centerHeader.pixelDataByteOffset;
				let rawSlice: Int16Array | Uint16Array;
				if (offset % 2 === 0 && centerBuf.byteLength >= offset + sliceVoxelCount * 2) {
					rawSlice = isSigned ? new Int16Array(centerBuf, offset, sliceVoxelCount) : new Uint16Array(centerBuf, offset, sliceVoxelCount);
				} else {
					const sliceBuf = centerBuf.slice(offset, offset + sliceVoxelCount * 2);
					const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
					const safeBuf = validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
					rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
				}

				const baseIdx = midIdx * sliceVoxelCount;
				const centerStats = decodeSliceVoxels({
					rawSlice,
					voxelData,
					baseIdx,
					sliceVoxelCount,
					width,
					height,
					bitsStored,
					isSigned,
					isLinearInteger,
					intIntercept,
					slope,
					intercept,
					mask,
					signBit,
					signExt,
					flipX: false,
					flipY: false,
				});

				const spacingZ = manifest.voxelSpacing?.[2] ?? (centerHeader.sliceThickness > 0.01 ? centerHeader.sliceThickness : 0.25);
				const spacingX = manifest.voxelSpacing?.[0] ?? centerHeader.pixelSpacing.x;
				const spacingY = manifest.voxelSpacing?.[1] ?? centerHeader.pixelSpacing.y;
				const physicalWidthMm = width * spacingX;
				const physicalHeightMm = height * spacingY;
				const physicalDepthMm = totalSlices * spacingZ;
				const centerZMm = (midIdx - totalSlices * 0.5) * spacingZ;

				const previewVol: CbctVoxelVolume = {
					id: `cbct-demo-${currentLoadId}-preview`,
					dimensions: { width, height, depth: totalSlices },
					spacingMm: { x: spacingX, y: spacingY, z: spacingZ },
					originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
					physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
					data: voxelData,
					minHU: centerStats.minHU,
					maxHU: centerStats.maxHU,
					rescaleSlope: centerHeader.rescaleSlope,
					rescaleIntercept: centerHeader.rescaleIntercept,
					defaultWindowWidth: 4400,
					defaultWindowLevel: 1300,
					isProgressivePreview: true,
					isDisposed: false,
				};

				// Paint instant 2D Axial slice immediately (< 1-2s)
				setVolume(previewVol);
				setLoadedSliceCount(1);
				setPatientDisplayName(demoPatientName);
				setWindowWidth(previewVol.defaultWindowWidth ?? 4400);
				setWindowLevel(previewVol.defaultWindowLevel ?? 1300);
				setCrosshairMm({ x: 0, y: 0, z: centerZMm });
				setDicomLoadingStatus(`Загрузка 3D КЛКТ (1/${totalSlices})...`);
				setDicomProgress(10);

				await new Promise<void>((r) => setTimeout(r, 0));

				// 3. BACKGROUND CHUNKED STREAMING (batches of 10 with Transferable worker messages)
				const otherIndices: number[] = [];
				for (let i = 0; i < totalSlices; i++) {
					if (i !== midIdx) otherIndices.push(i);
				}

				const workerBridge = getSharedCbctWorkerBridge();
				const BATCH_SIZE = 10;
				let loadedSlices = 1;
				let globalMinHU = centerStats.minHU;
				let globalMaxHU = centerStats.maxHU;

				for (let b = 0; b < otherIndices.length; b += BATCH_SIZE) {
					if (currentLoadId !== activeLoadIdRef.current) return;
					const chunkIndices = otherIndices.slice(b, b + BATCH_SIZE);

					const chunkBufs = await Promise.all(
						chunkIndices.map(async (idx) => {
							const name = manifest.slices[idx]!;
							const u = name.startsWith("/") || name.startsWith("http") ? name : `/radiology/demo_cbct/${name}`;
							const res = await fetch(u);
							if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке ${name}`);
							const ab = await res.arrayBuffer();
							return { idx, ab, header: parseDicomSliceHeader(ab) };
						}),
					);

					if (currentLoadId !== activeLoadIdRef.current) return;

					const tasks: DecodeDicomSliceTask[] = chunkBufs.map((item) => ({
						sliceIndex: item.idx,
						buffer: item.ab,
						pixelDataByteOffset: item.header.pixelDataByteOffset,
						width,
						height,
						bitsStored,
						isSigned,
						rescaleSlope: slope,
						rescaleIntercept: intercept,
						flipX: false,
						flipY: false,
					}));

					// Decode slices in worker with Transferable buffers (zero-copy ArrayBuffers)
					const decodedBatch = await workerBridge.decodeDicomSlices(tasks, true);
					for (const res of decodedBatch) {
						voxelData.set(res.data, res.sliceIndex * sliceVoxelCount);
						if (res.minHU < globalMinHU) globalMinHU = res.minHU;
						if (res.maxHU > globalMaxHU) globalMaxHU = res.maxHU;
					}

					loadedSlices += chunkIndices.length;
					setLoadedSliceCount(loadedSlices);
					const pct = 10 + Math.round((loadedSlices / totalSlices) * 88);
					setDicomProgress(pct);
					setDicomLoadingStatus(`Загрузка срезов КТ (${loadedSlices}/${totalSlices})...`);

					// Mandatory yield to browser event loop to eliminate UI freeze
					await new Promise<void>((r) => setTimeout(r, 0));
				}

				if (currentLoadId !== activeLoadIdRef.current) return;

				// 4. FINAL VOLUME STABILIZATION
				const finalVol: CbctVoxelVolume = {
					...previewVol,
					id: `cbct-demo-${currentLoadId}`,
					minHU: globalMinHU,
					maxHU: globalMaxHU,
					isProgressivePreview: false,
				};

				setVolume(finalVol);
				setLoadedSliceCount(totalSlices);
				if (typeof window !== "undefined") {
					(window as unknown as { __cbctDemoVolume?: CbctVoxelVolume }).__cbctDemoVolume = finalVol;
				}

				const arch = alignArchAndCrosshair(finalVol);
				setDicomLoadingStatus(null);
				setDicomProgress(100);

				const { x: sx, y: sy, z: sz } = finalVol.spacingMm;
				showToast(
					`Загружена 3D КЛКТ (${demoPatientName}): ${totalSlices} срезов (${width}x${height}), воксель ${sx.toFixed(2)}x${sy.toFixed(2)}x${sz.toFixed(2)} мм, дуга ОПТГ ${arch.totalArcLengthMm.toFixed(1)} мм`,
					"success",
				);
				return;
			}

			// Fallback if demo_cbct folder is missing: load single slice fixture
			setDicomLoadingStatus("Загрузка тестового среза КТ (резервный режим)...");
			setDicomProgress(20);
			const fallbackRes = await fetch("/radiology/kavo_op300_cbct_slice.dcm");
			if (!fallbackRes.ok) {
				throw new Error(`Не удалось загрузить демо-файл: ${fallbackRes.statusText}`);
			}
			const blob = await fallbackRes.blob();
			const file = new File([blob], "kavo_op300_cbct_slice.dcm", { type: "application/dicom" });
			await handleDicomFilesChange([file]);
		} catch (err: unknown) {
			setDicomLoadingStatus(null);
			setDicomProgress(0);
			const msg = err instanceof Error ? err.message : "Ошибка загрузки демо КТ";
			showToast(msg, "error");
		}
	}, [
		alignArchAndCrosshair,
		handleDicomFilesChange,
		setLoadedSliceCount,
		setPatientDisplayName,
		setVolume,
		setWindowLevel,
		setWindowWidth,
		setCrosshairMm,
	]);

	const handleLoadImageIds = useCallback(
		async (imageIds: readonly string[]) => {
			if (!imageIds || imageIds.length === 0) return;
			const currentLoadId = ++activeLoadIdRef.current;
			setDicomLoadingStatus(`Загрузка ${imageIds.length} срезов КТ...`);
			setDicomProgress(5);
			try {
				let loaded = 0;
				const files: File[] = [];
				const CHUNK_SIZE = 10;
				const authHeaders = getDenteAuthHeaders({ Accept: "application/dicom" });
				for (let i = 0; i < imageIds.length; i += CHUNK_SIZE) {
					if (currentLoadId !== activeLoadIdRef.current) return;
					const chunk = imageIds.slice(i, i + CHUNK_SIZE);
					const chunkFiles = await Promise.all(
						chunk.map(async (id, idx) => {
							const cleanUrl = id.replace(/^wadouri:/, "");
							const res = await fetch(cleanUrl, { headers: authHeaders });
							if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке среза ${i + idx + 1}`);
							const blob = await res.blob();
							return new File([blob], `slice_${String(i + idx).padStart(3, "0")}.dcm`, { type: "application/dicom" });
						}),
					);
					files.push(...chunkFiles);
					loaded += chunkFiles.length;
					setDicomProgress(5 + Math.round((loaded / imageIds.length) * 40));
					setDicomLoadingStatus(`Загружено ${loaded} из ${imageIds.length} срезов...`);
					await new Promise<void>((r) => setTimeout(r, 0));
				}
				if (currentLoadId !== activeLoadIdRef.current) return;
				const vol = await buildVolumeFromDicomFiles(files, {
					onProgress: (pct, msg) => {
						if (currentLoadId !== activeLoadIdRef.current) return;
						setDicomProgress(45 + Math.round(pct * 0.55));
						setDicomLoadingStatus(msg);
					},
					onProgressiveVolumeReady: (preview) => handleProgressiveVolumeReady(preview, currentLoadId),
					workerBridge: getSharedCbctWorkerBridge(),
					enableProgressiveLOD: true,
				});
				if (currentLoadId !== activeLoadIdRef.current) return;
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setPatientDisplayName(resolvedPatientName);
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				const arch = alignArchAndCrosshair(vol);
				setDicomLoadingStatus(null);
				setDicomProgress(100);
				showToast(`Загружена 3D КЛКТ: ${vol.dimensions.depth} срезов, дуга ОПТГ ${arch.totalArcLengthMm.toFixed(1)} мм`, "success");
			} catch (err: unknown) {
				if (currentLoadId !== activeLoadIdRef.current) return;
				setDicomLoadingStatus(null);
				setDicomProgress(0);
				const msg = err instanceof Error ? err.message : "Ошибка загрузки срезов";
				showToast(msg, "error");
			}
		},
		[alignArchAndCrosshair, handleProgressiveVolumeReady, resolvedPatientName, setLoadedSliceCount, setPatientDisplayName, setVolume, setWindowLevel, setWindowWidth],
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
		handleLoadImageIds,
		handleSelectDicomFolder,
		handleSelectDicomZip,
		handleDropFiles,
		handleLoadDemoVolume,
	};
}
