import React, { useEffect, useRef, useState } from "react";
import {
	Activity,
	Camera,
	Columns2,
	Download,
	ExternalLink,
	FileText,
	Layers,
	MoreHorizontal,
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
	onOpenExport?: () => void;
	onOpenComparison?: () => void;
	imagingKindFilter?: string;
	setImagingKindFilter?: (filter: string) => void;
	imagingKindOptions?: string[];
	imagingKindLabels?: Record<string, string>;
}

function formatCompactPatientName(rawName: string | null | undefined): string {
	if (!rawName) return "Не выбран";
	const parts = rawName.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 3) {
		return `${parts[0]} ${parts[1]?.[0] ?? ""}. ${parts[2]?.[0] ?? ""}.`;
	}
	return rawName.trim();
}

const COMPACT_FILTER_TABS: Array<{ key: string; label: string }> = [
	{ key: "all", label: "Все" },
	{ key: "periapical", label: "RVG" },
	{ key: "opg", label: "ОПТГ" },
	{ key: "cbct", label: "КТ" },
	{ key: "photo", label: "Фото" },
];

export function ImagingHeader({
	activePatient,
	activeImagingStudies,
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
	onOpenExport,
	onOpenComparison,
	imagingKindFilter = "all",
	setImagingKindFilter,
}: ImagingHeaderProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isMoreMenuOpen) return;
		const handleOutsideClick = (e: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
				setIsMoreMenuOpen(false);
			}
		};
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsMoreMenuOpen(false);
		};
		window.addEventListener("mousedown", handleOutsideClick);
		window.addEventListener("keydown", handleEscape);
		return () => {
			window.removeEventListener("mousedown", handleOutsideClick);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isMoreMenuOpen]);
	const studiesCount = activeImagingStudies?.length ?? 0;
	const patientName = activePatient?.fullName ?? activePatient?.name ?? null;
	const compactPatientName = formatCompactPatientName(patientName);

	return (
		<header
			className="imaging-unified-toolbar flex items-center justify-between gap-1.5 h-9 min-h-[36px] max-h-[36px] px-2.5 py-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs select-none w-full overflow-hidden"
			data-testid="imaging-unified-toolbar"
			aria-label="Панель управления снимками"
		>
			{/* Left Island: Title, Patient badge & Counter (Mandate 8d, Zero Matryoshka) */}
			<div className="flex items-center gap-1.5 min-w-0 shrink-0">
				<h2 className="text-xs font-bold text-[var(--ink)] m-0 tracking-tight whitespace-nowrap">
					Снимки и КТ
				</h2>

				<div
					className="imaging-patient-strip"
					aria-label="Контекст снимков"
					title={patientName ?? "Пациент не выбран"}
				>
					<span>Пациент:</span>
					<strong>{compactPatientName}</strong>
				</div>

				<span
					className="px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 font-mono text-[10px] font-bold shrink-0 leading-none"
					title="Количество снимков в ленте"
				>
					{studiesCount}
				</span>
			</div>

			{/* Center Island: Compact Filter Chips (Hick's Law / Segmented Bar) */}
			{setImagingKindFilter && (
				<nav
					className="imaging-kind-filter shrink-0 p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]"
					role="tablist"
					aria-label="Фильтр типа снимка"
				>
					{COMPACT_FILTER_TABS.map((tab) => {
						const isSelected = imagingKindFilter === tab.key;
						return (
							<button
								key={tab.key}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => setImagingKindFilter(tab.key)}
								className={isSelected ? "active" : ""}
							>
								{tab.label}
							</button>
						);
					})}
				</nav>
			)}

			{/* Right Island: CT Quickbar & Actions (1-row dense, 28px buttons) */}
			<div className="imaging-actions flex items-center gap-1 shrink-0">
				<div
					className="imaging-header-ct-quickbar flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] shrink-0"
					data-testid="imaging-header-ct-quickbar"
				>
					<button
						className="secondary-button h-6 min-h-[24px] px-1.5 text-[11px] font-bold shrink-0 whitespace-nowrap inline-flex items-center gap-1 cursor-pointer bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500 transition-colors rounded"
						type="button"
						data-testid="btn-open-ct-selector"
						onClick={onOpenCtSelector}
						title="Открыть клинический КТ-селектор: быстрый выбор из Загрузок, 2-й монитор, вьюер томографа"
					>
						<Scan aria-hidden="true" size={12} className="shrink-0 text-[var(--teal,#0d9488)]" />
						<span>КТ / Снимки</span>
					</button>
					<button
						className="secondary-button h-6 min-h-[24px] px-1.5 text-[11px] font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 cursor-pointer bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500 transition-colors rounded"
						type="button"
						data-testid="imaging-open-3d-mpr"
						onClick={onOpenCbctStudio}
						title="3D КЛКТ Студия: панорама, срезы, импланты, нижнечелюстной канал"
					>
						<Activity aria-hidden="true" size={12} className="shrink-0 text-[var(--teal,#0d9488)]" />
						<span>3D КТ</span>
					</button>
					<button
						className="secondary-button h-6 min-h-[24px] px-1.5 text-[11px] font-medium shrink-0 whitespace-nowrap inline-flex items-center gap-1 cursor-pointer text-[var(--muted)] hover:text-[var(--ink)] rounded"
						type="button"
						data-testid="ct-popout-open-btn"
						onClick={onOpenPopoutStudio}
						title="Открыть 3D КТ в отдельном окне для второго монитора"
					>
						<ExternalLink aria-hidden="true" size={11} className="shrink-0 text-[var(--muted)]" />
						<span className="hidden 2xl:inline">В окно</span>
					</button>
				</div>

				<button
					className="secondary-button h-7 min-h-[26px] px-2 text-[11px] font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded bg-[var(--paper)] border border-[var(--line)] hover:border-teal-500 cursor-pointer"
					type="button"
					data-testid="imaging-camera-capture-btn"
					onClick={onCaptureCamera}
					disabled={isCapturingCameraPhoto || isBrowserImagingFolderPicking}
					title="Сделать снимок с камеры (негатоскоп, фотопротокол)"
				>
					<Camera aria-hidden="true" size={12} className="shrink-0 text-[var(--teal,#0d9488)]" />
					<span>{isCapturingCameraPhoto ? "Загрузка..." : "Камера"}</span>
				</button>

				<button
					className="secondary-button h-7 min-h-[26px] px-2 text-[11px] font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded bg-[var(--paper)] border border-[var(--line)] hover:border-teal-500 cursor-pointer"
					type="button"
					data-testid="imaging-pick-dicom-files"
					onClick={onPickFiles}
					disabled={isBrowserImagingFolderPicking}
					title="Выбрать отдельные DICOM, RVG, JPG/PNG, ZIP файлы"
				>
					<FileText aria-hidden="true" size={12} className="shrink-0 text-[var(--muted)]" />
					<span>Файлы</span>
				</button>

				<button
					className="secondary-button h-7 min-h-[26px] px-2 text-[11px] font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded bg-[var(--paper)] border border-[var(--line)] hover:border-teal-500 cursor-pointer"
					type="button"
					data-testid="imaging-pick-dicom-folder"
					onClick={onPickFolder}
					disabled={isBrowserImagingFolderPicking}
					title="Выбрать папку DICOM/КТ со снимками"
				>
					<UploadCloud aria-hidden="true" size={12} className="shrink-0 text-[var(--muted)]" />
					<span>{isBrowserImagingFolderPicking ? "Сканирую" : "Папка"}</span>
				</button>

				{/* Secondary tools popover / Hick's Law overflow menu */}
				<div className="relative shrink-0" ref={moreMenuRef}>
					<button
						className={`secondary-button h-7 min-h-[26px] px-2 text-[11px] font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded bg-[var(--paper)] border transition-colors cursor-pointer ${
							isMoreMenuOpen
								? "border-teal-500 text-[var(--ink)] bg-[var(--paper-soft)]"
								: "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-teal-500"
						}`}
						type="button"
						data-testid="imaging-more-menu-btn"
						aria-label="Дополнительные клинические модули"
						aria-expanded={isMoreMenuOpen}
						title="Дополнительно: ОПТГ, Рентген-кабинет, Сравнение До/После, Экспорт"
						onClick={() => setIsMoreMenuOpen((v) => !v)}
					>
						<MoreHorizontal size={14} aria-hidden="true" />
						<span>Ещё</span>
					</button>

					{isMoreMenuOpen && (
						<div
							className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
							role="menu"
							aria-label="Дополнительные модули снимков"
						>
							<button
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-colors"
								type="button"
								role="menuitem"
								data-testid="imaging-open-panoramic"
								onClick={() => {
									setIsMoreMenuOpen(false);
									onOpenPanoramic();
								}}
							>
								<Sparkles aria-hidden="true" size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="flex flex-col">
									<span>Панорама (ОПТГ)</span>
									<span className="text-[10px] text-[var(--muted)] font-normal">Ортопантомограмма</span>
								</div>
							</button>

							<button
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-colors"
								type="button"
								role="menuitem"
								data-testid="imaging-open-radiology-module"
								onClick={() => {
									setIsMoreMenuOpen(false);
									onOpenRadiologyModule();
								}}
							>
								<Layers aria-hidden="true" size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="flex flex-col">
									<span>Рентген-кабинет</span>
									<span className="text-[10px] text-[var(--muted)] font-normal">Направления и дозиметрия</span>
								</div>
							</button>

							{onOpenComparison && (
								<button
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-colors"
									type="button"
									role="menuitem"
									data-testid="imaging-open-comparison-btn"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenComparison();
									}}
								>
									<Columns2 aria-hidden="true" size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
									<div className="flex flex-col">
										<span>Сравнение «До / После»</span>
										<span className="text-[10px] text-[var(--muted)] font-normal">Сплит-визиограф</span>
									</div>
								</button>
							)}

							{onOpenExport && (
								<button
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 inline-flex items-center gap-2 cursor-pointer transition-colors border-t border-[var(--line-subtle,#e2e8f0)] mt-0.5 pt-1.5"
									type="button"
									role="menuitem"
									data-testid="imaging-open-export-btn"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenExport();
									}}
								>
									<Download aria-hidden="true" size={14} className="shrink-0" />
									<div className="flex flex-col">
										<span>Экспорт (152-ФЗ)</span>
										<span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 font-normal">Флешка / Telegram / Архив</span>
									</div>
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
