import React from "react";
import { Grid, Split } from "lucide-react";
import type { OrthodonticSessionStage } from "@dental/shared";

interface OrthoModalToolbarProps {
	stage: OrthodonticSessionStage;
	onStageChange: (stage: OrthodonticSessionStage) => void;
	activeCategoryFilter: "all" | "extraoral" | "intraoral";
	setActiveCategoryFilter: (filter: "all" | "extraoral" | "intraoral") => void;
	isCompareMode: boolean;
	setIsCompareMode: React.Dispatch<React.SetStateAction<boolean>>;
	globalGuidelinesEnabled: boolean;
	setGlobalGuidelinesEnabled: (enabled: boolean) => void;
}

export const OrthoModalToolbar: React.FC<OrthoModalToolbarProps> = ({
	stage,
	onStageChange,
	activeCategoryFilter,
	setActiveCategoryFilter,
	isCompareMode,
	setIsCompareMode,
	globalGuidelinesEnabled,
	setGlobalGuidelinesEnabled,
}) => {
	return (
		<div className="ortho-modal-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 py-1 px-4 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap shrink-0 flex-nowrap">
			<div className="ortho-stage-selector" role="group" aria-label="Этап фотопротокола">
				<button
					type="button"
					onClick={() => onStageChange("pre_treatment")}
					className={`ortho-stage-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-1.5 ${stage === "pre_treatment" ? "active-stage-pre" : ""}`}
					data-testid="stage-pre-btn"
				>
					<span>До лечения</span>
				</button>
				<button
					type="button"
					onClick={() => onStageChange("active_monitoring")}
					className={`ortho-stage-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-1.5 ${stage === "active_monitoring" ? "active-stage-active" : ""}`}
					data-testid="stage-active-btn"
				>
					<span>Контроль</span>
				</button>
				<button
					type="button"
					onClick={() => onStageChange("post_treatment")}
					className={`ortho-stage-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-1.5 ${stage === "post_treatment" ? "active-stage-post" : ""}`}
					data-testid="stage-post-btn"
				>
					<span>После лечения</span>
				</button>
			</div>

			<div className="ortho-toolbar-tools">
				<div className="flex items-center gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--line)]">
					{(["all", "extraoral", "intraoral"] as const).map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => setActiveCategoryFilter(cat)}
							className={`px-3 py-2 min-h-[44px] sm:min-h-[28px] sm:h-7 sm:py-0.5 text-xs font-semibold rounded inline-flex items-center justify-center ${
								activeCategoryFilter === cat
									? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							{cat === "all" ? "Все (8)" : cat === "extraoral" ? "Лицо (3)" : "Зубы (5)"}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={() => setIsCompareMode((prev) => !prev)}
					className={`secondary-button min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl cursor-pointer ${
						isCompareMode ? "!bg-[var(--primary)] !text-white !border-[var(--primary)] shadow-xs" : ""
					}`}
					title="Сравнение фотографий До и После в 1 клик"
					data-testid="toggle-compare-before-after-btn"
				>
					<Split size={14} />
					<span>Сравнение До/После</span>
				</button>

				<button
					type="button"
					onClick={() => setGlobalGuidelinesEnabled(!globalGuidelinesEnabled)}
					className={`ortho-tool-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-2 ${globalGuidelinesEnabled ? "active" : ""}`}
					title="Показать/скрыть сетку наложения (центральная линия и окклюзия)"
					data-testid="toggle-guidelines-btn"
				>
					<Grid size={15} />
					<span>Сетка наложения</span>
				</button>
			</div>
		</div>
	);
};
