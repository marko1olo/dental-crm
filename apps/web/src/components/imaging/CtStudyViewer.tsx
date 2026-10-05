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
							className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
							style={{
								background: "var(--accent-soft, rgba(13, 148, 136, 0.15))",
								color: "var(--accent, #0d9488)",
							}}
						>
							{modality || "КЛКТ 3D"}
						</span>

						{isAutoBound ? (
							<span
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
								style={{
									background: "var(--ok-soft, rgba(16, 185, 129, 0.12))",
									color: "var(--ok-fg, #059669)",
								}}
							>
								<CheckCircle className="w-3 h-3" />
								Автопривязано ({bindingConfidence}%)
							</span>
						) : (
							<span
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
								style={{
									background: "var(--warn-soft, rgba(234, 179, 8, 0.12))",
									color: "var(--warn-fg, #ca8a04)",
								}}
							>
								<AlertCircle className="w-3 h-3" />
								{bindingConfidence}% соответствие
							</span>
						)}

						<span className="text-xs opacity-60 flex items-center gap-1">
							<Calendar className="w-3 h-3" />
							{formattedDate}
						</span>
					</div>

					<h3 className="font-bold text-sm leading-tight tracking-tight">
						{title}
					</h3>

					{patientName && (
						<p className="text-xs opacity-75">
							Пациент: <strong className="font-semibold">{patientName}</strong>
						</p>
					)}
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{onOpenControl && (
						<button
							type="button"
							data-testid={`btn-patient-study-control-${studyId}`}
							onClick={() => onOpenControl(studyId)}
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
							style={{
								borderColor: "var(--line, #e2e8f0)",
								color: "var(--ink, #0f172a)",
							}}
							title="Проверить сопоставление с DICOM"
						>
							<Settings className="w-3.5 h-3.5 opacity-70" />
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
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all duration-150 cursor-pointer hover:opacity-95 active:scale-95"
						style={{
							background: "var(--accent, #0d9488)",
						}}
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
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
						style={{
							borderColor: "var(--line, #e2e8f0)",
							color: "var(--ink, #0f172a)",
						}}
					>
						<Grid3X3 className="w-3.5 h-3.5 opacity-70" />
						<span>Раздел (Кросс-секции)</span>
					</button>

					<button
						type="button"
						data-testid="btn-ct-2d-open"
						onClick={() => {
							setSelectedViewMode("2d");
							setIsViewerOpen(true);
						}}
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
						style={{
							borderColor: "var(--line, #e2e8f0)",
							color: "var(--ink, #0f172a)",
						}}
					>
						<Eye className="w-3.5 h-3.5 opacity-70" />
						<span>2D Срез</span>
					</button>
				</div>
			</div>

			{/* Параметры томографии (вокслы, срезы, матрица) */}
			<div
				className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl border text-xs"
				style={{
					background: "var(--paper-subtle, rgba(0, 0, 0, 0.02))",
					borderColor: "var(--line, #e2e8f0)",
				}}
			>
				<div>
					<span className="block opacity-60 text-[10px] uppercase tracking-wide">Томограф</span>
					<strong className="truncate block font-semibold">{manufacturer || "Стандартный DICOM"}</strong>
				</div>
				<div>
					<span className="block opacity-60 text-[10px] uppercase tracking-wide">Кол-во срезов</span>
					<strong className="block font-semibold flex items-center gap-1">
						<Layers className="w-3 h-3 opacity-70" />
						{sliceCount || "—"}
					</strong>
				</div>
				<div>
					<span className="block opacity-60 text-[10px] uppercase tracking-wide">Размер кадра</span>
					<strong className="block font-semibold">{dimensions || "—"}</strong>
				</div>
				<div>
					<span className="block opacity-60 text-[10px] uppercase tracking-wide">Размер вокселя</span>
					<strong className="block font-semibold">{voxelSpacing || "—"}</strong>
				</div>
			</div>

			{/* Нижняя панель действий */}
			<div className="flex items-center justify-between pt-1 text-xs">
				<span className="text-[11px] opacity-60 truncate max-w-xs" title={storagePath ?? ""}>
					{storagePath ? `Путь: ${storagePath}` : ""}
				</span>

				<div className="flex items-center gap-2">
					{onAttachToVisit && (
						<button
							type="button"
							onClick={() => onAttachToVisit(studyId)}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
						>
							<FileText className="w-3 h-3 text-teal-600" />
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
