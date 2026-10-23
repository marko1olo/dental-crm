import type React from "react";
import { Clock, Syringe, Zap } from "lucide-react";

export interface MdlpNurseRulesBannerProps {
	readonly onQuickShiftCarpulesDisposal: () => void;
	readonly onDeferredDisposal: () => void;
}

export const MdlpNurseRulesBanner: React.FC<MdlpNurseRulesBannerProps> = ({
	onQuickShiftCarpulesDisposal,
	onDeferredDisposal,
}) => {
	return (
		<div className="mdlp-nurse-rules-banner" data-testid="mdlp-nurse-rules-banner">
			<div className="mdlp-nurse-rules-info">
				<Syringe className="w-4 h-4 text-teal-400 shrink-0" />
				<span>
					<strong>Быстрое списание:</strong> Пакетное списание упаковок без очередей ·{" "}
					<strong>Мягкий овердрафт:</strong> Задержка накладной не блокирует операцию.
				</span>
			</div>
			<div className="mdlp-nurse-rules-actions">
				<button
					type="button"
					onClick={onQuickShiftCarpulesDisposal}
					className="mdlp-action-pill-btn carpules"
					data-testid="mdlp-shift-carpules-batch-btn"
					title="Групповое списание 10 карпул Артикаина 1:100 000 по журналу приёма"
				>
					<Zap className="w-3.5 h-3.5 text-amber-300" />
					<span>Списать 10 карпул за смену (по журналу)</span>
				</button>
				<button
					type="button"
					onClick={onDeferredDisposal}
					className="mdlp-action-pill-btn deferred"
					data-testid="mdlp-deferred-disposal-btn"
					title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
				>
					<Clock className="w-3.5 h-3.5 text-cyan-300" />
					<span>Отложенное списание (офлайн-буфер)</span>
					<span className="sr-only">Отложенное списание МДЛП (офлайн-буфер)</span>
				</button>
			</div>
		</div>
	);
};
