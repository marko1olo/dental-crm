/**
 * DENTE Dental CRM — Maxilla Sagittal Midline Notch
 * Anatomical divider between central incisors 11 and 21 (Mandate 8b <= 120 lines).
 */

import React from "react";

export interface MaxillaMidlineNotchProps {
	readonly isDark?: boolean;
	readonly className?: string;
}

export const MaxillaMidlineNotch: React.FC<MaxillaMidlineNotchProps> = ({
	isDark = false,
	className = "",
}) => {
	return (
		<div
			data-testid="maxilla-midline-notch"
			className={`flex flex-col items-center justify-center px-1 sm:px-2 py-1 select-none shrink-0 self-stretch ${className}`}
			title="Сагиттальная линия симметрии (Midline) между верхними резцами 11 и 21"
			aria-label="Сагиттальная линия симметрии верхней челюсти"
		>
			<div
				className={`w-px flex-1 rounded-full ${
					isDark ? "bg-teal-500/30" : "bg-teal-600/25"
				}`}
			/>
			<div
				className={`my-1 px-1 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight uppercase border transition-colors ${
					isDark
						? "bg-teal-950/40 text-teal-300 border-teal-800/40"
						: "bg-teal-50 text-teal-800 border-teal-200"
				}`}
			>
				|
			</div>
			<div
				className={`w-px flex-1 rounded-full ${
					isDark ? "bg-teal-500/30" : "bg-teal-600/25"
				}`}
			/>
		</div>
	);
};
