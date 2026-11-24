import React from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import {
	EXTRACTION_COMPLEXITY_OPTIONS,
	type ExtractionComplexity,
} from "../../../surgery/surgeryCatalogData";

export interface ExtractionComplexitySelectorProps {
	readonly complexity: ExtractionComplexity;
	readonly onComplexityChange: (newComp: ExtractionComplexity) => void;
	readonly onAddServicesToInvoice: () => void;
}

export const ExtractionComplexitySelector: React.FC<ExtractionComplexitySelectorProps> = ({
	complexity,
	onComplexityChange,
	onAddServicesToInvoice,
}) => {
	return (
		<div className="space-y-1.5" data-testid="extraction-complexity-section">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted)]">Сложность экстракции (Услуга):</span>
				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="btn btn--secondary text-xs font-semibold text-[var(--primary)] bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--paper)] flex items-center gap-1 cursor-pointer min-h-[44px] px-3 py-1.5 rounded-xl touch-manipulation"
					data-testid="btn-extraction-add-to-invoice"
					title="Добавить хирургические услуги в смету визита"
				>
					<Plus size={14} />
					<span>В смету</span>
				</button>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
				{EXTRACTION_COMPLEXITY_OPTIONS.map((opt) => {
					const isSel = complexity === opt.id;
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => onComplexityChange(opt.id)}
							className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
								isSel
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"
							}`}
							data-testid={`btn-extraction-complexity-${opt.id}`}
						>
							<div className="flex flex-col min-w-0">
								<span className="font-semibold whitespace-normal break-words leading-tight text-xs">
									{opt.labelRu.split("(")[0]?.trim()}
								</span>
							</div>
							{isSel && <CheckCircle2 size={16} className="text-white shrink-0 ml-1" />}
						</button>
					);
				})}
			</div>
		</div>
	);
};
