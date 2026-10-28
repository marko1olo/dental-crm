import React from "react";
import { ChevronRight, Layers, RefreshCw } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";

export interface CtSelectorRecentStudiesSectionProps {
	readonly patientStudies: ImagingStudy[];
	readonly isLoadingStudies: boolean;
	readonly launchStudy: (study: ImagingStudy) => void;
}

export const CtSelectorRecentStudiesSection: React.FC<CtSelectorRecentStudiesSectionProps> = ({
	patientStudies,
	isLoadingStudies,
	launchStudy,
}) => {
	return (
		<section
			className="flex flex-col gap-2.5"
			data-testid="ct-selector-recent-studies"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Недавние исследования пациента
				</span>
				<span className="text-[11px] text-[var(--muted)]">
					{patientStudies.length > 0
						? `Найдено: ${patientStudies.length}`
						: "Нет сохранённых исследований"}
				</span>
			</div>

			{isLoadingStudies ? (
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
					<RefreshCw size={14} className="animate-spin text-teal-500" />
					<span>Загрузка архива снимков пациента...</span>
				</div>
			) : patientStudies.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
					{patientStudies.map((study) => (
						<div
							key={study.id}
							className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:border-teal-500/40 flex items-center justify-between gap-3 transition-all"
							data-testid={`recent-study-card-${study.id}`}
						>
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="w-10 h-10 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
									<Layers size={18} />
								</div>
								<div className="min-w-0">
									<strong className="block text-xs font-bold text-[var(--ink)] leading-snug line-clamp-2">
										{study.title || "3D КЛКТ исследование"}
									</strong>
									<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] flex-wrap">
										<span>
											{study.capturedAt || (study as any).studyDate
												? new Date(
														study.capturedAt || (study as any).studyDate,
													).toLocaleDateString("ru-RU", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})
												: "Архив"}
										</span>
										{study.sliceCount ? (
											<>
												<span>·</span>
												<span>{study.sliceCount} срезов</span>
											</>
										) : null}
										{study.voxelSpacing ? (
											<>
												<span>·</span>
												<span>{study.voxelSpacing}</span>
											</>
										) : null}
									</div>
								</div>
							</div>

							<button
								type="button"
								onClick={() => launchStudy(study)}
								className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-teal-600 hover:text-white text-[var(--ink)] border border-[var(--line)] hover:border-teal-600 font-semibold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-2xs"
								data-testid={`btn-open-recent-study-${study.id}`}
								title="Открыть в выбранном режиме"
							>
								<ChevronRight size={14} />
								<span>Открыть</span>
							</button>
						</div>
					))}
				</div>
			) : (
				<div
					className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-center text-xs text-[var(--muted)]"
					data-testid="no-recent-studies"
				>
					У пациента пока нет привязанных КТ-исследований в базе клиники. Добавьте файл выше
					или выберите архив из Загрузок.
				</div>
			)}
		</section>
	);
};
