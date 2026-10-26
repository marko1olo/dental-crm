import React from "react";
import { Plus } from "lucide-react";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";

export interface SplitCatalogServiceRowProps {
	readonly service: CatalogServiceLookupItem;
	readonly inStageCount: number;
	readonly onAddService: (service: CatalogServiceLookupItem) => void;
}

export const SplitCatalogServiceRow: React.FC<SplitCatalogServiceRowProps> = ({
	service,
	inStageCount,
	onAddService,
}) => {
	const itemCode = service.serviceCode || service.code || service.order804nCode || service.id;

	return (
		<div
			onClick={() => onAddService(service)}
			className="split-service-row"
			data-testid={`split-catalog-service-${service.id}`}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onAddService(service);
				}
			}}
		>
			<div className="split-service-meta">
				<div className="split-service-badges">
					<span className="split-service-code font-mono">
						{itemCode}
					</span>
					{inStageCount > 0 && (
						<span className="split-service-in-stage-badge" title="Уже добавлено в текущий этап">
							в этапе: {inStageCount}
						</span>
					)}
				</div>
				<div className="split-service-name">
					{service.title}
				</div>
			</div>
			<div className="split-service-action-wrap">
				<span className="split-service-price font-mono">
					{(service.basePriceRub || 0).toLocaleString("ru-RU")} ₽
				</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onAddService(service);
					}}
					className="split-service-add-btn"
					title={`Добавить «${service.title}» в активный этап`}
					data-testid={`quick-add-${service.id}`}
				>
					<Plus size={14} />
				</button>
			</div>
		</div>
	);
};
