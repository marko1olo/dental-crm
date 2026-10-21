import { Bot } from "lucide-react";
import type React from "react";
import { ImagingStudyThumbnail } from "./ImagingStudyThumbnail.js";
import {
	formatStudyRegion,
	formatStudySourceName,
	KIND_LABELS,
	SOURCE_KIND_LABELS,
} from "./imagingStudyListConstants.js";
import { type ImagingStudy, imagingStudyHasFile } from "./types.js";

export interface ImagingStudyRowProps {
	study: ImagingStudy;
	selectedImagingStudy?: ImagingStudy | null;
	previewSrc?: string | undefined;
	imagingKindLabels: Record<string, string>;
	imagingSourceLabels: Record<string, string>;
	imagingViewerHref: (study: ImagingStudy) => string;
	onSelectStudy: (studyId: string) => void;
	formatShortDate: (date: string) => string;
}

export const ImagingStudyRow: React.FC<ImagingStudyRowProps> = ({
	study,
	selectedImagingStudy,
	previewSrc,
	imagingKindLabels,
	imagingSourceLabels,
	imagingViewerHref,
	onSelectStudy,
	formatShortDate,
}) => {
	const isSelected = selectedImagingStudy?.id === study.id;
	const kindLabel =
		KIND_LABELS[study.kind] || imagingKindLabels?.[study.kind] || study.kind;
	const srcLabel =
		SOURCE_KIND_LABELS[study.sourceKind || "other"] ||
		imagingSourceLabels?.[study.sourceKind || "other"] ||
		"Файл";

	return (
		<article
			className={`imaging-row imaging-${study.status || "ready"} ${isSelected ? "active" : ""}`}
			key={study.id}
		>
			<div style={{ position: "relative", flexShrink: 0 }}>
				<ImagingStudyThumbnail study={study} previewSrc={previewSrc} />
				{Boolean(study.aiSummary) && (
					<span className="sa-ai-badge" title="Есть описание рентгенолога">
						<Bot size={9} /> AI
					</span>
				)}
			</div>
			<div style={{ minWidth: 0, flex: 1 }}>
				<h3
					className="text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2 break-words m-0"
					title={study.title}
				>
					{study.title}
				</h3>
				<p className="truncate text-xs text-[var(--muted)] m-0 mt-0.5">
					{kindLabel} · {formatStudyRegion(study.toothCode, study.region)} ·{" "}
					{formatShortDate(study.capturedAt)}
				</p>
				<span className="truncate block">
					{srcLabel} · {formatStudySourceName(study.sourceName)}
				</span>
				{!imagingStudyHasFile(study) && (
					<span
						data-testid="imaging-row-file-missing"
						style={{ color: "var(--warning-color, #f59e0b)" }}
					>
						Файл снимка не загружен — разбор недоступен
					</span>
				)}
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
					{isSelected ? "Выбрано" : "Выбрать"}
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
	);
};
