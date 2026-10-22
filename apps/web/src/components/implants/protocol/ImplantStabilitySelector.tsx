import React from "react";
import { TrendingUp } from "lucide-react";
import { MISCH_DENSITY_NOTES } from "../presets/implantPresetConstants";
import type { MischDensity } from "../presets/implantPresetTypes";

export interface ImplantStabilitySelectorProps {
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (t: number) => void;
	readonly isIsqEnabled: boolean;
	readonly setIsIsqEnabled: (en: boolean) => void;
	readonly isqValue?: number | undefined;
	readonly setIsqValue?: ((val: number) => void) | undefined;
}

const TORQUE_PRESETS = [15, 25, 30, 35, 40, 45, 50] as const;

export const ImplantStabilitySelector: React.FC<ImplantStabilitySelectorProps> = ({
	boneDensity,
	setBoneDensity,
	torqueNcm,
	setTorqueNcm,
	isIsqEnabled,
	setIsIsqEnabled,
	isqValue = 72,
	setIsqValue,
}) => {
	const effectiveIsq = isIsqEnabled ? isqValue : 72;
	const isImmediateLoadingFeasible = torqueNcm >= 35 && torqueNcm <= 55 && effectiveIsq >= 70;

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
					Первичный торк (Н·см):
				</label>
				<div className="flex items-center gap-1.5 flex-wrap flex-1">
					{TORQUE_PRESETS.map((val) => (
						<button
							key={val}
							type="button"
							onClick={() => setTorqueNcm(val)}
							className={`secondary-button min-h-[36px] px-2.5 text-xs font-mono font-bold ${
								torqueNcm === val ? "active bg-[var(--teal,#0d9488)] text-white" : ""
							}`}
							data-testid={`btn-quick-torque-${val}`}
						>
							{val}
						</button>
					))}
					<select
						id="select-torque"
						value={torqueNcm}
						onChange={(e) => setTorqueNcm(Number(e.target.value))}
						className="implant-select min-h-[36px] w-24 text-xs font-mono font-bold"
						data-testid="select-torque"
					>
						{TORQUE_PRESETS.map((val) => (
							<option key={val} value={val}>{val} Н·см</option>
						))}
					</select>
				</div>
			</div>

			<div className="pt-2 border-t border-[var(--line-subtle)] space-y-2">
				<div className="flex items-center justify-between text-xs flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-2 cursor-pointer text-[var(--ink)] font-semibold">
							<input
								type="checkbox"
								checked={isIsqEnabled}
								onChange={(e) => setIsIsqEnabled(e.target.checked)}
								className="rounded"
								data-testid="cb-isq-enabled"
							/>
							<TrendingUp size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Стабильность ISQ (Osstell / Penguin):</span>
						</label>
						<span className="font-mono font-bold text-[var(--teal,#0d9488)]">
							{isIsqEnabled ? `${isqValue} ISQ` : "72 ISQ (базовый)"}
						</span>
					</div>

					{isIsqEnabled && setIsqValue && (
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min="1"
								max="100"
								value={isqValue}
								onChange={(e) => {
									const raw = e.target.value;
									if (raw === "") return;
									const val = Number(raw);
									if (!isNaN(val)) {
										setIsqValue(Math.max(1, Math.min(100, val)));
									}
								}}
								className="w-16 h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-mono font-bold text-center text-[var(--ink)]"
								data-testid="input-isq-quick"
								title="Значение ISQ (1–100)"
							/>
							<button
								type="button"
								onClick={() => setIsqValue(72)}
								className="px-2 py-1 rounded-md text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,#0d9488)] text-[var(--ink)]"
								data-testid="btn-isq-quick-72"
							>
								72
							</button>
							<button
								type="button"
								onClick={() => setIsqValue(68)}
								className="px-2 py-1 rounded-md text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,#0d9488)] text-[var(--ink)]"
								data-testid="btn-isq-quick-68"
							>
								68
							</button>
							<button
								type="button"
								onClick={() => setIsqValue(55)}
								className="px-2 py-1 rounded-md text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--amber,#f59e0b)] text-[var(--ink)]"
								data-testid="btn-isq-quick-55"
							>
								55
							</button>
						</div>
					)}
				</div>

				{/* Пассивный цветовой бейдж стабильности */}
				<div
					className={`p-2 rounded-lg border text-xs leading-normal flex items-center justify-between gap-2 ${
						effectiveIsq < 60
							? "bg-[var(--amber-surface,rgba(245,158,11,0.08))] border-[var(--amber,#f59e0b)] text-[var(--ink)]"
							: effectiveIsq < 70
								? "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
								: "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] font-bold"
					}`}
					data-testid="isq-stability-passive-badge"
				>
					<span>
						{effectiveIsq < 60 ? (
							<>Низкая стабильность (ISQ &lt; 60) · Двухэтапный протокол с винтом-заглушкой</>
						) : effectiveIsq < 70 ? (
							<>Стандартная стабильность (ISQ 60–69) · Стандартный протокол остеоинтеграции</>
						) : (
							<>Высокая стабильность (ISQ &ge; 70) · Клинически обоснована ранняя / немедленная нагрузка</>
						)}
					</span>
					{isImmediateLoadingFeasible && (
						<span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--teal,#0d9488)] shrink-0 bg-[var(--paper)] px-2 py-0.5 rounded border border-[var(--teal,#0d9488)]">
							Немедленная нагрузка
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
