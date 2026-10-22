import { Film, Image as ImageIcon } from "lucide-react";
import type React from "react";
import { countLabel } from "../../AppHelpers.js";
import { EmptyState } from "../EmptyState.js";
import { KIND_LABELS } from "./imagingStudyListConstants.js";
import type { ImagingStudy } from "./types.js";

export interface ImagingStudyListEmptyStateProps {
	activePatient?: { fullName?: string; name?: string } | null | undefined;
	activeImagingStudies: ImagingStudy[];
	effectiveToothFilter: string;
	imagingKindFilter: string;
	imagingKindLabels: Record<string, string>;
	onClearToothFilter: () => void;
	onClearKindFilter: () => void;
}

export const ImagingStudyListEmptyState: React.FC<
	ImagingStudyListEmptyStateProps
> = ({
	activePatient,
	activeImagingStudies,
	effectiveToothFilter,
	imagingKindFilter,
	imagingKindLabels,
	onClearToothFilter,
	onClearKindFilter,
}) => {
	if (!activePatient) {
		return (
			<EmptyState
				icon={<ImageIcon size={28} />}
				title="Пациент не выбран"
				description="Лента показывает снимки того пациента, который назван в шапке экрана. Выберите пациента в картотеке или откройте приём — снимки подтянутся сами."
			/>
		);
	}

	if (activeImagingStudies?.length > 0 && effectiveToothFilter !== "all") {
		return (
			<EmptyState
				icon={<ImageIcon size={28} />}
				title={`Снимков для зуба #${effectiveToothFilter} у пациента нет`}
				description={`В карте пациента есть ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} для других зубов.`}
				action={
					<div className="flex flex-col gap-1.5 w-full">
						<button
							className="primary-button h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
							type="button"
							onClick={() => {
								window.dispatchEvent(
									new CustomEvent("dente-open-rvg-capture-modal", {
										detail: { toothCode: effectiveToothFilter },
									}),
								);
							}}
						>
							<span>Сделать снимок зуба #{effectiveToothFilter}</span>
						</button>
						<button
							className="secondary-button h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
							type="button"
							onClick={onClearToothFilter}
						>
							Показать все зубы
						</button>
					</div>
				}
			/>
		);
	}

	if (activeImagingStudies?.length > 0 && imagingKindFilter !== "all") {
		const kindTitle =
			KIND_LABELS[imagingKindFilter] ??
			imagingKindLabels?.[imagingKindFilter] ??
			imagingKindFilter;
		return (
			<EmptyState
				icon={<ImageIcon size={28} />}
				title={`Снимков типа «${kindTitle}» у пациента нет`}
				description={`Их скрыл фильтр типа: у пациента ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} других типов.`}
				action={
					<button
						className="h-8 px-3 rounded-lg text-[13px] font-medium border border-[var(--line-strong,var(--line))] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 transition-all shadow-2xs active:scale-98 cursor-pointer"
						type="button"
						onClick={onClearKindFilter}
					>
						Показать все снимки
					</button>
				}
			/>
		);
	}

	return (
		<EmptyState
			icon={<Film size={28} className="text-[var(--primary)]" />}
			title="У выбранного пациента нет рентгеновских снимков"
			description="Загрузите снимки пациента (RVG, КТ, ОПТГ, DICOM) через кнопку «+ Загрузить снимок» или перетащите файл на холст."
		/>
	);
};
