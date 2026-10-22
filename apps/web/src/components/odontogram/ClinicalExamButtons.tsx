import { Activity, Stethoscope } from "lucide-react";
import React from "react";

export interface ClinicalExamButtonsProps {
	readonly onTogglePerio?: (() => void) | undefined;
	readonly isPerioOpen?: boolean | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly isPediatricEffective: boolean;
	readonly setContextDrawerTooth: (tooth: number) => void;
	readonly onCloseMenu: () => void;
}

export const ClinicalExamButtons: React.FC<ClinicalExamButtonsProps> = ({
	onTogglePerio,
	isPerioOpen,
	selectedTeeth,
	isPediatricEffective,
	setContextDrawerTooth,
	onCloseMenu,
}) => {
	const itemCls =
		"min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-800/60 border-[var(--line,#e2e8f0)] dark:border-zinc-700/60 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-zinc-800 hover:border-teal-500/40";

	const handleOpenToothCard = () => {
		const firstSelected = selectedTeeth?.[0];
		const targetTooth =
			firstSelected !== undefined
				? firstSelected
				: isPediatricEffective
					? 55
					: 16;
		setContextDrawerTooth(targetTooth);
		onCloseMenu();
	};

	return (
		<>
			<button
				type="button"
				onClick={() => {
					onTogglePerio?.();
					onCloseMenu();
				}}
				className={`${itemCls} ${isPerioOpen ? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] border-[var(--teal,#0d9488)]/50 shadow-xs" : ""}`}
				title="Пародонтологическая карта"
				data-testid="btn-open-perio-chart"
			>
				<Activity size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
						Пародонтограмма
					</span>
					<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
						6 точек зондирования, OHI-S и CPITN
					</span>
				</div>
			</button>

			<button
				type="button"
				onClick={handleOpenToothCard}
				className={itemCls}
				title="Открыть подробную карточку зуба"
				data-testid="more-menu-tooth-card"
			>
				<Stethoscope
					size={16}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
						Детальная карточка зуба
					</span>
					<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
						Поверхности (MODVL), каналы и протокол
					</span>
				</div>
			</button>
		</>
	);
};
