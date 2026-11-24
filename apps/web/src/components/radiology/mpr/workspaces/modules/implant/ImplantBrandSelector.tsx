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
		<div className="flex flex-col gap-1.5" data-testid="cbct-selected-implant-card">
			<div className="flex items-center justify-between text-xs font-medium text-[var(--ink-muted)]">
				<span>Производитель имплантата:</span>
				<span className="text-[var(--ink-muted)] font-mono text-xs">{articleNumber}</span>
			</div>
			<div className="grid grid-cols-5 gap-1.5">
				{IMPLANT_BRANDS.map((b) => (
					<button
						key={b.key}
						type="button"
						onClick={() => onSelectBrand?.(b.key)}
						className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold text-center truncate border transition-colors cursor-pointer touch-manipulation ${
							selectedBrand === b.key
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
								: "bg-[var(--paper-soft)] text-[var(--ink)] hover:text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]"
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
