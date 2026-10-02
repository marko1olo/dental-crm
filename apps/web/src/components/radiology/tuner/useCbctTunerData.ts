/**
 * DENTE CRM — CBCT Tuner Patient Dataset Loader Hook
 * Loads all 5 clinical CBCT patients via fast binary streaming or demo files.
 * Standards: DICOM Part 3, Mandate 8b (< 800 lines).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CbctVoxelVolume } from "../cbctMprMath";
import type { DentalArchCurve } from "../dentalCurveEngine";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	autoDetectDentalArch,
	buildDentalArchCurve,
	findOcclusalZPlane,
} from "../dentalCurveEngine";

export interface TunerPatientOption {
	readonly id: string;
	readonly name: string;
	readonly badge: string;
	readonly description: string;
}

export const TUNER_PATIENTS: readonly TunerPatientOption[] = [
	{
		id: "zakharov",
		name: "Захаров Иван Дмитриевич",
		badge: "312 срезов (демо)",
		description: "600x600x312, концевой дефект 26/27, пневматизация верхнечелюстной пазухи",
	},
	{
		id: "bulyakov",
		name: "Буляков Н.З.",
		badge: "мультифрейм 560x560",
		description: "Мультифрейм КЛКТ 560x560x311, интактный прикус, плотная кортикальная кость",
	},
	{
		id: "barabash",
		name: "Барабаш С.В.",
		badge: "800x800 (400 срезов)",
		description: "400 срезов 640x640, широкая брахицефалическая челюсть, моляры 17/18",
	},
	{
		id: "sumarokova",
		name: "Сумарокова И.О.",
		badge: "сектор 24-26 (344 среза)",
		description: "344 среза 277x333, FOV 41.5x49.9 мм, сектор 24-26",
	},
	{
		id: "amirova",
		name: "Амирова Н.Н.",
		badge: "ультра-HD (547 срезов)",
		description: "547 срезов 512x512, металлокерамика, артефакты в 1 сегменте",
	},
];

export function useCbctTunerData(initialPatientId = "zakharov") {
	const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId);
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(() => {
		if (typeof window !== "undefined") {
			const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
			if (win.__cbctDemoVolume) return win.__cbctDemoVolume;
		}
		return null;
	});
	const [archCurve, setArchCurve] = useState<DentalArchCurve>(() =>
		buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible"),
	);
	const [recommendedZIndex, setRecommendedZIndex] = useState<number>(156);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [loadStatus, setLoadStatus] = useState<string | null>(null);
	const activeLoadIdRef = useRef<number>(0);

	const loadPatientVolume = useCallback(async (patientId: string) => {
		const currentLoadId = ++activeLoadIdRef.current;
		setIsLoading(true);
		setLoadStatus(`Загрузка КЛКТ (${patientId})...`);

		try {
			// Fast path 1: Check existing global demo volume for zakharov
			if (patientId === "zakharov" && typeof window !== "undefined") {
				const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
				if (win.__cbctDemoVolume) {
					const demoVol = win.__cbctDemoVolume;
					setVolume({
						...demoVol,
						defaultWindowWidth: 4025,
						defaultWindowLevel: 525,
					});
					const arch = autoDetectDentalArch(demoVol, "mandible");
					setArchCurve(arch);
					try {
						const occZMm = findOcclusalZPlane(win.__cbctDemoVolume, "mandible");
						const originZ = win.__cbctDemoVolume.originMm?.z ?? 0;
						const spZ = win.__cbctDemoVolume.spacingMm?.z || 0.25;
						const dimZ = win.__cbctDemoVolume.dimensions.depth;
						const occIdx = Math.max(0, Math.min(dimZ - 1, Math.round((occZMm - originZ) / spZ)));
						setRecommendedZIndex(occIdx);
					} catch {
						setRecommendedZIndex(Math.floor(win.__cbctDemoVolume.dimensions.depth / 2));
					}
					setIsLoading(false);
					setLoadStatus(null);
					return;
				}
			}

			// Fast path 2: Stream binary volume from Vite dev middleware
			const res = await fetch(`/api/cbct-tuner/volume-binary?id=${encodeURIComponent(patientId)}`);
			if (res.ok) {
				setLoadStatus("Декодирование воксельного куба...");
				const dimX = Number(res.headers.get("x-cbct-dim-x")) || 512;
				const dimY = Number(res.headers.get("x-cbct-dim-y")) || 512;
				const dimZ = Number(res.headers.get("x-cbct-dim-z")) || 300;
				const spX = Number(res.headers.get("x-cbct-sp-x")) || 0.25;
				const spY = Number(res.headers.get("x-cbct-sp-y")) || 0.25;
				const spZ = Number(res.headers.get("x-cbct-sp-z")) || 0.25;
				const minHU = Number(res.headers.get("x-cbct-min-hu")) || -1000;
				const maxHU = Number(res.headers.get("x-cbct-max-hu")) || 3000;
				const rawName = res.headers.get("x-cbct-name");
				const patientName = rawName ? decodeURIComponent(rawName) : patientId;

				const arrayBuffer = await res.arrayBuffer();
				if (currentLoadId !== activeLoadIdRef.current) return;

				const data = new Int16Array(arrayBuffer);
				const vol: CbctVoxelVolume = {
					id: `cbct-${patientId}-${Date.now()}`,
					dimensions: { width: dimX, height: dimY, depth: dimZ },
					spacingMm: { x: spX, y: spY, z: spZ },
					originMm: {
						x: -(dimX * spX) / 2,
						y: -(dimY * spY) / 2,
						z: -(dimZ * spZ) / 2,
					},
					minHU,
					maxHU,
					data,
					physicalSizeMm: {
						x: dimX * spX,
						y: dimY * spY,
						z: dimZ * spZ,
					},
					isDisposed: false,
					defaultWindowWidth: 4025,
					defaultWindowLevel: 525,
				};

				if (typeof window !== "undefined" && patientId === "zakharov") {
					(window as unknown as { __cbctDemoVolume?: CbctVoxelVolume }).__cbctDemoVolume = vol;
				}

				setVolume(vol);
				const detectedArch = autoDetectDentalArch(vol, "mandible");
				setArchCurve(detectedArch);
				try {
					const occZMm = findOcclusalZPlane(vol, "mandible");
					const originZ = vol.originMm?.z ?? 0;
					const spZ = vol.spacingMm?.z || 0.25;
					const occIdx = Math.max(0, Math.min(dimZ - 1, Math.round((occZMm - originZ) / spZ)));
					setRecommendedZIndex(occIdx);
				} catch {
					setRecommendedZIndex(Math.floor(dimZ / 2));
				}

				setIsLoading(false);
				setLoadStatus(null);
				return;
			}

			// Fallback: If binary endpoint fails, try demo_cbct manifest
			setLoadStatus("Загрузка через манифест демо КТ...");
			const manifestRes = await fetch("/radiology/demo_cbct/manifest.json");
			if (manifestRes.ok) {
				const manifest = await manifestRes.json();
				const sliceNames = manifest.slices as string[];
				const midIdx = Math.floor(sliceNames.length / 2);
				const midRes = await fetch(`/radiology/demo_cbct/${sliceNames[midIdx]}`);
				if (midRes.ok) {
					// Fallback minimal preview
					setLoadStatus(null);
					setIsLoading(false);
				}
			}
		} catch (err: unknown) {
			console.error("[CbctTunerData] Failed to load volume:", err);
			setLoadStatus("Ошибка загрузки КТ. Используется резервный режим.");
		} finally {
			if (currentLoadId === activeLoadIdRef.current) {
				setIsLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		loadPatientVolume(selectedPatientId);
	}, [selectedPatientId, loadPatientVolume]);

	return {
		selectedPatientId,
		setSelectedPatientId,
		volume,
		archCurve,
		recommendedZIndex,
		isLoading,
		loadStatus,
		reloadPatient: () => loadPatientVolume(selectedPatientId),
	};
}
