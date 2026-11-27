import { Layers } from "lucide-react";
import type React from "react";
import {
	getAllWarrantyPresets,
	STAR_COMPOSITE_QUICK_PRESET,
	STAR_EMAX_QUICK_PRESET,
	STAR_ZIRCONIA_QUICK_PRESET,
	STAR_IMPLANT_QUICK_PRESET,
	type StarQuickPreset,
	type WarrantyCategory,
	type WarrantyPreset,
} from "../../warrantyPresets.js";

export interface WarrantyCategoryPresetsBarProps {
	activeCategory: WarrantyCategory;
	currentWorkTitle: string;
	onApplyStarQuickPreset: (qp: StarQuickPreset) => void;
	onSelectCategory: (cat: WarrantyCategory) => void;
}

const getCategoryLabel = (preset: WarrantyPreset): { tag: string; title: string } => {
	switch (preset.category) {
		case "removable_prosthesis":
			return { tag: "Ортопедия", title: "Съемные протезы" };
		case "endodontic_treatment":
			return { tag: "Терапия", title: "Эндодонтия (Каналы)" };
		case "orthodontic_aligners":
			return { tag: "Ортодонтия", title: "Элайнеры & Брекеты" };
		case "periodontal_splinting":
			return { tag: "Пародонтология", title: "Шинирование зубов" };
		case "temporary_prosthesis":
			return { tag: "Ортопедия", title: "Временные коронки" };
		default:
			return { tag: "Стоматология", title: preset.shortTitle };
	}
};

export const WarrantyCategoryPresetsBar: React.FC<WarrantyCategoryPresetsBarProps> = ({
	activeCategory,
	currentWorkTitle,
	onApplyStarQuickPreset,
	onSelectCategory,
}) => {
	// Основные 4 популярных клинических пресета клиники (с полной преднастройкой материала и кода услуги)
	const compositeQp = STAR_COMPOSITE_QUICK_PRESET;
	const emaxQp = STAR_EMAX_QUICK_PRESET;
	const zirconiaQp = STAR_ZIRCONIA_QUICK_PRESET;
	const implantQp = STAR_IMPLANT_QUICK_PRESET;

	// Все остальные клинические категории из реестра пресетов
	const otherPresets = getAllWarrantyPresets().filter(
		(p) =>
			p.category !== "composite_restoration" &&
			p.category !== "ceramic_crown_veneer" &&
			p.category !== "implant_fixture",
	);

	return (
		<div className="warranty-card-section">
			<div className="warranty-section-header">
				<h4>
					<Layers size={16} />
					2. Категория стоматологической помощи и готовый регламент:
				</h4>
			</div>

			<div className="warranty-presets-unified-grid">
				{/* 1. Световая пломба (Композит) */}
				{compositeQp && (
					<button
						type="button"
						className={`warranty-unified-card ${
							activeCategory === "composite_restoration" ? "active" : ""
						}`}
						onClick={() => {
							onSelectCategory("composite_restoration");
							onApplyStarQuickPreset(compositeQp);
						}}
						title="Пломба из светоотверждаемого композита (Filtek / Estelite) • 1 год гарантии"
					>
						<div className="card-top">
							<span className="card-tag">Терапия</span>
							<strong className="card-title">{compositeQp.title}</strong>
						</div>
						<div className="card-meta">
							<span>Гарантия: <strong>1 год (12 мес.)</strong></span>
							<span>Срок службы: 3 года</span>
						</div>
					</button>
				)}

				{/* 2. Керамика E.max */}
				{emaxQp && (
					<button
						type="button"
						className={`warranty-unified-card ${
							activeCategory === "ceramic_crown_veneer" && currentWorkTitle.includes("E.max") ? "active" : ""
						}`}
						onClick={() => {
							onSelectCategory("ceramic_crown_veneer");
							onApplyStarQuickPreset(emaxQp);
						}}
						title="Коронка или винир E.max Press • 2 года гарантии"
					>
						<div className="card-top">
							<span className="card-tag">Ортопедия</span>
							<strong className="card-title">{emaxQp.title}</strong>
						</div>
						<div className="card-meta">
							<span>Гарантия: <strong>2 года (24 мес.)</strong></span>
							<span>Срок службы: 10 лет</span>
						</div>
					</button>
				)}

				{/* 3. Диоксид циркония */}
				{zirconiaQp && (
					<button
						type="button"
						className={`warranty-unified-card ${
							activeCategory === "ceramic_crown_veneer" && currentWorkTitle.includes("циркони") ? "active" : ""
						}`}
						onClick={() => {
							onSelectCategory("ceramic_crown_veneer");
							onApplyStarQuickPreset(zirconiaQp);
						}}
						title="Коронка из диоксида циркония (Katana / Prettau) • 3 года гарантии"
					>
						<div className="card-top">
							<span className="card-tag">Ортопедия</span>
							<strong className="card-title">{zirconiaQp.title}</strong>
						</div>
						<div className="card-meta">
							<span>Гарантия: <strong>3 года (36 мес.)</strong></span>
							<span>Срок службы: 15 лет</span>
						</div>
					</button>
				)}

				{/* 4. Дентальная имплантация */}
				{implantQp && (
					<button
						type="button"
						className={`warranty-unified-card ${
							activeCategory === "implant_fixture" ? "active" : ""
						}`}
						onClick={() => {
							onSelectCategory("implant_fixture");
							onApplyStarQuickPreset(implantQp);
						}}
						title="Дентальный имплантат и остеоинтеграция • Пожизненная гарантия завода"
					>
						<div className="card-top">
							<span className="card-tag highlight">Хирургия</span>
							<strong className="card-title">{implantQp.title}</strong>
						</div>
						<div className="card-meta">
							<span>Гарантия: <strong>5 лет (клиника)</strong></span>
							<span className="text-[var(--teal,#0d9488)] font-semibold">Пожизненная завода</span>
						</div>
					</button>
				)}

				{/* 5-9. Прочие клинические категории */}
				{otherPresets.map((preset) => {
					const isSel = activeCategory === preset.category;
					const { tag, title } = getCategoryLabel(preset);
					return (
						<button
							key={preset.category}
							type="button"
							className={`warranty-unified-card ${isSel ? "active" : ""}`}
							onClick={() => onSelectCategory(preset.category)}
							title={preset.description}
						>
							<div className="card-top">
								<span className="card-tag">{tag}</span>
								<strong className="card-title">{title}</strong>
							</div>
							<div className="card-meta">
								<span>Гарантия: <strong>{preset.baseWarrantyMonths} мес.</strong></span>
								<span>
									{preset.baseServiceLifeMonths < 12
										? "Временная"
										: `Срок сл.: ${Math.round(preset.baseServiceLifeMonths / 12)} г.`}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
