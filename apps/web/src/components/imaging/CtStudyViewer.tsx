import React, { useState } from "react";
import {
	Layers,
	Eye,
	Box,
	Maximize2,
	Download,
	FileText,
	Calendar,
	CheckCircle,
	AlertCircle,
	HardDrive,
	ExternalLink,
	Grid3X3,
	Settings,
} from "lucide-react";
import { DicomViewerModal } from "./DicomViewerModal.js";
import { showToast } from "../GlobalToast.js";

export interface CtStudyViewerProps {
	studyId: string;
	title: string;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	modality?: string | null | undefined;
	manufacturer?: string | null | undefined;
	sliceCount?: number | null | undefined;
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	capturedAt?: string | null | undefined;
	storagePath?: string | null | undefined;
	bindingStatus?: string | null | undefined;
	bindingConfidence?: number | null | undefined;
	onAttachToVisit?: ((studyId: string) => void) | undefined;
	onOpenStudio?: ((studyId: string) => void) | undefined;
	onOpenControl?: ((studyId: string) => void) | undefined;
	className?: string | undefined;
	dataTestId?: string | undefined;
}

export const CtStudyViewer: React.FC<CtStudyViewerProps> = ({
	studyId,
	title,
	patientId,
	patientName,
	modality = "CBCT",
	manufacturer,
	sliceCount = 0,
	dimensions = "512x512",
	voxelSpacing = "0.2x0.2x0.2 мм",
	capturedAt,
	storagePath,
	bindingStatus = "auto_bound",
	bindingConfidence = 100,
	onAttachToVisit,
	onOpenStudio,
	onOpenControl,
	className = "",
	dataTestId,
}) => {
	const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
	const [selectedViewMode, setSelectedViewMode] = useState<"2d" | "3d_mpr" | "sectioning">("3d_mpr");

	const isAutoBound = bindingStatus === "auto_bound";
	const formattedDate = capturedAt
		? new Date(capturedAt).toLocaleDateString("ru-RU", {
				day: "2-digit",
				month: "long",
				year: "numeric",
			})
		: "Дата не указана";

	return (
		<div
			data-testid={dataTestId || `patient-study-card-${studyId}`}
			className={`rounded-2xl border p-4 space-y-3.5 transition-all shadow-sm ${className}`}
			style={{
				background: "var(--paper, #ffffff)",
				borderColor: "var(--line, #e2e8f0)",
				color: "var(--ink, #0f172a)",
			}}
		>
			{/* Верхняя строка: Заголовок и бейджи */}
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span
							className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
						>
							{modality || "КЛКТ 3D"}
						</span>

						{isAutoBound ? (
							<span
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
							>
								<CheckCircle className="w-3.5 h-3.5" />
								Автопривязано ({bindingConfidence}%)
							</span>
						) : (
							<span
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40"
							>
								<AlertCircle className="w-3.5 h-3.5" />
								{bindingConfidence}% соответствие
							</span>
						)}

						<span className="text-xs text-[var(--muted)] flex items-center gap-1">
							<Calendar className="w-3.5 h-3.5" />
							{formattedDate}
						</span>
					</div>

					<h3 className="font-bold text-sm leading-tight tracking-tight text-[var(--ink)]">
						{title}
					</h3>

					{patientName && (
						<p className="text-xs text-[var(--muted)]">
							Пациент: <strong className="font-semibold text-[var(--ink)]">{patientName}</strong>
						</p>
					)}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{onOpenControl && (
						<button
							type="button"
							data-testid={`btn-patient-study-control-${studyId}`}
							onClick={() => onOpenControl(studyId)}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shadow-2xs"
							title="Проверить сопоставление с DICOM"
						>
							<Settings className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Контроль</span>
						</button>
					)}

					<button
						type="button"
						data-testid={`btn-launch-3d-studio-${studyId}`}
						onClick={() => {
							if (onOpenStudio) {
								onOpenStudio(studyId);
							} else {
								setSelectedViewMode("3d_mpr");
								setIsViewerOpen(true);
							}
						}}
						className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
					>
						<Box className="w-3.5 h-3.5" />
						<span>3D КЛКТ Студия</span>
					</button>

					<button
						type="button"
						data-testid="btn-ct-sectioning-open"
						onClick={() => {
							setSelectedViewMode("sectioning");
							setIsViewerOpen(true);
						}}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shadow-2xs"
					>
						<Grid3X3 className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Раздел (Кросс-секции)</span>
					</button>

					<button
						type="button"
						data-testid="btn-ct-2d-open"
						onClick={() => {
							setSelectedViewMode("2d");
							setIsViewerOpen(true);
						}}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shadow-2xs"
					>
						<Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>2D Срез</span>
					</button>
				</div>
			</div>

			{/* Параметры томографии (вокслы, срезы, матрица) */}
			<div
				className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs"
			>
				<div>
					<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Томограф</span>
					<strong className="truncate block font-semibold text-[var(--ink)]">{manufacturer || "Стандартный DICOM"}</strong>
				</div>
				<div>
					<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Кол-во срезов</span>
					<strong className="block font-semibold text-[var(--ink)] flex items-center gap-1">
						<Layers className="w-3 h-3 text-[var(--muted)]" />
						{sliceCount || "—"}
					</strong>
				</div>
				<div>
					<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Размер кадра</span>
					<strong className="block font-semibold text-[var(--ink)]">{dimensions || "—"}</strong>
				</div>
				<div>
					<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Размер вокселя</span>
					<strong className="block font-semibold text-[var(--ink)]">{voxelSpacing || "—"}</strong>
				</div>
			</div>

			{/* Нижняя панель действий */}
			<div className="flex items-center justify-between pt-1 text-xs">
				<span className="text-xs text-[var(--muted)] truncate max-w-xs" title={storagePath ?? ""}>
					{storagePath ? `Путь: ${storagePath}` : ""}
				</span>

				<div className="flex items-center gap-2">
					{onAttachToVisit && (
						<button
							type="button"
							onClick={() => onAttachToVisit(studyId)}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer shadow-2xs"
						>
							<FileText className="w-3.5 h-3.5 text-teal-600" />
							<span>В медицинскую карту</span>
						</button>
					)}
				</div>
			</div>

			{/* Модальный просмотрщик DICOM */}
			{isViewerOpen && (
				<DicomViewerModal
					isOpen={isViewerOpen}
					onClose={() => setIsViewerOpen(false)}
					title={title}
					patientName={patientName ?? undefined}
					patientId={patientId ?? undefined}
					studyDate={capturedAt ?? undefined}
					initialViewMode={selectedViewMode}
				/>
			)}
		</div>
	);
};

export default CtStudyViewer;
