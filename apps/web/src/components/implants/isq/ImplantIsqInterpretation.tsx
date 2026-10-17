import React from "react";
import type { MischDensity } from "../implantQuickPresets";

export interface ImplantIsqInterpretationProps {
	readonly isqValue: number;
	readonly torqueNcm: number;
	readonly boneDensity: MischDensity;
}

export const ImplantIsqInterpretation: React.FC<ImplantIsqInterpretationProps> = ({
	isqValue,
	torqueNcm,
	boneDensity,
}) => {
	return (
		<div className="space-y-4">
			<div
				className={`p-3 rounded-xl border text-xs font-medium leading-relaxed ${
					isqValue < 60
						? "bg-[var(--amber-surface,rgba(245,158,11,0.1))] border-[var(--amber,#f59e0b)] text-[var(--ink)]"
						: isqValue < 70
							? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)]"
							: "bg-[var(--teal-surface,rgba(13,148,136,0.15))] border-[var(--teal,#0d9488)] text-[var(--ink)] font-bold"
				}`}
				data-testid="isq-interpretation-badge"
			>
				{isqValue < 60 ? (
					<span>
						<strong>Низкая первичная стабильность (ISQ &lt; 60): </strong>
						Показан двухэтапный протокол с винтом-заглушкой и ушиванием раны наглухо. Ранняя нагрузка противопоказана. Срок остеоинтеграции 12–16 недель.
					</span>
				) : isqValue < 70 ? (
					<span>
						<strong>Умеренная/стандартная стабильность (ISQ 60–70): </strong>
						Стандартный протокол остеоинтеграции. Допустима установка ФДМ. Срок остеоинтеграции 8–12 недель.
					</span>
				) : (
					<span>
						<strong>Высокая первичная стабильность (ISQ &gt; 70): </strong>
						Оптимальная первичная фиксация. Клинически обоснована установка ФДМ или ранняя / немедленная функциональная нагрузка (при соблюдении окклюзионных условий).
					</span>
				)}
			</div>

			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] leading-relaxed">
				<strong className="text-[var(--ink)] block mb-1">
					Клинический регламент и протокол (Автономия врача):
				</strong>
				CRM не симулирует микро-замеры 16 точек анизотропии в перчатках у кресла. Зафиксирован надежный первичный торк {torqueNcm} Н·см, ISQ {isqValue} и плотность кости {boneDensity}. Данные автоматически экспортируются в медицинскую карту приёма.
			</div>
		</div>
	);
};
