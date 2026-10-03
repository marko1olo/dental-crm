import {
	Activity,
	Box,
	Camera,
	Compass,
	FileText,
	FolderInput,
	Layers,
	Plus,
	Printer,
	Scan,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { DicomViewerModal } from "../imaging/DicomViewerModal.js";
import { SensorStudyViewer } from "./SensorStudyViewer.js";
import { CbctMprImplantStudioModal } from "./CbctMprImplantStudioModal.js";
import { CbctImplantModal } from "./CbctImplantModal.js";
import { DirectRvgCaptureModal } from "./DirectRvgCaptureModal.js";
import { RadiationDoseSheetForm } from "../documents/forms/RadiationDoseSheetForm.js";
import { HotFolderIntakeModal } from "./HotFolderIntakeModal.js";
import { formatRadiationDose } from "./radiologyMath.js";
import {
	applyRadiologyProtocolToForm043,
	RADIOLOGY_STANDARD_PROTOCOLS,
	type RadiologyProtocolPreset,
} from "./radiologyProtocols.js";
import { RadiologyReferralModal } from "./RadiologyReferralModal.js";
import { RadiologyStudiesArchive } from "./archive/RadiologyStudiesArchive.js";
import { convertImagingStudyToRadiologyStudy } from "./archive/radiologyStudyAdapter.js";
import type { ImagingStudy } from "@dental/shared";

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

	// Active View (Archive vs Hub)
	const [activeView, setActiveView] = useState<"archive" | "hub">("archive");
	const [selectedStudyForStudio, setSelectedStudyForStudio] = useState<ImagingStudy | null>(null);
	const [selectedStudyForViewer, setSelectedStudyForViewer] = useState<ImagingStudy | null>(null);

	const patientName = patient?.fullName || "Пациент";
	const cardNum = patient?.medicalCardNumber || patient?.cardNumber || "МК-043/у";
	const docName = doctorName || "Лечащий врач";

	// Annual dose estimate
	const annualDoseMicrosv = 145.0; // typical annual load
	const doseFormatted = formatRadiationDose(annualDoseMicrosv);

	// 1-Click Study Launchers
	const handleOpenStudio = (study: ImagingStudy) => {
		setSelectedStudyForStudio(study);
		setShow3dStudioModal(true);
	};

	const handleOpenViewer = (study: ImagingStudy) => {
		setSelectedStudyForViewer(study);
		setShowDicomViewerModal(true);
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
								Цифровая рентгенология и КЛКТ (Tier 3 Studio Hub)
							</h3>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
								DICOM Part 10 / ALARA
							</span>
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
						title="Лист учета дозовых нагрузок пациента (СанПиН)"
					>
						<ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
						<span>Лист доз</span>
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
			    2. 1-CLICK PROTOCOLS QUICK-BAR (0-Click Form 043/y Standard)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between gap-3 px-5 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)]/60 text-xs">
				<div className="flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span className="font-bold text-[var(--muted)]">1-клик протокол в карту 043/у:</span>
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

				{/* Radiation Telemetry Badge */}
				<div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-bold bg-[var(--teal-surface)]/50 border-[var(--teal-soft)] text-[var(--teal)]">
					<Activity className="w-3.5 h-3.5" />
					<span>Нагрузка за год: ~{doseFormatted.microsvText} (Норма СанПиН &lt; 1000 мкЗв)</span>
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
							<button
								type="button"
								onClick={() => setShowReferralModal(true)}
								className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white transition-colors"
							>
								<Printer className="w-3.5 h-3.5" />
								<span>Выписать направление</span>
							</button>
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
									Просмотр снимков за &lt;50мс, аппаратные фильтры контрастности, калиброванная линейка и 1-кликовая фиксация рентген-нормы в Форму 043/у.
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
						onClose={() => setShowSensorViewerModal(false)}
						patientName={patientName}
						medicalCardNumber={cardNum}
						toothFdiCode={activeToothFdi ? String(activeToothFdi) : undefined}
					/>
				</div>
			)}

			{showRvgCaptureModal && (
				<DirectRvgCaptureModal
					isOpen={showRvgCaptureModal}
					onClose={() => setShowRvgCaptureModal(false)}
				/>
			)}

			{showDoseSheetModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
					<div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 w-full max-w-2xl relative shadow-2xl">
						<button
							type="button"
							onClick={() => setShowDoseSheetModal(false)}
							className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-200 p-1 text-sm font-bold"
						>
							✕
						</button>
						<RadiationDoseSheetForm />
					</div>
				</div>
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
		</div>
	);
};
