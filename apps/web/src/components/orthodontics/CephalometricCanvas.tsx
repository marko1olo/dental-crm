/**
 * @dental/web/components/orthodontics/CephalometricCanvas.tsx
 * Компонент холста для радиологии ТРГ (Мандат 8b).
 */

import React from "react";
import { UploadCloud } from "lucide-react";

export type XrayFilterMode = "normal" | "invert" | "contrast" | "bone_enhance";
export const SAMPLE_TRG_CEPHALOGRAM_URL = "/demo-assets/trg-sample.png";

export interface CephalometricCanvasProps {
	readonly imageUrl?: string | null;
	readonly landmarks?: Record<string, { x: number; y: number }>;
	readonly onLandmarkChange?: (id: string, pt: { x: number; y: number }) => void;
	readonly onRemoveLandmark?: (id: string) => void;
	readonly activeTargetKey?: string | null;
	readonly onSelectTargetKey?: (key: any) => void;
	readonly onImageUpload?: (url: string) => void;
	readonly filterMode?: XrayFilterMode;
	readonly onFilterModeChange?: (mode: XrayFilterMode) => void;
	readonly brightness?: number;
	readonly contrast?: number;
	readonly showPolygon?: boolean;
	readonly onTogglePolygon?: () => void;
	readonly showPlanes?: boolean;
	readonly onTogglePlanes?: () => void;
	readonly showLabels?: boolean;
	readonly onToggleLabels?: () => void;
	readonly scaleMmPerPixel?: number;
	readonly onScaleChange?: (scale: number) => void;
	readonly onLoadPreset?: () => void;
	readonly onResetLandmarks?: () => void;
	readonly onRunAiAutoPlacement?: () => void;
	readonly isAiInferring?: boolean;
	readonly aiBackendBadge?: string;
	readonly aiBackendLabel?: string;
	readonly aiBackendPref?: string;
	readonly onChangeAiBackendPref?: (pref: any) => void;
	readonly aiInferenceStats?: unknown;
	readonly children?: React.ReactNode;
	readonly className?: string;
}

export const CephalometricCanvas: React.FC<CephalometricCanvasProps> = ({
	imageUrl,
	children,
	className,
}) => {
	return (
		<div
			data-testid="cephalometric-canvas"
			className={`w-full h-full relative ${className || ""}`}
		>
			{!imageUrl && (
				<div data-testid="ceph-dropzone" className="flex flex-col items-center justify-center p-8 text-center text-slate-300">
					<UploadCloud className="w-10 h-10 text-teal-400 mb-2" />
					<p className="text-sm font-semibold">
						Для проведения цефалометрического анализа требуется реальный рентгеновский снимок
					</p>
					<p className="text-xs text-slate-400 mt-1">
						Загрузите или перетащите файл боковой ТРГ (DICOM, TIFF, JPG, PNG)
					</p>
				</div>
			)}
			{children}
		</div>
	);
};

export default CephalometricCanvas;
