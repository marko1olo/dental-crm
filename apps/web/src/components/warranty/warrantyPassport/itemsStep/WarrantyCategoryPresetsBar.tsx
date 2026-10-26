import { Award, Layers } from "lucide-react";
import type React from "react";
import {
	getAllWarrantyPresets,
	STAR_QUICK_PRESETS,
	type StarQuickPreset,
	type WarrantyCategory,
} from "../../warrantyPresets.js";

export interface WarrantyCategoryPresetsBarProps {
	activeCategory: WarrantyCategory;
	currentWorkTitle: string;
	onApplyStarQuickPreset: (qp: StarQuickPreset) => void;
	onSelectCategory: (cat: WarrantyCategory) => void;
}

export const WarrantyCategoryPresetsBar: React.FC<WarrantyCategoryPresetsBarProps> = ({
	activeCategory,
	currentWorkTitle,
	onApplyStarQuickPreset,
	onSelectCategory,
}) => {
	return (
		<div className="warranty-card-section">
			<div className="warranty-section-header">
				<h4>
					<Layers size={16} />
					2. Категория стоматологической помощи:
				</h4>
			</div>

			{/* Быстрые пресеты гарантий */}
			<div className="warranty-star-presets-bar">
				<div className="warranty-star-presets-title">
					<Award size={14} style={{ color: "var(--teal)" }} />
					<span>Быстрые пресеты гарантий клиники:</span>
				</div>
				<div className="warranty-star-presets-grid">
					{STAR_QUICK_PRESETS.map((qp) => (
						<button
							key={qp.id}
							type="button"
							className={`warranty-star-chip ${activeCategory === qp.category && currentWorkTitle === qp.title ? "active" : ""}`}
							onClick={() => onApplyStarQuickPreset(qp)}
							title={`${qp.title} (${qp.statutoryNote})`}
						>
							<strong className="truncate min-w-0">{qp.title}</strong>
							<span className="truncate min-w-0">{qp.subtitle}</span>
						</button>
					))}
				</div>
			</div>

			<div className="warranty-presets-grid">
				{getAllWarrantyPresets().map((preset) => (
					<button
						key={preset.category}
						type="button"
						className={`warranty-preset-card ${activeCategory === preset.category ? "active" : ""}`}
						onClick={() => onSelectCategory(preset.category)}
					>
						<span className="warranty-preset-title">{preset.shortTitle}</span>
						<div className="warranty-preset-meta">
							<span>Гарантия: {preset.baseWarrantyMonths} мес.</span>
							<span>{preset.baseServiceLifeMonths < 12 ? "Срок службы: до 6 мес. (временная)" : `Срок сл.: ${Math.round(preset.baseServiceLifeMonths / 12)} г.`}</span>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};
