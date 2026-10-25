import {
	type ClinicalMarketMaterialItem,
	searchClinicalMaterials,
} from "@dental/shared";
import { Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { BracesBracket } from "../icons/DentalIcons";
import {
	type OrthoCategoryFilter,
	MaterialCategoryTabs,
} from "./materialsSelector/MaterialCategoryTabs";
import { MaterialCardItem } from "./materialsSelector/MaterialCardItem";

export type { OrthoCategoryFilter };

export interface OrthodonticMaterialsQuickSelectorProps {
	readonly selectedMaterialId?: string | undefined;
	readonly onSelectMaterial: (material: ClinicalMarketMaterialItem) => void;
	readonly compact?: boolean | undefined;
}

export function OrthodonticMaterialsQuickSelector({
	selectedMaterialId,
	onSelectMaterial,
	compact = false,
}: OrthodonticMaterialsQuickSelectorProps) {
	const [activeCategory, setActiveCategory] = useState<OrthoCategoryFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredMaterials = useMemo(() => {
		const allMaterials = searchClinicalMaterials(searchQuery);
		const orthoOnly = allMaterials.filter((m) => m.domain.startsWith("ortho_"));

		if (activeCategory === "brackets") return orthoOnly.filter((m) => m.domain === "ortho_bracket");
		if (activeCategory === "wires") return orthoOnly.filter((m) => m.domain === "ortho_archwire");
		if (activeCategory === "aligners") return orthoOnly.filter((m) => m.domain === "ortho_aligner");
		if (activeCategory === "miniscrews") return orthoOnly.filter((m) => m.domain === "ortho_miniscrew");
		return orthoOnly;
	}, [searchQuery, activeCategory]);

	return (
		<div className="flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5">
					<BracesBracket size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-[13px] font-semibold text-[var(--ink)]">
						Ортодонтические материалы (90% рынка РФ)
					</span>
				</div>
				<span className="text-[11.5px] text-[var(--muted)] font-medium">
					Быстрый выбор
				</span>
			</div>

			<MaterialCategoryTabs
				activeCategory={activeCategory}
				setActiveCategory={setActiveCategory}
			/>

			<div className="relative">
				<Search
					size={15}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
				/>
				<input
					type="text"
					placeholder="Поиск (Damon, Clarity, 3D Smile, Bio-Ray, Cu-Ni-Ti)..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full h-8 pl-9 pr-3 text-[13px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-teal-500 transition-colors"
					style={{ paddingLeft: "38px" }}
				/>
			</div>

			<div className={`flex flex-col gap-1.5 overflow-y-auto ${compact ? "max-h-[220px]" : "max-h-[320px]"}`}>
				{filteredMaterials.length === 0 ? (
					<div className="p-4 text-center text-xs text-[var(--muted)]">
						Материалы не найдены
					</div>
				) : (
					filteredMaterials.map((mat) => (
						<MaterialCardItem
							key={mat.id}
							mat={mat}
							isSelected={selectedMaterialId === mat.id}
							onSelectMaterial={onSelectMaterial}
						/>
					))
				)}
			</div>
		</div>
	);
}
