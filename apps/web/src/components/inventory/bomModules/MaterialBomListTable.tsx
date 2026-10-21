import { Package, RefreshCw, Sparkles } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { MaterialBomServiceCard } from "./MaterialBomServiceCard.js";
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
				<MaterialBomServiceCard
					key={serviceGroup.serviceId}
					serviceGroup={serviceGroup}
					onAddMaterialToService={onAddMaterialToService}
					onEditRule={onEditRule}
					onDeleteRule={onDeleteRule}
				/>
			))}
		</div>
	);
}
