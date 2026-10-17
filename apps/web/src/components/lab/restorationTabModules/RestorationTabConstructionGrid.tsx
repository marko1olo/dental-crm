import React from "react";
import { CONSTRUCTION_TYPES, LAB_MATERIALS, type JawScope, isJawWideConstruction } from "../labMath";

export interface RestorationTabConstructionGridProps {
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	jawScope?: JawScope | null | undefined;
	setJawScope?: ((scope: JawScope | null) => void) | undefined;
}

export function RestorationTabConstructionGrid({
	constructionType,
	setConstructionType,
	material,
	setMaterial,
	jawScope,
	setJawScope,
}: RestorationTabConstructionGridProps) {
	return (
		<div className="space-y-3">
			<div>
				<label className="block text-xs font-bold text-[var(--ink)] mb-1.5">Тип конструкции:</label>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{CONSTRUCTION_TYPES.slice(0, 6).map((c) => {
						const isSel = constructionType === c.id;
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => {
									setConstructionType(c.id);
									if (isJawWideConstruction(c.id) && !jawScope) setJawScope?.("upper");
								}}
								className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer min-h-[44px] ${
									isSel
										? "bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-200 font-bold ring-1 ring-teal-500"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<div>{c.name}</div>
								<div className="text-[10px] text-[var(--muted)] font-normal">{c.category}</div>
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<label className="block text-xs font-bold text-[var(--ink)] mb-1.5">Материал изготовления:</label>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{LAB_MATERIALS.slice(0, 6).map((m) => {
						const isSel = material === m.id;
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => setMaterial(m.id)}
								className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer min-h-[44px] ${
									isSel
										? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<div>{m.name}</div>
								<div className="text-[10px] text-[var(--muted)] font-normal">{m.category}</div>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
