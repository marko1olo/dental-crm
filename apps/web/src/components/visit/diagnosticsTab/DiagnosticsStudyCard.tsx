import { ExternalLink, Eye, Image as ImageIcon, Trash2 } from "lucide-react";
import React from "react";
import { is3DScanUrl } from "../../lab/LabAttachScanModal";
import { openCbctPopoutWindow } from "../../native/desktopBridge";
import type { ClinicalPhotoAttachment } from "../../lib/clinicalProtocols043";
import type { DiagnosticStudy } from "./types";

export interface DiagnosticsStudyCardProps {
	study: DiagnosticStudy;
	effectiveTargetPatientId?: string | null;
	visitPatientName?: string | null;
	onOpen3DScan: (viewerUrl: string, title: string) => void;
	onOpenCbct: () => void;
	onOpenDicom: (imageSrc: string) => void;
}

export function DiagnosticsStudyCard({
	study,
	effectiveTargetPatientId,
	visitPatientName,
	onOpen3DScan,
	onOpenCbct,
	onOpenDicom,
}: DiagnosticsStudyCardProps) {
	const is3DScan =
		study.kind === "scan_3d" ||
		study.modality === "STL" ||
		study.modality === "PLY" ||
		study.modality === "OBJ" ||
		is3DScanUrl(study.previewUrl || study.viewerUrl || "");
	const isCbct = !is3DScan && (study.kind === "cbct" || study.modality === "cbct_3d");
	const thumbSrc = study.previewUrl || study.viewerUrl || "/radiology/sample_rvg_tooth16.jpg";

	return (
		<div
			className="group relative rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[#030712] cursor-pointer shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all aspect-square select-none"
			style={{ aspectRatio: "1 / 1" }}
			data-testid={`visit-scan-thumbnail-${study.id}`}
			onClick={() => {
				if (is3DScan) {
					onOpen3DScan(study.viewerUrl || study.previewUrl || "", study.title || "Интраоральный 3D-скан");
				} else if (isCbct) {
					onOpenCbct();
				} else {
					onOpenDicom(thumbSrc);
				}
			}}
			title={
				is3DScan
					? "Открыть в 3D Просмотрщике сканов"
					: isCbct
						? "Открыть в 3D КЛКТ Студии"
						: "Открыть в DICOM / RVG просмотрщике"
			}
		>
			<img
				src={thumbSrc}
				alt={study.title || "Рентген-снимок"}
				loading="lazy"
				decoding="async"
				className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
				style={{ width: "100%", height: "100%", objectFit: "cover" }}
			/>
			{/* Modality, Tooth & Dose Badges */}
			<div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none gap-1">
				<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs leading-none">
					{is3DScan
						? "3D-СКАН"
						: study.kind === "cbct"
							? "3D КТ"
							: study.kind === "opg"
								? "ОПТГ"
								: study.kind === "cephalometric" || study.kind === "trg"
									? "ТРГ"
									: "RVG"}
					{study.toothCode ? ` #${study.toothCode}` : ""}
				</span>
				{study.effectiveDoseMicrosv ? (
					<span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-black/80 text-zinc-300 border border-white/15 shadow-xs leading-none">
						{study.effectiveDoseMicrosv} мкЗв
					</span>
				) : null}
			</div>
			{/* Bottom Overlay with Date and Action */}
			<div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex items-center justify-between text-white text-[10px]">
				<span className="truncate max-w-[55px] opacity-90 text-[10px]">
					{study.capturedAt
						? new Date(study.capturedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
						: "Приём"}
				</span>
				<div className="flex items-center gap-1.5">
					{isCbct && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								openCbctPopoutWindow({
									studyId: study.id,
									patientId: effectiveTargetPatientId || undefined,
									patientName: visitPatientName || undefined,
									title: `3D КТ - ${study.title || "Исследование"}`,
								});
							}}
							className="text-cyan-300 hover:text-white font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
							title="Открыть на 2-м мониторе (в отдельном окне)"
							data-testid={`visit-scan-popout-${study.id}`}
						>
							<ExternalLink size={10} />
							<span className="text-[9.5px]">Окно</span>
						</button>
					)}
					<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:text-white transition-colors">
						<Eye size={11} />
						<span className="text-[9.5px]">Открыть</span>
					</span>
				</div>
			</div>
		</div>
	);
}

export interface DiagnosticsPhotoCardProps {
	photo: ClinicalPhotoAttachment;
	variant?: "gallery" | "attached-list";
	onOpenProtocol: () => void;
	onRemovePhoto: (id: string) => void;
}

export function DiagnosticsPhotoCard({
	photo,
	variant = "gallery",
	onOpenProtocol,
	onRemovePhoto,
}: DiagnosticsPhotoCardProps) {
	const testId =
		variant === "attached-list"
			? `photo-attachment-card-${photo.id}`
			: `visit-scan-thumbnail-${photo.id}`;

	return (
		<div
			className="group relative rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[#030712] cursor-pointer shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all aspect-square select-none"
			style={{ aspectRatio: "1 / 1" }}
			data-testid={testId}
			onClick={onOpenProtocol}
			title="Открыть фотопротокол"
		>
			{photo.photoUrl ? (
				<img
					src={photo.photoUrl}
					alt={`Фото: ${photo.toothNumber ? `зуб ${photo.toothNumber}` : "общий"}`}
					loading="lazy"
					decoding="async"
					className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
			) : (
				<div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-[var(--muted)] gap-1">
					<ImageIcon size={22} className="text-[var(--teal)] opacity-70" />
					<span className="font-semibold text-white text-[11px]">
						{variant === "attached-list"
							? photo.toothNumber
								? `Зуб ${photo.toothNumber}`
								: "Общий вид"
							: "Фотопротокол"}
					</span>
					<span className="text-[9.5px] text-zinc-400">
						{photo.photoType === "before"
							? "До лечения"
							: photo.photoType === "after"
								? variant === "attached-list"
									? "После лечения"
									: "После"
								: photo.photoType === "process"
									? "В процессе"
									: photo.photoType === "intraoral_macro"
										? "Внутриротовой макро"
										: "Портрет лица"}
					</span>
				</div>
			)}
			<div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
				<span
					className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/80 shadow-xs backdrop-blur-xs leading-none ${
						variant === "attached-list"
							? "text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40"
							: "text-amber-400 border border-amber-400/40"
					}`}
				>
					{variant === "attached-list"
						? photo.photoType === "before"
							? "До лечения"
							: photo.photoType === "after"
								? "После"
								: photo.photoType === "process"
									? "В процессе"
									: "Макро"
						: `Фото${photo.toothNumber ? ` #${photo.toothNumber}` : ""}`}
				</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemovePhoto(photo.id);
					}}
					className="pointer-events-auto p-1 rounded-md bg-black/70 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
					title="Удалить снимок"
				>
					<Trash2 size={11} />
				</button>
			</div>
			<div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex items-center justify-between text-white text-[10px]">
				<span className="truncate max-w-[70px] opacity-90 text-[10px]">
					{photo.description ||
						(photo.photoType === "before"
							? "До"
							: photo.photoType === "after"
								? "После"
								: photo.photoType === "process"
									? "В процессе"
									: photo.toothNumber
										? `Зуб ${photo.toothNumber}`
										: "Снимок")}
				</span>
				<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:text-white transition-colors">
					<Eye size={11} />
					<span className="text-[9.5px]">Открыть</span>
				</span>
			</div>
		</div>
	);
}
