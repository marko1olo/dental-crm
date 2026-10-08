import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Box,
	Camera,
	Check,
	CheckCircle2,
	ChevronRight,
	ExternalLink,
	Eye,
	FileText,
	FolderInput,
	Layers,
	Link2,
	Plus,
	RefreshCw,
	Scan,
	Settings,
	ShieldCheck,
	Sparkles,
	UploadCloud,
	User,
} from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { CbctMprImplantStudioModal } from "../../radiology/CbctMprImplantStudioModal";
import { DicomViewerModal } from "../../imaging/DicomViewerModal";
import { DicomAutoDetectStatusBadge } from "../../imaging/DicomAutoDetectStatusBadge";
import { CtStudyViewer } from "../../imaging/CtStudyViewer";
import { HotFolderIntakeModal } from "../../radiology/HotFolderIntakeModal";
import { StudyPatientBindControlModal } from "../../radiology/archive/StudyPatientBindControlModal";
import { convertImagingStudyToRadiologyStudy } from "../../radiology/archive/radiologyStudyAdapter";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { PatientTimeline } from "../PatientTimeline";
import {
	RadiologyPatientSearchModal,
	matchesDatePreset,
	matchesTactileModality,
	DEFAULT_TACTILE_FILTERS,
	type RadiologyTactileFilterState,
} from "../../radiology/RadiologyPatientSearchModal";
import { Filter } from "lucide-react";

export interface PatientRadiologyTabProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
}

const DEMO_PATIENT_STUDIES: ImagingStudy[] = [
	{
		id: "03c00000-0000-0000-0000-000000000001",
		organizationId: DEMO_SHOWCASE_ORG_ID,
		patientId: "01a00000-0000-0000-0000-000000000001",
		patientFullName: "Иванов Алексей Сергеевич",
		dicomPatientName: "Ivanov Alexey",
		dicomPatientId: "DICOM-CT-89412",
		dicomBirthDate: "1992-08-24",
		kind: "cbct",
		title: "3D КЛКТ верхней и нижней челюсти (FOV 8x8)",
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
		id: "03c00000-0000-0000-0000-000000000002",
		organizationId: DEMO_SHOWCASE_ORG_ID,
		patientId: "01a00000-0000-0000-0000-000000000001",
		patientFullName: "Иванов Алексей Сергеевич",
		dicomPatientName: "Ivanov Alexey",
		dicomPatientId: "DICOM-PAN-55421",
		dicomBirthDate: "1992-08-24",
		kind: "opg",
		title: "Ортопантомограмма цифровая (ОПТГ панорама)",
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
		id: "03c00000-0000-0000-0000-000000000003",
		organizationId: DEMO_SHOWCASE_ORG_ID,
		patientId: "01a00000-0000-0000-0000-000000000001",
		patientFullName: "Иванов Алексей Сергеевич",
		dicomPatientName: "Ivanov Alexey",
		dicomPatientId: "DICOM-RVG-10293",
		dicomBirthDate: "1992-08-24",
		kind: "periapical",
		toothCode: "36",
		region: "Моляр н/ч слева",
		title: "Прицельный снимок RVG зуб 36 (периапикальный)",
		modality: "IO",
		seriesDescription: "Vatech EzSensor Classic 1.5",
		studyDate: "2026-08-28",
		capturedAt: "2026-08-28T09:40:00.000Z",
		sliceCount: 1,
		dimensions: "1920x1440",
		voxelSpacing: "0.02mm",
		fileSizeBytes: 5200000,
		bindingStatus: "manual_bound",
		bindingConfidence: 100,
		sourceKind: "folder_watch",
		sourceName: "DENTE Рентген-станция",
		status: "available",
		visitId: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
		viewerUrl: null,
	},
];

/**
 * PatientRadiologyTab — Вкладка «Снимки и КТ» в медицинской карте пациента.
 *
 * МАНДАТЫ ВРАЧЕБНОЙ АВТОНОМИИ И ЭРГОНОМИКИ:
 * 1. Загрузка реальных исследований пациента через GET /api/imaging/studies?patientId=...
 * 2. 1-клик запуск 3D КЛКТ Студии имплантации (CbctMprImplantStudioModal) с передачей исследования.
 * 3. 1-клик запуск просмотрщика визиограмм и ОПТГ (DicomViewerModal).
 * 4. Быстрое действие «+ Загрузить КТ для этого пациента» (открытие приемника снимков с привязкой patientId).
 * 5. Бейджи статуса привязки: «Привязано по ФИО (98%)» или «Подтверждено врачом».
 * 6. Плотная профессиональная клиническая эргономика (высота кнопок 32–36px).
 */
