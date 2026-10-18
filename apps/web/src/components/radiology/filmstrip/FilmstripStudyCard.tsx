import React from "react";
import { Scan } from "lucide-react";
import { formatFilmstripDateTime, getModalityBadge, type RadiologyFilmstripItem } from "./filmstripTypes.js";
import type { RadiologyStudy } from "../types.js";

export interface FilmstripStudyCardProps {
	study: RadiologyStudy | RadiologyFilmstripItem;
	isActive: boolean;
	cardWidth: number;
	onSelect: () => void;
	onDoubleClick?: () => void;
}

export function FilmstripStudyCard({
	study, isActive, cardWidth, onSelect, onDoubleClick,
}: FilmstripStudyCardProps) {
	const { dateStr, timeStr } = formatFilmstripDateTime(study.studyDate);
	const badge = getModalityBadge(study.modality || "rvg");
	const teethList = study.teethFdi && study.teethFdi.length > 0 ? study.teethFdi : null;
	const primaryTooth = teethList ? teethList[0] : null;
	const imgSrc = study.thumbnailUrl || study.imageUrl;

	return (
		<div
			data-testid={`filmstrip-item-${study.id}`}
			onClick={onSelect}
			onDoubleClick={onDoubleClick}
			style={{
				width: `${cardWidth}px`,
				minWidth: `${cardWidth}px`,
				border: isActive ? "3px solid #00C853" : "1px solid #334155",
				boxShadow: isActive ? "0 0 10px rgba(0, 200, 83, 0.45)" : "none",
			}}
			className={`group relative flex flex-col rounded-md overflow-hidden bg-[#0d1424] cursor-pointer transition-all duration-150 shrink-0 ${
				isActive ? "ring-1 ring-[#00C853]" : "hover:border-[#64748b] hover:bg-[#131d31]"
			}`}
		>
			<div
				className="relative w-full bg-black flex items-center justify-center overflow-hidden"
				style={{ height: `${Math.round(cardWidth * 0.72)}px` }}
			>
				{imgSrc ? (
					<img
						src={imgSrc}
						alt={`Снимок ${dateStr}`}
						className="w-full h-full object-cover transition-transform group-hover:scale-105"
						loading="lazy"
					/>
				) : (
					<div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
						<Scan size={20} className="mb-0.5 opacity-60" />
						<span className="text-[9px]">DICOM</span>
					</div>
				)}

				<span
					style={{ backgroundColor: badge.bg, color: badge.color }}
					className="absolute top-1 left-1 px-1 py-0.2 rounded font-bold text-[9px] uppercase tracking-wider backdrop-blur-sm"
				>
					{badge.label.replace("-СЕНСОР", "")}
				</span>

				{primaryTooth && (
					<span
						style={{
							backgroundColor: isActive ? "#00C853" : "#0f766e",
							color: isActive ? "#022c15" : "#ccfbf1",
						}}
						className="absolute top-1 right-1 px-1.5 py-0.2 rounded font-black text-[10px] tracking-tight shadow-sm"
						title={`Зуб FDI: ${primaryTooth}`}
						data-testid={`filmstrip-tooth-${primaryTooth}`}
					>
						#{primaryTooth}
					</span>
				)}
			</div>

			<div className="flex flex-col p-1 bg-[#0b1320] border-t border-[#1e293b] leading-tight text-[10px]">
				<div className="flex items-center justify-between text-slate-200 font-semibold truncate">
					<span className="truncate">{dateStr}</span>
					{timeStr && <span className="text-slate-400 text-[9px] ml-1">{timeStr}</span>}
				</div>
				<div className="flex items-center justify-between text-slate-400 text-[9px] mt-0.5">
					<span className="truncate">{(study as any).title || (study as any).studyDescription || badge.label}</span>
					{isActive && <span className="text-[#00C853] font-bold text-[8px] uppercase">Активен</span>}
				</div>
			</div>
		</div>
	);
}
