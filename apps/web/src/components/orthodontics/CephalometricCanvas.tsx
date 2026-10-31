/**
 * @dental/web/components/orthodontics/CephalometricCanvas.tsx
 * Компонент холста для радиологии ТРГ (Мандат 8b).
 */

import React from "react";

export type XrayFilterMode = "normal" | "invert" | "contrast" | "bone_enhance";
export const SAMPLE_TRG_CEPHALOGRAM_URL = "/demo-assets/trg-sample.png";

export interface CephalometricCanvasProps {
	readonly landmarks?: Record<string, { x: number; y: number }>;
	readonly onLandmarkChange?: (id: string, pt: { x: number; y: number }) => void;
	readonly children?: React.ReactNode;
	readonly [key: string]: unknown;
}

export const CephalometricCanvas: React.FC<CephalometricCanvasProps> = ({ children, ...props }) => {
	return (
		<div data-testid="cephalometric-canvas" className="w-full h-full relative" {...props}>
			{children}
		</div>
	);
};

export default CephalometricCanvas;
