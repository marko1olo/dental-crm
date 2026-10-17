import React from "react";
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

			<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line-subtle)] flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<label className="flex items-center gap-2 cursor-pointer text-[var(--muted)]">
						<input
							type="checkbox"
							checked={isIsqEnabled}
							onChange={(e) => setIsIsqEnabled(e.target.checked)}
							className="rounded"
							data-testid="cb-isq-enabled"
						/>
						<span>Стабильность ISQ (Osstell):</span>
					</label>
					<span className="font-mono font-bold text-[var(--teal,#0d9488)]">
						{isIsqEnabled ? `${isqValue} ISQ` : "72 ISQ (базовый)"}
					</span>
				</div>
				{isImmediateLoadingFeasible && (
					<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] px-2 py-0.5 rounded-md">
						Немедленная нагрузка возможна
					</span>
				)}
			</div>
		</div>
	);
};
