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
import { showToast } from "../../GlobalToast";
import { CbctMprImplantStudioModal } from "../../radiology/CbctMprImplantStudioModal";
import { DicomViewerModal } from "../../imaging/DicomViewerModal";
import { DicomAutoDetectStatusBadge } from "../../imaging/DicomAutoDetectStatusBadge";
import { CtStudyViewer } from "../../imaging/CtStudyViewer";
import { HotFolderIntakeModal } from "../../radiology/HotFolderIntakeModal";
import { StudyPatientBindControlModal } from "../../radiology/archive/StudyPatientBindControlModal";
import { convertImagingStudyToRadiologyStudy } from "../../radiology/archive/radiologyStudyAdapter";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";

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
		organizationId: "00000000-0000-0000-0000-000000000001",
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
		organizationId: "00000000-0000-0000-0000-000000000001",
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
		organizationId: "00000000-0000-0000-0000-000000000001",
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
		sourceName: "EzDent-i Vatech Station",
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
				/* Список исследований пациента */
				<div className="flex flex-col gap-2.5" data-testid="patient-radiology-list">
					{sortedStudies.map((study) => {
						const isCbct = study.kind === "cbct" || (study.sliceCount && study.sliceCount > 1);

						if (isCbct) {
							return (
								<CtStudyViewer
									key={study.id}
									studyId={study.id}
									title={study.title}
									patientId={patientId || study.patientId}
									patientName={patientName || study.patientFullName}
									modality={study.modality || "КЛКТ"}
									manufacturer={study.seriesDescription || study.sourceName}
									sliceCount={study.sliceCount}
									dimensions={study.dimensions}
									voxelSpacing={study.voxelSpacing}
									capturedAt={study.capturedAt || study.studyDate}
									bindingStatus={study.bindingStatus}
									bindingConfidence={study.bindingConfidence}
									onOpenStudio={() => handleOpen3d(study)}
									onOpenControl={() => setActiveControlStudy(study)}
								/>
							);
						}

						return (
							<div
								key={study.id}
								className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] hover:border-teal-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
								data-testid={`patient-study-card-${study.id}`}
							>
								{/* Левый блок: инфо об исследовании */}
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

										{/* Бейдж статуса привязки */}
										<div className="flex items-center gap-2 mt-1.5 flex-wrap">
											{study.bindingStatus === "manual_bound" ? (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
													<Check className="w-2.5 h-2.5" />
													<span>Подтверждено врачом</span>
												</span>
											) : study.bindingStatus === "auto_bound" ? (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
													<Sparkles className="w-2.5 h-2.5" />
													<span>Привязано по ФИО ({study.bindingConfidence || 98}%)</span>
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40">
													<AlertCircle className="w-2.5 h-2.5" />
													<span>Требует контроля врача</span>
												</span>
											)}

											{study.dicomPatientName && (
												<span className="text-[10px] text-[var(--muted)] font-mono">
													DICOM: {study.dicomPatientName}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Правый блок: 1-клик кнопки запуска */}
								<div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
									{/* Контроль сопоставления */}
									<button
										type="button"
										onClick={() => setActiveControlStudy(study)}
										className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
										title="Проверить сопоставление с DICOM"
										data-testid={`btn-patient-study-control-${study.id}`}
									>
										<Settings className="w-3.5 h-3.5 text-[var(--muted)]" />
										<span>Контроль</span>
									</button>

									{/* 1-клик запуск 3D Студии */}
									{isCbct ? (
										<button
											type="button"
											onClick={() => handleOpen3d(study)}
											className="h-8 px-3 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
											data-testid={`btn-launch-3d-studio-${study.id}`}
											title="1-клик запуск 3D КЛКТ Студии планирования имплантации"
										>
											<Box className="w-3.5 h-3.5" />
											<span>3D КЛКТ Студия</span>
										</button>
									) : (
										/* 1-клик запуск 2D вьюера для панорамы или RVG */
										<button
											type="button"
											onClick={() => handleOpen2d(study)}
											className="h-8 px-3 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
											data-testid={`btn-launch-viewer-${study.id}`}
											title="Открыть снимок в просмотрщике"
										>
											<Eye className="w-3.5 h-3.5 text-teal-500" />
											<span>
												{study.kind === "opg" ? "Панорама ОПТГ" : "Визиограф & DICOM"}
											</span>
										</button>
									)}
								</div>
							</div>
						);
					})}
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
		</div>
	);
};

export default PatientRadiologyTab;
