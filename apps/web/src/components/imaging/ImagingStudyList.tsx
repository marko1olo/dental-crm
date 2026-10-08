import React, { useState } from "react";
import { Bot, Image as ImageIcon } from "lucide-react";
import { countLabel } from "../../AppHelpers";
import { EmptyState } from "../EmptyState";
import {
	imagingStudyHasFile,
	type ImagingStudy,
	type ImagingStudyKind,
} from "./types";

export interface ImagingStudyThumbnailProps {
	study: ImagingStudy;
	previewSrc?: string | undefined;
}

export function ImagingStudyThumbnail({
	study,
	previewSrc,
}: ImagingStudyThumbnailProps) {
	const [hasError, setHasError] = useState(false);
	const src = previewSrc || study?.previewUrl;
	const isDirectBlob = src?.startsWith("blob:") || src?.startsWith("data:");

	if (hasError || !src || (!isDirectBlob && !imagingStudyHasFile(study))) {
		return (
			<div
				className="w-12 h-12 rounded-lg bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col items-center justify-center text-[var(--teal,#0d9488)] shrink-0 select-none"
				style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
				title={study?.title || "Рентген-снимок"}
			>
				<svg viewBox="0 0 28 28" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="4" y="2" width="20" height="24" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
					<rect x="7" y="5" width="14" height="18" rx="2" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="1.5 1.5" />
					<circle cx="14" cy="14" r="3" stroke="currentColor" strokeOpacity="0.7" />
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			className="w-12 h-12 object-cover rounded-lg shrink-0 aspect-square border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)]"
			style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
			onError={() => setHasError(true)}
		/>
	);
}

export interface ImagingStudyListProps {
	visibleImagingStudies: ImagingStudy[];
	activeImagingStudies: ImagingStudy[];
	selectedImagingStudy?: ImagingStudy | null;
	activePatient?: { fullName?: string; name?: string } | null;
	imagingKindFilter: string;
	setImagingKindFilter: (filter: string) => void;
	imagingKindLabels: Record<string, string>;
	imagingSourceLabels: Record<string, string>;
	imagingPreviewSource: (study: ImagingStudy) => string | undefined;
	imagingViewerHref: (study: ImagingStudy) => string;
	onSelectStudy: (studyId: string) => void;
	formatShortDate: (date: string) => string;
}

export function ImagingStudyList({
	visibleImagingStudies,
	activeImagingStudies,
	selectedImagingStudy,
	activePatient,
	imagingKindFilter,
	setImagingKindFilter,
	imagingKindLabels,
	imagingSourceLabels,
	imagingPreviewSource,
	imagingViewerHref,
	onSelectStudy,
	formatShortDate,
}: ImagingStudyListProps) {
	return (
		<div className="imaging-list">
			{visibleImagingStudies?.length === 0 ? (
				!activePatient ? (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title="Пациент не выбран"
						description="Лента показывает снимки того пациента, который назван в шапке экрана. Выберите пациента в картотеке или откройте приём — снимки подтянутся сами."
					/>
				) : activeImagingStudies?.length > 0 && imagingKindFilter !== "all" ? (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title={`Снимков типа «${imagingKindLabels[imagingKindFilter] ?? imagingKindFilter}» у пациента нет`}
						description={`Их скрыл фильтр типа: у пациента ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} других типов.`}
						action={
							<button
								className="h-8 px-3 rounded-lg text-[13px] font-medium border border-[var(--line-strong,var(--line))] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 transition-all shadow-2xs active:scale-98 cursor-pointer"
								type="button"
								onClick={() => setImagingKindFilter("all")}
							>
								Показать все снимки
							</button>
						}
					/>
				) : (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title="Снимков в карте пациента нет"
						description="В ленте только снимки, привязанные к пациенту в базе. Файлы, выбранные с диска кнопками «Папка DICOM» и «Файлы», в карту не попадают и после перезагрузки страницы не сохраняются. Кнопка «Добавить снимок вручную» создаёт карточку без файла — разобрать такой снимок нельзя."
					/>
				)
			) : null}

			{(visibleImagingStudies || []).map((study) => (
				<article
					className={`imaging-row imaging-${study.status || "ready"} ${selectedImagingStudy?.id === study.id ? "active" : ""}`}
					key={study.id}
				>
					<div style={{ position: "relative", flexShrink: 0 }}>
						<ImagingStudyThumbnail
							study={study}
							previewSrc={imagingPreviewSource(study)}
						/>
						{Boolean(study.aiSummary) && (
							<span
								className="sa-ai-badge"
								title="Есть AI-заключение ShadowAnalyst"
							>
								<Bot size={9} /> AI
							</span>
						)}
					</div>
					<div style={{ minWidth: 0, flex: 1 }}>
						<h3 className="truncate" title={study.title}>{study.title}</h3>
						<p className="truncate">
							{imagingKindLabels[study.kind] || study.kind} ·{" "}
							{study.toothCode ?? study.region ?? "область не указана"} ·{" "}
							{formatShortDate(study.capturedAt)}
						</p>
						<span className="truncate block">
							{imagingSourceLabels[study.sourceKind || "other"] || study.sourceKind} · {study.sourceName}
						</span>
						{!imagingStudyHasFile(study) ? (
							<span
								data-testid="imaging-row-file-missing"
								style={{ color: "var(--warning-color, #f59e0b)" }}
							>
								Файл снимка не загружен — разбор недоступен
							</span>
						) : null}
					</div>
					<div className="imaging-row-actions">
						<button
							className="text-button imaging-row-select"
							type="button"
							onClick={() => onSelectStudy(study.id)}
							aria-pressed={selectedImagingStudy?.id === study.id}
							aria-label={`Выбрать снимок: ${study.title}, ${formatShortDate(study.capturedAt)}`}
							title={`Выбрать снимок: ${study.title}`}
						>
							{selectedImagingStudy?.id === study.id ? "Выбрано" : "Выбрать"}
						</button>
						<a
							className="doc-link"
							href={imagingViewerHref(study)}
							target="_blank"
							rel="noreferrer noopener"
							aria-label={`Открыть просмотрщик снимка: ${study.title}, ${formatShortDate(study.capturedAt)}`}
							title={`Открыть просмотрщик снимка: ${study.title}`}
						>
							Открыть
						</a>
					</div>
				</article>
			))}
		</div>
	);
}
