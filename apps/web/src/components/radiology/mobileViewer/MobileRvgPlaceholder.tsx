import { UploadCloud } from "lucide-react";
import type React from "react";
import type { MobileChairsideStudyItem } from "./types.js";

export const MobileRvgPlaceholder: React.FC<{
	study: MobileChairsideStudyItem | null;
	hasFile: boolean;
	onPickFiles: () => void;
}> = ({ study, hasFile, onPickFiles }) => {
	return (
		<div
			className="w-72 h-80 rounded-2xl border-2 border-dashed border-teal-500/30 bg-slate-900/80 p-5 flex flex-col items-center justify-center text-center gap-3 select-none"
			data-testid="mobile-rvg-vector-placeholder"
		>
			<div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
				<UploadCloud size={28} />
			</div>
			<div className="text-sm font-bold text-white">
				{study?.title || "Интраоральный RVG снимок"}
			</div>
			<div className="text-xs text-slate-400">
				{hasFile
					? "Снимок готов к просмотру"
					: "Файл визиографа не прикреплен к карточке"}
			</div>
			<button
				type="button"
				onClick={onPickFiles}
				className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
				data-testid="btn-mobile-attach-xray"
			>
				<UploadCloud size={14} />
				<span>Загрузить снимок</span>
			</button>
		</div>
	);
};
