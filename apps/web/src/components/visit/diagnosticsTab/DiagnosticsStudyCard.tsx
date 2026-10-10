import { ExternalLink, Eye, Image as ImageIcon, Maximize2, Trash2 } from "lucide-react";
import React from "react";
import { is3DScanUrl } from "../../lab/LabAttachScanModal";
import { openCbctPopoutWindow } from "../../../native/desktopBridge";
import type { ClinicalPhotoAttachment } from "../../../lib/clinicalProtocols043";
import type { DiagnosticStudy } from "./types";

export interface DiagnosticsStudyCardProps {
	study: DiagnosticStudy;
	effectiveTargetPatientId?: string | null | undefined;
	visitPatientName?: string | null | undefined;
	onSelectStudy?: ((study: DiagnosticStudy) => void) | undefined;
	onOpen3DScan: (viewerUrl: string, title: string) => void;
	onOpenCbct: () => void;
	onOpenDicom: (imageSrc: string) => void;
}

export function DiagnosticsStudyCard({
	study,
	effectiveTargetPatientId,
	visitPatientName,
	onSelectStudy,
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
			className="group relative rounded-lg overflow-hidden border border-[var(--line-subtle)] bg-[#030712] cursor-pointer shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all shrink-0 select-none"
			style={{ aspectRatio: "1 / 1", width: "48px", height: "48px" }}
			data-testid={`visit-scan-thumbnail-${study.id}`}
			onClick={() => {
				if (is3DScan) {
					onOpen3DScan(study.viewerUrl || study.previewUrl || "", study.title || "Интраоральный 3D-скан");
				} else if (isCbct) {
					onOpenCbct();
				} else if (onSelectStudy) {
					onSelectStudy(study);
				} else {
					onOpenDicom(thumbSrc);
				}
			}}
			title={
				is3DScan
					? "Открыть в 3D Просмотрщике сканов"
					: isCbct
						? "Открыть в 3D КЛКТ Студии"
						: "Загрузить во вьюер визиографа"
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
			<div className="absolute top-1 left-1 right-1 flex items-center justify-between pointer-events-none gap-0.5">
				<span className="text-[9px] font-bold px-1 py-0.2 rounded bg-black/85 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs leading-none">
					{is3DScan
						? "3D"
						: study.kind === "cbct"
							? "КТ"
							: study.kind === "opg"
								? "ОПТГ"
								: study.kind === "cephalometric" || study.kind === "trg"
									? "ТРГ"
									: "RVG"}
					{study.toothCode ? ` #${study.toothCode}` : ""}
				</span>
				{study.effectiveDoseMicrosv ? (
					<span className="text-[8.5px] font-semibold px-1 py-0.2 rounded bg-black/85 text-zinc-300 border border-white/15 shadow-xs leading-none">
						{study.effectiveDoseMicrosv}
					</span>
				) : null}
			</div>
			{/* Bottom Action Controls (Clean, 0 Truncation, No Duplicate Text) */}
			<div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-end text-white text-[9px]">
				<div className="flex items-center gap-1">
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
							<ExternalLink size={9} />
						</button>
					)}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onOpenDicom(thumbSrc);
						}}
						className="text-zinc-300 hover:text-[var(--teal,#0d9488)] font-semibold flex items-center transition-colors cursor-pointer p-0.5"
						title="На весь экран / окно"
						data-testid={`visit-scan-maximize-${study.id}`}
					>
						<Maximize2 size={9} />
					</button>
					<span className="text-[var(--teal,#0d9488)] group-hover:text-white transition-colors" title="Открыть во вьюере">
						<Eye size={9} />
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
			className={`group relative overflow-hidden border border-[var(--line-subtle)] bg-[#030712] cursor-pointer shadow-2xs hover:border-[var(--teal)] hover:shadow-md transition-all select-none ${
				variant === "gallery" ? "rounded-lg shrink-0" : "rounded-xl aspect-square"
			}`}
			style={variant === "gallery" ? { width: "48px", height: "48px", aspectRatio: "1 / 1" } : { aspectRatio: "1 / 1" }}
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
			{variant === "gallery" ? (
				<div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-end text-white text-[9px]">
					<span className="text-[var(--teal,#0d9488)] group-hover:text-white transition-colors">
						<Eye size={9} />
					</span>
				</div>
			) : (
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
			)}
		</div>
	);
}
