/**
 * TreatmentPlanQrCode.tsx — Векторный React-компонент рендеринга QR-кода верификации плана лечения.
 */

import React, { useMemo } from "react";
import { generateQrMatrix, type QrErrorCorrectionLevel } from "./treatmentPlanQrEngine";

export interface TreatmentPlanQrCodeProps {
	readonly value: string;
	readonly size?: number;
	readonly fgColor?: string;
	readonly bgColor?: string;
	readonly quietZone?: number;
	readonly className?: string;
	readonly ecLevel?: QrErrorCorrectionLevel;
	readonly title?: string;
}

export const TreatmentPlanQrCode: React.FC<TreatmentPlanQrCodeProps> = ({
	value,
	size = 120,
	fgColor = "#0f172a",
	bgColor = "#ffffff",
	quietZone = 2,
	className = "",
	ecLevel = "M",
	title = "QR-код верификации плана лечения",
}) => {
	const matrix = useMemo(() => {
		try {
			return generateQrMatrix(value || "https://dente.clinic", ecLevel);
		} catch {
			return generateQrMatrix("https://dente.clinic", "L");
		}
	}, [value, ecLevel]);

	const totalCount = matrix.size + quietZone * 2;
	const cellSize = size / totalCount;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`0 0 ${size} ${size}`}
			width={size}
			height={size}
			className={`inline-block select-none ${className}`.trim()}
			role="img"
			aria-label={title}
		>
			<rect width="100%" height="100%" fill={bgColor} rx={4} />
			{matrix.modules.map((row, r) =>
				row.map((isDark, c) => {
					if (!isDark) return null;
					const x = (c + quietZone) * cellSize;
					const y = (r + quietZone) * cellSize;
					return (
						<rect
							key={`${r}-${c}`}
							x={x}
							y={y}
							width={cellSize}
							height={cellSize}
							fill={fgColor}
						/>
					);
				}),
			)}
		</svg>
	);
};

export default TreatmentPlanQrCode;
