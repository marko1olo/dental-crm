import {
	Activity, HeartPulse, Layers, RotateCcw, Scissors, Sparkles, Stethoscope, Zap, ShieldCheck,
} from "lucide-react";
import React from "react";
import type { ChairsideSmartProtocolKey } from "../clinicalVisitWorkflow";

export interface SoapExpressProtocolsBarProps {
	readonly onApplyExpressProtocol: (preset: ChairsideSmartProtocolKey) => void;
	readonly onOpenOrthoWidget?: (() => void) | undefined;
}

export const SoapExpressProtocolsBar: React.FC<SoapExpressProtocolsBarProps> = ({
	onApplyExpressProtocol, onOpenOrthoWidget,
}) => {
	const btnCls = "h-8 px-2.5 rounded-lg text-[12px] font-semibold bg-[var(--paper)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap border";

	return (
		<div
			className="col-span-full flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-[var(--paper-soft)] to-indigo-500/10 border border-[var(--teal,var(--brand-primary))]/30 shadow-2xs"
			data-testid="soap-chairside-express-bar"
		>
			<div className="flex items-center gap-1.5 shrink-0">
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
				<span className="text-[12.5px] font-bold text-[var(--ink)]">Экспресс-протоколы у кресла:</span>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				<button type="button" onClick={() => onApplyExpressProtocol("caries")} className={`${btnCls} hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 hover:border-emerald-600`} data-testid="btn-soap-express-caries" title="Протокол: Кариес дентина (K02.1)">
					<Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>Кариес</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("pulpitis")} className={`${btnCls} hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-500/40 hover:border-amber-600`} data-testid="btn-soap-express-pulpitis" title="Протокол: Острый пульпит (K04.0)">
					<Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
					<span>Пульпит</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("periodontitis")} className={`${btnCls} hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-500/40 hover:border-purple-600`} data-testid="btn-soap-express-periodontitis" title="Протокол: Хронический периодонтит (K04.5)">
					<HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
					<span>Периодонтит</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("hygiene")} className={`${btnCls} hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-500/40 hover:border-sky-600`} data-testid="btn-soap-express-hygiene" title="Протокол: Профгигиена (K05.1)">
					<Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
					<span>Гигиена</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("extraction")} className={`${btnCls} hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-500/40 hover:border-rose-600`} data-testid="btn-soap-express-extraction" title="Протокол: Простое удаление зуба (K01.1)">
					<Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
					<span>Удаление</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("extraction_complex")} className={`${btnCls} hover:bg-red-50 dark:hover:bg-red-950/40 text-red-800 dark:text-red-300 border-red-500/40 hover:border-red-600`} data-testid="btn-soap-express-extraction-complex" title="Протокол: Сложное удаление с альвеолотомией (K01.1)">
					<Scissors className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
					<span>Сложн. удаление</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("implant_standard")} className={`${btnCls} hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-500/40 hover:border-teal-600`} data-testid="btn-soap-express-implant" title="Протокол: Дентальная имплантация Osstem/Straumann (K08.1)">
					<ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Имплантация</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("sinus_gbr")} className={`${btnCls} hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-500/40 hover:border-indigo-600`} data-testid="btn-soap-express-sinus-gbr" title="Протокол: Синус-лифтинг и костная пластика НКР (K08.2)">
					<Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
					<span>Синус / НКР</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("ortho_wire_change")} className={`${btnCls} hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-500/40 hover:border-teal-600`} data-testid="btn-soap-express-ortho-wire" title="Ортодонтия: Смена дуг NiTi/SS и лигатур (K07.4)">
					<RotateCcw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Смена дуг</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("ortho_aligner_activation")} className={`${btnCls} hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-500/40 hover:border-cyan-600`} data-testid="btn-soap-express-ortho-aligner" title="Ортодонтия: Активация элайнеров и выдача сетов капп (K07.2)">
					<Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
					<span>Элайнеры</span>
				</button>
				{onOpenOrthoWidget && (
					<button type="button" onClick={onOpenOrthoWidget} className="h-8 px-3 rounded-lg text-[12px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs whitespace-nowrap" data-testid="btn-soap-open-ortho-protocol" title="Открыть полный ортодонтический протокол приёма (дуги, эластики, ТРГ, смета)">
						<Stethoscope className="w-3.5 h-3.5 text-white" />
						<span>Орто-приём</span>
					</button>
				)}
			</div>
		</div>
	);
};
