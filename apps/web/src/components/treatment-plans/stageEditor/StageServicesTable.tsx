import React from "react";
import { Package, Plus } from "lucide-react";
import type { StageServicesTableProps } from "../splitCatalog/splitCatalogTypes";
import { StageServicesTableHeader } from "./StageServicesTableHeader";
import { StageServicesTableRow } from "./StageServicesTableRow";
import { StageServicesTableFooter } from "./StageServicesTableFooter";

export { type StageServicesTableProps } from "../splitCatalog/splitCatalogTypes";

export const StageServicesTable: React.FC<StageServicesTableProps> = ({
	stage,
	doctors,
	onUpdateItemQuantity,
	onUpdateItemPrice,
	onUpdateItem,
	onRemoveItem,
	onAssignDoctorToItem,
	onAddItemToStage,
	onStartStage,
	onPayStage,
	className = "",
}) => {
	return (
		<div className={`stage-services-table-wrap ${className}`.trim()} data-testid={`stage-services-table-${stage.stageNumber}`}>
			<StageServicesTableHeader />

			{stage.items.length === 0 ? (
				<div className="stage-table-empty" data-testid="stage-table-empty">
					<Package size={24} className="stage-empty-icon" />
					<div className="stage-empty-title">В этом этапе пока нет назначенных услуг</div>
					<div className="stage-empty-desc">
						Выберите услугу из каталога слева для мгновенного добавления в 1 клик или примените клинический пакет
					</div>
					{onAddItemToStage && (
						<button
							type="button"
							onClick={() => onAddItemToStage(stage)}
							className="stage-empty-add-btn"
							data-testid="stage-empty-add-btn"
						>
							<Plus size={13} />
							<span>Открыть каталог услуг...</span>
						</button>
					)}
				</div>
			) : (
				<div className="stage-table-body divide-y divide-[var(--line,#e2e8f0)]">
					{stage.items.map((item) => (
						<StageServicesTableRow
							key={item.id}
							item={item}
							doctors={doctors}
							onUpdateItemQuantity={onUpdateItemQuantity}
							onRemoveItem={onRemoveItem}
							onAssignDoctorToItem={onAssignDoctorToItem}
						/>
					))}
				</div>
			)}

			<StageServicesTableFooter
				stage={stage}
				onAddItemToStage={onAddItemToStage}
				onStartStage={onStartStage}
				onPayStage={onPayStage}
			/>
		</div>
	);
};

export default StageServicesTable;
