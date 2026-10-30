/**
 * PassportTorqueAndStability.tsx — Плотность кости (Misch D1–D4), первичная стабильность,
 * торк (15–50 Н·см), пассивный бейдж ISQ и выбор типа ушивания (ФДМ vs винт-заглушка).
 * Запрет процедурных симуляторов ISQ, соблюдение сенсорного минимума >= 44px (Мандаты 8e, 8am, 8ze).
 */

import React from "react";
import { CheckCircle2, Gauge, Zap } from "lucide-react";
import {
	MISCH_DENSITY_NOTES,
	type MischDensity,
	type ImplantCapType,
} from "../implantQuickPresets";

export interface PassportTorqueAndStabilityProps {
	readonly boneDensity: MischDensity;
	readonly onBoneDensityChange: (density: MischDensity) => void;
	readonly torqueNcm: number;
	readonly onTorqueChange: (torque: number) => void;
	readonly isqValue?: number | undefined;
	readonly capType: ImplantCapType;
	readonly onCapTypeChange: (cap: ImplantCapType) => void;
}

const TORQUE_PRESETS = [15, 25, 30, 35, 40, 45, 50] as const;

export const PassportTorqueAndStability: React.FC<PassportTorqueAndStabilityProps> = ({
	boneDensity,
	onBoneDensityChange,
	torqueNcm,
	onTorqueChange,
	isqValue = 72,
	capType,
	onCapTypeChange,
}) => {
	const isOptimal = torqueNcm >= 35;
	const isImmediateLoadingFeasible = torqueNcm >= 35 && torqueNcm <= 50;

	return (
		<div className="passport-torque-and-stability space-y-3.5">
			{/* Плотность кости и торк */}
			<div className="space-y-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs">
				<div className="space-y-3">
					<div className="implant-form-row flex items-center justify-between gap-3 flex-wrap">
						<label className="implant-label text-xs font-semibold text-[var(--ink)]">Плотность кости (Misch):</label>
						<div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end">
							{(["D1", "D2", "D3", "D4"] as const).map((density) => (
								<button
									key={density}
									type="button"
									onClick={() => onBoneDensityChange(density)}
									className={`secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
										boneDensity === density ? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
									title={MISCH_DENSITY_NOTES[density].hint}
									data-testid={`btn-bone-density-${density.toLowerCase()}`}
								>
									{density}
								</button>
							))}
						</div>
					</div>

					<div className="implant-form-row flex items-center justify-between gap-3 flex-wrap">
						<label className="implant-label text-xs font-semibold text-[var(--ink)]" htmlFor="select-torque">
							Первичная стабильность и торк:
						</label>
						<div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end">
							{TORQUE_PRESETS.map((val) => {
								const isSelected = torqueNcm === val;
								const isStandardOptimum = val === 35;
								return (
									<button
										key={val}
										type="button"
										onClick={() => onTorqueChange(val)}
										className={`secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 text-xs font-mono font-bold rounded-xl border cursor-pointer transition-colors ${
											isSelected
												? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
												: isStandardOptimum
													? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)]"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
										data-testid={`btn-quick-torque-${val}`}
										title={isStandardOptimum ? "Клинический оптимум (35 Н·см)" : `${val} Н·см`}
									>
										{val} Н·см
									</button>
								);
							})}
							<select
								id="select-torque"
								value={torqueNcm}
								onChange={(e) => onTorqueChange(Number(e.target.value))}
								className="implant-select min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 w-28 text-xs font-mono font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2"
								data-testid="select-torque"
							>
								{TORQUE_PRESETS.map((val) => (
									<option key={val} value={val}>
										{val} Н·см
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Пассивный бейдж ISQ */}
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

					{isImmediateLoadingFeasible && (
						<span className="text-[10px] font-black uppercase tracking-wider text-[var(--teal,#0d9488)] shrink-0 bg-[var(--paper)] px-2.5 py-1 rounded-xl border border-[var(--teal,#0d9488)] shadow-2xs flex items-center gap-1">
							<Zap size={12} className="shrink-0 text-[var(--teal,#0d9488)]" />
							<span>Немедленная нагрузка</span>
						</span>
					)}
				</div>
			</div>

			{/* Выбор типа ушивания / колпачка */}
			<div className="implant-form-row">
				<label className="implant-label">Тип ушивания / колпачка:</label>
				<div className="flex items-center gap-2 flex-1">
					<button
						type="button"
						onClick={() => onCapTypeChange("fdm")}
						className={`secondary-button flex-1 min-h-[44px] h-11 sm:h-9 sm:min-h-[36px] px-3 text-xs font-bold rounded-xl border ${
							capType === "fdm" ? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
						}`}
						data-testid="btn-cap-type-fdm"
					>
						ФДМ (формирователь десны)
					</button>
					<button
						type="button"
						onClick={() => onCapTypeChange("plug")}
						className={`secondary-button flex-1 min-h-[44px] h-11 sm:h-9 sm:min-h-[36px] px-3 text-xs font-bold rounded-xl border ${
							capType === "plug" ? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
						}`}
						data-testid="btn-cap-type-plug"
					>
						Винт-заглушка (ушивание наглухо)
					</button>
				</div>
			</div>
		</div>
	);
};

export default PassportTorqueAndStability;
