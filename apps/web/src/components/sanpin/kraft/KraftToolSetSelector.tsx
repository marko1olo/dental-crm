/**
 * DENTE CRM — Kraft Package Tool Set Selector Subcomponent
 * SanPiN 3.3686-21 / Statutory Dental Tool Packaging Selector
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandate 8b (Subcomponents <= 500 lines)
 */

import React, { useMemo, useState } from "react";
import { Layers, RotateCcw, Sparkles } from "lucide-react";
import {
	DENTAL_TOOL_SETS_CATALOG,
	getDentalToolSetDefinition,
	type KraftPackageMaterialId,
	type KraftPackageSizeId,
} from "./kraftPackagePresets";

export interface QuickKraftPreset {
	readonly id: string;
	readonly brandNameRu: string;
	readonly dimensionsMm: string;
	readonly materialId: KraftPackageMaterialId;
	readonly sizeId: KraftPackageSizeId;
	readonly shelfLifeDays: number;
	readonly descriptionRu: string;
	readonly badgeTextRu: string;
}

export const POPULAR_KRAFT_PRESETS: readonly QuickKraftPreset[] = [
	{
		id: "sanpin_sealed_30d",
		brandNameRu: "Крафт-пакет запечатанный",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Запечатанный самоклеящийся крафт-пакет (срок сохранения стерильности 30 суток)",
		badgeTextRu: "30 суток (стерильность)",
	},
	{
		id: "azov_100x200_50d",
		brandNameRu: "Azov (Азов) Самоклейка",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 50,
		descriptionRu: "Пакет бумажный самоклеящийся с клейкой полосой (СанПиН 3.3686-21)",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_75x150_50d",
		brandNameRu: "DGM Steriguard 75×150",
		dimensionsMm: "75×150 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_75x150",
		shelfLifeDays: 50,
		descriptionRu: "Самоклеящийся крафт-пакет для боров, эндодонтии и щипцов",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_100x200_30d",
		brandNameRu: "DGM Стандартный крафт",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Бумага мешочная непропитанная (ГОСТ 2228) на скрепках / ленте",
		badgeTextRu: "30 суток",
	},
	{
		id: "clinipak_180d",
		brandNameRu: "Clinipak / DGM Прозрачный",
		dimensionsMm: "100×250 мм",
		materialId: "paper_plastic_pouch",
		sizeId: "size_150x250",
		shelfLifeDays: 180,
		descriptionRu: "Комбинированный прозрачный пакет термосварной (ГОСТ Р ИСО 11607)",
		badgeTextRu: "180 суток (6 мес)",
	},
	{
		id: "euronda_50d",
		brandNameRu: "Euronda Самоклеящийся",
		dimensionsMm: "90×230 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_150x250",
		shelfLifeDays: 50,
		descriptionRu: "Итальянский крафт-пакет с индикатором пара 4 класса",
		badgeTextRu: "50 суток",
	},
];

export interface KraftToolSetSelectorProps {
	readonly selectedToolSetId: string;
	readonly onToolSetChange: (toolSetId: string) => void;
	readonly customItemsText: string;
	readonly onCustomItemsChange: (text: string) => void;
	readonly selectedMaterialId: KraftPackageMaterialId;
	readonly selectedSizeId: KraftPackageSizeId;
	readonly onApplyPopularPreset: (preset: QuickKraftPreset) => void;
}

