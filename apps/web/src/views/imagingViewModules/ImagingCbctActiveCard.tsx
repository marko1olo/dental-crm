import React, { Suspense } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { DicomArchiveUploader } from "../../components/imaging/DicomArchiveUploader";

export interface ImagingCbctActiveCardProps {
	selectedImagingStudy: any;
	localImageIds: string[];
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	onOpenCbctStudio: () => void;
	onLoadFromDicomweb: () => void;
	onImagesLoaded: (imageIds: string[]) => void;
}

export function ImagingCbctActiveCard({
	selectedImagingStudy,
	localImageIds,
	isDicomwebLoading,
	dicomwebLoadProgress,
	onOpenCbctStudio,
	onLoadFromDicomweb,
	onImagesLoaded,
}: ImagingCbctActiveCardProps) {
	return (
		<div data-testid="cbct-study-active-card" className="w-full h-full flex flex-col gap-4 p-4 min-h-[500px]">
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
				<div className="flex flex-col gap-1 text-left min-w-0">
					<div className="flex items-center gap-2">
						<span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--primary)] animate-pulse shrink-0" />
						<strong className="text-sm font-semibold text-[var(--ink)] truncate">
							КЛКТ 3D: {selectedImagingStudy?.title || (localImageIds?.length > 0 ? `Серия срезов (${localImageIds.length})` : "Томограмма 3D")}
						</strong>
						<span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] border border-[var(--primary)]/30 shrink-0">
							Архив КЛКТ 3D
						</span>
					</div>
					<div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
						{isDicomwebLoading ? (
							<span className="text-[var(--primary)] font-medium flex items-center gap-1.5">
								<RefreshCw size={12} className="animate-spin" /> {dicomwebLoadProgress ?? "Подключение к PACS архиву..."}
							</span>
						) : localImageIds?.length > 0 ? (
							<span>Готово к просмотру: {localImageIds.length} срезов (локальный архив)</span>
						) : (
							<span>Автономный доступ: 3D Студия Romexis, мультипланарная реконструкция или загрузка из архива</span>
						)}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
					<button
						type="button"
						data-testid="btn-open-cbct-studio"
						onClick={onOpenCbctStudio}
						className="primary-button flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
						title="Открыть Romexis 3D Студию"
					>
						<Sparkles size={16} className="shrink-0" /> <span>3D Студия имплантации</span>
					</button>
					<button
						type="button"
						data-testid="btn-load-dicomweb-pacs"
						onClick={onLoadFromDicomweb}
						disabled={isDicomwebLoading}
						className="secondary-button flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 flex-1 sm:flex-none"
						title="Запросить срезы из архива КЛКТ 3D"
					>
						<RefreshCw size={14} className={`shrink-0 ${isDicomwebLoading ? "animate-spin" : ""}`} />
						<span>{isDicomwebLoading ? (dicomwebLoadProgress ?? "Загрузка...") : "Загрузить из PACS"}</span>
					</button>
				</div>
			</div>
			<div className="flex-1 flex flex-col min-h-[360px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
				<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Подготовка загрузчика архивов...</div>}>
					<DicomArchiveUploader
						onImagesLoaded={(imageIds) => {
							onImagesLoaded(imageIds);
							onOpenCbctStudio();
						}}
						className="w-full flex-1"
					/>
				</Suspense>
			</div>
		</div>
	);
}
