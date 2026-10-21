import React from "react";
import { Check } from "lucide-react";
import { CANONICAL_6_ORTHOPEDIC_CHIPS } from "./constructionConstants";

export interface DrawerQuickConstructionChipsProps {
	formConstruction: string;
	onSelectConstruction: (val: string) => void;
	setFormTeethInput: (val: string) => void;
}

export function DrawerQuickConstructionChips({
	formConstruction, onSelectConstruction, setFormTeethInput,
}: DrawerQuickConstructionChipsProps): React.JSX.Element {
	return (
		<>
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">
						Экспресс-выбор конструкции (1 клик):
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
					{CANONICAL_6_ORTHOPEDIC_CHIPS.map((c) => {
						const isSelected =
							formConstruction === c.id ||
							("canonicalId" in c && formConstruction === (c as any).canonicalId);
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => onSelectConstruction(c.id)}
								title={c.label}
								className={`min-h-[34px] px-2 py-1 rounded-lg border text-left text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center justify-between gap-1 ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-xs"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper,#ffffff)]"
								}`}
								data-testid={`quick-construction-${c.id}`}
							>
								<span className="truncate">{c.shortLabel}</span>
								{isSelected && <Check size={12} className="shrink-0" />}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
				<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Пресеты:</span>
				{[
					{ label: "16", val: "16" },
					{ label: "11, 21", val: "11, 21" },
					{ label: "1.6", val: "16" },
					{ label: "2.1", val: "21" },
				].map((p) => (
					<button
						key={p.label}
						type="button"
						onClick={() => setFormTeethInput(p.val)}
						className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] hover:border-[var(--teal)] font-bold text-[10.5px] shadow-2xs transition cursor-pointer"
					>
						{p.label}
					</button>
				))}
			</div>
		</>
	);
}
