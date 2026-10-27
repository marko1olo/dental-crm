import React from "react";
import { type JawScope, isJawWideConstruction } from "../labMath";

export interface DentalLabOrthopedicConstructionGridProps {
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	jawScope?: JawScope | null | undefined;
	setJawScope?: ((scope: JawScope | null) => void) | undefined;
}

export const CANONICAL_6_CONSTRUCTIONS = [
	{ id: "single_crown", name: "Коронка", sub: "Одиночная анатомическая", category: "Несъемное" },
	{ id: "veneer", name: "Винир", sub: "Керамический винир", category: "Эстетика" },
	{ id: "bridge", name: "Мостовидный протез", sub: "С опорой на зубы", category: "Несъемное" },
	{ id: "inlay_onlay", name: "Вкладка / Накладка", sub: "Inlay / Onlay / Overlay", category: "Микропротезирование" },
	{ id: "clasp_denture", name: "Съемный протез", sub: "Бюгельный / пластиночный", category: "Съемное" },
	{ id: "implant_abutment", name: "Абатмент / Индивидуальная балка", sub: "Винтовая фиксация Ti-Base", category: "Имплантология" },
] as const;

export const CANONICAL_5_MATERIALS = [
	{ id: "zirconia_multilayer", name: "Диоксид циркония (Katana / Prettau)", sub: "ZrO₂ Multi-layer (1150 МПа)", category: "Цирконий" },
	{ id: "emax_press", altId: "emax_lithium_disilicate", name: "Пресс-керамика E.max", sub: "IPS e.max Press (470 МПа)", category: "Стеклокерамика" },
	{ id: "pfm_cocr", name: "Металлокерамика (CoCr)", sub: "Классический сплав CoCr", category: "Металл" },
	{ id: "pmma_temporary", name: "PMMA временная", sub: "CAD/CAM провизорная", category: "Временная" },
	{ id: "lithium_disilicate_cad", altId: "emax_lithium_disilicate", name: "Дисиликат лития", sub: "CAD/CAM фрезерование", category: "Стеклокерамика" },
] as const;

export function DentalLabOrthopedicConstructionGrid({
	constructionType,
	setConstructionType,
	material,
	setMaterial,
	jawScope,
	setJawScope,
}: DentalLabOrthopedicConstructionGridProps) {
	return (
		<div className="space-y-3">
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<label className="text-xs font-bold text-[var(--ink)]">1. Тип изделия (ортопедическая конструкция):</label>
					<span className="text-[10px] font-semibold text-[var(--muted)]">1-тап выбор</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{CANONICAL_6_CONSTRUCTIONS.map((c) => {
						const isSel = constructionType === c.id;
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => {
									setConstructionType(c.id);
									if (isJawWideConstruction(c.id) && !jawScope) setJawScope?.("upper");
								}}
								className={`min-h-[44px] sm:min-h-[38px] p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex flex-col justify-center ${
									isSel
										? "bg-teal-500/10 border-[var(--teal,#0d9488)] text-teal-900 dark:text-teal-200 font-bold ring-1 ring-[var(--teal,#0d9488)] shadow-2xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`construction-type-${c.id}`}
							>
								<div className="leading-tight font-bold">{c.name}</div>
								<div className="text-[10px] text-[var(--muted)] font-normal mt-0.5">{c.sub}</div>
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<div className="flex items-center justify-between mb-1.5">
					<label className="text-xs font-bold text-[var(--ink)]">2. Материал изготовления конструкции:</label>
					<span className="text-[10px] font-semibold text-[var(--muted)]">1-тап выбор</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{CANONICAL_5_MATERIALS.map((m) => {
						const isSel = material === m.id || ("altId" in m && material === m.altId);
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => setMaterial(m.id)}
								className={`min-h-[44px] sm:min-h-[38px] p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex flex-col justify-center ${
									isSel
										? "bg-teal-500/10 border-[var(--teal,#0d9488)] text-teal-900 dark:text-teal-200 font-bold ring-1 ring-[var(--teal,#0d9488)] shadow-2xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`material-type-${m.id}`}
							>
								<div className="leading-tight font-bold">{m.name}</div>
								<div className="text-[10px] text-[var(--muted)] font-normal mt-0.5">{m.sub}</div>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default DentalLabOrthopedicConstructionGrid;
