import { Sparkles } from "lucide-react";
import type React from "react";
import { PricelistToolbarBatchBar } from "./PricelistToolbarBatchBar";
import { PricelistToolbarSearchSelect } from "./PricelistToolbarSearchSelect";
import { PricelistToolbarSpecialtySelect } from "./PricelistToolbarSpecialtySelect";
import { PricelistToolbarTierControl } from "./PricelistToolbarTierControl";
import type { PriceRoundingMode } from "./servicePricelistEngine";
import type {
	DoctorSpecialty,
	PriceTierKind,
	ServiceCategory,
} from "./servicePricelistPresets";

export interface PricelistFiltersAndBatchBarProps {
	readonly searchTerm: string;
	readonly onSearchChange: (value: string) => void;
	readonly selectedCategory: ServiceCategory | "all";
	readonly onCategoryChange: (category: ServiceCategory | "all") => void;
	readonly selectedSpecialty: DoctorSpecialty | "all";
	readonly onSpecialtyChange: (specialty: DoctorSpecialty | "all") => void;
	readonly activeTier: PriceTierKind;
	readonly onTierChange: (tier: PriceTierKind) => void;
	readonly isBatchBarOpen: boolean;
	readonly onToggleBatchBar: () => void;
	readonly batchRounding: PriceRoundingMode;
	readonly onApplyBatchMarkup: (
		percent: number,
		rounding: PriceRoundingMode,
	) => void;
	readonly onApplyBatchRounding: (rounding: PriceRoundingMode) => void;
}

export const PricelistFiltersAndBatchBar: React.FC<
	PricelistFiltersAndBatchBarProps
> = (props) => {
	const {
		searchTerm,
		onSearchChange,
		onCategoryChange,
		selectedSpecialty,
		onSpecialtyChange,
		activeTier,
		onTierChange,
		isBatchBarOpen,
		onToggleBatchBar,
		batchRounding,
		onApplyBatchMarkup,
		onApplyBatchRounding,
	} = props;

	return (
		<>
			<div
				className="pricelist-toolbar"
				style={{
					padding: "0.35rem 1rem",
					gap: "0.5rem",
					display: "flex",
					alignItems: "center",
					minHeight: "40px",
					height: "40px",
					flexWrap: "nowrap",
					overflowX: "auto",
				}}
			>
				<PricelistToolbarSearchSelect
					searchTerm={searchTerm}
					onSearchChange={onSearchChange}
					onSelectPopularService={(val) => {
						onSearchChange(val);
						onCategoryChange("all");
					}}
				/>

				<PricelistToolbarTierControl
					activeTier={activeTier}
					onTierChange={onTierChange}
				/>

				<PricelistToolbarSpecialtySelect
					selectedSpecialty={selectedSpecialty}
					onSpecialtyChange={onSpecialtyChange}
				/>

				<button
					type="button"
					className={`pricelist-btn ${isBatchBarOpen ? "pricelist-btn-active" : ""}`}
					style={{
						minHeight: "36px",
						height: "36px",
						padding: "0 0.75rem",
						fontSize: "0.8125rem",
						gap: "0.375rem",
						marginLeft: "auto",
					}}
					onClick={onToggleBatchBar}
					title="Пакетная индексация цен (+5%, +10%, скидки, округление)"
				>
					<Sparkles size={14} />
					<span>Индексация</span>
				</button>
			</div>

			{isBatchBarOpen && (
				<PricelistToolbarBatchBar
					activeTier={activeTier}
					batchRounding={batchRounding}
					onApplyBatchMarkup={onApplyBatchMarkup}
					onApplyBatchRounding={onApplyBatchRounding}
				/>
			)}
		</>
	);
};
