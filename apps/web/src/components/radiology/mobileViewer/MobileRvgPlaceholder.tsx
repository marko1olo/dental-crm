import { Film, Scan, UploadCloud } from "lucide-react";
import React from "react";
import type { MobileChairsideStudyItem } from "./types.js";

export const MobileRvgPlaceholder: React.FC<{
	study?: MobileChairsideStudyItem | null | undefined;
	hasFile?: boolean | undefined;
	onPickFiles?: (() => void) | undefined;
}> = ({ study, hasFile, onPickFiles }) => {
	const isEmptyState = !study;

	return (
		<div
			className="w-72 h-80 rounded-2xl border-2 border-dashed border-teal-500/30 bg-slate-900/80 p-5 flex flex-col items-center justify-center text-center gap-3 select-none"
			data-testid="mobile-rvg-vector-placeholder"
		>
			<div className="relative w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
				{isEmptyState ? (
					<>
						<Film size={26} aria-hidden="true" />
						<div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-teal-500 text-slate-950">
							<Scan size={10} aria-hidden="true" />
						</div>
					</>
				) : (
					<UploadCloud size={28} />
				)}
			</div>
			<div className="text-sm font-bold text-white leading-snug">
				{isEmptyState ? "У выбранного пациента нет рентгеновских снимков" : (study?.title || "Интраоральный RVG снимок")}
			</div>
			<div className="text-xs text-slate-400">
				{isEmptyState
					? "Загрузите снимок (DICOM, RVG, ОПТГ) или сделайте снимок с камеры."
					: hasFile
						? "Снимок готов к просмотру"
						: "Файл визиографа не прикреплен к карточке"}
			</div>
			<button
				type="button"
				onClick={onPickFiles}
				className="mt-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
				data-testid="btn-mobile-attach-xray"
			>
				<UploadCloud size={14} />
				<span>+ Загрузить снимок (DICOM/RVG)</span>
			</button>
		</div>
	);
};
