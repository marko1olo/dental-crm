import React from "react";
import { Box, Scan } from "lucide-react";

export interface PatientTimelineThumbnailProps {
	readonly imgSrc?: string | null | undefined;
	readonly formattedDate: string;
	readonly cardWidth: number;
	readonly is3DScan: boolean;
	readonly isCbct: boolean;
	readonly badge: { readonly label: string; readonly bg: string; readonly text: string; readonly border: string };
	readonly toothCode?: string | number | null | undefined;
	readonly isSelected: boolean;
}

export const PatientTimelineThumbnail: React.FC<PatientTimelineThumbnailProps> = ({
	imgSrc,
	formattedDate,
	cardWidth,
	is3DScan,
	isCbct,
	badge,
	toothCode,
	isSelected,
}) => {
	return (
		<div
			className="relative w-full bg-black flex items-center justify-center overflow-hidden"
			style={{ height: `${Math.round(cardWidth * 0.75)}px` }}
		>
			{imgSrc ? (
				<img
					src={imgSrc}
					alt={`Снимок ${formattedDate}`}
					className="w-full h-full object-cover transition-transform group-hover:scale-105"
					loading="lazy"
				/>
			) : (
				<div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
					{is3DScan ? (
						<>
							<Box className="w-6 h-6 mb-1 opacity-80 text-teal-400" />
							<span className="text-[10px] font-mono text-teal-300">3D-СКАН</span>
						</>
					) : isCbct ? (
						<>
							<Box className="w-6 h-6 mb-1 opacity-70 text-indigo-400" />
							<span className="text-[10px] font-mono">DICOM</span>
						</>
					) : (
						<>
							<Scan className="w-6 h-6 mb-1 opacity-70 text-emerald-400" />
							<span className="text-[10px] font-mono">DICOM</span>
						</>
					)}
				</div>
			)}
			<span
				style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
				className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider backdrop-blur-md border shadow-xs"
			>
				{badge.label}
			</span>
			{toothCode && (
				<span
					style={{ backgroundColor: isSelected ? "#00C853" : "#0d9488", color: isSelected ? "#012812" : "#ffffff" }}
					className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded font-black text-[10px] tracking-tight shadow-md"
					title={`Зуб FDI: #${toothCode}`}
					data-testid={`timeline-tooth-${toothCode}`}
				>
					#{toothCode}
				</span>
			)}
			{isSelected && <div className="absolute inset-0 border-2 border-[#00C853] pointer-events-none rounded-t-xl" />}
		</div>
	);
};
