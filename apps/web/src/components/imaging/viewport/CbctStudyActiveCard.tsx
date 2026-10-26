/**
 * CbctStudyActiveCard.tsx — Карточка активного исследования КЛКТ 3D и загрузчик срезов (Мандат 8b <= 120 строк).
 */

import React, { Suspense } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { DicomArchiveUploader } from "../DicomArchiveUploader";
import type { ImagingStudy } from "../types";

interface Props {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	onOpenCbctStudio: () => void;
	onLoadFromDicomweb: () => void;
}

export const CbctStudyActiveCard: React.FC<Props> = ({
	selectedImagingStudy,
	localImageIds,
	setLocalImageIds,
	isDicomwebLoading,
	dicomwebLoadProgress,
	onOpenCbctStudio,
	onLoadFromDicomweb,
}) => {
	const title = selectedImagingStudy?.title || (localImageIds?.length > 0 ? `Серия срезов (${localImageIds.length})` : "Томограмма 3D");

	return (
		<div data-testid="cbct-study-active-card" className="w-full h-full flex flex-col gap-4 p-4 min-h-[500px]">
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
				<div className="flex flex-col gap-1 text-left min-w-0">
					<div className="flex items-center gap-2">
						<span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
						<strong className="text-sm font-semibold text-[var(--ink)] truncate">
							КЛКТ 3D: {title}
						</strong>
						<span className="px-2 py-0.5 text-[11px] font-medium rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
							Архив КЛКТ 3D
						</span>
					</div>
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						{isDicomwebLoading ? (
							<span className="text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1.5">
								<RefreshCw size={12} className="animate-spin" />
								{dicomwebLoadProgress ?? "Подключение к PACS архиву..."}
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
						className="h-8 px-3.5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-none"
						title="Открыть Romexis 3D Студию с панорамой, осями и расчётом безопасности нерва"
					>
						<Sparkles size={14} className="shrink-0" />
						<span>3D Студия имплантации</span>
					</button>

					<button
						type="button"
						data-testid="btn-load-dicomweb-pacs"
						onClick={onLoadFromDicomweb}
						disabled={isDicomwebLoading}
						className="h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line-strong,var(--line))] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)]/40 transition-all shadow-2xs active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 flex-1 sm:flex-none"
						title="Запросить срезы из архива КЛКТ 3D"
					>
						<RefreshCw size={13} className={`shrink-0 text-[var(--teal)] ${isDicomwebLoading ? "animate-spin" : ""}`} />
						<span>{isDicomwebLoading ? (dicomwebLoadProgress ?? "Загрузка...") : "Загрузить из PACS"}</span>
					</button>
				</div>
			</div>

			<div className="flex-1 flex flex-col min-h-[360px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2">
				<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Подготовка загрузчика архивов...</div>}>
					<DicomArchiveUploader
						onImagesLoaded={(imageIds) => {
							setLocalImageIds(imageIds);
							onOpenCbctStudio();
						}}
						className="w-full flex-1"
					/>
				</Suspense>
			</div>
		</div>
	);
};
