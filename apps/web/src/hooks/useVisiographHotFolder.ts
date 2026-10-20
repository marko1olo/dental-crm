/**
 * useVisiographHotFolder.ts — React Hook for Autonomous Visiograph Hot Folder Intake.
 *
 * Implements Mandates 8e (Doctor Autonomy, zero sensor lock-in), 8s (Canonical Authority).
 * Provides:
 * - Reactive state of incoming visiograph x-ray scans
 * - Debounced queue badge (+N новых)
 * - 1-Click linking to current active tooth (Enter hotkey)
 * - 1-Click opening in DirectRvgCaptureModal
 * - Seamless dismissal (Escape hotkey)
 *
 * Conforms to anti-monolith limit (<500 lines).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	getVisiographHotFolderEngine,
	isFileSystemAccessSupported,
	type VisiographDetectedScan,
	type HotFolderScanSimulatedDetail,
} from "../lib/visiographHotFolderEngine";
import { useAppStore } from "../store/appStore";
import { useVisitStore } from "../store/visitStore";

export interface UseVisiographHotFolderResult {
	readonly currentScan: VisiographDetectedScan | null;
	readonly queuedCount: number;
	readonly isWatching: boolean;
	readonly isFileSystemSupported: boolean;
	readonly activeTooth: string;
	readonly startWatchingFolder: () => Promise<boolean>;
	readonly stopWatching: () => void;
	readonly linkToTooth: (tooth?: string) => void;
	readonly openInViewer: () => void;
	readonly dismissToast: () => void;
	readonly simulateScanArrival: (params?: Partial<HotFolderScanSimulatedDetail>) => void;
}

export function useVisiographHotFolder(): UseVisiographHotFolderResult {
	const engine = useMemo(() => getVisiographHotFolderEngine(), []);
	const [currentScan, setCurrentScan] = useState<VisiographDetectedScan | null>(() => engine.getCurrentScan());
	const [queuedCount, setQueuedCount] = useState<number>(() => engine.getQueuedCount());
	const [isWatching, setIsWatching] = useState<boolean>(false);

	// Synchronize active tooth from stores
	const appActiveTooth = useAppStore((state) => state.activeTooth);
	const visitActiveTooth = useVisitStore((state) => state.activeToothNumber);

	const activeTooth = useMemo(() => {
		if (appActiveTooth !== null && appActiveTooth !== undefined) {
			return String(appActiveTooth);
		}
		if (visitActiveTooth !== null && visitActiveTooth !== undefined) {
			return String(visitActiveTooth);
		}
		return "16";
	}, [appActiveTooth, visitActiveTooth]);

	// Subscribe to engine events
	useEffect(() => {
		const unsubscribe = engine.subscribe((scan, queueLength) => {
			setCurrentScan(scan);
			setQueuedCount(queueLength);
		});

		return () => {
			unsubscribe();
		};
	}, [engine]);

	const dismissToast = useCallback(() => {
		engine.dismissCurrentScan();
	}, [engine]);

	const linkToTooth = useCallback(
		(targetTooth?: string) => {
			if (!currentScan) return;
			const toothToUse = targetTooth || currentScan.detectedTooth || activeTooth;
			engine.attachScanToVisit(currentScan, toothToUse);
		},
		[engine, currentScan, activeTooth],
	);

	const openInViewer = useCallback(() => {
		if (!currentScan) return;
		engine.openScanInDirectViewer(currentScan, activeTooth);
	}, [engine, currentScan, activeTooth]);

	const startWatchingFolder = useCallback(async (): Promise<boolean> => {
		if (!isFileSystemAccessSupported()) {
			return false;
		}

		try {
			// biome-ignore lint/suspicious/noExplicitAny: window.showDirectoryPicker
			const dirHandle = await (window as any).showDirectoryPicker({
				id: "dente-rvg-hotfolder",
				mode: "read",
				startIn: "documents",
			});

			if (dirHandle) {
				await engine.startDirectoryWatcher(dirHandle);
				setIsWatching(true);
				return true;
			}
			return false;
		} catch {
			// User canceled picker or permission denied
			return false;
		}
	}, [engine]);

	const stopWatching = useCallback(() => {
		engine.stopDirectoryWatcher();
		setIsWatching(false);
	}, [engine]);

	const simulateScanArrival = useCallback(
		(params?: Partial<HotFolderScanSimulatedDetail>) => {
			engine.simulateIncomingScan({
				fileName: params?.fileName || "Vatech_EzSensor_Tooth16_Periapical.dcm",
				fileSize: params?.fileSize || 2480100,
				folderPath: params?.folderPath || "C:\\EzSensor\\Capture",
				imageUrl: params?.imageUrl || "/radiology/sample_rvg_tooth16.jpg",
				tooth: params?.tooth || activeTooth,
				brand: params?.brand || "vatech",
				modelId: params?.modelId || "vatech_ezsensor_hd",
			});
		},
		[engine, activeTooth],
	);

	// Hotkeys: Enter confirms linking, Escape dismisses HUD
	useEffect(() => {
		if (!currentScan) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't intercept if user is typing in form inputs
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			if (e.key === "Enter") {
				e.preventDefault();
				linkToTooth();
			} else if (e.key === "Escape") {
				e.preventDefault();
				dismissToast();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [currentScan, linkToTooth, dismissToast]);

	return {
		currentScan,
		queuedCount,
		isWatching,
		isFileSystemSupported: isFileSystemAccessSupported(),
		activeTooth,
		startWatchingFolder,
		stopWatching,
		linkToTooth,
		openInViewer,
		dismissToast,
		simulateScanArrival,
	};
}
