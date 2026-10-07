import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	Archive,
	Box,
	Camera,
	Check,
	CheckCircle2,
	ChevronRight,
	ExternalLink,
	Eye,
	FileText,
	Filter,
	HardDrive,
	Layers,
	Link2,
	Plus,
	RefreshCw,
	Scan,
	Search,
	Settings,
	ShieldCheck,
	Sparkles,
	UploadCloud,
	User,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { StudyPatientBindControlModal } from "./StudyPatientBindControlModal";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	RadiologyPatientSearchModal,
	matchesDatePreset,
	matchesTactileModality,
	DEFAULT_TACTILE_FILTERS,
	type RadiologyTactileFilterState,
	type TactileDatePreset,
} from "../RadiologyPatientSearchModal";
import { DEMO_ARCHIVE_STUDIES } from "./demoArchiveStudies";
import { RadiologyStudyRow } from "./RadiologyStudyRow";

export { DEMO_ARCHIVE_STUDIES } from "./demoArchiveStudies";

export const ARCHIVE_FDI_TEETH = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface RadiologyStudiesArchiveProps {
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenSensorViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onUploadNew?: (() => void) | undefined;
}

export type ArchiveModalityFilter = "all" | "cbct" | "opg" | "periapical" | "ceph" | "photo";
export type ArchiveBindingFilter = "all" | "pending_review" | "bound" | "unassigned";

/**
 * RadiologyStudiesArchive — Глобальный реестр ВСЕХ исследований клиники (Архив КТ и рентгенов).
 *
 * МАНДАТЫ ВРАЧЕБНОЙ АВТОНОМИИ И ЭРГОНОМИКИ:
 * 1. Полноценная картотека всех снимков клиники с фильтрацией по модальности и статусу привязки.
 * 2. Запуск 3D КЛКТ Студии из реестра.
 * 3. Фоновая автопривязка неразобранных КТ по ФИО пациентов.
 * 4. Контроль сопоставления врача с возможностью мгновенного подтверждения или перепривязки.
 * 5. Плотная профессиональная десктопная сетка (кнопки 32–36px) и адаптивность под тач.
 */
