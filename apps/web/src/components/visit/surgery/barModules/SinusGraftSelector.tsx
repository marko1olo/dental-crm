import React from "react";
import { Plus, CheckCircle2 } from "lucide-react";

export interface SinusGraftSelectorProps {
	readonly selectedGraft: string;
	readonly onGraftSelect: (graft: string) => void;
	readonly onAddServicesToInvoice: () => void;
}

const GRAFT_OPTIONS = [
	{ label: "Ксеногенный гранулят 0.5 см³", short: "Ксеногранулят 0.5 см³" },
	{ label: "Аллогенный костный матрикс", short: "Алломатрикс" },
	{ label: "Аутогенная костная стружка", short: "Аутостружка" },
	{ label: "Синтетический фосфат кальция / бета-ТКФ", short: "Бета-ТКФ" },
] as const;

export const SinusGraftSelector: React.FC<SinusGraftSelectorProps> = ({
	selectedGraft,
	onGraftSelect,
	onAddServicesToInvoice,
}) => {
	return (
		<div className="space-y-1.5" data-testid="sinus-graft-section">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted)]">Костный графт (Остеопластика):</span>
				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2 touch-manipulation"
					data-testid="btn-sinus-add-to-invoice"
					title="Добавить услуги синус-лифтинга и аугментации в смету"
				>
					<Plus size={14} />
					<span>В смету</span>
				</button>
			</div>
			<div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Выбор костного материала">
				{GRAFT_OPTIONS.map((g) => {
					const isSel = selectedGraft.includes(g.short) || selectedGraft === g.label;
					return (
						<button
							key={g.short}
							type="button"
							onClick={() => onGraftSelect(g.label)}
							className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
								isSel
									? "bg-[var(--primary)] text-white shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)]"
							}`}
							data-testid={`btn-graft-${g.short.replace(/[\s.]+/g, "-")}`}
						>
							{isSel && <CheckCircle2 size={13} className="shrink-0" />}
							<span>{g.short}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
