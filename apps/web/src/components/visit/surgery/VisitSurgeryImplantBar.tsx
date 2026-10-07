import React, { useState } from "react";
import { Sparkles, Zap, Plus, Check } from "lucide-react";
import type { StandardImplantationParams } from "../../surgery/surgeryProtocols";

export interface VisitSurgeryImplantBarProps {
	readonly implantBrand: string;
	readonly setImplantBrand: (b: string) => void;
	readonly implantDiameter: number;
	readonly setImplantDiameter: (d: number) => void;
	readonly implantLength: number;
	readonly setImplantLength: (l: number) => void;
	readonly implantTorque: number;
	readonly setImplantTorque: (t: number) => void;
	readonly implantIsq: number;
	readonly setImplantIsq: (i: number) => void;
	readonly implantCap: "fdm" | "plug";
	readonly setImplantCap: (c: "fdm" | "plug") => void;
	readonly implantSuture: string;
	readonly setImplantSuture: (s: string) => void;
	readonly onApplyPreset: (overrides?: Partial<StandardImplantationParams>) => void;
}

const EXTENDED_SYSTEMS = [
	{ brand: "Dentium", model: "SuperLine" },
	{ brand: "Osstem", model: "TS III" },
	{ brand: "Straumann", model: "BLX" },
	{ brand: "Nobel Biocare", model: "Parallel CC" },
	{ brand: "Astra Tech", model: "EV" },
	{ brand: "Ankylos", model: "C/X" },
	{ brand: "MIS", model: "V3 / C1" },
	{ brand: "MegaGen", model: "AnyRidge" },
];

export const VisitSurgeryImplantBar: React.FC<VisitSurgeryImplantBarProps> = ({
	implantBrand,
	setImplantBrand,
	implantDiameter,
	setImplantDiameter,
	implantLength,
	setImplantLength,
	implantTorque,
	setImplantTorque,
	implantIsq,
	setImplantIsq,
	implantCap,
	setImplantCap,
	implantSuture,
	setImplantSuture,
	onApplyPreset,
}) => {
	const [isCustomBrandOpen, setIsCustomBrandOpen] = useState(false);
	const [customBrandName, setCustomBrandName] = useState("");

	const handleCustomBrandSubmit = () => {
		const trimmed = customBrandName.trim();
		if (!trimmed) return;
		setImplantBrand(trimmed);
		onApplyPreset({ brand: trimmed, model: "Custom" });
		setIsCustomBrandOpen(false);
	};

	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
			data-testid="visit-surgery-implant-bar"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
					<Sparkles size={15} />
					<span>Пресет имплантации:</span>
				</div>
				<button
					type="button"
					onClick={() => onApplyPreset()}
					className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-2 cursor-pointer shadow-xs hover:opacity-95 transition-all touch-manipulation"
					data-testid="btn-preset-standard-implant-tab"
					title="Стандартная имплантация (торк 35 Н*см, ISQ 72, ФДМ, швы Prolene 4-0, контрольный снимок)"
				>
					<Zap size={14} className="text-amber-300" />
					<span>Стандартная имплантация (торк 35 Н*см, ISQ 72, ФДМ, Prolene 4-0, снимок)</span>
				</button>
			</div>

			{/* Быстрые параметры */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
				{/* Система */}
				<div className="space-y-1">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-bold text-[var(--muted)]">Система:</span>
						<button
							type="button"
							onClick={() => setIsCustomBrandOpen(!isCustomBrandOpen)}
							className="text-[10px] text-[var(--teal,#0d9488)] font-bold hover:underline cursor-pointer"
							data-testid="btn-toggle-custom-brand"
						>
							{isCustomBrandOpen ? "Закрыть" : "+ Своя система"}
						</button>
					</div>

					{isCustomBrandOpen ? (
						<div className="flex items-center gap-1">
							<input
								type="text"
								value={customBrandName}
								onChange={(e) => setCustomBrandName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCustomBrandSubmit()}
								placeholder="Название бренда..."
								className="min-h-[38px] px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] flex-1"
								data-testid="input-custom-brand-name"
							/>
							<button
								type="button"
								onClick={handleCustomBrandSubmit}
								className="min-h-[38px] px-2.5 rounded-lg bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] text-xs font-bold shrink-0"
								data-testid="btn-apply-custom-brand"
							>
								<Check size={14} />
							</button>
						</div>
					) : (
						<div className="flex items-center gap-1 flex-wrap">
							{EXTENDED_SYSTEMS.map((s) => (
								<button
									key={s.brand}
									type="button"
									onClick={() =>
										onApplyPreset({ brand: s.brand, model: s.model })
									}
									className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
										implantBrand === s.brand
											? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
											: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
									}`}
									data-testid={`btn-implant-system-${s.brand}`}
								>
									{s.brand}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Размер (Ø × длина) */}
				<div className="space-y-1">
					<span className="text-[11px] font-bold text-[var(--muted)]">Размер (Ø × Длина):</span>
					<div className="flex items-center gap-1 flex-wrap">
						{[
							{ dia: 3.5, len: 10.0 },
							{ dia: 4.0, len: 10.0 },
							{ dia: 4.3, len: 11.5 },
							{ dia: 4.5, len: 10.0 },
							{ dia: 4.0, len: 11.5 },
						].map((sz) => (
							<button
								key={`${sz.dia}-${sz.len}`}
								type="button"
								onClick={() =>
									onApplyPreset({ diameterMm: sz.dia, lengthMm: sz.len })
								}
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
						{[
							{ torque: 35, isq: 72, label: "35 Н/см (ISQ 72)" },
							{ torque: 45, isq: 75, label: "45 Н/см (ISQ 75)" },
						].map((st) => (
							<button
								key={st.torque}
								type="button"
								onClick={() =>
									onApplyPreset({ torqueNcm: st.torque, isq: st.isq })
								}
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
							onClick={() =>
								onApplyPreset({ capType: "fdm", sutureMaterial: "Prolene 4-0" })
							}
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
							onClick={() =>
								onApplyPreset({ capType: "plug", sutureMaterial: "Vicryl 4-0" })
							}
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
			</div>
		</div>
	);
};

export default VisitSurgeryImplantBar;
