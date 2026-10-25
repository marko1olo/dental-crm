/**
 * ProtocolBoneTorqueInputs.tsx — Ввод плотности кости (Misch D1..D4) и хирургического торка (Мандаты 8b, 8e, 8am).
 * Ввод в 1 клик: D1..D4 и тактильные кнопки торка (15, 25, 30, 35, 40, 45, 50 Н·см).
 */
import React from "react";
import { MISCH_DENSITY_NOTES } from "../presets/implantPresetConstants";
import type { MischDensity } from "../presets/implantPresetTypes";

export interface ProtocolBoneTorqueInputsProps {
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (t: number) => void;
}

const TORQUE_PRESETS = [15, 25, 30, 35, 40, 45, 50] as const;

export const ProtocolBoneTorqueInputs: React.FC<ProtocolBoneTorqueInputsProps> = ({
	boneDensity,
	setBoneDensity,
	torqueNcm,
	setTorqueNcm,
}) => {
	return (
		<div className="space-y-3">
			<div className="implant-form-row flex items-center justify-between gap-3 flex-wrap">
				<label className="implant-label text-xs font-semibold text-[var(--ink)]">Плотность кости (Misch):</label>
				<div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end">
					{(["D1", "D2", "D3", "D4"] as const).map((density) => (
						<button
							key={density}
							type="button"
							onClick={() => setBoneDensity(density)}
							className={`secondary-button min-h-[36px] px-3 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
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
								onClick={() => setTorqueNcm(val)}
								className={`secondary-button min-h-[36px] px-2.5 text-xs font-mono font-bold rounded-lg border cursor-pointer transition-colors ${
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
						onChange={(e) => setTorqueNcm(Number(e.target.value))}
						className="implant-select min-h-[36px] w-28 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2"
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
	);
};

export default ProtocolBoneTorqueInputs;
