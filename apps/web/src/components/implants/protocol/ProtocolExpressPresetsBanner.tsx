/**
 * ProtocolExpressPresetsBanner.tsx — Баннер 1-кликовых экспресс-протоколов имплантации (Мандаты 8e, 8am).
 * Врач выбирает протокол в 1 клик, без заполнения десятков полей.
 */
import React from "react";
import { Sparkles, Check } from "lucide-react";

export interface ProtocolExpressPresetsBannerProps {
	readonly onApplyStandardProtocol?: (() => void) | undefined;
	readonly onApplyImmediateProtocol?: (() => void) | undefined;
	readonly onApplyTwoStageProtocol?: (() => void) | undefined;
	readonly onApplyGbrProtocol?: (() => void) | undefined;
}

export const ProtocolExpressPresetsBanner: React.FC<ProtocolExpressPresetsBannerProps> = ({
	onApplyStandardProtocol,
	onApplyImmediateProtocol,
	onApplyTwoStageProtocol,
	onApplyGbrProtocol,
}) => {
	return (
		<div className="banner-standard-protocol-preset implant-presets-section p-3.5 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.3))] space-y-2.5">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
					<div className="text-xs">
						<strong className="text-[var(--ink)] block text-sm">Хирургический экспресс-протокол имплантации:</strong>
						<span className="text-[var(--muted)]">1 клик: Ø 4.0/4.5×10 мм по зубу FDI, торк 35 Н·см, ФДМ, охлаждение 0.9% NaCl, шов Викрил 4-0</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
				<button
					type="button"
					onClick={onApplyStandardProtocol}
					className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full border-[var(--teal,#0d9488)] bg-[var(--paper)] rounded-xl"
					data-testid="btn-apply-standard-protocol"
					title="Стандарт: торк 35 Н·см, формирователь десны ФДМ, шов Викрил 4-0"
				>
					<span className="font-bold text-[var(--teal,#0d9488)] block truncate flex items-center gap-1.5">
						<Check size={14} className="shrink-0" />
						<span>Стандартный протокол</span>
					</span>
					<span className="text-[11px] text-[var(--muted)] block truncate">35 Н·см · ФДМ · Викрил 4-0</span>
				</button>

				<button
					type="button"
					onClick={onApplyImmediateProtocol}
					className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full rounded-xl"
					data-testid="btn-apply-immediate-protocol"
					title="Одномоментная имплантация: лунка удаленного зуба, немедленная нагрузка (45 Н·см)"
				>
					<span className="font-bold text-[var(--ink)] block truncate">Немедленная нагрузка</span>
					<span className="text-[11px] text-[var(--muted)] block truncate">45 Н·см · Одномоментно</span>
				</button>

				<button
					type="button"
					onClick={onApplyTwoStageProtocol}
					className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full rounded-xl"
					data-testid="btn-apply-twostage-protocol"
					title="Двухэтапная классическая: винт-заглушка с ушиванием раны наглухо (35 Н·см)"
				>
					<span className="font-bold text-[var(--ink)] block truncate">Двухэтапная заглушка</span>
					<span className="text-[11px] text-[var(--muted)] block truncate">35 Н·см · Заглушка наглухо</span>
				</button>

				<button
					type="button"
					onClick={onApplyGbrProtocol}
					className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full rounded-xl"
					data-testid="btn-apply-gbr-protocol"
					title="Имплантация с НКР (GBR): Bio-Oss + Bio-Gide + швы"
				>
					<span className="font-bold text-[var(--amber,#f59e0b)] block truncate">Костная пластика (НКР)</span>
					<span className="text-[11px] text-[var(--muted)] block truncate">Bio-Oss + Bio-Gide + швы</span>
				</button>
			</div>
		</div>
	);
};

export default ProtocolExpressPresetsBanner;
