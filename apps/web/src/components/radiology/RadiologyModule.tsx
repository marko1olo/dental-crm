import {
	Activity,
	Box,
	Camera,
	Compass,
	FileText,
	Filter,
	FolderInput,
	Layers,
	Plus,
	Printer,
	Scan,
	ShieldCheck,
	Sparkles,
	SplitSquareHorizontal,
} from "lucide-react";
import React, { useState } from "react";
import { DicomViewerModal } from "../imaging/DicomViewerModal.js";
import { SensorStudyViewer } from "./SensorStudyViewer.js";
import { RadiologyConsultationSplit } from "./RadiologyConsultationSplit.js";
import { CbctMprImplantStudioModal } from "./CbctMprImplantStudioModal.js";
import { CbctImplantModal } from "./CbctImplantModal.js";
import { DirectRvgCaptureModal } from "./DirectRvgCaptureModal.js";
import { RadiationSafetyRegistryModal } from "./RadiationSafetyRegistryModal.js";
import { RadiologyReportStudioModal } from "./RadiologyReportStudioModal.js";
import { HotFolderIntakeModal } from "./HotFolderIntakeModal.js";
import {
	applyRadiologyProtocolToForm043,
	RADIOLOGY_STANDARD_PROTOCOLS,
	type RadiologyProtocolPreset,
} from "./radiologyProtocols.js";
import { RadiologyReferralModal } from "./RadiologyReferralModal.js";
import { RadiologyStudiesArchive } from "./archive/RadiologyStudiesArchive.js";
import { convertImagingStudyToRadiologyStudy } from "./archive/radiologyStudyAdapter.js";
import type { ImagingStudy } from "@dental/shared";
import {
	RadiologyPatientSearchModal,
	DEFAULT_TACTILE_FILTERS,
	type RadiologyTactileFilterState,
} from "./RadiologyPatientSearchModal.js";

