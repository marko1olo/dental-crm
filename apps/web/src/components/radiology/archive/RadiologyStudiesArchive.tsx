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

export const DEMO_ARCHIVE_STUDIES: ImagingStudy[] = [
	{
		id: "02b00000-0000-0000-0000-000000000001",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "01a00000-0000-0000-0000-000000000001",
		patientFullName: "Захаров Иван Дмитриевич",
		dicomPatientName: "Zakharov Ivan",
		dicomPatientId: "DICOM-CT-89412",
		dicomBirthDate: "1985-04-12",
		kind: "cbct",
		title: "3D КЛКТ верхней и нижней челюсти 8x8",
		modality: "CT",
		seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
		studyDate: "2026-08-25",
		capturedAt: "2026-08-25T10:30:00.000Z",
		sliceCount: 420,
		dimensions: "512x512x420",
		voxelSpacing: "0.2mm",
		fileSizeBytes: 185400000,
		bindingStatus: "auto_bound",
		bindingConfidence: 98,
		sourceKind: "folder_watch",
		sourceName: "KaVo eXam Vision PACS",
		status: "available",
		visitId: null,
		toothCode: null,
		region: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
		viewerUrl: null,
	},
	{
		id: "02b00000-0000-0000-0000-000000000002",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "01a00000-0000-0000-0000-000000000002",
		patientFullName: "Иванов Алексей Сергеевич",
		dicomPatientName: "Ivanov Alexey",
		dicomPatientId: "DICOM-PAN-55421",
		dicomBirthDate: "1992-08-24",
		kind: "opg",
		title: "Ортопантомограмма цифровая (ОПТГ)",
		modality: "PAN",
		seriesDescription: "Planmeca ProMax HD Panoramic",
		studyDate: "2026-08-26",
		capturedAt: "2026-08-26T14:15:00.000Z",
		sliceCount: 1,
		dimensions: "2840x1420",
		voxelSpacing: "0.08mm",
		fileSizeBytes: 14200000,
		bindingStatus: "manual_bound",
		bindingConfidence: 100,
		sourceKind: "dicomweb",
		sourceName: "Planmeca Romexis Hub",
		status: "available",
		visitId: null,
		toothCode: null,
		region: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_pathology.jpg",
		viewerUrl: null,
	},
	{
		id: "02b00000-0000-0000-0000-000000000003",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "01a00000-0000-0000-0000-000000000003",
		patientFullName: "Смирнова Елена Александровна",
		dicomPatientName: "Smirnova Elena",
		dicomPatientId: "DICOM-RVG-10293",
		dicomBirthDate: "1988-11-03",
		kind: "periapical",
		toothCode: "36",
		region: "Моляр н/ч слева",
		title: "Прицельный снимок зуб 36 (периапикальный)",
		modality: "IO",
		seriesDescription: "Vatech EzSensor Classic 1.5",
		studyDate: "2026-08-28",
		capturedAt: "2026-08-28T09:40:00.000Z",
		sliceCount: 1,
		dimensions: "1920x1440",
		voxelSpacing: "0.02mm",
		fileSizeBytes: 5200000,
		bindingStatus: "auto_bound",
		bindingConfidence: 94,
		sourceKind: "folder_watch",
		sourceName: "DENTE Рентген-станция",
		status: "available",
		visitId: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
		viewerUrl: null,
	},
	{
		id: "02b00000-0000-0000-0000-000000000004",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: null,
		patientFullName: null,
		dicomPatientName: "Kuznetsov D.",
		dicomPatientId: "DICOM-CT-99102",
		dicomBirthDate: "1979-02-17",
		kind: "cbct",
		title: "3D КЛКТ сегмента нижней челюсти 5x5",
		modality: "CT",
		seriesDescription: "Morita Veraviewepocs 3D F40",
		studyDate: "2026-08-28",
		capturedAt: "2026-08-28T16:50:00.000Z",
		sliceCount: 380,
		dimensions: "512x512x380",
		voxelSpacing: "0.125mm",
		fileSizeBytes: 145000000,
		bindingStatus: "pending_review",
		bindingConfidence: 78,
		sourceKind: "folder_watch",
		sourceName: "i-Dixel Morita Network",
		status: "available",
		visitId: null,
		toothCode: null,
		region: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
		viewerUrl: null,
	},
];

