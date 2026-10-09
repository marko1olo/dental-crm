import { Camera, Scan } from "lucide-react";
import React from "react";
import type { ClinicalPhotoAttachment } from "../../../lib/clinicalProtocols043";
import { DiagnosticsPhotoCard, DiagnosticsStudyCard } from "./DiagnosticsStudyCard";
import type { DiagnosticStudy } from "./types";

export interface DiagnosticsStudyListProps {
	patientStudies: DiagnosticStudy[];
	photoAttachments: ClinicalPhotoAttachment[];
	effectiveTargetPatientId?: string | null;
	visitPatientName?: string | null;
	onOpen3DScan: (viewerUrl: string, title: string) => void;
	onOpenCbct: () => void;
	onOpenDicom: (imageSrc: string) => void;
	onOpenPhotoProtocol: () => void;
	onRemovePhoto: (id: string) => void;
}

export function DiagnosticsStudyList({
	patientStudies,
	photoAttachments,
	effectiveTargetPatientId,
	visitPatientName,
	onOpen3DScan,
	onOpenCbct,
	onOpenDicom,
	onOpenPhotoProtocol,
	onRemovePhoto,
}: DiagnosticsStudyListProps) {
	const totalCount = patientStudies.length + photoAttachments.length;

	return (
		<div
			data-testid="visit-diagnostics-attached-scans-gallery"
			className="p-3 sm:p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Scan size={16} className="text-[var(--teal)] shrink-0" />
					<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
						Прикрепленные снимки и КТ-срезы ({totalCount})
					</h4>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Кликните по снимку для мгновенного открытия в просмотрщике
				</span>
			</div>

			{totalCount === 0 ? (
				<div
					data-testid="attached-scans-empty-placeholder"
					className="w-full py-6 px-4 rounded-xl border border-dashed border-[var(--line-subtle)] bg-[var(--paper)] flex flex-col items-center justify-center text-center text-xs text-[var(--muted)] gap-1.5 select-none"
				>
					<Camera size={24} className="text-[var(--muted)] opacity-50" />
					<span className="font-semibold text-[var(--ink)]">Снимки не прикреплены</span>
					<span className="text-[11px] text-[var(--muted)] max-w-sm">
						Сделайте захват с датчика визиографа, привяжите фотопротокол или импортируйте КТ / ОПТГ
					</span>
				</div>
			) : (
				<div
					data-testid="attached-scans-list"
					className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 pt-0.5"
				>
					{patientStudies.map((study) => (
						<DiagnosticsStudyCard
							key={study.id}
							study={study}
							effectiveTargetPatientId={effectiveTargetPatientId}
							visitPatientName={visitPatientName}
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
				</div>
			)}
		</div>
	);
}