export const PatientRadiologyTab: React.FC<PatientRadiologyTabProps> = ({
	patientId,
	patientName,
	patientBirthDate,
	cardNumber,
	onOpenStudio,
	onOpenViewer,
}) => {
	const [studies, setStudies] = useState<ImagingStudy[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Внутренние модалки (если родитель не перехватывает открытие)
	const [activeCbctStudy, setActiveCbctStudy] = useState<ImagingStudy | null>(null);
	const [active2dStudy, setActive2dStudy] = useState<ImagingStudy | null>(null);
	const [showHotFolder, setShowHotFolder] = useState<boolean>(false);
	const [activeControlStudy, setActiveControlStudy] = useState<ImagingStudy | null>(null);

	// Тактильный матричный поиск и хронологический таймлайн (EzDent-i Снимки 15, 16, 19)
	const [showTactileSearch, setShowTactileSearch] = useState<boolean>(false);
	const [tactileFilters, setTactileFilters] = useState<RadiologyTactileFilterState>(DEFAULT_TACTILE_FILTERS);
	const [activeStudyId, setActiveStudyId] = useState<string | null>(null);

	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId) || isDemoPatientId(patientName);

	// Загрузка исследований пациента
	const loadPatientStudies = useCallback(async () => {
		if (!patientId) {
			setStudies(isDemo ? DEMO_PATIENT_STUDIES : []);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`);
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					setStudies(data);
				} else if (isDemo) {
					setStudies(DEMO_PATIENT_STUDIES);
				} else {
					setStudies([]);
				}
			} else {
				if (isDemo) {
					setStudies(DEMO_PATIENT_STUDIES);
				} else {
					setError("Не удалось загрузить снимки с сервера");
				}
			}
		} catch {
			if (isDemo) {
				setStudies(DEMO_PATIENT_STUDIES);
			} else {
				setError("Ошибка сетевого соединения с архивом снимков");
			}
		} finally {
			setIsLoading(false);
		}
	}, [patientId, isDemo]);

	useEffect(() => {
		loadPatientStudies();
	}, [loadPatientStudies]);

	const handleOpen3d = useCallback(
		(study: ImagingStudy) => {
			if (onOpenStudio) {
				onOpenStudio(study);
			} else {
				setActiveCbctStudy(study);
			}
		},
		[onOpenStudio],
	);

	const handleOpen2d = useCallback(
		(study: ImagingStudy) => {
			if (onOpenViewer) {
				onOpenViewer(study);
			} else {
				setActive2dStudy(study);
			}
		},
		[onOpenViewer],
	);

	const handleStudyUpdated = useCallback((updated: ImagingStudy) => {
		setStudies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
	}, []);

	// Сортировка по дате (свежие сверху)
	const sortedStudies = useMemo(() => {
		return [...studies].sort((a, b) => {
			const dateA = new Date(a.capturedAt || a.studyDate || 0).getTime();
			const dateB = new Date(b.capturedAt || b.studyDate || 0).getTime();
			return dateB - dateA;
		});
	}, [studies]);

	// Фильтрация тактильной матрицей (Снимок 19)
	const filteredStudies = useMemo(() => {
		return sortedStudies.filter((study) => {
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
				const matchTitle = (study.title || "").toLowerCase().includes(q);
				const matchTooth = (study.toothCode || "").includes(q);
				const matchSeries = (study.seriesDescription || "").toLowerCase().includes(q);
				if (!matchTitle && !matchTooth && !matchSeries) return false;
			}
			return true;
		});
	}, [sortedStudies, tactileFilters]);

	return (
		<div className="flex flex-col gap-4 text-[var(--ink)]" data-testid="patient-radiology-tab">
			{/* Верхний командный тулбар */}
			<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
						<Scan className="w-4 h-4" />
					</div>
					<div>
						<h3 className="text-xs font-bold text-[var(--ink)] leading-tight">
							Рентгенологические исследования пациента
						</h3>
						<p className="text-[11px] text-[var(--muted)]">
							Компьютерные томограммы (КЛКТ), ортопантомограммы и прицельные снимки
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Фоновый статус автообнаружения DICOM/PACS */}
					<DicomAutoDetectStatusBadge onStudyBound={loadPatientStudies} />

					{/* Кнопка вызова тактильной матрицы поиска */}
					<button
						type="button"
						onClick={() => setShowTactileSearch(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
						data-testid="btn-patient-tactile-search"
						title="Тактильная матрица поиска исследований по датам и аппаратам"
					>
						<Filter className="w-3.5 h-3.5" />
						<span>Матрица поиска</span>
					</button>

					{/* Кнопка загрузки КТ для пациента */}
					<button
						type="button"
						onClick={() => setShowHotFolder(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
						data-testid="btn-patient-upload-ct"
						title="Импорт снимка из горячей папки томографа или загрузка файла с автопривязкой к пациенту"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>+ Загрузить КТ для этого пациента</span>
					</button>

					{/* Кнопка обновления */}
					<button
						type="button"
						onClick={loadPatientStudies}
						disabled={isLoading}
						className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
						title="Обновить список исследований"
						data-testid="btn-refresh-patient-radiology"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			{/* Контент: список исследований или пустое состояние */}
			{isLoading ? (
				<div className="flex items-center justify-center p-12 text-[var(--muted)] gap-2">
					<RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
					<span className="text-xs font-semibold">Загрузка снимков пациента...</span>
				</div>
			) : error ? (
				<div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{error}</span>
					</div>
					<button
						type="button"
						onClick={loadPatientStudies}
						className="h-7 px-2.5 rounded-md bg-[var(--paper)] border border-rose-500/30 font-semibold hover:bg-rose-500/20 text-xs"
					>
						Повторить
					</button>
				</div>
			) : sortedStudies.length === 0 ? (
				/* Пустое состояние */
				<div
					className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-[var(--paper-soft)] rounded-2xl border border-dashed border-[var(--line)]"
					data-testid="patient-radiology-empty"
				>
					<div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center">
						<Scan className="w-6 h-6" />
					</div>
					<div className="max-w-md">
						<h4 className="text-sm font-bold text-[var(--ink)]">Снимки еще не привязаны</h4>
						<p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
							У пациента пока нет сохраненных КЛКТ или рентгеновских снимков в базе. Вы можете
							принять снимок из папки аппарата или загрузить DICOM файл.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowHotFolder(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer mt-1"
					>
						<UploadCloud className="w-4 h-4" />
						<span>Загрузить исследование</span>
					</button>
				</div>
			) : (
				/* Хронологический таймлайн исследований (EzDent-i Снимки 15, 16) */
				<div className="flex flex-col gap-2.5 min-h-[460px]" data-testid="patient-radiology-list">
					<PatientTimeline
						studies={filteredStudies}
						activeStudyId={activeStudyId || filteredStudies[0]?.id || null}
						onSelectStudy={(study) => setActiveStudyId(study.id)}
						onOpenStudio={handleOpen3d}
						onOpenViewer={handleOpen2d}
						onOpenControl={(study) => setActiveControlStudy(study)}
						onOpenTactileSearch={() => setShowTactileSearch(true)}
					/>
				</div>
			)}

			{/* Модалка 3D КЛКТ Студии */}
			{activeCbctStudy && (
				<CbctMprImplantStudioModal
					isOpen={Boolean(activeCbctStudy)}
					onClose={() => setActiveCbctStudy(null)}
					study={convertImagingStudyToRadiologyStudy(activeCbctStudy)}
					patientName={patientName || activeCbctStudy.patientFullName || undefined}
					patientId={patientId || activeCbctStudy.patientId || undefined}
				/>
			)}

			{/* Модалка 2D Просмотрщика */}
			{active2dStudy && (
				<DicomViewerModal
					isOpen={Boolean(active2dStudy)}
					onClose={() => setActive2dStudy(null)}
					imageSrc={active2dStudy.previewUrl || undefined}
					title={active2dStudy.title}
					patientName={patientName || active2dStudy.patientFullName || undefined}
					patientId={patientId || active2dStudy.patientId || undefined}
					toothFdiCode={active2dStudy.toothCode || undefined}
				/>
			)}

			{/* Модалка HotFolder с предзаполненным patientId */}
			{showHotFolder && (
				<HotFolderIntakeModal
					isOpen={showHotFolder}
					onClose={() => setShowHotFolder(false)}
					patientId={patientId || undefined}
					patientName={patientName || undefined}
					patientCardNumber={cardNumber || undefined}
					patientBirthDate={patientBirthDate || undefined}
					onAttachToEmr={() => {
						setShowHotFolder(false);
						loadPatientStudies();
					}}
				/>
			)}

			{/* Модалка контроля привязки */}
			{activeControlStudy && (
				<StudyPatientBindControlModal
					isOpen={Boolean(activeControlStudy)}
					onClose={() => setActiveControlStudy(null)}
					study={activeControlStudy}
					onStudyUpdated={handleStudyUpdated}
				/>
			)}

			{/* Тактильная матрица поиска EzDent-i (Снимок 19) */}
			<RadiologyPatientSearchModal
				isOpen={showTactileSearch}
				onClose={() => setShowTactileSearch(false)}
				initialFilters={tactileFilters}
				onApply={(newFilters) => setTactileFilters(newFilters)}
				onReset={() => setTactileFilters(DEFAULT_TACTILE_FILTERS)}
				totalStudiesCount={sortedStudies.length}
				matchedCount={filteredStudies.length}
				studies={sortedStudies}
			/>
		</div>
	);
};

export default PatientRadiologyTab;
