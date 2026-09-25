import React from "react";
import { Activity, TrendingUp } from "lucide-react";
import type { MischDensity } from "./implantQuickPresets";

export interface ImplantIsqTabProps {
	readonly torqueNcm: number;
	readonly isqValue: number;
	readonly setIsqValue: (val: number) => void;
	readonly isIsqEnabled: boolean;
	readonly setIsIsqEnabled: (val: boolean) => void;
	readonly boneDensity: MischDensity;
}

export const ImplantIsqTab: React.FC<ImplantIsqTabProps> = ({
	torqueNcm,
	isqValue,
	setIsqValue,
	isIsqEnabled,
	setIsIsqEnabled,
	boneDensity,
}) => {
	return (
		<div className="space-y-4" data-testid="tab-content-isq">
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-4">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-3 bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] rounded-xl shrink-0">
						<Activity size={24} />
					</div>
					<div className="min-w-0">
						<div className="text-sm font-black text-[var(--ink)] truncate">
							{isIsqEnabled ? "RFA магнитно-резонансная стабилометрия" : "Механический контроль торка ключом"}
						</div>
						<div className="text-xs text-[var(--muted)] truncate">
							Первичная стабильность: {torqueNcm} Н·см · {torqueNcm >= 35 ? "Высокая (оптимум 35 Н·см)" : "Стандартная"}
							{isIsqEnabled ? ` · ISQ День 0: ${isqValue} (${isqValue >= 70 ? "Высокая" : isqValue >= 60 ? "Стандартная" : "Низкая"})` : ""}
						</div>
					</div>
				</div>
				<div className="text-right shrink-0">
					<div className="text-xl font-black font-mono text-[var(--teal,#0d9488)]">
						{torqueNcm} Н·см
					</div>
					{isIsqEnabled && (
						<div className="text-xs font-bold text-[var(--muted)]">
							{isqValue} ISQ
						</div>
					)}
				</div>
			</div>

			{/* Interactive ISQ Controls (Osstell / Penguin RFA) */}
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
						<TrendingUp size={15} className="text-[var(--teal,#0d9488)]" />
						<span>Показатель стабилометрии ISQ День 0 (Osstell / Penguin RFA):</span>
					</span>
					<span className="text-sm font-mono font-black text-[var(--teal,#0d9488)]">
						{isqValue} ISQ
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
					<div className="flex flex-col gap-1">
						<label htmlFor="input-isq-day0" className="text-xs font-bold text-[var(--ink)]">
							Числовое значение ISQ (шкала 35–85):
						</label>
						<input
							id="input-isq-day0"
							type="number"
							min="35"
							max="85"
							value={isqValue}
							onChange={(e) => {
								const val = Number(e.target.value);
								if (!isNaN(val)) setIsqValue(val);
							}}
							className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
							data-testid="input-isq-day0"
							aria-label="Числовое значение ISQ День 0"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label htmlFor="slider-isq-day0" className="text-xs font-bold text-[var(--ink)]">
							Ползунок стабилометрии:
						</label>
						<input
							id="slider-isq-day0"
							type="range"
							min="35"
							max="85"
							step="1"
							value={isqValue}
							onChange={(e) => setIsqValue(Number(e.target.value))}
							className="w-full h-3 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)] mt-2"
							data-testid="slider-isq-day0"
							aria-label="Ползунок шкалы ISQ"
						/>
					</div>
				</div>

				{/* Quick ISQ Presets */}
				<div className="flex flex-wrap gap-2 pt-1">
					<button
						type="button"
						onClick={() => {
							setIsqValue(55);
							setIsIsqEnabled(true);
						}}
						className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] cursor-pointer touch-manipulation"
						data-testid="btn-isq-preset-55"
					>
						ISQ 55 (&lt; 60: Низкая)
					</button>
					<button
						type="button"
						onClick={() => {
							setIsqValue(68);
							setIsIsqEnabled(true);
						}}
						className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] cursor-pointer touch-manipulation"
						data-testid="btn-isq-preset-68"
					>
						ISQ 68 (60–70: Стандарт)
					</button>
					<button
						type="button"
						onClick={() => {
							setIsqValue(75);
							setIsIsqEnabled(true);
						}}
						className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] cursor-pointer touch-manipulation"
						data-testid="btn-isq-preset-75"
					>
						ISQ 75 (&gt; 70: Высокая)
					</button>
				</div>

				{/* Clinical Interpretation Badge */}
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
			</div>

			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] leading-relaxed">
				<strong className="text-[var(--ink)] block mb-1">
					Клинический регламент и протокол (Автономия врача):
				</strong>
				CRM не симулирует микро-замеры 16 точек анизотропии в перчатках у кресла. Зафиксирован надежный первичный торк {torqueNcm} Н·см, ISQ {isqValue} и плотность кости {boneDensity}. Данные автоматически экспортируются в карту 043/у.
			</div>
		</div>
	);
};
