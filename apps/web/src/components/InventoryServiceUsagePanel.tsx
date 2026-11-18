import {
	Clock,
	Layers,
} from "lucide-react";
import React, { lazy, Suspense } from "react";
import type { InventoryItem } from "./inventory/useInventoryLogic.js";

const MaterialBomsSettingsPanel = lazy(() =>
	import("./inventory/MaterialBomsSettingsPanel.js").then((module) => ({
		default: module.MaterialBomsSettingsPanel,
	})),
);

export interface InventoryServiceUsagePanelProps {
	readonly organizationId: string;
	readonly inventoryItems?: readonly InventoryItem[];
	readonly rulesList?: readonly any[];
	readonly onRulesUpdated?: () => void;
	readonly getHeaders?: (headers?: Record<string, string>) => Record<string, string>;
}

/**
 * Панель технологических карт и норм расхода расходных материалов под процедуры (Мандаты 8b, 8e, 8n, 8v).
 * Нормирует списание расходников (анестезия, карпулы, пломбировочные материалы) при завершении приёма в ЭМК.
 * Реальное списание происходит тихо в фоне при закрытии визита.
 */
export const InventoryServiceUsagePanel: React.FC<InventoryServiceUsagePanelProps> = ({
	organizationId,
}) => {
	return (
		<div className="flex flex-col h-full w-full overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			{/* Верхняя компактная плашка заголовка */}
			<div className="px-5 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between gap-2 shrink-0">
				<div className="flex items-center gap-2">
					<Layers size={16} className="text-[var(--primary)] shrink-0" />
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-[var(--ink)]">
							Технологические карты процедур (Справочник техкарт)
						</span>
						<span className="text-xs text-[var(--ink-muted)]">
							Нормы расхода материалов для автоматического списания при закрытии визита
						</span>
					</div>
				</div>
			</div>

			{/* Основной контент: справочник техкарт BOM */}
			<div className="flex-1 overflow-y-auto">
				<Suspense
					fallback={
						<div className="p-8 text-center text-xs text-[var(--ink-muted)] flex items-center justify-center gap-2">
							<Clock className="animate-spin text-[var(--primary)]" size={16} />
							<span>Загрузка технологических карт с диска...</span>
						</div>
					}
				>
					<MaterialBomsSettingsPanel organizationId={organizationId} />
				</Suspense>
			</div>
		</div>
	);
};

export default InventoryServiceUsagePanel;
