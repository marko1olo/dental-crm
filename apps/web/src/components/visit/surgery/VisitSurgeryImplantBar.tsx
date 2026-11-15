import React from "react";
import { Sparkles, Zap } from "lucide-react";
import type { StandardImplantationParams } from "../../surgery/surgeryCatalogData";
import { ImplantSystemSelector } from "./barModules/ImplantSystemSelector";
import { ImplantParametersGrid } from "./barModules/ImplantParametersGrid";

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
					title="Стандартный протокол: установка дентального имплантата с ФДМ"
				>
					<Zap size={14} className="text-amber-300" />
					<span>Стандартная имплантация с ФДМ</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
				<ImplantSystemSelector
					implantBrand={implantBrand}
					setImplantBrand={setImplantBrand}
					onApplyPreset={onApplyPreset}
				/>
				<ImplantParametersGrid
					implantDiameter={implantDiameter}
					implantLength={implantLength}
					implantTorque={implantTorque}
					implantCap={implantCap}
					onApplyPreset={onApplyPreset}
				/>
			</div>

			{/* Индивидуальная настройка стабильности ISQ и шовного материала */}
			<div className="pt-2 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">Стабильность ISQ (55–85):</span>
					<div className="flex items-center gap-1">
						<input
							type="number"
							min={55}
							max={85}
							value={implantIsq || 72}
							onChange={(e) => {
								const val = Number(e.target.value);
								if (!Number.isNaN(val)) setImplantIsq(val);
							}}
							className="w-16 h-8 px-2 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-mono text-xs font-bold text-center focus:border-[var(--teal,#0d9488)] outline-none"
							data-testid="input-implant-isq"
							title="Коэффициент первичной стабильности имплантата ISQ (шкала Остелл 55–85)"
						/>
						{[65, 72, 75, 80].map((presetIsq) => (
							<button
								key={presetIsq}
								type="button"
								onClick={() => setImplantIsq(presetIsq)}
								className={`h-8 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
									implantIsq === presetIsq
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
										: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]"
								}`}
								data-testid={`btn-preset-isq-${presetIsq}`}
							>
								{presetIsq}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">Шовный материал:</span>
					<div className="flex items-center gap-1 flex-wrap">
						{["Prolene 4-0", "Vicryl 4-0", "Glycolon 5-0", "ПГА 4-0"].map((suture) => (
							<button
								key={suture}
								type="button"
								onClick={() => setImplantSuture(suture)}
								className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									implantSuture === suture
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-suture-${suture.replace(/\s+/g, "_")}`}
							>
								{suture}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default VisitSurgeryImplantBar;
