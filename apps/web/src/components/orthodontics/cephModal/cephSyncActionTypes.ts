import type { LandmarkMap, CephalometricAnalysisResult } from "../cephalometricMath";
import type { CephAiStats } from "./types";

export interface UseCephSyncAndEmrActionsProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly imageUrl: string | null;
	readonly landmarks: LandmarkMap;
	readonly setLandmarks: (lm: LandmarkMap) => void;
	readonly scaleMmPerPixel: number;
	readonly setScaleMmPerPixel: (scale: number) => void;
	readonly filterMode: string;
	readonly brightness: number;
	readonly contrast: number;
	readonly analysis: CephalometricAnalysisResult;
	readonly aiStats: CephAiStats | null;
	readonly aiBackendLabel: string;
	readonly currentEffectiveProtocolText: string;
	readonly isImageLoaded: boolean;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}
