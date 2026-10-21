import { Plus } from "lucide-react";
import React from "react";
import { MaterialBomItemRow } from "./MaterialBomItemRow.js";
import type {
	ProcedureMaterialRuleViewItem,
	ServiceGroupViewItem,
} from "./materialBomTypes.js";

export interface MaterialBomServiceCardProps {
	readonly serviceGroup: ServiceGroupViewItem;
	readonly onAddMaterialToService: (serviceId: string) => void;
	readonly onEditRule: (rule: ProcedureMaterialRuleViewItem) => void;
	readonly onDeleteRule: (ruleId: string) => void;
}

export function MaterialBomServiceCard({
	serviceGroup,
	onAddMaterialToService,
	onEditRule,
	onDeleteRule,
}: MaterialBomServiceCardProps) {
	return (
		<div className="material-boms-service-card">
			<div className="material-boms-service-header">
				<div className="material-boms-service-info">
					<span className="material-boms-service-code">
						{serviceGroup.serviceCode}
					</span>
					<h3 className="material-boms-service-title">
						{serviceGroup.serviceTitle}
					</h3>
				</div>

				<div className="material-boms-service-cost">
					<span className="material-boms-prime-cost">
						Себестоимость материалов:{" "}
						<strong>
							{serviceGroup.totalCostRub.toLocaleString("ru-RU", {
								maximumFractionDigits: 2,
							})}{" "}
							₽
						</strong>
					</span>

					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						style={{ minHeight: 36, padding: "6px 12px", fontSize: 13 }}
						onClick={() => onAddMaterialToService(serviceGroup.serviceId)}
					>
						<Plus size={14} />
						Добавить материал
					</button>
				</div>
			</div>

			<div className="material-boms-table-wrap">
				<table className="material-boms-table">
					<thead>
						<tr>
							<th>Расходный материал</th>
							<th>Норма списания</th>
							<th>Ед. изм.</th>
							<th>Цена ед.</th>
							<th>Стоимость нормы</th>
							<th>Остаток на складе</th>
							<th style={{ textAlign: "right" }}>Действия</th>
						</tr>
					</thead>
					<tbody>
						{serviceGroup.rules.map((rule) => (
							<MaterialBomItemRow
								key={rule.id}
								rule={rule}
								onEdit={onEditRule}
								onDelete={onDeleteRule}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
