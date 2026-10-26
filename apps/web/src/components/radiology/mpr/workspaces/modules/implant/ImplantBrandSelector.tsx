import React from "react";
import type { ImplantBrandKey } from "../../../../implantSafetyEngine";
import { IMPLANT_BRANDS } from "./implantWorkspaceTypes";

export interface ImplantBrandSelectorProps {
	readonly selectedBrand: string;
	readonly onSelectBrand?: ((brand: ImplantBrandKey) => void) | undefined;
	readonly articleNumber: string;
}

export const ImplantBrandSelector: React.FC<ImplantBrandSelectorProps> = ({
	selectedBrand, onSelectBrand, articleNumber,
}) => {
	return (
		<div className="flex flex-col gap-1" data-testid="cbct-selected-implant-card">
			<div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
				<span>Производитель имплантата:</span>
				<span className="text-zinc-500 font-mono text-[9px]">{articleNumber}</span>
			</div>
			<div className="grid grid-cols-5 gap-1">
				{IMPLANT_BRANDS.map((b) => (
					<button
						key={b.key}
						type="button"
						onClick={() => onSelectBrand?.(b.key)}
						className={`py-1 px-1 rounded text-[11px] font-semibold text-center truncate border transition-colors cursor-pointer ${
							selectedBrand === b.key
								? "bg-amber-950/70 text-amber-200 border-amber-500/50 shadow-xs font-bold"
								: "bg-zinc-900 text-zinc-300 hover:text-zinc-200 border-zinc-800"
						}`}
						data-testid={`cbct-implant-brand-${b.key}`}
					>
						{b.label}
					</button>
				))}
			</div>
		</div>
	);
};
