import React from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import {
	EXTRACTION_COMPLEXITY_OPTIONS,
	type ExtractionComplexity,
} from "../../../surgery/surgeryProtocols";

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
					className="btn btn--secondary text-xs font-bold text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--paper-soft)] dark:bg-slate-900 border border-[var(--line)] dark:border-slate-800 flex items-center gap-1 cursor-pointer min-h-[36px] px-2.5 py-1 rounded-lg touch-manipulation"
					data-testid="btn-extraction-add-to-invoice"
					title="Добавить хирургические услуги в смету визита"
				>
					<Plus size={14} />
					<span>В смету</span>
				</button>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				{EXTRACTION_COMPLEXITY_OPTIONS.map((opt) => {
					const isSel = complexity === opt.id;
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => onComplexityChange(opt.id)}
							className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
								isSel
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-extraction-complexity-${opt.id}`}
						>
							<div className="flex flex-col min-w-0">
								<span className="font-extrabold whitespace-normal break-words leading-tight text-xs">
									{opt.labelRu.split("(")[0]?.trim()}
								</span>
								<span className="text-[10px] opacity-75 font-mono">{opt.code804n}</span>
							</div>
							{isSel && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0 ml-1" />}
						</button>
					);
				})}
			</div>
		</div>
	);
};
