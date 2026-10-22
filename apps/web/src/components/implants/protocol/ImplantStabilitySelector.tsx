import React from "react";
import { Gauge, CheckCircle2 } from "lucide-react";
import { MISCH_DENSITY_NOTES } from "../presets/implantPresetConstants";
import type { MischDensity } from "../presets/implantPresetTypes";

export interface ImplantStabilitySelectorProps {
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (t: number) => void;
	readonly isIsqEnabled?: boolean | undefined;
	readonly setIsIsqEnabled?: ((en: boolean) => void) | undefined;
	readonly isqValue?: number | undefined;
	readonly setIsqValue?: ((val: number) => void) | undefined;
}

const TORQUE_PRESETS = [15, 25, 30, 35, 40, 45, 50] as const;

export const ImplantStabilitySelector: React.FC<ImplantStabilitySelectorProps> = ({
	boneDensity,
	setBoneDensity,
	torqueNcm,
	setTorqueNcm,
}) => {
	const isOptimal = torqueNcm >= 35;
	const isImmediateLoadingFeasible = torqueNcm >= 35 && torqueNcm <= 50;

	return (
		<div className="space-y-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="implant-form-row">
				<label className="implant-label">Плотность кости (Misch):</label>
				<div className="flex items-center gap-1.5 flex-wrap flex-1">
					{(["D1", "D2", "D3", "D4"] as const).map((density) => (
						<button
							key={density}
							type="button"
							onClick={() => setBoneDensity(density)}
							className={`secondary-button min-h-[36px] px-3 text-xs font-bold ${
								boneDensity === density ? "active bg-[var(--teal,#0d9488)] text-white" : ""
							}`}
							title={MISCH_DENSITY_NOTES[density].hint}
							data-testid={`btn-bone-density-${density.toLowerCase()}`}
						>
							{density}
						</button>
					))}
				</div>
			</div>

			<div className="implant-form-row">
				<label className="implant-label" htmlFor="select-torque">
					Первичная стабильность и торк:
				</label>
				<div className="flex items-center gap-1.5 flex-wrap flex-1">
					{TORQUE_PRESETS.map((val) => {
						const isSelected = torqueNcm === val;
						const isStandardOptimum = val === 35;
						return (
							<button
								key={val}
								type="button"
								onClick={() => setTorqueNcm(val)}
								className={`secondary-button min-h-[36px] px-2.5 text-xs font-mono font-bold ${
									isSelected
										? "active bg-[var(--teal,#0d9488)] text-white"
										: isStandardOptimum
											? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)]"
											: ""
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
						onChange={(e) => setTorqueNcm(Number(e.target.value))}
						className="implant-select min-h-[36px] w-28 text-xs font-mono font-bold"
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

			{/* Пассивный клинический индикатор стабильности (без симуляторов физики) */}
			<div
				className={`p-2.5 rounded-lg border text-xs leading-normal flex items-center justify-between gap-2.5 ${
					torqueNcm < 25
						? "bg-[var(--amber-surface,rgba(245,158,11,0.08))] border-[var(--amber,#f59e0b)] text-[var(--ink)]"
						: isOptimal
							? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] font-medium"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
				}`}
				data-testid="isq-stability-passive-badge"
			>
				<div className="flex items-center gap-2 min-w-0">
					{isOptimal ? (
						<CheckCircle2 size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					) : (
						<Gauge size={16} className="text-[var(--amber,#f59e0b)] shrink-0" />
					)}
					<span className="truncate">
						{torqueNcm < 25 ? (
							<>Торк &lt; 25 Н·см · Низкая первичная фиксация (показан винт-заглушка с ушиванием наглухо)</>
						) : isOptimal ? (
							<>Торк {torqueNcm} Н·см · Высокая первичная стабильность (оптимум для ФДМ или немедленной нагрузки)</>
						) : (
							<>Торк {torqueNcm} Н·см · Стандартная первичная стабильность</>
						)}
					</span>
				</div>
				{isImmediateLoadingFeasible && (
					<span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--teal,#0d9488)] shrink-0 bg-[var(--paper)] px-2 py-0.5 rounded border border-[var(--teal,#0d9488)]">
						Немедленная нагрузка
					</span>
				)}
			</div>
		</div>
	);
};

export default ImplantStabilitySelector;
