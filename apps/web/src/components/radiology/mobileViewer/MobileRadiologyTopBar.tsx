import { Camera, FileText, RefreshCw, X } from "lucide-react";
import type React from "react";

export interface MobileRadiologyTopBarProps {
	activeStudiesCount: number;
	toothBadge: string;
	studyDateStr: string;
	modalityTitle: string;
	onOpenStudiesSheet: () => void;
	onOpenShowcase: () => void;
	onResetTransform: () => void;
	onCaptureCamera?: () => void;
	onClose?: () => void;
}

export const MobileRadiologyTopBar: React.FC<MobileRadiologyTopBarProps> = ({
	activeStudiesCount,
	toothBadge,
	studyDateStr,
	modalityTitle,
	onOpenStudiesSheet,
	onOpenShowcase,
	onResetTransform,
	onCaptureCamera,
	onClose,
}) => {
	return (
		<header
			className="mobile-radiology-topbar"
			data-testid="mobile-radiology-topbar"
		>
			<button
				type="button"
				onClick={onOpenStudiesSheet}
				className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer shrink-0"
				data-testid="btn-open-mobile-studies-sheet"
				aria-label="Открыть список всех снимков пациента"
				title="Все снимки пациента"
			>
				<span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
				<span>Снимки</span>
				<span className="px-1.5 py-0.2 rounded-full bg-teal-500/25 text-teal-300 font-mono text-[10px] font-bold shrink-0">
					{activeStudiesCount}
				</span>
			</button>

			<div className="mobile-radiology-topbar-title min-w-0 flex-1 px-1">
				<div className="flex items-center justify-center">
					<span
						className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0"
						title={toothBadge}
					>
						{toothBadge}
					</span>
				</div>
				<div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
					{studyDateStr} · {modalityTitle}
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={onOpenShowcase}
					data-testid="btn-open-mobile-showcase"
					className="mobile-radiology-showcase-btn rounded-xl font-semibold bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 border border-white/15 transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap px-2.5 h-10"
					title="Режим демонстрации пациенту (До/После и протокол приёма)"
				>
					<FileText size={14} className="text-teal-400 shrink-0" />
					<span className="text-xs font-medium">Пациенту</span>
				</button>

				<button
					type="button"
					onClick={onResetTransform}
					className="mobile-radiology-icon-btn hidden sm:flex rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 items-center justify-center transition-all border border-white/10 cursor-pointer"
					data-testid="btn-mobile-reset-transform"
					aria-label="Сбросить масштаб и положение"
					title="Сброс (1:1)"
				>
					<RefreshCw size={15} />
				</button>

				<button
					type="button"
					onClick={onCaptureCamera}
					className="mobile-radiology-icon-btn rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-400 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
					data-testid="btn-mobile-camera-capture"
					aria-label="Сделать снимок с камеры смартфона"
					title="Снимок с камеры"
				>
					<Camera size={16} />
				</button>

				<button
					type="button"
					onClick={() => {
						if (onClose) onClose();
						else window.location.hash = "visit";
					}}
					className="mobile-radiology-icon-btn rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/10 cursor-pointer"
					data-testid="btn-mobile-close-viewer"
					aria-label="Закрыть просмотрщик"
					title="Закрыть (к визиту)"
				>
					<X size={16} />
				</button>
			</div>
		</header>
	);
};