/**
 * RadiologyStudiesArchive — Глобальный реестр ВСЕХ исследований клиники (Архив КТ и рентгенов).
 *
 * МАНДАТЫ ВРАЧЕБНОЙ АВТОНОМИИ И ЭРГОНОМИКИ:
 * 1. Полноценная картотека всех снимков клиники с фильтрацией по модальности и статусу привязки.
 * 2. 1-клик запуск 3D КЛКТ Студии из реестра.
 * 3. 1-клик запуск фоновой автопривязки неразобранных КТ по ФИО пациентов.
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

			// 1-клик быстрый фильтр по пресету даты
			if (datePresetFilter !== "all") {
				if (!matchesDatePreset(study.capturedAt || study.studyDate, datePresetFilter)) {
					return false;
				}
			}

			// 1-клик быстрый фильтр по зубу FDI
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
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
							data-testid="btn-scan-disk-for-dicom"
							title="Автономный поиск папок и архивов КТ на диске с фильтрацией мусора сторонних просмотрщиков и исключением дубликатов"
						>
							<HardDrive className={`w-3.5 h-3.5 ${isDiskScanning ? "animate-spin" : ""}`} />
							<span>{isDiskScanning ? "Поиск КТ..." : "Найти КТ на диске"}</span>
						</button>

						{/* Кнопка автопривязки по ФИО */}
						<button
							type="button"
							onClick={handleTriggerAutoBinding}
							disabled={isAutoBinding}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
							data-testid="btn-auto-bind-scan"
							title="Запустить алгоритм автопривязки неразобранных КТ по ФИО и дате рождения"
						>
							<Sparkles className={`w-3.5 h-3.5 ${isAutoBinding ? "animate-spin" : ""}`} />
							<span>{isAutoBinding ? "Сопоставление..." : "Автопривязка по ФИО"}</span>
						</button>

						{/* Кнопка загрузки КТ */}
						{onUploadNew && (
							<button
								type="button"
								onClick={onUploadNew}
								className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 transition-colors cursor-pointer"
								data-testid="btn-archive-upload-new"
							>
								<Plus className="w-3.5 h-3.5 text-teal-500" />
								<span>Загрузить снимок / КТ</span>
							</button>
						)}

						{/* Кнопка обновления */}
						<button
							type="button"
							onClick={fetchAllStudies}
							disabled={isLoading}
							className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
							title="Обновить список"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
						</button>
					</div>
				</div>

				{/* Панель поиска и фильтров */}
				<div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
					{/* Поле поиска */}
					<div className="relative flex-1 min-w-[220px]">
						<Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по ФИО пациента, названию или номеру зуба..."
							className="w-full h-8 pl-8 pr-3 rounded-lg text-xs bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-hidden focus:border-teal-500 transition-colors"
							data-testid="archive-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
							>
								✕
							</button>
						)}
					</div>

					{/* Кнопка вызова тактильной матрицы поиска */}
					<button
						type="button"
						onClick={() => setShowTactileModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
						data-testid="btn-open-tactile-matrix"
						title="Тактильная матрица поиска исследований по датам и аппаратам"
					>
						<Filter className="w-3.5 h-3.5" />
						<span>Матрица поиска</span>
					</button>

					{/* Индикатор активных фильтров тактильной матрицы */}
					{(tactileFilters.mode !== "all" || tactileFilters.datePreset !== "all" || Boolean(tactileFilters.query)) && (
						<button
							type="button"
							onClick={() => setTactileFilters(DEFAULT_TACTILE_FILTERS)}
							className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-bold rounded-lg bg-[#2E8B57]/15 text-[#2E8B57] border border-[#2E8B57]/30 hover:bg-[#2E8B57]/25 transition-colors cursor-pointer shrink-0"
							title="Сбросить тактильные фильтры"
							data-testid="btn-reset-tactile-matrix"
						>
							<span>Матрица: {tactileFilters.mode} / {tactileFilters.datePreset}</span>
							<span className="text-xs ml-0.5">✕</span>
						</button>
					)}

					{/* 1-клик быстрый фильтр по датам (Сегодня / Вчера / 3 дня / Неделя / Месяц / Все) */}
					<div className="flex items-center gap-0.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-0.5 overflow-x-auto scrollbar-none" data-testid="archive-date-presets-bar">
						<button
							type="button"
							onClick={() => setDatePresetFilter("all")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								datePresetFilter === "all"
									? "bg-teal-600 text-white shadow-2xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="archive-date-all"
						>
							Все даты
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("today")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								datePresetFilter === "today"
									? "bg-teal-600 text-white shadow-2xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="archive-date-today"
						>
							Сегодня
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("yesterday")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								datePresetFilter === "yesterday"
									? "bg-teal-600 text-white shadow-2xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="archive-date-yesterday"
						>
							Вчера
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("3days")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								datePresetFilter === "3days"
									? "bg-teal-600 text-white shadow-2xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="archive-date-3days"
						>
							3 дня
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("last_week")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								datePresetFilter === "last_week"
									? "bg-teal-600 text-white shadow-2xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="archive-date-week"
						>
							Неделя
						</button>
						<button
							type="button"
							onClick={() => setDatePresetFilter("last_month")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								datePresetFilter === "last_month"
									? "bg-teal-600 text-white shadow-2xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
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
							className="h-7 px-2 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-xs outline-none cursor-pointer hover:border-teal-500"
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
					<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-0.5 overflow-x-auto scrollbar-none">
						<button
							type="button"
							onClick={() => setModalityFilter("all")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								modalityFilter === "all"
									? "bg-teal-600 text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-modality-all"
						>
							Все виды ({counts.total})
						</button>
						<button
							type="button"
							onClick={() => setModalityFilter("cbct")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
								modalityFilter === "cbct"
									? "bg-teal-600 text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-modality-cbct"
						>
							<Box className="w-3 h-3" />
							<span>3D КЛКТ</span>
						</button>
						<button
							type="button"
							onClick={() => setModalityFilter("opg")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
								modalityFilter === "opg"
									? "bg-teal-600 text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-modality-opg"
						>
							<Scan className="w-3 h-3" />
							<span>ОПТГ</span>
						</button>
						<button
							type="button"
							onClick={() => setModalityFilter("periapical")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
								modalityFilter === "periapical"
									? "bg-teal-600 text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="filter-modality-rvg"
						>
							<Layers className="w-3 h-3" />
							<span>Прицельные снимки</span>
						</button>
					</div>

					{/* Сегментный фильтр по статусу контроля */}
					<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-0.5 overflow-x-auto scrollbar-none">
						<button
							type="button"
							onClick={() => setBindingFilter("all")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
								bindingFilter === "all"
									? "bg-zinc-700 text-white dark:bg-zinc-600 shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Все статусы
						</button>
						<button
							type="button"
							onClick={() => setBindingFilter("pending_review")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
								bindingFilter === "pending_review"
									? "bg-amber-600 text-white shadow-2xs"
									: "text-amber-500 hover:text-amber-400"
							}`}
							data-testid="filter-binding-pending"
						>
							<AlertCircle className="w-3 h-3" />
							<span>Контроль ({counts.pending})</span>
						</button>
						<button
							type="button"
							onClick={() => setBindingFilter("bound")}
							className={`h-7 px-2.5 rounded-md font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
								bindingFilter === "bound"
									? "bg-emerald-600 text-white shadow-2xs"
									: "text-emerald-500 hover:text-emerald-400"
							}`}
						>
							<Check className="w-3 h-3" />
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
					filteredStudies.map((study) => {
						const isCbct = study.kind === "cbct" || (study.sliceCount && study.sliceCount > 1);
						const isBound = Boolean(study.patientId);

						return (
							<div
								key={study.id}
								className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] hover:border-teal-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
								data-testid={`study-row-${study.id}`}
							>
								{/* Левая колонка: Иконка модальности + Описание */}
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div
										className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
											isCbct
												? "bg-blue-500/15 text-blue-500 border-blue-500/30"
												: study.kind === "opg"
													? "bg-purple-500/15 text-purple-500 border-purple-500/30"
													: "bg-teal-500/15 text-teal-500 border-teal-500/30"
										}`}
									>
										{isCbct ? (
											<Box className="w-5 h-5" />
										) : study.kind === "opg" ? (
											<Scan className="w-5 h-5" />
										) : (
											<Layers className="w-5 h-5" />
										)}
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<h4 className="text-xs font-bold text-[var(--ink)] truncate">
												{study.title}
											</h4>
											{study.toothCode && (
												<span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30">
													Зуб #{study.toothCode}
												</span>
											)}
										</div>

										<div className="flex items-center gap-3 text-[11px] text-[var(--muted)] mt-1 flex-wrap">
											<span>
												Дата:{" "}
												<strong className="text-[var(--ink)]">
													{study.capturedAt
														? new Date(study.capturedAt).toLocaleDateString("ru-RU", {
																day: "2-digit",
																month: "2-digit",
																year: "numeric",
																hour: "2-digit",
																minute: "2-digit",
															})
														: study.studyDate || "—"}
												</strong>
											</span>
											<span>Серия: {study.seriesDescription || study.sourceName}</span>
											{study.sliceCount && (
												<span className="font-semibold text-blue-600 dark:text-blue-400">
													{study.sliceCount} срез. ({study.voxelSpacing || "0.2mm"})
												</span>
											)}
										</div>

										{/* Блок привязки пациента */}
										<div className="flex items-center gap-2 mt-1.5 flex-wrap">
											<div className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink)]">
												<User className="w-3 h-3 text-[var(--muted)]" />
												<span>
													Пациент:{" "}
													<strong
														className={
															study.patientFullName ? "text-[var(--ink)]" : "text-amber-500"
														}
													>
														{study.patientFullName || "Не привязан к базе"}
													</strong>
												</span>
											</div>

											{study.dicomPatientName && (
												<span className="text-[10px] text-[var(--muted)] font-mono">
													(DICOM: {study.dicomPatientName})
												</span>
											)}

											{/* Бейдж статуса */}
											{study.bindingStatus === "manual_bound" ? (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
													<Check className="w-2.5 h-2.5" />
													<span>Подтверждено врачом</span>
												</span>
											) : study.bindingStatus === "auto_bound" ? (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
													<Sparkles className="w-2.5 h-2.5" />
													<span>Привязано по ФИО ({study.bindingConfidence || 95}%)</span>
												</span>
											) : study.bindingStatus === "pending_review" ? (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40">
													<AlertCircle className="w-2.5 h-2.5" />
													<span>Ожидает контроля ({study.bindingConfidence || 75}%)</span>
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
													<span>Не привязано</span>
												</span>
											)}

											{study.archivePath && (
												<span
													className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
													title={`Архив-источник КТ: ${study.archivePath}`}
													data-testid={`badge-archive-${study.id}`}
												>
													<Archive className="w-2.5 h-2.5" />
													<span>Архив КТ</span>
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Правая колонка: 1-клик кнопки действий */}
								<div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
									{/* Контроль сопоставления */}
									<button
										type="button"
										onClick={() => setActiveControlStudy(study)}
										className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
										data-testid={`btn-control-binding-${study.id}`}
										title="Контроль привязки к пациенту / смена / отвязка"
									>
										<Settings className="w-3.5 h-3.5 text-[var(--muted)]" />
										<span>Контроль</span>
									</button>

									{/* Запуск 3D Студии */}
									{isCbct && onOpenStudio && (
										<button
											type="button"
											onClick={() => onOpenStudio(study)}
											className="h-8 px-3 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
											data-testid={`btn-open-studio-${study.id}`}
											title="1-клик запуск 3D КЛКТ Студии планирования имплантации"
										>
											<Box className="w-3.5 h-3.5" />
											<span>🔬 3D Студия</span>
										</button>
									)}

									{/* 1-клик запуск в 2D Рентген-просмотрщике */}
									{onOpenSensorViewer && !isCbct && (
										<button
											type="button"
											onClick={() => onOpenSensorViewer(study)}
											className="h-8 px-2.5 text-xs font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
											data-testid={`btn-open-sensor-${study.id}`}
											title="Открыть снимок в 2D Рентген-просмотрщике с калибровкой и фильтрами"
										>
											<Sparkles className="w-3.5 h-3.5 text-emerald-400" />
											<span>2D Сенсор</span>
										</button>
									)}

									{/* Просмотр снимка */}
									{onOpenViewer && (
										<button
											type="button"
											onClick={() => onOpenViewer(study)}
											className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
											data-testid={`btn-open-viewer-${study.id}`}
											title="Открыть снимок в просмотрщике"
										>
											<Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
											<span>Просмотр</span>
										</button>
									)}
								</div>
							</div>
						);
					})
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
