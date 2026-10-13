/**
 * MaterialBomListTable.tsx — Таблица услуг со статусом наличия техкарт (BOM) и предупреждениями о дефиците.
 *
 * Implements:
 * 1. Четкая группировка по услугам приказа 804н.
 * 2. Копеечно-точный расчет себестоимости материалов на процедуру.
 * 3. Контроль остатков на складе и предупреждение о дефиците.
 * 4. Empty state с подсказкой загрузки типовых норм расхода.
 */

import { Package, Plus, RefreshCw, Sparkles } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { MaterialBomItemRow } from "./MaterialBomItemRow.js";
import type {
	ProcedureMaterialRuleViewItem,
	ServiceGroupViewItem,
} from "./materialBomTypes.js";

export interface MaterialBomListTableProps {
	readonly groupedServices: readonly ServiceGroupViewItem[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly isLoading: boolean;
	readonly searchQuery: string;
	readonly isSeeding: boolean;
	readonly onSeedDefaults: () => void;
	readonly onAddMaterialToService: (serviceId: string) => void;
	readonly onEditRule: (rule: ProcedureMaterialRuleViewItem) => void;
	readonly onDeleteRule: (ruleId: string) => void;
}

export function MaterialBomListTable({
	groupedServices,
	isLoading,
	searchQuery,
	isSeeding,
	onSeedDefaults,
	onAddMaterialToService,
	onEditRule,
	onDeleteRule,
}: MaterialBomListTableProps) {
	if (isLoading) {
		return (
			<div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
				<RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
				Загрузка технологических карт расхода материалов...
			</div>
		);
	}

	if (groupedServices.length === 0) {
		return (
			<div
				style={{
					padding: 48,
					textAlign: "center",
					background: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: 16,
				}}
			>
				<Package size={48} color="var(--muted)" style={{ margin: "0 auto 16px auto", opacity: 0.5 }} />
				<h3 style={{ margin: "0 0 8px 0", fontSize: 17, color: "var(--ink)" }}>
					{searchQuery ? "По вашему запросу ничего не найдено" : "Технологические карты расхода ещё не настроены"}
				</h3>
				<p
					style={{
						margin: "0 0 20px 0",
						color: "var(--muted)",
						fontSize: 14,
						maxWidth: 500,
						marginLeft: "auto",
						marginRight: "auto",
					}}
				>
					{searchQuery
						? "Попробуйте изменить поисковый запрос или сбросить фильтры."
						: "Нажмите «Загрузить типовые нормы», чтобы быстро подключить готовые стандарты по терапии, эндодонтии, хирургии и гигиене."}
				</p>
				{!searchQuery && (
					<button
						type="button"
						className="material-boms-btn material-boms-btn-primary"
						onClick={onSeedDefaults}
						disabled={isSeeding}
					>
						<Sparkles size={16} />
						Загрузить типовые нормы расхода
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="material-boms-procedures-list">
			{groupedServices.map((serviceGroup) => (
				<div key={serviceGroup.serviceId} className="material-boms-service-card">
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
			))}
		</div>
	);
}
