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
import { Award, Check, Layers, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

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
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				backgroundColor: "var(--paper, #fff)",
				border: "1px solid var(--border, #e2e8f0)",
				borderRadius: "8px",
				padding: compact ? "10px" : "14px",
			}}
		>
			{/* Header */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<Layers size={16} style={{ color: "var(--primary, #0d9488)" }} />
					<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink, #1e293b)" }}>
						Ортодонтические материалы (90% рынка РФ)
					</span>
				</div>
				<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
					Топ-выбор в 1 клик
				</span>
			</div>

			{/* Category Filter Chips */}
			<div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
				{CATEGORY_TABS.map((tab) => {
					const isActive = activeCategory === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveCategory(tab.id)}
							style={{
								padding: "4px 8px",
								borderRadius: "4px",
								fontSize: "11px",
								fontWeight: isActive ? 600 : 400,
								border: isActive ? "1px solid var(--primary, #0d9488)" : "1px solid var(--border, #e2e8f0)",
								backgroundColor: isActive ? "var(--primary-subtle, rgba(13,148,136,0.1))" : "var(--paper, #fff)",
								color: isActive ? "var(--primary, #0d9488)" : "var(--ink, #1e293b)",
								cursor: "pointer",
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Search input */}
			<div style={{ position: "relative" }}>
				<Search
					size={14}
					style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
				/>
				<input
					type="text"
					placeholder="Поиск (Damon, Clarity, 3D Smile, Bio-Ray, Cu-Ni-Ti)..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{
						width: "100%",
						boxSizing: "border-box",
						padding: "6px 8px 6px 28px",
						fontSize: "12px",
						borderRadius: "6px",
						border: "1px solid var(--border, #cbd5e1)",
						backgroundColor: "var(--paper-subtle, #f8fafc)",
						color: "var(--ink, #1e293b)",
					}}
				/>
			</div>

			{/* Materials List */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
					maxHeight: compact ? "220px" : "320px",
					overflowY: "auto",
				}}
			>
				{filteredMaterials.length === 0 ? (
					<div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
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
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									padding: "8px 10px",
									borderRadius: "6px",
									border: isSelected
										? "2px solid var(--primary, #0d9488)"
										: isLeader
											? "1px solid var(--primary, #0d9488)"
											: "1px solid var(--border, #e2e8f0)",
									backgroundColor: isSelected
										? "var(--primary-subtle, rgba(13,148,136,0.12))"
										: isLeader
											? "var(--primary-subtle, rgba(13,148,136,0.04))"
											: "var(--paper, #fff)",
									cursor: "pointer",
									textAlign: "left",
									transition: "all 0.15s ease",
								}}
							>
								<div style={{ flex: 1, minWidth: 0, marginRight: "8px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
										<span
											style={{
												fontSize: "10px",
												fontWeight: 700,
												padding: "1px 5px",
												borderRadius: "3px",
												backgroundColor: isLeader ? "#0d9488" : "var(--muted-bg, #f1f5f9)",
												color: isLeader ? "#fff" : "var(--muted, #64748b)",
												display: "inline-flex",
												alignItems: "center",
												gap: "2px",
											}}
										>
											{isLeader && <Award size={10} />}
											{isLeader ? "№1" : `№${mat.marketRank}`}
										</span>
										<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink, #1e293b)" }}>
											{mat.brandName}
										</span>
										<span style={{ fontSize: "10px", color: "var(--muted)" }}>
											({mat.manufacturer})
										</span>
									</div>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
										{mat.nameRu}
									</div>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
									<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink, #1e293b)" }}>
										{mat.approximatePriceRub.toLocaleString("ru-RU")} ₽
									</span>
									{isSelected && <Check size={14} style={{ color: "var(--primary, #0d9488)" }} />}
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
