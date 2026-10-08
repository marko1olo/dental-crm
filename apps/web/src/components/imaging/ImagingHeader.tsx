import React from "react";
import {
	Activity,
	Camera,
	ExternalLink,
	FileText,
	Layers,
	Scan,
	Sparkles,
	UploadCloud,
} from "lucide-react";

export interface ImagingHeaderProps {
	activePatient?: any;
	activeAppointment?: any;
	activeImagingStudies?: any[];
	selectedImagingViewerPlan?: any;
	isBrowserImagingFolderPicking?: boolean;
	isCapturingCameraPhoto?: boolean;
	onPickFolder: () => void;
	onPickFiles: () => void;
	onCaptureCamera: () => void;
	onOpenCbctStudio: () => void;
	onOpenPanoramic: () => void;
	onOpenRadiologyModule: () => void;
	onOpenCtSelector?: () => void;
	onOpenPopoutStudio?: () => void;
}

export function ImagingHeader({
	activePatient,
	activeAppointment,
	activeImagingStudies,
	selectedImagingViewerPlan,
	isBrowserImagingFolderPicking,
	isCapturingCameraPhoto,
	onPickFolder,
	onPickFiles,
	onCaptureCamera,
	onOpenCbctStudio,
	onOpenPanoramic,
	onOpenRadiologyModule,
	onOpenCtSelector,
	onOpenPopoutStudio,
}: ImagingHeaderProps) {
	return (
		<>
			<div className="imaging-copy flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 select-none">
				<div className="min-w-0 flex-1">
					<p className="eyebrow text-xs text-[var(--muted)] m-0">Снимки пациента</p>
					<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
						Снимки и КТ-диагностика
					</h2>
				</div>
				<div className="imaging-actions flex items-center gap-1.5 flex-nowrap shrink-0 overflow-x-auto scrollbar-none py-0.5">
					{/* CT Quickbar (1-row dense, Hick's Law compliant) */}
					<div
						className="imaging-header-ct-quickbar flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0"
						data-testid="imaging-header-ct-quickbar"
					>
						<button
							className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-bold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 shadow-xs transition-colors"
							type="button"
							data-testid="btn-open-ct-selector"
							onClick={onOpenCtSelector}
							title="Открыть клинический КТ-селектор: быстрый выбор из Загрузок, 2-й монитор, вьюер томографа"
						>
							<Scan aria-hidden="true" size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<span>КТ / Снимки</span>
						</button>
						<button
							className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 cursor-pointer bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 shadow-xs transition-colors"
							type="button"
							data-testid="imaging-open-3d-mpr"
							onClick={onOpenCbctStudio}
							title="Romexis 3D КЛКТ Студия: панорама, срезы, импланты, нерв"
						>
							<Activity aria-hidden="true" size={13} className="shrink-0 text-cyan-400" />
							<span>3D КТ</span>
						</button>
						<button
							className="secondary-button min-h-[32px] h-8 px-2 text-xs font-medium shrink-0 whitespace-nowrap inline-flex items-center gap-1 cursor-pointer text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							type="button"
							data-testid="ct-popout-open-btn"
							onClick={onOpenPopoutStudio}
							title="Открыть 3D КТ в отдельном окне для второго монитора"
						>
							<ExternalLink aria-hidden="true" size={13} className="shrink-0 text-cyan-500" />
							<span className="hidden xl:inline">В окно</span>
						</button>
					</div>
					<button
						className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5"
						type="button"
						data-testid="imaging-pick-dicom-folder"
						onClick={onPickFolder}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать папку DICOM/КТ или папку со снимками"
					>
						<UploadCloud aria-hidden="true" size={14} className="shrink-0" />
						<span>{isBrowserImagingFolderPicking ? "Сканирую" : "Папка DICOM"}</span>
					</button>
					<button
						className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5"
						type="button"
						data-testid="imaging-pick-dicom-files"
						onClick={onPickFiles}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать отдельные DICOM, RVG, JPG/PNG/TIFF, ZIP/RAR/7z или 3D-файлы"
					>
						<FileText aria-hidden="true" size={14} className="shrink-0" />
						<span>Файлы</span>
					</button>
					<button
						className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5"
						type="button"
						data-testid="imaging-camera-capture-btn"
						onClick={onCaptureCamera}
						disabled={isCapturingCameraPhoto || isBrowserImagingFolderPicking}
						title="Сделать снимок с камеры смартфона/планшета (негатоскоп, фото полости рта)"
					>
						<Camera aria-hidden="true" size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
						<span>{isCapturingCameraPhoto ? "Загрузка..." : "Снимок с камеры"}</span>
					</button>

					<button
						className="secondary-button !hidden md:!inline-flex items-center gap-1 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 text-xs font-medium shrink-0 whitespace-nowrap"
						type="button"
						data-testid="imaging-open-panoramic"
						onClick={onOpenPanoramic}
						title="Открыть панорамную реконструкцию (ОПТГ)"
					>
						<Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-amber-400 shrink-0" />
						<span>ОПТГ</span>
					</button>
					<button
						className="secondary-button !hidden md:!inline-flex items-center gap-1 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 text-xs font-medium shrink-0 whitespace-nowrap"
						type="button"
						data-testid="imaging-open-radiology-module"
						onClick={onOpenRadiologyModule}
						title="Рентген-кабинет: направления, архив исследований, лучевая нагрузка"
					>
						<Layers aria-hidden="true" className="w-3.5 h-3.5 text-teal-500 shrink-0" />
						<span>Рентген-кабинет</span>
					</button>
				</div>
			</div>

			{/* Patient Strip */}
			<section className="imaging-patient-strip flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs shrink-0" aria-label="Контекст снимков">
				<article className="flex items-center gap-2 min-w-0">
					<span className="text-[var(--muted)] font-medium text-xs">Пациент:</span>
					<strong className="truncate font-bold text-[var(--ink)] text-xs">
						{activePatient?.fullName ?? "Пациент не выбран"}
					</strong>
					<small className="text-[var(--muted)] text-[11px] truncate">({activeAppointment?.reason ?? "текущий прием"})</small>
				</article>
				<div className="flex items-center gap-3 shrink-0 text-xs">
					<article className="flex items-center gap-1.5">
						<span className="text-[var(--muted)] text-[11px]">В ленте:</span>
						<strong className="text-[var(--ink)] font-semibold">{activeImagingStudies?.length ?? 0}</strong>
					</article>
					<article className="flex items-center gap-1.5">
						<span className="text-[var(--muted)] text-[11px]">Режим:</span>
						<strong className="text-[var(--teal)] font-semibold">{selectedImagingViewerPlan?.label ?? "просмотрщик"}</strong>
					</article>
				</div>
			</section>
		</>
	);
}
