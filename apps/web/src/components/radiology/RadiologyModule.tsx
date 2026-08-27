import {
	Activity,
	ArrowLeftRight,
	Calendar,
	Camera,
	Check,
	Columns,
	Download,
	Eye,
	FileText,
	Filter,
	Layers,
	Maximize2,
	Plus,
	Box,
	Printer,
	RotateCw,
	Scan,
	Search,
	ShieldCheck,
	Sparkles,
	Target,
	Trash2,
	UploadCloud,
	User,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { CbctMprImplantStudioModal } from "./CbctMprImplantStudioModal";
import { RadiationDoseSheetModal } from "./RadiationDoseSheetModal";
import { formatRadiationDose } from "./radiologyMath";
import { RadiologyReferralModal } from "./RadiologyReferralModal";
import { RadiologyStudyList } from "./RadiologyStudyList";
import { RadiologyViewerModal } from "./RadiologyViewerModal";
import {
	MedicalRadiologyDropzone,
	SAMPLE_PATIENT_RVG_URL,
} from "./MedicalRadiologyDropzone";
import type { RadiologyStudy } from "./types";

export interface RadiologyModuleProps {
	patient?: {
		id?: string;
		fullName?: string | null;
		birthDate?: string | null;
		phone?: string | null;
		cardNumber?: string | null;
		medicalCardNumber?: string | null;
	} | null;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	clinicName?: string | null;
	initialStudies?: RadiologyStudy[];
	onSaveStudies?: (studies: RadiologyStudy[]) => void;
	className?: string;
}

const DEFAULT_SAMPLE_STUDIES: RadiologyStudy[] = [
	{
		id: "study-cbct-001",
		patientName: "Иванов Иван Иванович",
		studyDate: "2026-08-15 14:30",
		studyType: "cbct_jaw_8x8",
		modality: "cbct_3d",
		modalityLabel: "3D КЛКТ челюстей",
		anatomicalArea: "Верхняя и нижняя челюсти (FOV 8x8)",
		teethFdi: ["16", "26", "36", "46"],
		effectiveDoseMicrosv: 55.0,
		effectiveDoseMsv: 0.055,
		imageUrl:
			"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'><rect width='1200' height='900' fill='%23050811'/><circle cx='600' cy='450' r='350' fill='none' stroke='%2306b6d4' stroke-width='2' stroke-dasharray='8 4'/><path d='M300 450 Q600 200 900 450 Q600 700 300 450' fill='none' stroke='%2338bdf8' stroke-width='3'/><text x='600' y='440' fill='%2338bdf8' font-size='28' font-family='sans-serif' font-weight='bold' text-anchor='middle'>3D КЛКТ: ОБЗОРНЫЙ ТОМОГРАФИЧЕСКИЙ СРЕЗ</text><text x='600' y='480' fill='%2394a3b8' font-size='18' font-family='sans-serif' text-anchor='middle'>Костная плотность D2 · Пазухи интактны · Каналы визуализированы</text></svg>",
		doctorName: "Др. Смирнов А.В.",
		doctorSpecialty: "Врач-рентгенолог / Хирург",
		clinicName: 'ООО "Денте Клиник"',
		status: "completed",
		diagnosisIcd10: "K08.1",
		diagnosticNotes:
			"Томограмма челюстей выполнена для планирования дентальной имплантации в области отсутствующих зубов 16, 26, 46. В области альвеолярного отростка верхней челюсти высота кости 12.4 мм, ширина 7.8 мм. Дно гайморовой пазухи интактно. Нижнечелюстной канал справа на расстоянии 14.2 мм от вершины гребня.",
		aiFindings: {
			boneLossPercentage: 12,
			summary: "Костное предложение достаточно для установки имплантатов 4.0x10.0 мм без синус-лифтинга.",
			confidence: 0.94,
		},
		metadata: {
			kv: 85,
			ma: 6.3,
			exposureSec: 14.5,
			pixelSpacingMm: 0.1,
			apparatusModel: "KaVo 3D eXam",
		},
		measurements: [
			{
				id: "m-1",
				startX: 40,
				startY: 45,
				endX: 40,
				endY: 55,
				distanceMm: 12.4,
				label: "Высота гребня 16: 12.4 мм",
			},
		],
		landmarks: [
			{
				id: "lm-1",
				x: 40,
				y: 25,
				toothFdi: "16",
				label: "Зона имплантации 16 (Апикальная)",
				type: "implant_site",
			},
			{
				id: "lm-2",
				x: 60,
				y: 45,
				toothFdi: "26",
				label: "Зона имплантации 26",
				type: "implant_site",
			},
		],
	},
	{
		id: "study-optg-002",
		patientName: "Иванов Иван Иванович",
		studyDate: "2026-08-10 11:15",
		studyType: "optg_digital_panoramic",
		modality: "optg_panoramic",
		modalityLabel: "Панорамная ОПТГ",
		anatomicalArea: "Панорамный обзор всех зубов",
		teethFdi: ["11", "21", "36", "37"],
		effectiveDoseMicrosv: 18.0,
		effectiveDoseMsv: 0.018,
		imageUrl:
			"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'><rect width='1200' height='700' fill='%23050811'/><path d='M150 450 Q600 150 1050 450' fill='none' stroke='%2306b6d4' stroke-width='4'/><text x='600' y='330' fill='%2338bdf8' font-size='26' font-family='sans-serif' font-weight='bold' text-anchor='middle'>ЦИФРОВАЯ ПАНОРАМНАЯ ОРТОПАНТОМОГРАММА (ОПТГ)</text><text x='600' y='370' fill='%2394a3b8' font-size='16' font-family='sans-serif' text-anchor='middle'>Зубная дуга симметрична · ВНЧС суставные щели равномерны</text></svg>",
		doctorName: "Др. Смирнов А.В.",
		doctorSpecialty: "Врач-стоматолог терапевт",
		clinicName: 'ООО "Денте Клиник"',
		status: "completed",
		diagnosisIcd10: "K04.0",
		diagnosticNotes:
			"Обзорная панорамная рентгенограмма. Корневые каналы зуба 36 ранее не пломбированы, глубокая кариозная полость на дистально-окклюзионной поверхности, сообщающаяся с полостью зуба. Периапикальные ткани зубов 11, 21 без признаков деструкции.",
		metadata: {
			kv: 70,
			ma: 8.0,
			exposureSec: 12.0,
			pixelSpacingMm: 0.12,
			apparatusModel: "Planmeca ProMax 2D",
		},
	},
	{
		id: "study-rvg-003",
		patientName: "Иванов Иван Иванович",
		studyDate: "2026-08-01 09:40",
		studyType: "intraoral_radiovisiography",
		modality: "intraoral_rvg",
		modalityLabel: "Прицельная радиовизиография",
		anatomicalArea: "Зуб 16 (Верхний правый моляр)",
		teethFdi: ["16"],
		effectiveDoseMicrosv: 3.0,
		effectiveDoseMsv: 0.003,
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		doctorName: "Др. Смирнов А.В.",
		doctorSpecialty: "Врач-стоматолог эндодонтист",
		clinicName: 'ООО "Денте Клиник"',
		status: "completed",
		diagnosisIcd10: "K04.0",
		diagnosticNotes:
			"Прицельная контрольная радиовизиография зуба 16. Визуализируются 3 обтурированных корневых канала (медиально-щечный MB1, дистально-щечный DB, небный P) гуттаперчей с силером. Пломбирование плотное, гомогенное, на 0.5-0.8 мм до рентгенологического апекса. Периодонтальная щель равномерная, кортикальная пластинка Lamina Dura интактна, периапикальных деструктивных изменений костной ткани не выявлено.",
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.08,
			pixelSpacingMm: 0.05,
			apparatusModel: "Vatech EzSensor Classic (CMOS 14-bit)",
		},
		measurements: [
			{
				id: "m-rvg-1",
				startX: 51.5,
				startY: 53.8,
				endX: 51.5,
				endY: 21.9,
				distanceMm: 20.7,
				label: "Длина небного корня 16: 20.7 мм",
				color: "var(--teal, #06b6d4)",
			},
			{
				id: "m-rvg-2",
				startX: 34.0,
				startY: 71.0,
				endX: 68.0,
				endY: 71.0,
				distanceMm: 17.0,
				label: "Ширина коронки 16: 17.0 мм",
				color: "var(--teal, #06b6d4)",
			},
		],
		landmarks: [
			{
				id: "lm-rvg-1",
				x: 51.5,
				y: 21.9,
				toothFdi: "16",
				label: "Апекс небного корня (P) 16",
				type: "apex",
				color: "var(--ok, #10b981)",
			},
			{
				id: "lm-rvg-2",
				x: 39.5,
				y: 25.0,
				toothFdi: "16",
				label: "Апекс медиально-щечного корня (MB1) 16",
				type: "apex",
				color: "var(--ok, #10b981)",
			},
			{
				id: "lm-rvg-3",
				x: 64.0,
				y: 26.2,
				toothFdi: "16",
				label: "Апекс дистально-щечного корня (DB) 16",
				type: "apex",
				color: "var(--ok, #10b981)",
			},
			{
				id: "lm-rvg-4",
				x: 51.5,
				y: 23.5,
				toothFdi: "16",
				label: "Апикальная проекция 16",
				type: "apex",
				color: "var(--ok, #10b981)",
			},
		],
	},
];

