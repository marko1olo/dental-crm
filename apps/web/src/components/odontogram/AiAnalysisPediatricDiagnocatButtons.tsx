/**
 * apps/web/src/components/odontogram/AiAnalysisPediatricDiagnocatButtons.tsx
 *
 * Facade adapter for pediatric mixed dentition & radiology AI clinical analysis.
 * Preserves backward compatibility while enforcing Mandate 8ap (Zero Third-Party Brands).
 */

import { Sparkles, Stethoscope } from "lucide-react";
import React from "react";

export interface AiAnalysisPediatricDiagnocatButtonsProps {
	readonly onOpenPediatricModal?: (() => void) | undefined;
	readonly onLoadDiagnocat?: (() => void) | undefined;
	readonly diagnocatLoading?: boolean | undefined;
	readonly onLoadRadiologyAiReport?: (() => void) | undefined;
	readonly radiologyAiLoading?: boolean | undefined;
	readonly onCloseMenu: () => void;
}

export const AiAnalysisPediatricDiagnocatButtons: React.FC<
	AiAnalysisPediatricDiagnocatButtonsProps
> = ({
	onOpenPediatricModal,
	onLoadDiagnocat,
	diagnocatLoading,
	onLoadRadiologyAiReport,
	radiologyAiLoading,
	onCloseMenu,
}) => {
	const itemCls =
		"min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-800/60 border-[var(--line,#e2e8f0)] dark:border-zinc-700/60 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-zinc-800 hover:border-teal-500/40";

	const handleRadiologyReport = onLoadRadiologyAiReport ?? onLoadDiagnocat;
	const isRadiologyLoading = radiologyAiLoading ?? diagnocatLoading;

	return (
		<>
			{onOpenPediatricModal && (
				<button
					type="button"
					onClick={() => {
						onOpenPediatricModal();
						onCloseMenu();
					}}
					className={itemCls}
					title="Сменный прикус: сроки прорезывания, стадии резорбции"
					data-testid="btn-more-menu-pediatric"
				>
					<Sparkles
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							Сменный прикус
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							Сроки прорезывания и резорбция корней
						</span>
					</div>
				</button>
			)}

			{handleRadiologyReport && (
				<button
					type="button"
					onClick={() => {
						handleRadiologyReport();
						onCloseMenu();
					}}
					disabled={isRadiologyLoading}
					className={itemCls}
					title="Загрузить радиологический ИИ-отчёт КЛКТ / ОПТГ"
					data-testid="btn-more-menu-radiology-ai"
				>
					<Stethoscope
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							{isRadiologyLoading ? "Загрузка отчёта..." : "Радиологический ИИ-отчёт"}
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							ИИ-анализ снимков КЛКТ и ОПТГ
						</span>
					</div>
				</button>
			)}
		</>
	);
};
