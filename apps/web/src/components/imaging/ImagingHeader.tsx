import React, { useEffect, useRef, useState } from "react";
import {
	Activity,
	Camera,
	ChevronDown,
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
	onOpenRvgCapture?: () => void;
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
	onOpenRvgCapture,
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
			className="imaging-unified-toolbar flex items-center justify-between gap-2 h-12 min-h-[48px] max-h-[52px] px-3 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs select-none w-full max-w-[100vw] overflow-x-clip"
			data-testid="imaging-unified-toolbar"
			aria-label="Панель управления снимками"
		>
			{/* Left Island: Title, Patient badge & Counter (Mandate 8am / 8d, Zero Matryoshka) */}
			<div className="flex items-center gap-2 min-w-0 shrink-0">
				<div className="flex items-center gap-1.5 shrink-0">
					<Scan aria-hidden="true" size={18} className="text-[var(--primary)] shrink-0" />
					<h2 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 tracking-tight whitespace-nowrap">
						Снимки и КТ
					</h2>
				</div>

				<div
					className="imaging-patient-strip flex items-center gap-1.5 px-2.5 h-9 min-h-[36px] rounded-xl bg-[var(--paper)] border border-[var(--line)] whitespace-nowrap shrink-0"
					aria-label="Контекст снимков"
					title={patientName ?? "Пациент не выбран"}
				>
					<span className="text-xs text-[var(--ink-muted)] font-medium">Пациент:</span>
					<strong className="text-xs text-[var(--ink)] font-bold">{compactPatientName}</strong>
				</div>

				<span
					className="px-2 py-0.5 rounded-full bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] font-mono text-xs font-bold shrink-0 leading-normal"
					title="Количество снимков в ленте"
				>
					{studiesCount}
				</span>
			</div>

			{/* Center Island: Compact Filter Chips (Hick's Law / Segmented Bar) */}
			{setImagingKindFilter && (
				<nav
					className="imaging-kind-filter inline-flex items-center p-0.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shrink-0 h-9 min-h-[36px]"
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
								className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--paper-soft)] text-[var(--ink)] font-bold shadow-xs border border-[var(--line)]"
										: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent"
								}`}
							>
								{tab.label}
							</button>
						);
					})}
				</nav>
			)}

			{/* Right Island: Streamlined Fast Actions & Overflow Menu (Mandate 8am, 36px buttons, 1-row) */}
			<div className="imaging-actions flex items-center gap-1.5 shrink-0">
				{/* 1. Primary CTA: 3D КТ */}
				<button
					className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs cursor-pointer transition-colors"
					type="button"
					data-testid="imaging-open-3d-mpr"
					onClick={onOpenCbctStudio}
					title="3D КЛКТ Студия: панорама, срезы, импланты, нижнечелюстной канал"
				>
					<Activity aria-hidden="true" size={16} className="shrink-0" />
					<span>3D КТ</span>
				</button>

				{/* 1b. RVG Capture: Захват RVG */}
				{onOpenRvgCapture && (
					<button
						className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
						type="button"
						data-testid="imaging-rvg-capture-btn"
						onClick={onOpenRvgCapture}
						title="Прямой захват RVG (Vatech, EzSensor, KaVo, Carestream)"
					>
						<Scan aria-hidden="true" size={16} className="shrink-0 text-[var(--primary)]" />
						<span>Захват RVG</span>
					</button>
				)}

				{/* 2. Secondary: Camera */}
				<button
					className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
					type="button"
					data-testid="imaging-camera-capture-btn"
					onClick={onCaptureCamera}
					disabled={isCapturingCameraPhoto || isBrowserImagingFolderPicking}
					title="Сделать снимок с камеры (негатоскоп, фотопротокол)"
				>
					<Camera aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-muted)]" />
					<span>{isCapturingCameraPhoto ? "Загрузка..." : "Камера"}</span>
				</button>

				{/* 3. Secondary: Pick Files */}
				<button
					className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
					type="button"
					data-testid="imaging-pick-dicom-files"
					onClick={onPickFiles}
					disabled={isBrowserImagingFolderPicking}
					title="Выбрать отдельные DICOM, RVG, JPG/PNG, ZIP файлы"
				>
					<FileText aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-muted)]" />
					<span>Файлы</span>
				</button>

				{/* 4. Secondary: Pick Folder */}
				<button
					className="secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-xs"
					type="button"
					data-testid="imaging-pick-dicom-folder"
					onClick={onPickFolder}
					disabled={isBrowserImagingFolderPicking}
					title="Выбрать папку DICOM/КТ со снимками"
				>
					<UploadCloud aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-muted)]" />
					<span>{isBrowserImagingFolderPicking ? "Сканирую..." : "Папка"}</span>
				</button>

				{/* 5. Overflow Menu: «··· Ещё ▾» (Hick's Law / Mandate 8am) */}
				<div className="relative shrink-0" ref={moreMenuRef}>
					<button
						className={`secondary-button h-9 min-h-[36px] px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl border transition-colors cursor-pointer shadow-xs ${
							isMoreMenuOpen
								? "border-[var(--primary)] text-[var(--ink)] bg-[var(--paper-soft)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
						type="button"
						data-testid="imaging-more-menu-btn"
						aria-label="Дополнительные клинические модули"
						aria-expanded={isMoreMenuOpen}
						title="Дополнительно: КТ-селектор, В окно, ОПТГ, Рентген-кабинет, Сравнение, Экспорт"
						onClick={() => setIsMoreMenuOpen((v) => !v)}
					>
						<MoreHorizontal size={16} aria-hidden="true" />
						<span>Ещё</span>
						<ChevronDown size={14} aria-hidden="true" className="text-[var(--ink-muted)]" />
					</button>

					{isMoreMenuOpen && (
						<div
							className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
							role="menu"
							aria-label="Дополнительные модули снимков"
						>
							{onOpenRvgCapture && (
								<button
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
									type="button"
									role="menuitem"
									data-testid="btn-open-rvg-capture"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenRvgCapture();
									}}
								>
									<Scan aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
									<div className="flex flex-col">
										<span>Захват RVG (Визиограф)</span>
										<span className="text-[10px] text-[var(--ink-muted)] font-normal">Прямой захват / Hot Folder</span>
									</div>
								</button>
							)}

							{onOpenCtSelector && (
								<button
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
									type="button"
									role="menuitem"
									data-testid="btn-open-ct-selector"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenCtSelector();
									}}
								>
									<Scan aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
									<div className="flex flex-col">
										<span>КТ / Снимки</span>
										<span className="text-[10px] text-[var(--ink-muted)] font-normal">Выбор томографа и архивов</span>
									</div>
								</button>
							)}

							{onOpenPopoutStudio && (
								<button
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
									type="button"
									role="menuitem"
									data-testid="ct-popout-open-btn"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenPopoutStudio();
									}}
								>
									<ExternalLink aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
									<div className="flex flex-col">
										<span>В отдельное окно</span>
										<span className="text-[10px] text-[var(--ink-muted)] font-normal">Для второго монитора</span>
									</div>
								</button>
							)}

							<button
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
								type="button"
								role="menuitem"
								data-testid="imaging-open-panoramic"
								onClick={() => {
									setIsMoreMenuOpen(false);
									onOpenPanoramic();
								}}
							>
								<Sparkles aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
								<div className="flex flex-col">
									<span>Панорама (ОПТГ)</span>
									<span className="text-[10px] text-[var(--ink-muted)] font-normal">Ортопантомограмма</span>
								</div>
							</button>

							<button
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
								type="button"
								role="menuitem"
								data-testid="imaging-open-radiology-module"
								onClick={() => {
									setIsMoreMenuOpen(false);
									onOpenRadiologyModule();
								}}
							>
								<Layers aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
								<div className="flex flex-col">
									<span>Рентген-кабинет</span>
									<span className="text-[10px] text-[var(--ink-muted)] font-normal">Направления и дозиметрия</span>
								</div>
							</button>

							{onOpenComparison && (
								<button
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
									type="button"
									role="menuitem"
									data-testid="imaging-open-comparison-btn"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenComparison();
									}}
								>
									<Columns2 aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
									<div className="flex flex-col">
										<span>Сравнение «До / После»</span>
										<span className="text-[10px] text-[var(--ink-muted)] font-normal">Сплит-визиограф</span>
									</div>
								</button>
							)}

							{onOpenExport && (
								<button
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors border-t border-[var(--line-subtle)] mt-1 pt-2"
									type="button"
									role="menuitem"
									data-testid="imaging-open-export-btn"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenExport();
									}}
								>
									<Download aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
									<div className="flex flex-col">
										<span>Экспорт снимков</span>
										<span className="text-[10px] text-[var(--ink-muted)] font-normal">Флешка / Telegram / Архив</span>
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