export const RadiologyModule: React.FC<RadiologyModuleProps> = ({
	patient,
	doctorName = "Др. Смирнов А.В.",
	doctorSpecialty = "Врач-стоматолог",
	clinicName = 'ООО "Денте Клиник"',
	initialStudies,
	onSaveStudies,
	className = "",
}) => {
	const [studies, setStudies] = useState<RadiologyStudy[]>(
		initialStudies && initialStudies.length > 0
			? initialStudies
			: DEFAULT_SAMPLE_STUDIES,
	);

	// Modals state
	const [activeViewerStudy, setActiveViewerStudy] =
		useState<RadiologyStudy | null>(null);
	const [isViewerModalOpen, setIsViewerModalOpen] = useState<boolean>(false);
	const [isReferralModalOpen, setIsReferralModalOpen] =
		useState<boolean>(false);
	const [isDoseSheetModalOpen, setIsDoseSheetModalOpen] =
		useState<boolean>(false);
	const [isCbctStudioOpen, setIsCbctStudioOpen] = useState<boolean>(false);
	const [isDropzoneVisible, setIsDropzoneVisible] = useState<boolean>(false);

	// Comparative Split-View state
	const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
	const [compareStudyA, setCompareStudyA] = useState<RadiologyStudy | null>(
		null,
	);
	const [compareStudyB, setCompareStudyB] = useState<RadiologyStudy | null>(
		null,
	);

	// Patient details
	const patientFullName = patient?.fullName || "Иванов Иван Иванович";
	const patientBirth = patient?.birthDate || "1990-05-14";
	const patientCard =
		patient?.medicalCardNumber || patient?.cardNumber || "043/у-0012";

	// Handle adding a new study directly from medical dropzone
	const handleAddStudyFromDropzone = (
		dataUrl: string,
		meta?: { name: string; size: number; type: string },
	) => {
		const newStudy: RadiologyStudy = {
			id: `study-rvg-${Date.now()}`,
			patientName: patientFullName,
			studyDate: new Date().toISOString().replace("T", " ").substring(0, 16),
			studyType: "intraoral_radiovisiography",
			modality: "intraoral_rvg",
			modalityLabel: "Прицельная радиовизиография",
			anatomicalArea: "Зуб 16 (Верхний правый моляр)",
			teethFdi: ["16"],
			effectiveDoseMicrosv: 3.0,
			effectiveDoseMsv: 0.003,
			imageUrl: dataUrl,
			doctorName: doctorName || "Др. Смирнов А.В.",
			doctorSpecialty: doctorSpecialty || "Врач-стоматолог",
			clinicName: clinicName || 'ООО "Денте Клиник"',
			status: "completed",
			diagnosisIcd10: "K04.0",
			diagnosticNotes: meta
				? `Загружен снимок: ${meta.name} (${Math.round(meta.size / 1024)} КБ). Контрольная радиовизиография.`
				: "Загружена контрольная радиовизиография зуба 16.",
			metadata: {
				kv: 65,
				ma: 7.0,
				exposureSec: 0.08,
				pixelSpacingMm: 0.05,
				apparatusModel: "Цифровой радиовизиограф (RVG CMOS)",
			},
		};
		const updated = [newStudy, ...studies];
		setStudies(updated);
		if (onSaveStudies) onSaveStudies(updated);
		setIsDropzoneVisible(false);
		handleOpenViewer(newStudy);
	};

	// Save or update a single study
	const handleSaveStudy = (updatedStudy: RadiologyStudy) => {
		const updatedList = studies.map((s) =>
			s.id === updatedStudy.id ? updatedStudy : s,
		);
		setStudies(updatedList);
		if (onSaveStudies) onSaveStudies(updatedList);
	};

	// Delete a study
	const handleDeleteStudy = (studyId: string) => {
		const updatedList = studies.filter((s) => s.id !== studyId);
		setStudies(updatedList);
		if (onSaveStudies) onSaveStudies(updatedList);
	};

	// Open Single Viewer
	const handleOpenViewer = (study: RadiologyStudy) => {
		setActiveViewerStudy(study);
		setIsViewerModalOpen(true);
	};

	// Cumulative Radiation Dose
	const cumulativeDose = useMemo(() => {
		let totalMicrosv = 0;
		for (const s of studies) {
			totalMicrosv += s.effectiveDoseMicrosv || 0;
		}
		return formatRadiationDose(totalMicrosv);
	}, [studies]);

	return (
		<div
			className={`flex flex-col w-full h-full bg-[var(--paper)] rounded-2xl overflow-hidden ${className}`}
			data-testid="radiology-module-container"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP SAFETY & ERGONOMICS DASHBOARD BANNER
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="p-4 md:p-6 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-col gap-4">
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					{/* Left: Patient & Clinical Module Title */}
					<div className="flex items-center gap-4">
						<div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] shrink-0">
							<Scan className="w-7 h-7" />
						</div>

						<div className="flex flex-col">
							<div className="flex items-center gap-2 flex-wrap">
								<h1 className="text-lg md:text-xl font-bold text-[var(--ink)]">
									Лучевая диагностика и рентгенология
								</h1>
								<span className="px-2.5 py-0.5 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] text-xs font-bold uppercase tracking-wide">
									СанПиН / ALARA
								</span>
							</div>
							<p className="text-xs md:text-sm text-[var(--muted)] mt-0.5">
								Пациент:{" "}
								<strong className="text-[var(--ink)] font-bold">
									{patientFullName}
								</strong>{" "}
								· Мед. карта: {patientCard} · Исследований:{" "}
								<strong className="text-[var(--ink)] font-bold">
									{studies.length}
								</strong>
							</p>
						</div>
					</div>

					{/* Right: Quick Action Buttons (Touch Targets >= 44x44px) */}
					<div className="flex items-center gap-2 flex-wrap">
						{/* Referral Button */}
						<button
							type="button"
							onClick={() => setIsReferralModalOpen(true)}
							className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs md:text-sm font-bold shadow-md hover:opacity-95 active:scale-95 transition-all font-extrabold"
							data-testid="open-referral-modal-btn"
						>
							<FileText className="w-4 h-4" />
							<span>Направление на КЛКТ/ОПТГ</span>
						</button>

						{/* Radiation Dose Sheet Button */}
						<button
							type="button"
							onClick={() => setIsDoseSheetModalOpen(true)}
							className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] hover:text-[var(--teal)] text-xs md:text-sm font-bold shadow-sm transition-all"
							data-testid="open-dose-sheet-modal-btn"
						>
							<Activity className="w-4 h-4 text-[var(--teal)]" />
							<span>Лист дозовых нагрузок</span>
						</button>

						{/* 3D CBCT MPR & Implant Studio Button */}
						<button
							type="button"
							onClick={() => setIsCbctStudioOpen(true)}
							className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] hover:text-[var(--teal)] text-xs md:text-sm font-bold shadow-sm transition-all"
							data-testid="open-cbct-mpr-studio-btn"
						>
							<Box className="w-4 h-4 text-[var(--teal)]" />
							<span>3D КЛКТ MPR & Имплант-планировщик</span>
						</button>

						{/* Split-view Comparison Toggle */}
						<button
							type="button"
							onClick={() => {
								setIsCompareMode((prev) => !prev);
								if (!compareStudyA && studies.length > 0)
									setCompareStudyA(studies[0] ?? null);
								if (!compareStudyB && studies.length > 1)
									setCompareStudyB(studies[1] ?? null);
							}}
							className={`flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border text-xs md:text-sm font-bold shadow-sm transition-all ${
								isCompareMode
									? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)]"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
							}`}
							data-testid="toggle-compare-mode-btn"
						>
							<ArrowLeftRight className="w-4 h-4 text-[var(--teal)]" />
							<span>Сравнение (Split-View)</span>
						</button>

						{/* Medical Radiology Dropzone Toggle Button */}
						<button
							type="button"
							onClick={() => setIsDropzoneVisible((prev) => !prev)}
							className={`flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border text-xs md:text-sm font-bold shadow-sm transition-all ${
								isDropzoneVisible
									? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)]"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
							}`}
							data-testid="toggle-dropzone-btn"
						>
							<UploadCloud className="w-4 h-4 text-[var(--teal)]" />
							<span>Загрузка снимка (Дропзона)</span>
						</button>
					</div>
				</div>

				{/* Radiation Safety Summary Gauge Bar (>= 13-14px bold per mandate) */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
					<div
						className={`p-3.5 rounded-xl border flex items-center justify-between shadow-sm ${cumulativeDose.badgeClass}`}
					>
						<div className="flex items-center gap-2.5">
							<Activity className="w-5 h-5" />
							<div className="flex flex-col">
								<span className="text-xs uppercase font-bold tracking-wider opacity-80">
									Суммарная доза за год
								</span>
								<span className="text-sm md:text-base font-bold tracking-tight">
									{cumulativeDose.fullText}
								</span>
							</div>
						</div>
						<span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-black/10">
							{cumulativeDose.safetyZone === "green"
								? "Безопасно"
								: "Контроль"}
						</span>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3">
						<ShieldCheck className="w-5 h-5 text-[var(--teal)]" />
						<div className="flex flex-col">
							<span className="text-xs text-[var(--muted)] uppercase font-bold tracking-wider">
								Принцип ALARA
							</span>
							<span className="text-xs md:text-sm font-bold text-[var(--ink)]">
								Обосновано и оптимизировано
							</span>
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3">
						<Target className="w-5 h-5 text-[var(--teal)]" />
						<div className="flex flex-col">
							<span className="text-xs text-[var(--muted)] uppercase font-bold tracking-wider">
								Контроль зубов (FDI)
							</span>
							<span className="text-xs md:text-sm font-bold text-[var(--ink)] truncate">
								{Array.from(
									new Set(studies.flatMap((s) => s.teethFdi || [])),
								).join(", ") || "Все сегменты"}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. COMPARATIVE SPLIT-VIEW MODE (Side-by-Side Dual Viewer)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isCompareMode && (
				<div
					className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-col gap-4 text-[var(--ink)] animate-in slide-in-from-top-4 duration-200"
					data-testid="compare-split-view-container"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-[var(--teal)] font-bold text-sm">
							<ArrowLeftRight className="w-5 h-5" />
							<span>Сравнительный анализ двух исследований (Side-by-Side)</span>
						</div>
						<button
							type="button"
							onClick={() => setIsCompareMode(false)}
							className="text-xs text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer"
						>
							Закрыть режим сравнения
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Study A Selector & Preview */}
						<div className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--teal)] uppercase">
									Снимок А (До лечения / База):
								</span>
								<select
									value={compareStudyA?.id || ""}
									onChange={(e) => {
										const found = studies.find(
											(s) => s.id === e.target.value,
										);
										setCompareStudyA(found || null);
									}}
									className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								>
									{studies.map((s) => (
										<option key={s.id} value={s.id}>
											{s.studyDate} · {s.modalityLabel} ({s.anatomicalArea})
										</option>
									))}
								</select>
							</div>

							{compareStudyA && (
								<div className="relative aspect-video bg-black rounded-xl border border-[var(--line)] overflow-hidden flex items-center justify-center">
									<img
										src={compareStudyA.imageUrl}
										alt="Study A"
										className="max-h-full object-contain"
									/>
									<div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 text-[var(--teal)] text-xs font-bold border border-[var(--teal)]/40">
										{compareStudyA.studyDate} · {compareStudyA.modalityLabel}
									</div>
									<button
										type="button"
										onClick={() => handleOpenViewer(compareStudyA)}
										className="absolute bottom-2 right-2 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs font-bold shadow-lg cursor-pointer"
									>
										Развернуть снимок А
									</button>
								</div>
							)}
						</div>

						{/* Study B Selector & Preview */}
						<div className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--teal)] uppercase">
									Снимок B (После лечения / Контроль):
								</span>
								<select
									value={compareStudyB?.id || ""}
									onChange={(e) => {
										const found = studies.find(
											(s) => s.id === e.target.value,
										);
										setCompareStudyB(found || null);
									}}
									className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								>
									{studies.map((s) => (
										<option key={s.id} value={s.id}>
											{s.studyDate} · {s.modalityLabel} ({s.anatomicalArea})
										</option>
									))}
								</select>
							</div>

							{compareStudyB && (
								<div className="relative aspect-video bg-black rounded-xl border border-[var(--line)] overflow-hidden flex items-center justify-center">
									<img
										src={compareStudyB.imageUrl}
										alt="Study B"
										className="max-h-full object-contain"
									/>
									<div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 text-[var(--teal)] text-xs font-bold border border-[var(--teal)]/40">
										{compareStudyB.studyDate} · {compareStudyB.modalityLabel}
									</div>
									<button
										type="button"
										onClick={() => handleOpenViewer(compareStudyB)}
										className="absolute bottom-2 right-2 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs font-bold shadow-lg cursor-pointer"
									>
										Развернуть снимок B
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    2B. MEDICAL RADIOLOGY DROPZONE (Immediate Upload & Ingestion)
			    ═══════════════════════════════════════════════════════════════════ */}
			{(isDropzoneVisible || studies.length === 0) && (
				<div
					className="p-4 md:p-6 bg-[var(--paper-soft)] border-b border-[var(--line)]"
					data-testid="radiology-module-dropzone-section"
				>
					<div className="flex items-center justify-between mb-3">
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
							Медицинская станция приема снимков
						</span>
						{studies.length > 0 && (
							<button
								type="button"
								onClick={() => setIsDropzoneVisible(false)}
								className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								Скрыть дропзону
							</button>
						)}
					</div>
					<MedicalRadiologyDropzone
						onImageLoaded={handleAddStudyFromDropzone}
						onLoadSample={() =>
							handleAddStudyFromDropzone(SAMPLE_PATIENT_RVG_URL, {
								name: "SMIRNOVA_E_V_tooth16_RVG_postop.jpg",
								size: 700609,
								type: "image/jpeg",
							})
						}
					/>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    3. MAIN INTEGRATED STUDY LIST
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex-1 min-h-0 p-4 md:p-6">
				<RadiologyStudyList
					studies={studies}
					onSelectStudy={handleOpenViewer}
					onOpenReferralModal={() => setIsReferralModalOpen(true)}
					onOpenDoseSheetModal={() => setIsDoseSheetModalOpen(true)}
					onDeleteStudy={handleDeleteStudy}
				/>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. MODALS (Viewer, Referral, Dose Sheet)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isViewerModalOpen && activeViewerStudy && (
				<RadiologyViewerModal
					isOpen={isViewerModalOpen}
					onClose={() => {
						setIsViewerModalOpen(false);
						setActiveViewerStudy(null);
					}}
					study={activeViewerStudy}
					onSaveStudy={handleSaveStudy}
					onOpenReferralModal={() => {
						setIsViewerModalOpen(false);
						setIsReferralModalOpen(true);
					}}
					onOpenDoseSheetModal={() => {
						setIsViewerModalOpen(false);
						setIsDoseSheetModalOpen(true);
					}}
				/>
			)}

			{isReferralModalOpen && (
				<RadiologyReferralModal
					isOpen={isReferralModalOpen}
					onClose={() => setIsReferralModalOpen(false)}
					patient={patient ? {
						fullName: patient.fullName ?? undefined,
						birthDate: patient.birthDate ?? undefined,
						phone: patient.phone ?? undefined,
						cardNumber: patient.cardNumber ?? undefined,
						medicalCardNumber: patient.medicalCardNumber ?? undefined,
					} : null}
					doctorName={doctorName ?? undefined}
					doctorSpecialty={doctorSpecialty ?? undefined}
					clinicName={clinicName ?? undefined}
				/>
			)}

			{isDoseSheetModalOpen && (
				<RadiationDoseSheetModal
					isOpen={isDoseSheetModalOpen}
					onClose={() => setIsDoseSheetModalOpen(false)}
					studies={studies}
					patientName={patientFullName}
					patientBirthDate={patientBirth}
					medicalCardNumber={patientCard}
					clinicName={clinicName ?? undefined}
					doctorName={doctorName ?? undefined}
				/>
			)}

			{isCbctStudioOpen && (
				<CbctMprImplantStudioModal
					isOpen={isCbctStudioOpen}
					onClose={() => setIsCbctStudioOpen(false)}
					study={activeViewerStudy}
				/>
			)}
		</div>
	);
};
