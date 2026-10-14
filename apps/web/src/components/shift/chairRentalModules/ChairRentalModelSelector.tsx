import React from "react";
import { Banknote, Calendar, Clock, Percent } from "lucide-react";
import type { ChairRentalModel } from "@dental/shared";

export interface ChairRentalModelSelectorProps {
	readonly model: ChairRentalModel;
	readonly onSelectModel: (model: ChairRentalModel) => void;
}

export const ChairRentalModelSelector: React.FC<ChairRentalModelSelectorProps> = ({
	model,
	onSelectModel,
}) => {
	return (
		<div
			className="chair-rental-models-bar"
			role="tablist"
			aria-label="Модель субаренды стоматологического кресла"
		>
			<button
				type="button"
				role="tab"
				aria-selected={model === "hourly"}
				className={`chair-rental-model-chip ${model === "hourly" ? "active" : ""}`}
				onClick={() => onSelectModel("hourly")}
				data-testid="model-tab-hourly"
			>
				<Clock size={14} />
				<span>Почасовая</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={model === "per_shift"}
				className={`chair-rental-model-chip ${model === "per_shift" ? "active" : ""}`}
				onClick={() => onSelectModel("per_shift")}
				data-testid="model-tab-per-shift"
			>
				<Calendar size={14} />
				<span>За смену</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={model === "revenue_percent"}
				className={`chair-rental-model-chip ${model === "revenue_percent" ? "active" : ""}`}
				onClick={() => onSelectModel("revenue_percent")}
				data-testid="model-tab-revenue-percent"
			>
				<Percent size={14} />
				<span>% выручки</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={model === "fixed_monthly"}
				className={`chair-rental-model-chip ${model === "fixed_monthly" ? "active" : ""}`}
				onClick={() => onSelectModel("fixed_monthly")}
				data-testid="model-tab-fixed-monthly"
			>
				<Banknote size={14} />
				<span>Фикс / мес</span>
			</button>
		</div>
	);
};
