/**
 * apps/web/src/components/odontogram/AiAnalysisMenuButtons.tsx
 *
 * Consolidated AI, Imaging & Outpatient Clinical Analysis Menu Actions.
 * Replaces fragmented micro-wrappers per Mandate 8b & Mandate 8ap.
 * Strictly 0% third-party commercial brand names (pure semantic domain language).
 */

import { Printer, Sparkles, Stethoscope } from "lucide-react";
import React from "react";
import { triggerOdontogramPrint } from "./print/triggerOdontogramPrint";

export interface AiAnalysisMenuButtonsProps {
	readonly isSmartOpgOpen?: boolean | undefined;
	readonly setIsSmartOpgOpen?: ((open: boolean) => void) | undefined;
	readonly isOrthoCephOpen?: boolean | undefined;
	readonly setIsOrthoCephOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onOpenPediatricModal?: (() => void) | undefined;
	readonly onLoadRadiologyAiReport?: (() => void) | undefined;
	readonly radiologyAiLoading?: boolean | undefined;
	readonly onPrintOdontogramA4?: (() => void) | undefined;
	readonly onCloseMenu: () => void;
}

export const AiAnalysisMenuButtons: React.FC<AiAnalysisMenuButtonsProps> = ({
	isSmartOpgOpen,
	setIsSmartOpgOpen,
	isOrthoCephOpen,
	setIsOrthoCephOpen,
	onOpenPediatricModal,
	onLoadRadiologyAiReport,
	radiologyAiLoading,
	onPrintOdontogramA4,
	onCloseMenu,
}) => {
	const itemCls =
		"min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-800/60 border-[var(--line,#e2e8f0)] dark:border-zinc-700/60 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-zinc-800 hover:border-teal-500/40";

	return (
		<>
			{setIsSmartOpgOpen && (
				<button
					type="button"
					onClick={() => {
						setIsSmartOpgOpen(true);
						onCloseMenu();
					}}
					className={`${itemCls} ${isSmartOpgOpen ? "bg-teal-500/15 border-teal-500/40 shadow-xs" : ""}`}
					title="Умный анализ ОПТГ: разметка 32 зубов, детекция патологий"
					data-testid="btn-open-smart-opg"
				>
					<Sparkles
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							Панорама ОПТГ AI
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							ИИ-разметка 32 зубов, детекция патологий
						</span>
					</div>
				</button>
			)}

			<button
				type="button"
				onClick={() => {
					setIsOrthoCephOpen((prev) => !prev);
					onCloseMenu();
				}}
				className={`${itemCls} ${isOrthoCephOpen ? "bg-teal-500/15 border-teal-500/40 shadow-xs" : ""}`}
				title="Цефалометрия ТРГ: анализ Штайнера, Твида, Wits"
				data-testid="btn-open-ortho-ceph"
			>
				<Sparkles
					size={16}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
						Цефалометрия ТРГ
					</span>
					<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
						Углы SNA/SNB/ANB, Wits, Штайнер и Твид
					</span>
				</div>
			</button>

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

			{onLoadRadiologyAiReport && (
				<button
					type="button"
					onClick={() => {
						onLoadRadiologyAiReport();
						onCloseMenu();
					}}
					disabled={radiologyAiLoading}
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
							{radiologyAiLoading ? "Загрузка отчёта..." : "Радиологический ИИ-отчёт"}
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							ИИ-анализ снимков КЛКТ и ОПТГ
						</span>
					</div>
				</button>
			)}

			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					triggerOdontogramPrint(onPrintOdontogramA4);
				}}
				className={itemCls}
				title="Распечатать графическую одонтограмму на лист A4"
				data-testid="print-odontogram-a4-btn"
			>
				<Printer
					size={16}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
						Печать зубной формулы (А4)
					</span>
					<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
						Схема для амбулаторной карты
					</span>
				</div>
			</button>
		</>
	);
};
