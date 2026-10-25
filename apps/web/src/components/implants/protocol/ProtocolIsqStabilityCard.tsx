/**
 * ProtocolIsqStabilityCard.tsx — Пассивная карточка первичной стабильности ISQ и торка (Мандаты 8b, 8e).
 * Никаких симуляторов физики диффузии кости и фейковых нейросетей с setTimeout! Чистая клиническая индикация.
 */
import React from "react";
import { Gauge, CheckCircle2, Zap } from "lucide-react";

export interface ProtocolIsqStabilityCardProps {
	readonly torqueNcm: number;
	readonly isqValue?: number | undefined;
	readonly setIsqValue?: ((val: number) => void) | undefined;
}

export const ProtocolIsqStabilityCard: React.FC<ProtocolIsqStabilityCardProps> = ({
	torqueNcm,
	isqValue = 72,
	setIsqValue,
}) => {
	const isOptimal = torqueNcm >= 35;
	const isImmediateLoadingFeasible = torqueNcm >= 35 && torqueNcm <= 50;

	return (
		<div
			className={`p-3 rounded-xl border text-xs leading-normal flex items-center justify-between gap-3 shadow-xs transition-colors flex-wrap sm:flex-nowrap ${
				torqueNcm < 25
					? "bg-[var(--amber-surface,rgba(245,158,11,0.08))] border-[var(--amber,#f59e0b)] text-[var(--ink)]"
					: isOptimal
						? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] font-medium"
						: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
			}`}
			data-testid="isq-stability-passive-badge"
		>
			<div className="flex items-center gap-2.5 min-w-0 flex-1">
				{isOptimal ? (
					<CheckCircle2 size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
				) : (
					<Gauge size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
				)}
				<div className="min-w-0">
					<div className="font-bold text-[var(--ink)] flex items-center gap-2 flex-wrap">
						<span>
							{torqueNcm < 25
								? "Торк < 25 Н·см · Низкая первичная фиксация"
								: isOptimal
									? `Торк ${torqueNcm} Н·см · Высокая первичная стабильность`
									: `Торк ${torqueNcm} Н·см · Стандартная стабильность`}
						</span>
						<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--teal,#0d9488)] font-black">
							ISQ {isqValue}
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] block truncate mt-0.5">
						{torqueNcm < 25
							? "Показан двухэтапный протокол: винт-заглушка с ушиванием раны наглухо"
							: "Оптимум для установки формирователя десны (ФДМ) или немедленной нагрузки"}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				{setIsqValue && (
					<div className="flex items-center gap-1 text-[11px] font-mono bg-[var(--paper)] px-2 py-1 rounded-lg border border-[var(--line-subtle)]">
						<span className="text-[var(--muted)]">ISQ:</span>
						<button
							type="button"
							onClick={() => setIsqValue(Math.max(40, isqValue - 2))}
							className="px-1 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
						>
							-
						</button>
						<span className="font-bold text-[var(--ink)] min-w-[20px] text-center">{isqValue}</span>
						<button
							type="button"
							onClick={() => setIsqValue(Math.min(90, isqValue + 2))}
							className="px-1 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
						>
							+
						</button>
					</div>
				)}

				{isImmediateLoadingFeasible && (
					<span className="text-[10px] font-black uppercase tracking-wider text-[var(--teal,#0d9488)] shrink-0 bg-[var(--paper)] px-2.5 py-1 rounded-lg border border-[var(--teal,#0d9488)] shadow-2xs flex items-center gap-1">
						<Zap size={12} className="shrink-0 text-[var(--teal,#0d9488)]" />
						<span>Немедленная нагрузка</span>
					</span>
				)}
			</div>
		</div>
	);
};

export default ProtocolIsqStabilityCard;
