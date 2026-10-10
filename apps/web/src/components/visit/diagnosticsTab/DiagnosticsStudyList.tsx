import { Camera, Plus, Scan } from "lucide-react";
import React from "react";
import type { ClinicalPhotoAttachment } from "../../../lib/clinicalProtocols043";
import { DiagnosticsPhotoCard, DiagnosticsStudyCard } from "./DiagnosticsStudyCard";
import type { DiagnosticStudy } from "./types";

export interface DiagnosticsStudyListProps {
	patientStudies: DiagnosticStudy[];
	photoAttachments: ClinicalPhotoAttachment[];
	effectiveTargetPatientId?: string | null | undefined;
	visitPatientName?: string | null | undefined;
	onSelectStudy?: ((study: DiagnosticStudy) => void) | undefined;
	onOpen3DScan: (viewerUrl: string, title: string) => void;
	onOpenCbct: () => void;
	onOpenDicom: (imageSrc: string) => void;
	onOpenPhotoProtocol: () => void;
	onRemovePhoto: (id: string) => void;
	onQuickAdd?: (() => void) | undefined;
}

export function DiagnosticsStudyList({
	patientStudies,
	photoAttachments,
	effectiveTargetPatientId,
	visitPatientName,
	onSelectStudy,
	onOpen3DScan,
	onOpenCbct,
	onOpenDicom,
	onOpenPhotoProtocol,
	onRemovePhoto,
	onQuickAdd,
}: DiagnosticsStudyListProps) {
	const totalCount = patientStudies.length + photoAttachments.length;

	return (
		<div
			data-testid="visit-diagnostics-attached-scans-gallery"
			className="px-2 py-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs flex items-center gap-2 overflow-hidden h-[54px] min-h-[50px] max-h-[56px]"
		>
			<div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-[var(--line-subtle)] select-none">
				<Scan size={13} className="text-[var(--teal)] shrink-0" />
				<span className="text-xs font-bold text-[var(--ink)] whitespace-nowrap">
					Снимки ({totalCount})
				</span>
			</div>

			{totalCount === 0 ? (
				<div
					data-testid="attached-scans-empty-placeholder"
					className="flex-1 h-full px-2 rounded-lg border border-dashed border-[var(--line-subtle)] bg-[var(--paper)] flex items-center justify-between text-xs text-[var(--muted)] gap-2 select-none"
				>
					<div className="flex items-center gap-1.5 text-[11.5px]">
						<Camera size={13} className="text-[var(--muted)] opacity-60 shrink-0" />
						<span className="text-[var(--muted)]">Нет прикрепленных снимков к приёму</span>
					</div>
					<button
						type="button"
						onClick={onQuickAdd || onOpenPhotoProtocol}
						className="h-6 px-2 rounded text-[11px] font-semibold text-[var(--teal)] hover:bg-[var(--teal)]/10 border border-[var(--teal)]/30 transition-colors cursor-pointer flex items-center gap-1"
						title="Добавить снимок или фото"
					>
						<Plus size={11} />
						<span>Добавить</span>
					</button>
				</div>
			) : (
				<div
					data-testid="attached-scans-list"
					className="flex-1 flex items-center gap-1.5 overflow-x-auto h-full py-0.5 scrollbar-thin"
				>
					{patientStudies.map((study) => (
						<DiagnosticsStudyCard
							key={study.id}
							study={study}
							effectiveTargetPatientId={effectiveTargetPatientId ?? null}
							visitPatientName={visitPatientName ?? null}
							onSelectStudy={onSelectStudy}
							onOpen3DScan={onOpen3DScan}
							onOpenCbct={onOpenCbct}
							onOpenDicom={onOpenDicom}
						/>
					))}

					{photoAttachments.map((photo) => (
						<DiagnosticsPhotoCard
							key={photo.id}
							photo={photo}
							variant="gallery"
							onOpenProtocol={onOpenPhotoProtocol}
							onRemovePhoto={onRemovePhoto}
						/>
					))}

					<button
						type="button"
						onClick={onQuickAdd || onOpenPhotoProtocol}
						className="h-[42px] w-[32px] rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
						title="Добавить снимок или фотопротокол"
					>
						<Plus size={13} />
					</button>
				</div>
			)}
		</div>
	);
}