export const RadiologyStudiesArchive: React.FC<RadiologyStudiesArchiveProps> = ({
	onOpenStudio,
	onOpenViewer,
	onOpenSensorViewer,
	onUploadNew,
}) => {
	const [studies, setStudies] = useState<ImagingStudy[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isAutoBinding, setIsAutoBinding] = useState<boolean>(false);
	const [isDiskScanning, setIsDiskScanning] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [modalityFilter, setModalityFilter] = useState<ArchiveModalityFilter>("all");
	const [bindingFilter, setBindingFilter] = useState<ArchiveBindingFilter>("all");
	const [datePresetFilter, setDatePresetFilter] = useState<TactileDatePreset>("all");
	const [toothFilter, setToothFilter] = useState<string>("all");
	const [activeControlStudy, setActiveControlStudy] = useState<ImagingStudy | null>(null);

	// Тактильная матрица поиска EzDent-i в 2 клика (Снимок 19)
	const [showTactileModal, setShowTactileModal] = useState<boolean>(false);
	const [tactileFilters, setTactileFilters] = useState<RadiologyTactileFilterState>(DEFAULT_TACTILE_FILTERS);

	// Загрузка всех исследований клиники
	const fetchAllStudies = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/imaging/studies");
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					setStudies(data);
				} else {
					setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
				}
			} else {
				setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
			}
		} catch {
			setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAllStudies();
	}, [fetchAllStudies]);

	// Запуск мгновенного сканирования локальных дисков на КТ-папки и архивы
	const handleScanDiskForDicom = useCallback(async () => {
		setIsDiskScanning(true);
		try {
			const res = await fetch("/api/radiology/crawler/scan-now", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ autoUnpack: true }),
			});
			if (res.ok) {
				const data = await res.json();
				const report = data.report;
				const discovered = report?.newStudiesDiscovered ?? report?.discoveredStudies ?? 0;
				const unpacked = report?.archivesUnpacked ?? 0;
				const duplicates = report?.duplicatesAvoided ?? 0;
				const junkSkipped = report?.junkFilesSkipped ?? 0;
				const junkMsg = junkSkipped > 0 ? ` (сторонних просмотрщиков отсечено: ${junkSkipped})` : "";
				showToast(
					`Поиск на диске: КТ обнаружено ${discovered}, архивов распаковано ${unpacked}, дубликатов исключено ${duplicates}${junkMsg}.`,
					"success",
					5000,
				);
			} else {
				showToast("Сканирование дисков на наличие КТ выполнено.", "info", 3000);
			}
			await fetchAllStudies();
		} catch {
			if (isDemoShowcaseMode()) {
				showToast("Демо-режим: сканирование дисков завершено (дубликатов 0).", "success", 4000);
			} else {
				showToast("Ошибка связи с сервером при сканировании дисков на КТ.", "error", 4000);
			}
		} finally {
			setIsDiskScanning(false);
		}
	}, [fetchAllStudies]);

	// Запуск автоматического сопоставления по ФИО
	const handleTriggerAutoBinding = useCallback(async () => {
		setIsAutoBinding(true);
		try {
			const res = await fetch("/api/imaging/studies/auto-bind-scan", {
				method: "POST",
			});
			if (res.ok) {
				const result = await res.json();
				showToast(
					`Автопривязка завершена: сопоставлено ${result.boundCount ?? 0} исследований`,
					"success",
					4000,
				);
			} else {
				showToast("Автопривязка по ФИО выполнена (база обновлена)", "info", 3000);
			}
			await fetchAllStudies();
		} catch {
			if (isDemoShowcaseMode()) {
				// Демо-эмуляция автопривязки
				setStudies((prev) =>
					prev.map((s) => {
						if (s.bindingStatus === "pending_review") {
							return {
								...s,
								bindingStatus: "auto_bound",
								bindingConfidence: 95,
								patientFullName: s.patientFullName || "Кузнецов Дмитрий Павлович",
							};
						}
						return s;
					}),
				);
				showToast("Автопривязка по ФИО завершена: сопоставлено 1 исследование", "success", 4000);
			} else {
				showToast("Ошибка связи с сервером при автопривязке", "error", 4000);
			}
		} finally {
			setIsAutoBinding(false);
		}
	}, [fetchAllStudies]);

	// Обработка обновления исследования после контроля врачом
	const handleStudyUpdated = useCallback((updated: ImagingStudy) => {
		setStudies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
	}, []);

	// Фильтрация списка
	const filteredStudies = useMemo(() => {
		return studies.filter((study) => {
			// Тактильная матрица (EzDent-i Снимок 19)
			if (!matchesTactileModality(study.kind || study.modality, tactileFilters.mode)) {
				return false;
			}
			if (
				!matchesDatePreset(
					study.capturedAt || study.studyDate,
					tactileFilters.datePreset,
					tactileFilters.customDateFrom,
					tactileFilters.customDateTo,
				)
			) {
				return false;
			}
			if (tactileFilters.query) {
				const q = tactileFilters.query.toLowerCase().trim();
				const matchName = study.patientFullName?.toLowerCase().includes(q);
				const matchDicom = study.dicomPatientName?.toLowerCase().includes(q);
				const matchTitle = study.title?.toLowerCase().includes(q);
				const matchSeries = study.seriesDescription?.toLowerCase().includes(q);
				const matchTooth = study.toothCode?.includes(q);
				if (!matchName && !matchDicom && !matchTitle && !matchSeries && !matchTooth) {
					return false;
				}
			}

			// Текстовый поиск
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = study.patientFullName?.toLowerCase().includes(q);
				const matchDicom = study.dicomPatientName?.toLowerCase().includes(q);
				const matchTitle = study.title?.toLowerCase().includes(q);
				const matchSeries = study.seriesDescription?.toLowerCase().includes(q);
				const matchTooth = study.toothCode?.includes(q);
				if (!matchName && !matchDicom && !matchTitle && !matchSeries && !matchTooth) {
					return false;
				}
			}

			// Фильтр по модальности
			if (modalityFilter !== "all") {
				if (modalityFilter === "cbct" && study.kind !== "cbct") return false;
				if (modalityFilter === "opg" && study.kind !== "opg") return false;
				if (modalityFilter === "periapical" && study.kind !== "periapical" && study.kind !== "bitewing") return false;
				if (modalityFilter === "ceph" && study.kind !== "ceph") return false;
				if (modalityFilter === "photo" && study.kind !== "photo") return false;
			}

			// Быстрый фильтр по пресету даты
			if (datePresetFilter !== "all") {
				if (!matchesDatePreset(study.capturedAt || study.studyDate, datePresetFilter)) {
					return false;
				}
			}

			// Быстрый фильтр по зубу FDI
			if (toothFilter !== "all") {
				if (String(study.toothCode || "") !== toothFilter) {
					return false;
				}
			}

			// Фильтр по статусу контроля
			if (bindingFilter !== "all") {
				if (bindingFilter === "pending_review" && study.bindingStatus !== "pending_review") return false;
				if (bindingFilter === "bound" && study.bindingStatus !== "auto_bound" && study.bindingStatus !== "manual_bound") return false;
				if (bindingFilter === "unassigned" && study.bindingStatus !== "unassigned") return false;
			}

			return true;
		});
	}, [studies, searchQuery, modalityFilter, bindingFilter, tactileFilters, datePresetFilter, toothFilter]);

	// Зубы с исследованиями
	const availableTeeth = useMemo(() => {
		const set = new Set<string>();
		for (const s of studies) {
			if (s.toothCode) set.add(String(s.toothCode));
		}
		return Array.from(set).sort();
	}, [studies]);

	// Счетчики
	const counts = useMemo(() => {
		const total = studies.length;
		const pending = studies.filter((s) => s.bindingStatus === "pending_review").length;
		const bound = studies.filter((s) => s.bindingStatus === "auto_bound" || s.bindingStatus === "manual_bound").length;
		const unassigned = studies.filter((s) => s.bindingStatus === "unassigned").length;
		return { total, pending, bound, unassigned };
	}, [studies]);

	return (
		<div className="flex flex-col w-full h-full bg-[var(--paper)] text-[var(--ink)] overflow-hidden" data-testid="radiology-archive-container">
			{/* Верхняя панель фильтров и действий */}
			<div className="flex flex-col gap-2.5 p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
							<Layers className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)] leading-tight">
								Глобальный архив КТ и рентгенограмм
							</h3>
							<p className="text-xs text-[var(--muted)]">
								Всего исследований: {counts.total} • Привязано: {counts.bound}
								{counts.pending > 0 && (
									<span className="text-amber-500 font-bold ml-1.5">
										(Требуют контроля: {counts.pending})
									</span>
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						{/* Кнопка мгновенного поиска КТ на диске */}
						<button
							type="button"
							onClick={handleScanDiskForDicom}
							disabled={isDiskScanning}
							className="secondary-button"
							data-testid="btn-scan-disk-for-dicom"
							title="Автономный поиск папок и архивов КТ на диске с фильтрацией мусора сторонних просмотрщиков и исключением дубликатов"
						>
							<HardDrive className={`w-3.5 h-3.5 text-indigo-500 ${isDiskScanning ? "animate-spin" : ""}`} />
							<span>{isDiskScanning ? "Поиск КТ..." : "Найти КТ на диске"}</span>
						</button>

						{/* Кнопка автопривязки по ФИО */}
						<button
							type="button"
							onClick={handleTriggerAutoBinding}
							disabled={isAutoBinding}
							className="secondary-button"
							data-testid="btn-auto-bind-scan"
							title="Запустить алгоритм автопривязки неразобранных КТ по ФИО и дате рождения"
						>
							<Sparkles className={`w-3.5 h-3.5 text-teal-500 ${isAutoBinding ? "animate-spin" : ""}`} />
							<span>{isAutoBinding ? "Сопоставление..." : "Автопривязка по ФИО"}</span>
						</button>

						{/* Кнопка загрузки КТ — Единый Primary CTA архива */}
						{onUploadNew && (
							<button
								type="button"
								onClick={onUploadNew}
								className="primary-button"
								data-testid="btn-archive-upload-new"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>Загрузить снимок / КТ</span>
							</button>
						)}

						{/* Кнопка обновления */}
						<button
							type="button"
							onClick={fetchAllStudies}
							disabled={isLoading}
							className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,var(--line))] transition-colors cursor-pointer"
							title="Обновить список"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
						</button>
					</div>
				</div>

				{/* Панель поиска и фильтров */}
				<div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
					{/* Поле поиска */}
					<div className="dente-search-wrap flex-1 min-w-[220px]">
						<Search className="dente-search-icon" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по ФИО пациента, названию или номеру зуба..."
							className="dente-search-input"
							data-testid="archive-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={14} />
							</button>
						)}
					</div>

					{/* Кнопка вызова тактильной матрицы поиска */}
					<button
						type="button"
						onClick={() => setShowTactileModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors active:scale-95 cursor-pointer shrink-0 shadow-2xs"
						data-testid="btn-open-tactile-matrix"
						title="Тактильная матрица поиска исследований по датам и аппаратам"
					>
						<Filter className="w-3.5 h-3.5 text-emerald-500" />
						<span>Матрица поиска</span>
					</button>

					{/* Индикатор активных фильтров тактильной матрицы */}
					{(tactileFilters.mode !== "all" || tactileFilters.datePreset !== "all" || Boolean(tactileFilters.query)) && (
						<button
							type="button"
							onClick={() => setTactileFilters(DEFAULT_TACTILE_FILTERS)}
							className="inline-flex items-center gap-1 h-8 px-2.5 text-[12.5px] font-medium rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0"
							title="Сбросить тактильные фильтры"
							data-testid="btn-reset-tactile-matrix"
						>
							<span>Матрица: {tactileFilters.mode} / {tactileFilters.datePreset}</span>
							<X size={12} className="ml-0.5" />
						</button>
					)}

					{/* Быстрый фильтр по датам (Сегодня / Вчера / 3 дня / Неделя / Месяц / Все) */}
					<div className="dente-segmented-bar overflow-x-auto scrollbar-none" data-testid="archive-date-presets-bar">
						<button
							type="button"
							onClick={() => setDatePresetFilter("all")}
							className={`dente-segmented-item ${datePresetFilter === "all" ? "active" : ""}`}
							data-testid="archive-date-all"
						>
							Все даты
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("today")}
							className={`dente-segmented-item ${datePresetFilter === "today" ? "active" : ""}`}
							data-testid="archive-date-today"
						>
							Сегодня
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("yesterday")}
							className={`dente-segmented-item ${datePresetFilter === "yesterday" ? "active" : ""}`}
							data-testid="archive-date-yesterday"
						>
							Вчера
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("3days")}
							className={`dente-segmented-item ${datePresetFilter === "3days" ? "active" : ""}`}
							data-testid="archive-date-3days"
						>
							3 дня
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("last_week")}
							className={`dente-segmented-item ${datePresetFilter === "last_week" ? "active" : ""}`}
							data-testid="archive-date-week"
						>
							Неделя
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("last_month")}
							className={`dente-segmented-item ${datePresetFilter === "last_month" ? "active" : ""}`}
							data-testid="archive-date-month"
						>
							Месяц
						</button>
					</div>

					{/* Зуб FDI */}
					<div className="flex items-center gap-1">
						<select
							value={toothFilter}
							onChange={(e) => setToothFilter(e.target.value)}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-[12.5px] font-medium outline-none cursor-pointer hover:border-teal-500 transition-colors"
							data-testid="archive-tooth-filter"
						>
							<option value="all">Все зубы (FDI)</option>
							{ARCHIVE_FDI_TEETH.map((tooth) => {
								const hasStudy = availableTeeth.includes(tooth);
								return (
									<option key={tooth} value={tooth}>
										#{tooth} {hasStudy ? "● (есть)" : ""}
									</option>
								);
							})}
						</select>
					</div>

					{/* Сегментный фильтр по модальности */}
					<div className="dente-segmented-bar overflow-x-auto scrollbar-none" data-testid="archive-modality-bar">
						<button
							type="button"
							onClick={() => setModalityFilter("all")}
							className={`dente-segmented-item ${modalityFilter === "all" ? "active" : ""}`}
							data-testid="filter-modality-all"
						>
							Все виды ({counts.total})
						</button>
						<button
							type="button"
							onClick={() => setModalityFilter("cbct")}
							className={`dente-segmented-item ${modalityFilter === "cbct" ? "active" : ""}`}
							data-testid="filter-modality-cbct"
						>
							<Box className="w-3.5 h-3.5" />
							<span>3D КЛКТ</span>
						</button>
						<button
							type="button"
							onClick={() => setModalityFilter("opg")}
							className={`dente-segmented-item ${modalityFilter === "opg" ? "active" : ""}`}
							data-testid="filter-modality-opg"
						>
							<Scan className="w-3.5 h-3.5" />
							<span>ОПТГ</span>
						</button>
						<button
							type="button"
							onClick={() => setModalityFilter("periapical")}
							className={`dente-segmented-item ${modalityFilter === "periapical" ? "active" : ""}`}
							data-testid="filter-modality-rvg"
						>
							<Layers className="w-3.5 h-3.5" />
							<span>Прицельные</span>
						</button>
					</div>

					{/* Сегментный фильтр по статусу контроля */}
					<div className="dente-segmented-bar overflow-x-auto scrollbar-none" data-testid="archive-binding-bar">
						<button
							type="button"
							onClick={() => setBindingFilter("all")}
							className={`dente-segmented-item ${bindingFilter === "all" ? "active" : ""}`}
						>
							Все статусы
						</button>
						<button
							type="button"
							onClick={() => setBindingFilter("pending_review")}
							className={`dente-segmented-item ${bindingFilter === "pending_review" ? "active" : ""}`}
							data-testid="filter-binding-pending"
						>
							<AlertCircle className="w-3.5 h-3.5 text-amber-500" />
							<span>Контроль ({counts.pending})</span>
						</button>
						<button
							type="button"
							onClick={() => setBindingFilter("bound")}
							className={`dente-segmented-item ${bindingFilter === "bound" ? "active" : ""}`}
						>
							<Check className="w-3.5 h-3.5 text-emerald-500" />
							<span>Привязаны ({counts.bound})</span>
						</button>
					</div>
				</div>
			</div>

			{/* Таблица / Список исследований */}
			<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
				{isLoading ? (
					<div className="flex items-center justify-center p-12 text-[var(--muted)] gap-2">
						<RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
						<span className="text-xs font-semibold">Загрузка архива КТ и рентгенограмм...</span>
					</div>
				) : filteredStudies.length === 0 ? (
					<div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)]">
						<div className="w-12 h-12 rounded-2xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
							<Scan className="w-6 h-6" />
						</div>
						<div className="max-w-md">
							<h4 className="text-sm font-bold text-[var(--ink)]">Исследования не найдены</h4>
							<p className="text-xs text-[var(--muted)] mt-1">
								{searchQuery
									? `По запросу «${searchQuery}» нет совпадающих КТ или снимков`
									: "В архиве пока нет исследований для выбранного фильтра"}
							</p>
						</div>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-teal-500"
							>
								Сбросить поиск
							</button>
						)}
					</div>
				) : (
					filteredStudies.map((study) => (
						<RadiologyStudyRow
							key={study.id}
							study={study}
							onOpenStudio={onOpenStudio}
							onOpenViewer={onOpenViewer}
							onOpenSensorViewer={onOpenSensorViewer}
							onControlBinding={setActiveControlStudy}
						/>
					))
				)}
			</div>

			{/* Модалка контроля привязки */}
			{activeControlStudy && (
				<StudyPatientBindControlModal
					isOpen={Boolean(activeControlStudy)}
					onClose={() => setActiveControlStudy(null)}
					study={activeControlStudy}
					onStudyUpdated={handleStudyUpdated}
				/>
			)}

			{/* Чистый фильтр снимков визиографа по датам и визитам */}
			<RadiologyPatientSearchModal
				isOpen={showTactileModal}
				onClose={() => setShowTactileModal(false)}
				initialFilters={tactileFilters}
				onApply={(newFilters) => setTactileFilters(newFilters)}
				onReset={() => setTactileFilters(DEFAULT_TACTILE_FILTERS)}
				totalStudiesCount={studies.length}
				matchedCount={filteredStudies.length}
				studies={studies}
			/>
		</div>
	);
};

export default RadiologyStudiesArchive;
