import { Calendar, ChevronRight } from "lucide-react";
import type React from "react";
import { formatShortDate } from "../../../AppHelpers.js";
import type { ImagingStudy } from "../../imaging/types.js";

export interface MobileStudiesListItemsProps {
	studies: ImagingStudy[];
	selectedStudyId?: string | undefined;
	imagingKindLabels?: Record<string, string> | undefined;
	onSelectStudy: (id: string) => void;
	onClose: () => void;
	triggerHaptic: () => void;
}

export const MobileStudiesListItems: React.FC<MobileStudiesListItemsProps> = ({
	studies,
	selectedStudyId,
	imagingKindLabels = {},
	onSelectStudy,
	onClose,
	triggerHaptic,
}) => {
	if (studies.length === 0) {
		return (
			<div className="py-12 text-center text-xs text-[var(--muted)]">
				Снимки выбранного типа не найдены
			</div>
		);
	}

	return (
		<>
			{studies.map((study) => {
				const isSelected = selectedStudyId === study.id;
				const sBadge = study.toothCode
					? `Зуб #${study.toothCode}`
					: study.region || null;

				const handleSelect = () => {
					triggerHaptic();
					onSelectStudy(study.id);
					onClose();
				};

				return (
					<button
						type="button"
						key={study.id}
						onClick={handleSelect}
						className={`w-full text-left flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
							isSelected
								? "bg-teal-500/15 border-teal-500 shadow-sm"
								: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40"
						}`}
						data-testid={`mobile-study-item-${study.id}`}
					>
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<div className="w-12 h-12 rounded-xl bg-slate-900 border border-[var(--line)] overflow-hidden shrink-0 flex items-center justify-center">
								{study.previewUrl ? (
									<img
										src={study.previewUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="text-[10px] font-bold text-teal-400 uppercase">
										{study.kind.slice(0, 3)}
									</span>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<strong className="text-xs font-bold text-[var(--ink)] truncate">
										{study.title || "Рентген-снимок"}
									</strong>
									{sBadge && (
										<span className="px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 font-mono text-[10px] font-bold shrink-0">
											{sBadge}
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--muted)]">
									<span className="flex items-center gap-1">
										<Calendar size={11} />
										{formatShortDate(study.capturedAt || "")}
									</span>
									<span>·</span>
									<span>{imagingKindLabels[study.kind] || study.kind}</span>
								</div>
							</div>
						</div>
						<ChevronRight
							size={16}
							className={`text-[var(--muted)] shrink-0 ml-2 ${isSelected ? "text-teal-400" : ""}`}
						/>
					</button>
				);
			})}
		</>
	);
};
