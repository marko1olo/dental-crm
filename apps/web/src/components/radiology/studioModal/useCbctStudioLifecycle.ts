/**
 * useCbctStudioLifecycle.ts — жизненный цикл 3D объема КЛКТ, очистка WebGL-контекста и вывод в popout окно.
 */

import { useCallback, useEffect, useRef } from "react";
import type { CbctVoxelVolume } from "../cbctMprMath";
import { disposeCbctVolume } from "../cbctMprMath";
import { disposeSharedCbctGlContext } from "../mpr/webgl/CbctVolumeGlContext";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../utils/demoModeEngine.js";
import { cacheActiveCbctVolume } from "../mpr/cbctStudioSyncChannel";
import { routeOpenCbctPopout } from "../../../utils/runtimeRouter";
import { showToast } from "../../GlobalToast";
import type { useCbctStudioModalState } from "./useCbctStudioModalState";
import type { RadiologyStudy } from "../types";
import { autoDetectDentalArch, findOcclusalZPlane } from "../dentalCurveEngine";

export interface UseCbctStudioLifecycleProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialVolume?: CbctVoxelVolume | null | undefined;
	readonly autoLoadDemo?: boolean | undefined;
	readonly state: ReturnType<typeof useCbctStudioModalState>;
	readonly modalContainerRef: React.RefObject<HTMLDivElement | null>;
	readonly handleLoadDemoVolume: () => Promise<void>;
}

export function useCbctStudioLifecycle({
	isOpen,
	onClose,
	study,
	patientName,
	patientId,
	initialVolume,
	autoLoadDemo,
	state,
	modalContainerRef,
	handleLoadDemoVolume,
}: UseCbctStudioLifecycleProps) {
	const isExternalVolume = useCallback((vol: CbctVoxelVolume | null): boolean => {
		if (!vol) return false;
		if (initialVolume && vol === initialVolume) return true;
		if (typeof window !== "undefined") {
			const win = window as unknown as {
				__cbctDemoVolume?: CbctVoxelVolume;
				__cbctActiveVolume?: CbctVoxelVolume;
				__cbctSharedVolume?: CbctVoxelVolume;
			};
			if (win.__cbctDemoVolume && vol === win.__cbctDemoVolume) return true;
			if (win.__cbctActiveVolume && vol === win.__cbctActiveVolume) return true;
			if (win.__cbctSharedVolume && vol === win.__cbctSharedVolume) return true;
		}
		return false;
	}, [initialVolume]);

	const handleCloseStudio = useCallback(() => {
		if (modalContainerRef.current) {
			teardownViewportCanvases(modalContainerRef.current);
		}
		disposeSharedCbctGlContext();
		if (state.volume) {
			if (!isExternalVolume(state.volume)) {
				disposeCbctVolume(state.volume);
			}
			state.setVolume(null);
		}
		onClose();
	}, [state, onClose, isExternalVolume, modalContainerRef]);

	useEffect(() => {
		if (!isOpen) {
			if (modalContainerRef.current) teardownViewportCanvases(modalContainerRef.current);
			disposeSharedCbctGlContext();
			if (state.volume) {
				if (!isExternalVolume(state.volume)) disposeCbctVolume(state.volume);
				state.setVolume(null);
			}
		}
		return () => {
			if (modalContainerRef.current) teardownViewportCanvases(modalContainerRef.current);
			disposeSharedCbctGlContext();
			if (state.volume && !isExternalVolume(state.volume)) disposeCbctVolume(state.volume);
		};
	}, [isOpen, state.volume, isExternalVolume, modalContainerRef]);

	useEffect(() => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
		const applyVol = (vol: CbctVoxelVolume) => {
			state.setVolume(vol);
			state.setLoadedSliceCount(vol.dimensions.depth);
			if (vol.defaultWindowWidth) state.setWindowWidth(vol.defaultWindowWidth);
			if (vol.defaultWindowLevel) state.setWindowLevel(vol.defaultWindowLevel);
			if (vol.patientName && vol.patientName.trim()) {
				state.setPatientDisplayName(vol.patientName.trim());
			} else if (patientName && patientName.trim()) {
				state.setPatientDisplayName(patientName.trim());
			} else if (isDemo) {
				state.setPatientDisplayName("Демо 3D КЛКТ");
			} else {
				state.setPatientDisplayName("3D КЛКТ исследование");
			}
			try {
				const detected = autoDetectDentalArch(vol, state.jawType);
				state.setArchCurve(detected);
				if (state.studioMode === "panoramic") state.setShowDentalArch(true);
				const occlusalZMm = detected.planeZMm ?? findOcclusalZPlane(vol, state.jawType);
				let archCenterX = 0;
				let archCenterY = 0;
				if (detected.splinePointsMm.length > 0) {
					const midIdx = Math.floor(detected.splinePointsMm.length / 2);
					archCenterX = detected.splinePointsMm[midIdx]?.x ?? 0;
					archCenterY = detected.splinePointsMm[midIdx]?.y ?? 0;
				}
				state.setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
			} catch {
				// keep defaults
			}
		};

		if (initialVolume && !state.volume) {
			applyVol(initialVolume);
		} else if (typeof window !== "undefined") {
			const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
			if (win.__cbctDemoVolume && !state.volume) applyVol(win.__cbctDemoVolume);
			const handleCustomLoad = (e: Event) => {
				const customEvent = e as CustomEvent<CbctVoxelVolume>;
				if (customEvent.detail) applyVol(customEvent.detail);
			};
			window.addEventListener("dente-load-cbct-volume", handleCustomLoad);
			return () => {
				window.removeEventListener("dente-load-cbct-volume", handleCustomLoad);
			};
		}
	}, [initialVolume, state.volume, state.jawType, patientId, patientName]);

	const autoLoadDemoAttemptedRef = useRef(false);
	useEffect(() => {
		if (isOpen && !state.volume && !autoLoadDemoAttemptedRef.current) {
			const isDemoReq =
				Boolean(autoLoadDemo) ||
				patientId === "demo_cbct_patient" ||
				isDemoPatientId(patientId) ||
				(typeof window !== "undefined" &&
					Boolean(
						window.location?.search?.includes("cbct=") ||
						window.location?.search?.includes("cbct") ||
						window.location?.hash?.includes("cbct=") ||
						window.location?.hash?.includes("cbct")
					));
			if (isDemoReq) {
				autoLoadDemoAttemptedRef.current = true;
				void handleLoadDemoVolume();
			}
		}
	}, [isOpen, state.volume, autoLoadDemo, patientId, handleLoadDemoVolume]);

	const handleOpenPopoutWindow = useCallback(async () => {
		if (state.volume) {
			cacheActiveCbctVolume(state.volume);
			if (typeof window !== "undefined") {
				const win = window as unknown as {
					__cbctSharedVolume?: CbctVoxelVolume;
					__cbctActiveVolume?: CbctVoxelVolume;
				};
				win.__cbctSharedVolume = state.volume;
				win.__cbctActiveVolume = state.volume;
			}
		}
		const res = await routeOpenCbctPopout({
			studyId: study?.id,
			patientId,
			patientName: state.patientDisplayName || patientName,
			mode: state.studioMode,
		});
		if (!res.success && res.error === "popup_blocked") {
			showToast("Разрешите всплывающие окна для вывода КТ на второй монитор", "warning");
		} else if (res.success) {
			onClose();
		}
	}, [state.volume, state.patientDisplayName, state.studioMode, study?.id, patientId, patientName, onClose]);

	return {
		isExternalVolume,
		handleCloseStudio,
		handleOpenPopoutWindow,
	};
}
