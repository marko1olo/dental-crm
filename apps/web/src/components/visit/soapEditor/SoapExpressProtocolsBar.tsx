import {
	Activity, HeartPulse, Layers, RotateCcw, Scissors, Stethoscope, Zap, ShieldCheck,
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
	const btnCls = "h-7.5 px-2.5 rounded-lg text-[12px] font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap";

	return (
		<div
			className="col-span-full flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs"
			data-testid="soap-chairside-express-bar"
		>
			<div className="flex items-center gap-1.5 shrink-0">
				<Stethoscope className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
				<span className="text-[12px] font-semibold text-[var(--ink)]">Экспресс-протоколы:</span>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				<button type="button" onClick={() => onApplyExpressProtocol("caries")} className={btnCls} data-testid="btn-soap-express-caries" title="Протокол: Кариес дентина (K02.1)">
					<Activity className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Кариес</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("pulpitis")} className={btnCls} data-testid="btn-soap-express-pulpitis" title="Протокол: Острый пульпит (K04.0)">
					<Zap className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Пульпит</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("periodontitis")} className={btnCls} data-testid="btn-soap-express-periodontitis" title="Протокол: Хронический периодонтит (K04.5)">
					<HeartPulse className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Периодонтит</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("hygiene")} className={btnCls} data-testid="btn-soap-express-hygiene" title="Протокол: Профгигиена (K05.1)">
					<ShieldCheck className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Гигиена</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("extraction")} className={btnCls} data-testid="btn-soap-express-extraction" title="Протокол: Простое удаление зуба (K01.1)">
					<Scissors className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Удаление</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("extraction_complex")} className={btnCls} data-testid="btn-soap-express-extraction-complex" title="Протокол: Сложное удаление с альвеолотомией (K01.1)">
					<Scissors className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Сложн. удаление</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("implant_standard")} className={btnCls} data-testid="btn-soap-express-implant" title="Протокол: Дентальная имплантация Osstem/Straumann (K08.1)">
					<ShieldCheck className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Имплантация</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("sinus_gbr")} className={btnCls} data-testid="btn-soap-express-sinus-gbr" title="Протокол: Синус-лифтинг и костная пластика НКР (K08.2)">
					<Layers className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Синус / НКР</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("ortho_wire_change")} className={btnCls} data-testid="btn-soap-express-ortho-wire" title="Ортодонтия: Смена дуг NiTi/SS и лигатур (K07.4)">
					<RotateCcw className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Смена дуг</span>
				</button>
				<button type="button" onClick={() => onApplyExpressProtocol("ortho_aligner_activation")} className={btnCls} data-testid="btn-soap-express-ortho-aligner" title="Ортодонтия: Активация элайнеров и выдача сетов капп (K07.2)">
					<Layers className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
					<span>Элайнеры</span>
				</button>
				{onOpenOrthoWidget && (
					<button type="button" onClick={onOpenOrthoWidget} className={btnCls} data-testid="btn-soap-open-ortho-protocol" title="Открыть полный ортодонтический протокол приёма (дуги, эластики, ТРГ, смета)">
						<Stethoscope className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
						<span>Орто-приём</span>
					</button>
				)}
			</div>
		</div>
	);
};
