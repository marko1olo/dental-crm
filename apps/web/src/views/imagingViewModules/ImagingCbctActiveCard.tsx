import React, { Suspense } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { DicomArchiveUploader } from "../../components/imaging/DicomArchiveUploader";
import { NativeTomographyLaunchBar } from "./NativeTomographyLaunchBar";

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
		<div data-testid="cbct-study-active-card" className="w-full h-full flex flex-col gap-3.5 p-3.5 sm:p-4 min-h-[500px]">
			{/* Top Banner: Context & Hardware Integrations */}
			<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3 shadow-xs">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
					<div className="flex flex-col gap-1 text-left min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--primary)] animate-pulse shrink-0" />
							<strong className="text-sm font-bold text-[var(--ink)] truncate">
								Томограмма 3D (КЛКТ): {selectedImagingStudy?.title || (localImageIds?.length > 0 ? `Серия срезов (${localImageIds.length})` : "Исследование челюсти")}
							</strong>
							<span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] border border-[var(--primary)]/30 shrink-0">
								КЛКТ 3D
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
							{isDicomwebLoading ? (
								<span className="text-[var(--primary)] font-medium flex items-center gap-1.5">
									<RefreshCw size={12} className="animate-spin" /> {dicomwebLoadProgress ?? "Подключение к PACS архиву..."}
								</span>
							) : localImageIds?.length > 0 ? (
								<span>Готово к просмотру: {localImageIds.length} срезов (аппаратное ускорение)</span>
							) : (
								<span>Профессиональный просмотр в нативном ПО томографа клиники или во встроенной 3D студии</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							data-testid="btn-open-cbct-studio"
							onClick={onOpenCbctStudio}
							className="primary-button h-9 min-h-[36px] px-3.5 text-xs font-bold rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] active:scale-95 transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
							title="Открыть встроенную 3D студию имплантации и панорамы"
						>
							<Sparkles size={15} className="shrink-0" />
							<span>3D Студия DENTE</span>
						</button>
						<button
							type="button"
							data-testid="btn-load-dicomweb-pacs"
							onClick={onLoadFromDicomweb}
							disabled={isDicomwebLoading}
							className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5 shadow-2xs"
							title="Запросить срезы из локального архива DICOM PACS"
						>
							<RefreshCw size={14} className={`shrink-0 ${isDicomwebLoading ? "animate-spin" : ""}`} />
							<span>{isDicomwebLoading ? (dicomwebLoadProgress ?? "Загрузка...") : "PACS архив"}</span>
						</button>
					</div>
				</div>

				{/* 1-Click Native Tomography Hardware Launch Bar (Planmeca, Vatech, Sirona, 3Shape) */}
				<NativeTomographyLaunchBar
					selectedImagingStudy={selectedImagingStudy}
					onOpenCbctStudio={onOpenCbctStudio}
				/>
			</div>

			{/* Dropzone & Archive Uploader Stage */}
			<div className="flex-1 flex flex-col min-h-[340px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
				<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Подготовка загрузчика архивов...</div>}>
					<DicomArchiveUploader
						onImagesLoaded={(imageIds) => {
							onImagesLoaded(imageIds);
							onOpenCbctStudio();
						}}
					/>
				</Suspense>
			</div>
		</div>
	);
}
