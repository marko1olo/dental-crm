import React from "react";
import { Sparkles, Zap } from "lucide-react";
import type { StandardImplantationParams } from "../../surgery/surgeryProtocols";
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
	implantLength,
	implantTorque,
	implantCap,
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
					title="Стандартный протокол: установка дентального имплантата с ФДМ (1 клик)"
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
		</div>
	);
};

export default VisitSurgeryImplantBar;
