/**
 * OrthodonticMaterialsQuickSelector.tsx — Панель быстрого 1-клик выбора ортодонтических материалов.
 * (Мандаты 8d — 0 эмодзи, 8e — Doctor Autonomy, 8b — <= 800 строк).
 *
 * Позволяет ортодонту в 1 клик выбирать брекет-системы, дуги, элайнеры и микровинты
 * из канонического каталога 90% рынка РФ/СНГ без ручной печати текста.
 */

import {
	type ClinicalMarketMaterialItem,
	searchClinicalMaterials,
} from "@dental/shared";
import { Award, Check, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { BracesBracket } from "../icons/DentalIcons";

export type OrthoCategoryFilter = "all" | "brackets" | "wires" | "aligners" | "miniscrews";

export interface OrthodonticMaterialsQuickSelectorProps {
	readonly selectedMaterialId?: string | undefined;
	readonly onSelectMaterial: (material: ClinicalMarketMaterialItem) => void;
	readonly compact?: boolean | undefined;
}

const CATEGORY_TABS: readonly { readonly id: OrthoCategoryFilter; readonly label: string }[] = [
	{ id: "all", label: "Все (90% рынка)" },
	{ id: "brackets", label: "Брекеты" },
	{ id: "wires", label: "Дуги" },
	{ id: "aligners", label: "Элайнеры" },
	{ id: "miniscrews", label: "Микровинты" },
];

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

		if (activeCategory === "brackets") {
			return orthoOnly.filter((m) => m.domain === "ortho_bracket");
		}
		if (activeCategory === "wires") {
			return orthoOnly.filter((m) => m.domain === "ortho_archwire");
		}
		if (activeCategory === "aligners") {
			return orthoOnly.filter((m) => m.domain === "ortho_aligner");
		}
		if (activeCategory === "miniscrews") {
			return orthoOnly.filter((m) => m.domain === "ortho_miniscrew");
		}
		return orthoOnly;
	}, [searchQuery, activeCategory]);

	return (
		<div className="flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
			{/* Header */}
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

			{/* Category Filter Segmented Bar */}
			<div className="dente-segmented-bar flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0 shadow-2xs">
				{CATEGORY_TABS.map((tab) => {
					const isActive = activeCategory === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveCategory(tab.id)}
							className={`dente-segmented-item ${isActive ? "active" : ""}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Search input with Mandate 12 icon overlap protection (38px+ left padding) */}
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

			{/* Materials List */}
			<div
				className={`flex flex-col gap-1.5 overflow-y-auto ${
					compact ? "max-h-[220px]" : "max-h-[320px]"
				}`}
			>
				{filteredMaterials.length === 0 ? (
					<div className="p-4 text-center text-xs text-[var(--muted)]">
						Материалы не найдены
					</div>
				) : (
					filteredMaterials.map((mat) => {
						const isSelected = selectedMaterialId === mat.id;
						const isLeader = mat.marketRank === 1 || mat.isMarketLeader;

						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => onSelectMaterial(mat)}
								className={`flex items-center justify-between p-2 sm:px-2.5 sm:py-2 rounded-lg border text-left transition-all cursor-pointer ${
									isSelected
										? "border-teal-500 bg-teal-500/10 shadow-xs"
										: isLeader
											? "border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10"
											: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<div className="flex-1 min-w-0 mr-2">
									<div className="flex items-center gap-1.5 mb-0.5">
										<span
											className={`text-[11.5px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0 ${
												isLeader
													? "bg-teal-600 text-white"
													: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
											}`}
										>
											{isLeader && <Award size={11} />}
											{isLeader ? "№1" : `№${mat.marketRank}`}
										</span>
										<span className="text-[13px] font-semibold text-[var(--ink)] truncate">
											{mat.brandName}
										</span>
										<span className="text-[11.5px] text-[var(--muted)] truncate">
											({mat.manufacturer})
										</span>
									</div>
									<div className="text-[12px] text-[var(--muted)] truncate">
										{mat.nameRu}
									</div>
								</div>

								<div className="flex items-center gap-2 shrink-0">
									<span className="text-[12.5px] font-semibold text-[var(--ink)]">
										{mat.approximatePriceRub.toLocaleString("ru-RU")} ₽
									</span>
									{isSelected && <Check size={14} className="text-teal-600 dark:text-teal-400" />}
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
