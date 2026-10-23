/**
 * apps/web/src/components/perio/chart/PerioToothVisual.tsx
 *
 * SVG-визуализация анатомии зуба и уровня кости/карманов (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { fastGetClinicalToneHex } from "../perioRafOptimizer";
import { PerioImplantVisualSvg, PerioMissingVisualSvg } from "./PerioMissingOrImplantSvg";

export interface PerioToothVisualProps {
	readonly toothNumber: number;
	readonly isUpper: boolean;
	readonly isMissing?: boolean | undefined;
	readonly isImplant?: boolean | undefined;
	readonly buccalPd: number;
	readonly lingualPd: number;
	readonly width?: number | undefined;
	readonly height?: number | undefined;
}

export const PerioToothVisual: React.FC<PerioToothVisualProps> = React.memo(({
	toothNumber, isUpper, isMissing = false, isImplant = false,
	buccalPd, lingualPd, width = 28, height = 52,
}) => {
	if (isMissing) {
		return <PerioMissingVisualSvg width={width} height={height} isUpper={isUpper} />;
	}
	if (isImplant) {
		return <PerioImplantVisualSvg width={width} height={height} isUpper={isUpper} />;
	}

	const isAnterior = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43].includes(toothNumber);
	const isMolar = [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(toothNumber);

	const maxPd = Math.max(buccalPd, lingualPd);
	const pocketVisualHeight = Math.min(18, Math.max(2, (maxPd - 2) * 2.8));
	const pocketColor = fastGetClinicalToneHex(maxPd);

	const rootPath = isAnterior
		? isUpper ? "M 10 24 L 14 46 L 18 24 Z" : "M 10 28 L 14 6 L 18 28 Z"
		: isMolar
			? isUpper ? "M 8 24 L 10 46 L 14 32 L 18 46 L 20 24 Z" : "M 8 28 L 10 6 L 14 20 L 18 6 L 20 28 Z"
			: isUpper ? "M 9 24 L 12 45 L 15 30 L 17 45 L 19 24 Z" : "M 9 28 L 12 7 L 15 22 L 17 7 L 19 28 Z";

	const crownY = isUpper ? 6 : 28;
	const boneY = isUpper ? 24 : 28;

	return (
		<svg width={width} height={height} viewBox="0 0 28 52" className="overflow-visible select-none pointer-events-none">
			<path d={rootPath} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round" />
			<rect x="6" y={crownY} width="16" height="18" rx="4" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
			<line x1="10" y1={crownY + 4} x2="18" y2={crownY + 4} stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
			<line x1="2" y1={boneY} x2="26" y2={boneY} stroke="#0d9488" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
			{maxPd > 3 && (
				<rect
					x="5" y={isUpper ? boneY : boneY - pocketVisualHeight}
					width="18" height={pocketVisualHeight} rx="1.5"
					fill={pocketColor} opacity="0.45" stroke={pocketColor} strokeWidth="1"
				/>
			)}
		</svg>
	);
});

PerioToothVisual.displayName = "PerioToothVisual";
