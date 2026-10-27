import React from "react";
import type { StandardImplantationParams } from "../../../surgery/surgeryProtocols";

export interface ImplantParametersGridProps {
	readonly implantDiameter: number;
	readonly implantLength: number;
	readonly implantTorque: number;
	readonly implantCap: "fdm" | "plug";
	readonly onApplyPreset: (overrides?: Partial<StandardImplantationParams>) => void;
}

const IMPLANT_SIZES = [
	{ dia: 3.5, len: 10.0 },
	{ dia: 4.0, len: 10.0 },
	{ dia: 4.3, len: 11.5 },
	{ dia: 4.5, len: 10.0 },
	{ dia: 4.0, len: 11.5 },
] as const;

const STABILITY_PRESETS = [
	{ torque: 35, isq: 72, label: "35 Н/см (ISQ 72)" },
	{ torque: 45, isq: 75, label: "45 Н/см (ISQ 75)" },
] as const;

export const ImplantParametersGrid: React.FC<ImplantParametersGridProps> = ({
	implantDiameter,
	implantLength,
	implantTorque,
	implantCap,
	onApplyPreset,
}) => {
	return (
		<>
			{/* Размер (Ø × длина) */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Размер (Ø × Длина):</span>
				<div className="flex items-center gap-1 flex-wrap">
					{IMPLANT_SIZES.map((sz) => (
						<button
							key={`${sz.dia}-${sz.len}`}
							type="button"
							onClick={() => onApplyPreset({ diameterMm: sz.dia, lengthMm: sz.len })}
							className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer touch-manipulation ${
								implantDiameter === sz.dia && implantLength === sz.len
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-implant-size-${sz.dia}-${sz.len}`}
						>
							{`Ø${sz.dia}×${sz.len}`}
						</button>
					))}
				</div>
			</div>

			{/* Торк и ISQ */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Стабильность:</span>
				<div className="flex items-center gap-1 flex-wrap">
					{STABILITY_PRESETS.map((st) => (
						<button
							key={st.torque}
							type="button"
							onClick={() => onApplyPreset({ torqueNcm: st.torque, isq: st.isq })}
							className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								implantTorque === st.torque
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-implant-torque-${st.torque}`}
						>
							{st.label}
						</button>
					))}
				</div>
			</div>

			{/* Заглушка / Швы */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Формирователь & Швы:</span>
				<div className="flex items-center gap-1 flex-wrap">
					<button
						type="button"
						onClick={() => onApplyPreset({ capType: "fdm", sutureMaterial: "Prolene 4-0" })}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
							implantCap === "fdm"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
								: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="btn-implant-cap-fdm"
					>
						ФДМ · Prolene 4-0
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset({ capType: "plug", sutureMaterial: "Vicryl 4-0" })}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
							implantCap === "plug"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
								: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="btn-implant-cap-plug"
					>
						Заглушка · Vicryl
					</button>
				</div>
			</div>
		</>
	);
};
