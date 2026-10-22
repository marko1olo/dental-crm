import {
	Activity,
	HeartPulse,
	Scissors,
	Sparkles,
	Zap,
} from "lucide-react";
import React from "react";
import type { ChairsideSmartProtocolKey } from "../clinicalVisitWorkflow";

export interface SoapExpressProtocolsBarProps {
	readonly onApplyExpressProtocol: (preset: ChairsideSmartProtocolKey) => void;
}

export const SoapExpressProtocolsBar: React.FC<SoapExpressProtocolsBarProps> = ({
	onApplyExpressProtocol,
}) => {
	return (
		<div
			className="col-span-full flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-[var(--paper-soft)] to-indigo-500/10 border border-[var(--teal,var(--brand-primary))]/30 shadow-2xs"
			data-testid="soap-chairside-express-bar"
		>
			<div className="flex items-center gap-1.5 shrink-0">
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
				<span className="text-[12.5px] font-bold text-[var(--ink)]">
					Экспресс-протоколы у кресла:
				</span>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={() => onApplyExpressProtocol("caries")}
					className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 hover:border-emerald-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
					data-testid="btn-soap-express-caries"
					title="Протокол: Кариес дентина (K02.1)"
				>
					<Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>Кариес (K02.1)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyExpressProtocol("pulpitis")}
					className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:border-amber-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
					data-testid="btn-soap-express-pulpitis"
					title="Протокол: Острый пульпит (K04.0)"
				>
					<Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
					<span>Пульпит (K04.0)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyExpressProtocol("periodontitis")}
					className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-500/40 hover:border-purple-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
					data-testid="btn-soap-express-periodontitis"
					title="Протокол: Хронический периодонтит (K04.5)"
				>
					<HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
					<span>Периодонтит (K04.5)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyExpressProtocol("hygiene")}
					className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-500/40 hover:border-sky-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
					data-testid="btn-soap-express-hygiene"
					title="Протокол: Профгигиена (K05.1)"
				>
					<Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
					<span>Профгигиена (K05.1)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyExpressProtocol("extraction")}
					className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/40 hover:border-rose-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
					data-testid="btn-soap-express-extraction"
					title="Протокол: Простое удаление зуба (K01.1)"
				>
					<Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
					<span>Удаление (K01.1)</span>
				</button>
			</div>
		</div>
	);
};