export interface RadiologyModuleProps {
	patient?: {
		id?: string | null | undefined;
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		cardNumber?: string | null | undefined;
		medicalCardNumber?: string | null | undefined;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	activeToothFdi?: string | number | null | undefined;
	onClose?: (() => void) | undefined;
}

export const RadiologyModule: React.FC<RadiologyModuleProps> = ({
	patient,
	doctorName,
	doctorSpecialty,
	clinicName,
	activeToothFdi,
	onClose,
}) => {
	// Modals State (Strict Anti-Matryoshka Law: Modal Depth Strictly 1)
	const [showReferralModal, setShowReferralModal] = useState<boolean>(false);
	const [show3dStudioModal, setShow3dStudioModal] = useState<boolean>(false);
	const [showDicomViewerModal, setShowDicomViewerModal] = useState<boolean>(false);
	const [showSensorViewerModal, setShowSensorViewerModal] = useState<boolean>(false);
	const [showRvgCaptureModal, setShowRvgCaptureModal] = useState<boolean>(false);
	const [showDoseSheetModal, setShowDoseSheetModal] = useState<boolean>(false);
	const [showHotFolderModal, setShowHotFolderModal] = useState<boolean>(false);
	const [showImplantModal, setShowImplantModal] = useState<boolean>(false);
	const [showConsultationModal, setShowConsultationModal] = useState<boolean>(false);
	const [showReportStudioModal, setShowReportStudioModal] = useState<boolean>(false);
	const [showTactileSearchModal, setShowTactileSearchModal] = useState<boolean>(false);
	const [tactileFilters, setTactileFilters] = useState<RadiologyTactileFilterState>(DEFAULT_TACTILE_FILTERS);

	// Active View (Archive vs Hub)
	const [activeView, setActiveView] = useState<"archive" | "hub">("archive");
	const [selectedStudyForStudio, setSelectedStudyForStudio] = useState<ImagingStudy | null>(null);
	const [selectedStudyForViewer, setSelectedStudyForViewer] = useState<ImagingStudy | null>(null);
	const [selectedStudyForSensorViewer, setSelectedStudyForSensorViewer] = useState<ImagingStudy | null>(null);

	const patientName = patient?.fullName || "Пациент";
	const cardNum = patient?.medicalCardNumber || patient?.cardNumber || `МК-${patient?.id ? patient.id.slice(0, 8).toUpperCase() : "2026"}`;
	const docName = doctorName || "Лечащий врач";

	// 1-Click Study Launchers
	const handleOpenStudio = (study: ImagingStudy) => {
		setSelectedStudyForStudio(study);
		setShow3dStudioModal(true);
	};

	const handleOpenViewer = (study: ImagingStudy) => {
		setSelectedStudyForViewer(study);
		setShowDicomViewerModal(true);
	};

	const handleOpenSensorViewer = (study: ImagingStudy) => {
		setSelectedStudyForSensorViewer(study);
		setShowSensorViewerModal(true);
	};

	// Handle 1-click radiology protocol insertion
	const handleInsertStandardProtocol = (preset: RadiologyProtocolPreset) => {
		applyRadiologyProtocolToForm043({
			protocol: preset,
			options: {
				toothFdi: activeToothFdi ? String(activeToothFdi) : undefined,
				modalityLabel: "Рентгенодиагностика",
			},
			showNotification: true,
			copyToClipboard: true,
		});
	};

	return (
		<div
			className="flex flex-col w-full h-full bg-[var(--paper)] text-[var(--ink)] overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm"
			data-testid="radiology-module-container"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. WORKSPACE TOOLBAR (Desktop Density 32–36px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
						<Scan className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-bold text-[var(--ink)]">
								Цифровая рентгенология и КЛКТ
							</h3>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Медкарта: {cardNum}
						</p>
					</div>
				</div>

				{/* Переключатель: Архив КТ и снимков vs Хаб инструментов */}
				<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-0.5 shadow-2xs">
					<button
						type="button"
						onClick={() => setActiveView("archive")}
						className={`h-7 px-3 rounded-md font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
							activeView === "archive"
								? "bg-teal-600 text-white shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-radiology-archive"
					>
						<Layers className="w-3.5 h-3.5" />
						<span>Архив всех КТ и снимков</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveView("hub")}
						className={`h-7 px-3 rounded-md font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
							activeView === "hub"
								? "bg-teal-600 text-white shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-radiology-hub"
					>
						<Scan className="w-3.5 h-3.5" />
						<span>Инструменты и протоколы</span>
					</button>
				</div>

				{/* 1-Click Launchers Bar (32–36px height) */}
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setShowTactileSearchModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
						data-testid="btn-open-tactile-matrix-modal"
						title="Тактильная матрица поиска EzDent-i в 2 клика (Снимок 19)"
					>
						<Filter className="w-3.5 h-3.5" />
						<span>Матрица поиска (Снимок 19)</span>
					</button>

					<button
						type="button"
						onClick={() => setShowReferralModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-xs hover:opacity-95 active:scale-95 transition-all"
						data-testid="btn-open-referral-modal"
						title="Сформировать направление на КЛКТ с выбором FOV и QR-кодом"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Направление на КЛКТ</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setSelectedStudyForStudio(null);
							setShow3dStudioModal(true);
						}}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
						data-testid="btn-open-3d-cbct-studio"
						title="Открыть 3D мультипланарную реконструкцию (MPR) КЛКТ"
					>
						<Box className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span>3D КЛКТ Студия</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setSelectedStudyForViewer(null);
							setShowDicomViewerModal(true);
						}}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
						data-testid="btn-open-dicom-viewer"
						title="Просмотр 2D визиограмм и серии DICOM"
					>
						<Layers className="w-3.5 h-3.5 text-blue-500" />
						<span>Визиограф & DICOM</span>
					</button>

					<button
						type="button"
						onClick={() => setShowConsultationModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[#00C853] hover:text-[#00C853] transition-colors"
						data-testid="btn-open-consultation-split"
						title="Открыть сплит-экран консультации и библиотеку 8 дисциплин (EzDent-i)"
					>
						<SplitSquareHorizontal className="w-3.5 h-3.5 text-[#00C853]" />
						<span>Консультация (Сплит)</span>
					</button>

					<button
						type="button"
						onClick={() => setShowReportStudioModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-emerald-600 hover:text-emerald-600 transition-colors"
						data-testid="btn-open-report-studio"
						title="Конструктор отчетов и печать листа А4 / пленки (EzDent-i Отчет)"
					>
						<Printer className="w-3.5 h-3.5 text-emerald-600" />
						<span>Отчет и печать</span>
					</button>

					<button
						type="button"
						onClick={() => setShowRvgCaptureModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,var(--line))] transition-colors"
						data-testid="btn-open-rvg-capture"
						title="Прямой захват снимка с датчика визиографа"
					>
						<Camera className="w-3.5 h-3.5" />
						<span>Захват RVG</span>
					</button>

					<button
						type="button"
						onClick={() => setShowDoseSheetModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,var(--line))] transition-colors"
						data-testid="btn-open-dose-sheet"
						title="Архив лучевой нагрузки (для проверок)"
					>
						<ShieldCheck className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Архив доз</span>
					</button>

					<button
						type="button"
						onClick={() => setShowHotFolderModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,var(--line))] transition-colors"
						data-testid="btn-open-hot-folder"
						title="Автоприём снимков из горячей папки томографа"
					>
						<FolderInput className="w-3.5 h-3.5" />
						<span>Hot Folder</span>
					</button>

					<button
						type="button"
						onClick={() => setShowImplantModal(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,var(--line))] transition-colors"
						data-testid="btn-open-implant-modal"
						title="3D Библиотека имплантатов (Straumann, Nobel, Osstem, Dentium, MIS)"
					>
						<Compass className="w-3.5 h-3.5 text-teal-600" />
						<span>Имплантаты</span>
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="h-8 px-3 text-xs font-semibold rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors ml-auto"
						>
							Закрыть
						</button>
					)}
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. 1-CLICK PROTOCOLS QUICK-BAR (0-Click Clinical Standard)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between gap-3 px-5 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)]/60 text-xs">
				<div className="flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span className="font-bold text-[var(--muted)]">1-клик протокол в карту:</span>
					<div className="flex items-center gap-1.5 overflow-x-auto">
						{RADIOLOGY_STANDARD_PROTOCOLS.map((proto) => (
							<button
								key={proto.id}
								type="button"
								onClick={() => handleInsertStandardProtocol(proto)}
								className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-all shadow-2xs"
								data-testid={`btn-protocol-${proto.id}`}
								title={proto.text}
							>
								{proto.shortLabel}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. WORKSPACE BODY: ARCHIVE VIEW vs HUB VIEW
			    ═══════════════════════════════════════════════════════════════════ */}
			{activeView === "archive" ? (
				<div className="flex-1 overflow-hidden flex flex-col">
					<RadiologyStudiesArchive
						onOpenStudio={handleOpenStudio}
						onOpenViewer={handleOpenViewer}
						onOpenSensorViewer={handleOpenSensorViewer}
						onUploadNew={() => setShowHotFolderModal(true)}
					/>
				</div>
			) : (
				<div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Card 1: Referral & Protocols */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										Направление на исследование
									</span>
									<FileText className="w-4 h-4 text-[var(--teal)]" />
								</div>
								<h4 className="text-sm font-bold text-[var(--ink)] mb-1">
									Официальное направление на КЛКТ
								</h4>
								<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
									Оформление за 5 секунд у кресла: выбор FOV (16x10, 10x10, 5x5, ВНЧС), целей сканирования, печать со штрихкодом и QR для центров «Пикассо» и «3D Lab».
								</p>
							</div>
							<div className="flex flex-col gap-2 mt-2">
								<button
									type="button"
									onClick={() => setShowReferralModal(true)}
									className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white transition-colors"
								>
									<Printer className="w-3.5 h-3.5" />
									<span>Выписать направление</span>
								</button>
								<button
									type="button"
									onClick={() => setShowReportStudioModal(true)}
									className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-emerald-600 hover:text-emerald-600 transition-colors"
									data-testid="btn-hub-report-studio"
								>
									<FileText className="w-3.5 h-3.5 text-emerald-600" />
									<span>Конструктор отчетов (Печать)</span>
								</button>
							</div>
						</div>

						{/* Card 2: 3D MPR Studio */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										3D Планирование (MPR)
									</span>
									<Box className="w-4 h-4 text-blue-500" />
								</div>
								<h4 className="text-sm font-bold text-[var(--ink)] mb-1">
									Томография и имплантация
								</h4>
								<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
									Аксиальные, сагиттальные, корональные срезы, панорамная кривая зубной дуги, трассировка мандибулярного нерва и измерение плотности по Мишу (D1–D4).
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setSelectedStudyForStudio(null);
									setShow3dStudioModal(true);
								}}
								className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
							>
								<Box className="w-3.5 h-3.5 text-[var(--teal)]" />
								<span>Запустить 3D Студию</span>
							</button>
						</div>

						{/* Card 3: 2D Visio & DICOM */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										Визиография & 2D DICOM
									</span>
									<Layers className="w-4 h-4 text-emerald-500" />
								</div>
								<h4 className="text-sm font-bold text-[var(--ink)] mb-1">
									Прицельные снимки RVG
								</h4>
								<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
									Просмотр снимков за &lt;50мс, аппаратные фильтры контрастности, калиброванная линейка и 1-кликовая фиксация рентген-нормы в медицинскую карту.
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setSelectedStudyForViewer(null);
									setShowDicomViewerModal(true);
								}}
								className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
							>
								<Layers className="w-3.5 h-3.5 text-emerald-600" />
								<span>Открыть визиограммы</span>
							</button>

							<button
								type="button"
								onClick={() => setShowSensorViewerModal(true)}
								className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
								data-testid="btn-open-sensor-study-viewer"
							>
								<Sparkles className="w-3.5 h-3.5 text-teal-600" />
								<span>2D Сенсор EzDent-i</span>
							</button>
						</div>

						{/* Card 4: EzDent-i Consultation & Pathology Split */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										Консультация у кресла
									</span>
									<SplitSquareHorizontal className="w-4 h-4 text-[#00C853]" />
								</div>
								<h4 className="text-sm font-bold text-[var(--ink)] mb-1">
									Сплит-сравнение и 8 дисциплин
								</h4>
								<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
									Синхронное сопоставление снимков До/После, векторные стрелки и каталог патологий по 8 стоматологическим дисциплинам EzDent-i для презентации плана лечения.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowConsultationModal(true)}
								className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[#00C853] hover:text-[#00C853] transition-colors"
								data-testid="btn-launch-consultation-card"
							>
								<SplitSquareHorizontal className="w-3.5 h-3.5 text-[#00C853]" />
								<span>Запустить консультацию</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    4. MODAL DIALOGS (Strictly Depth 1)
			    ═══════════════════════════════════════════════════════════════════ */}
			{showReferralModal && (
				<RadiologyReferralModal
					isOpen={showReferralModal}
					onClose={() => setShowReferralModal(false)}
					patient={patient}
					doctorName={docName}
					doctorSpecialty={doctorSpecialty}
					clinicName={clinicName}
					initialTeeth={activeToothFdi ? [String(activeToothFdi)] : undefined}
				/>
			)}

			{show3dStudioModal && (
				<CbctMprImplantStudioModal
					isOpen={show3dStudioModal}
					onClose={() => {
						setShow3dStudioModal(false);
						setSelectedStudyForStudio(null);
					}}
					study={
						selectedStudyForStudio
							? convertImagingStudyToRadiologyStudy(selectedStudyForStudio)
							: undefined
					}
					patientName={selectedStudyForStudio?.patientFullName || patientName}
					patientId={selectedStudyForStudio?.patientId || patient?.id || undefined}
				/>
			)}

			{showDicomViewerModal && (
				<DicomViewerModal
					isOpen={showDicomViewerModal}
					onClose={() => {
						setShowDicomViewerModal(false);
						setSelectedStudyForViewer(null);
					}}
					imageSrc={selectedStudyForViewer?.previewUrl || undefined}
					title={selectedStudyForViewer?.title || "Дентальный снимок (RVG / DICOM)"}
					patientName={selectedStudyForViewer?.patientFullName || patientName}
					patientId={selectedStudyForViewer?.patientId || patient?.id || undefined}
					toothFdiCode={selectedStudyForViewer?.toothCode || undefined}
				/>
			)}

			{showSensorViewerModal && (
				<div className="fixed inset-0 z-50 bg-black flex flex-col">
					<SensorStudyViewer
						onClose={() => {
							setShowSensorViewerModal(false);
							setSelectedStudyForSensorViewer(null);
						}}
						study={
							selectedStudyForSensorViewer
								? convertImagingStudyToRadiologyStudy(selectedStudyForSensorViewer)
								: undefined
						}
						patientName={selectedStudyForSensorViewer?.patientFullName || patientName}
						medicalCardNumber={cardNum}
						patientBirthDate={patient?.birthDate || undefined}
						toothFdiCode={selectedStudyForSensorViewer?.toothCode || (activeToothFdi ? String(activeToothFdi) : undefined)}
					/>
				</div>
			)}

			{showRvgCaptureModal && (
				<DirectRvgCaptureModal
					isOpen={showRvgCaptureModal}
					onClose={() => setShowRvgCaptureModal(false)}
					patientId={patient?.id || undefined}
					patientName={patientName}
					patientCardNumber={cardNum}
					doctorName={docName}
					initialToothFdi={activeToothFdi ? String(activeToothFdi) : "16"}
				/>
			)}


			{showDoseSheetModal && (
				<RadiationSafetyRegistryModal
					isOpen={showDoseSheetModal}
					onClose={() => setShowDoseSheetModal(false)}
					patientName={patientName}
					patientCardNumber={cardNum}
					patientBirthDate={patient?.birthDate || undefined}
				/>
			)}

			{showReportStudioModal && (
				<RadiologyReportStudioModal
					isOpen={showReportStudioModal}
					onClose={() => setShowReportStudioModal(false)}
					patientName={patientName}
					patientCardNumber={cardNum}
					patientAge={patient?.birthDate ? undefined : "58Y"}
					patientGender="Жен."
					clinicName={clinicName || "Стоматологическая клиника DENTE"}
				/>
			)}

			{showHotFolderModal && (
				<HotFolderIntakeModal
					isOpen={showHotFolderModal}
					onClose={() => setShowHotFolderModal(false)}
					patientId={patient?.id || undefined}
					patientName={patient?.fullName || undefined}
					patientCardNumber={patient?.medicalCardNumber || patient?.cardNumber || undefined}
					patientBirthDate={patient?.birthDate || undefined}
				/>
			)}

			{showImplantModal && (
				<CbctImplantModal
					isOpen={showImplantModal}
					onClose={() => setShowImplantModal(false)}
					patientId={patient?.id || undefined}
					patientName={patientName}
					toothFdi={activeToothFdi ? Number(activeToothFdi) : 46}
				/>
			)}

			{showConsultationModal && (
				<div className="fixed inset-0 z-50 bg-[#020617] flex flex-col">
					<RadiologyConsultationSplit
						patientName={patientName}
						patientCardNumber={cardNum}
						patientAge={patient?.birthDate ? undefined : "58Y"}
						patientGender="Жен."
						activeToothFdi={activeToothFdi || undefined}
						initialLeftStudy={
							selectedStudyForViewer
								? convertImagingStudyToRadiologyStudy(selectedStudyForViewer)
								: undefined
						}
						onClose={() => setShowConsultationModal(false)}
					/>
				</div>
			)}

			{/* Тактильная матрица поиска EzDent-i в 2 клика (Снимок 19) */}
			<RadiologyPatientSearchModal
				isOpen={showTactileSearchModal}
				onClose={() => setShowTactileSearchModal(false)}
				initialFilters={tactileFilters}
				onApply={(filters) => {
					setTactileFilters(filters);
					setActiveView("archive");
				}}
				onReset={() => setTactileFilters(DEFAULT_TACTILE_FILTERS)}
			/>
		</div>
	);
};
