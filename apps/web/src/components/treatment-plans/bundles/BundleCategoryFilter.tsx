import type { ClinicalBundleCategory, ClinicalBundleDefinition } from "../treatmentPlanBundlesEngine";

export interface BundleCategoryFilterProps {
	readonly selectedCategory: ClinicalBundleCategory | "all";
	readonly onSelectCategory: (cat: ClinicalBundleCategory | "all") => void;
	readonly bundles: readonly ClinicalBundleDefinition[];
}

export const BundleCategoryFilter: React.FC<BundleCategoryFilterProps> = ({
	selectedCategory,
	onSelectCategory,
	bundles,
}) => {
	const count = (cat: ClinicalBundleCategory) => bundles.filter((b) => b.category === cat).length;

	return (
		<div className="dente-filter-chips overflow-x-auto min-w-0 py-0.5">
			<button
				type="button"
				onClick={() => onSelectCategory("all")}
				className={`dente-filter-chip ${selectedCategory === "all" ? "active" : ""}`}
				data-active={selectedCategory === "all"}
				data-testid="filter-cat-all"
			>
				Все пакеты ({bundles.length})
			</button>
			<button
				type="button"
				onClick={() => onSelectCategory("therapy")}
				className={`dente-filter-chip ${selectedCategory === "therapy" ? "active" : ""}`}
				data-active={selectedCategory === "therapy"}
				data-testid="filter-cat-therapy"
			>
				Терапия ({count("therapy")})
			</button>
			<button
				type="button"
				onClick={() => onSelectCategory("surgery")}
				className={`dente-filter-chip ${selectedCategory === "surgery" ? "active" : ""}`}
				data-active={selectedCategory === "surgery"}
				data-testid="filter-cat-surgery"
			>
				Хирургия ({count("surgery")})
			</button>
			<button
				type="button"
				onClick={() => onSelectCategory("hygiene")}
				className={`dente-filter-chip ${selectedCategory === "hygiene" ? "active" : ""}`}
				data-active={selectedCategory === "hygiene"}
				data-testid="filter-cat-hygiene"
			>
				Профгигиена ({count("hygiene")})
			</button>
			<button
				type="button"
				onClick={() => onSelectCategory("orthopedics")}
				className={`dente-filter-chip ${selectedCategory === "orthopedics" ? "active" : ""}`}
				data-active={selectedCategory === "orthopedics"}
				data-testid="filter-cat-orthopedics"
			>
				Ортопедия ({count("orthopedics")})
			</button>
		</div>
	);
};