export const KraftToolSetSelector: React.FC<KraftToolSetSelectorProps> = ({
	selectedToolSetId,
	onToolSetChange,
	customItemsText,
	onCustomItemsChange,
	selectedMaterialId,
	selectedSizeId,
	onApplyPopularPreset,
}) => {
	const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

	const selectedToolSet = useMemo(
		() => getDentalToolSetDefinition(selectedToolSetId),
		[selectedToolSetId],
	);

	const categories = useMemo(() => {
		const set = new Set<string>();
		DENTAL_TOOL_SETS_CATALOG.forEach((item) => {
			if (item.categoryRu) set.add(item.categoryRu);
		});
		return ["all", ...Array.from(set)];
	}, []);

	const filteredToolSets = useMemo(() => {
		if (activeCategoryFilter === "all") {
			return DENTAL_TOOL_SETS_CATALOG;
		}
		return DENTAL_TOOL_SETS_CATALOG.filter(
			(item) => item.categoryRu === activeCategoryFilter,
		);
	}, [activeCategoryFilter]);

	const handleResetToTypical = () => {
		onCustomItemsChange(selectedToolSet.typicalItemsRu.join(", "));
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* Быстрые пресеты упаковок */}
			<div className="kraft-panel-card" style={{ padding: "0.85rem 1rem" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--ink)" }}>
						Быстрые пресеты упаковок:
					</span>
					<span style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
						Стандарты стерилизации
					</span>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
					{POPULAR_KRAFT_PRESETS.map((p) => {
						const isSelected =
							selectedMaterialId === p.materialId && selectedSizeId === p.sizeId;
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => onApplyPopularPreset(p)}
								className="sanpin-tag touch-manipulation"
								style={{
									cursor: "pointer",
									minHeight: "44px",
									fontSize: "0.82rem",
									padding: "0.5rem 0.85rem",
									borderRadius: "8px",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									border: isSelected
										? "2px solid var(--teal, #0d9488)"
										: "1px solid var(--line, #cbd5e1)",
									background: isSelected
										? "rgba(13, 148, 136, 0.15)"
										: "var(--paper, #fff)",
									color: "var(--ink, #0f172a)",
									fontWeight: 600,
								}}
							>
								{p.brandNameRu} ({p.badgeTextRu})
							</button>
						);
					})}
				</div>
			</div>

			{/* Шаг 1: Селектор наборов инструментов */}
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<Layers size={16} className="text-teal-600" />
						<span>1. Выберите набор инструментов</span>
					</div>
					<span
						style={{
							fontSize: "0.75rem",
							color: "var(--teal, #0d9488)",
							fontWeight: 600,
						}}
					>
						{selectedToolSet.categoryRu}
					</span>
				</div>

				{/* Категории фильтрации */}
				<div
					style={{
						display: "flex",
						gap: "0.35rem",
						flexWrap: "wrap",
						marginBottom: "0.75rem",
					}}
				>
					{categories.map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => setActiveCategoryFilter(cat)}
							className="touch-manipulation"
							style={{
								cursor: "pointer",
								fontSize: "0.75rem",
								padding: "0.25rem 0.65rem",
								borderRadius: "6px",
								border:
									activeCategoryFilter === cat
										? "1px solid var(--teal, #0d9488)"
										: "1px solid var(--line, #e2e8f0)",
								background:
									activeCategoryFilter === cat
										? "rgba(13, 148, 136, 0.12)"
										: "var(--paper-soft, #f8fafc)",
								color:
									activeCategoryFilter === cat
										? "var(--teal, #0d9488)"
										: "var(--muted)",
								fontWeight: activeCategoryFilter === cat ? 700 : 500,
							}}
						>
							{cat === "all" ? "Все наборы" : cat}
						</button>
					))}
				</div>

				<div className="kraft-presets-grid">
					{filteredToolSets.map((set) => (
						<div
							key={set.id}
							onClick={() => onToolSetChange(set.id)}
							className={`kraft-preset-item ${selectedToolSetId === set.id ? "selected" : ""}`}
							style={{ minHeight: "68px", cursor: "pointer" }}
						>
							<div
								className="kraft-preset-title"
								style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
							>
								{set.nameRu}
							</div>
							<div
								className="kraft-preset-desc"
								style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
							>
								{set.typicalItemsRu.slice(0, 3).join(", ")}...
							</div>
							<span className="kraft-preset-badge">{set.shortCode}</span>
						</div>
					))}
				</div>

				{/* Редактор состава набора */}
				<div style={{ marginTop: "0.75rem" }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "0.35rem",
						}}
					>
						<label
							style={{
								fontSize: "0.75rem",
								fontWeight: 600,
								color: "var(--muted)",
							}}
						>
							Состав набора в пакете (через запятую):
						</label>
						<button
							type="button"
							onClick={handleResetToTypical}
							style={{
								background: "none",
								border: "none",
								color: "var(--teal, #0d9488)",
								fontSize: "0.725rem",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.25rem",
								padding: "2px 4px",
							}}
							title="Сбросить состав на типовой"
						>
							<RotateCcw size={11} />
							<span>Типовой состав</span>
						</button>
					</div>
					<input
						type="text"
						value={customItemsText || selectedToolSet.typicalItemsRu.join(", ")}
						onChange={(e) => onCustomItemsChange(e.target.value)}
						style={{
							width: "100%",
							minHeight: "44px",
							padding: "0.5rem 0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default KraftToolSetSelector;
