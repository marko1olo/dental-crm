/**
 * MaterialBomsSettingsPanel.tsx — Панель управления технологическими картами (BOM)
 * и нормами списания материалов со склада по услугам приказа Минздрава РФ № 804н.
 *
 * ФУНКЦИОНАЛ:
 * 1. Интерактивная матрица привязки услуг 804н к складским расходникам.
 * 2. Копеечно-точный расчет себестоимости материалов на каждую услугу.
 * 3. Контроль дефицита и складских остатков по нормам списания.
 * 4. 1-клик сидирование дефолтных клинических техкарт 804н.
 * 5. Редактирование, добавление и удаление норм списания.
 */

import React, { useCallback } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { MaterialBomsDeleteModal } from "./MaterialBomsDeleteModal.js";
import { MaterialBomEditModal } from "./bomModules/MaterialBomEditModal.js";
import { MaterialBomHeaderStats } from "./bomModules/MaterialBomHeaderStats.js";
import { MaterialBomListTable } from "./bomModules/MaterialBomListTable.js";
import type { ProcedureMaterialRuleViewItem } from "./bomModules/materialBomTypes.js";
import { useMaterialBomsData } from "./bomModules/useMaterialBomsData.js";
import "./MaterialBomsSettingsPanel.css";

export type { ProcedureMaterialRuleViewItem };

export interface MaterialBomsSettingsPanelProps {
	readonly organizationId?: string | undefined;
}

export function MaterialBomsSettingsPanel({
	organizationId: propOrgId,
}: MaterialBomsSettingsPanelProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;
	const orgId =
		propOrgId ||
		dashboard?.clinicSettings?.profile?.organizationId ||
		(dashboard as unknown as { organization?: { id?: string } })?.organization?.id ||
		(auth as unknown as { organizationId?: string })?.organizationId ||
		"";

	const getHeaders = useCallback(
		(extra?: Record<string, string>) => {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders(extra)
					: extra || {};
			return headers;
		},
		[auth],
	);

	const bomsData = useMaterialBomsData({
		orgId,
		getHeaders,
		dashboardServices: dashboard?.services,
	});

	return (
		<div className="material-boms-container">
			<MaterialBomHeaderStats
				isLoading={bomsData.isLoading}
				isSeeding={bomsData.isSeeding}
				stats={bomsData.stats}
				searchQuery={bomsData.searchQuery}
				selectedCategory={bomsData.selectedCategory}
				onRefresh={bomsData.fetchAllRules}
				onSeedDefaults={bomsData.handleSeedDefaults}
				onOpenAddModal={() =>
					bomsData.setModalState({
						isOpen: true,
						serviceId: bomsData.availableServices[0]?.id || "",
						inventoryItemId: bomsData.warehouseItems[0]?.id || "",
						quantityToDeduct: "1",
					})
				}
				onSearchChange={bomsData.setSearchQuery}
				onCategoryChange={bomsData.setSelectedCategory}
			/>

			<MaterialBomListTable
				groupedServices={bomsData.groupedServices}
				warehouseItems={bomsData.warehouseItems}
				isLoading={bomsData.isLoading}
				searchQuery={bomsData.searchQuery}
				isSeeding={bomsData.isSeeding}
				onSeedDefaults={bomsData.handleSeedDefaults}
				onAddMaterialToService={(serviceId) =>
					bomsData.setModalState({
						isOpen: true,
						serviceId,
						inventoryItemId: bomsData.warehouseItems[0]?.id || "",
						quantityToDeduct: "1",
					})
				}
				onEditRule={(rule) =>
					bomsData.setModalState({
						isOpen: true,
						ruleId: rule.id,
						serviceId: rule.serviceId,
						inventoryItemId: rule.inventoryItemId,
						quantityToDeduct: String(rule.quantityToDeduct),
					})
				}
				onDeleteRule={(ruleId) => bomsData.setConfirmDeleteId(ruleId)}
			/>

			<MaterialBomEditModal
				modalState={bomsData.modalState}
				availableServices={bomsData.availableServices}
				warehouseItems={bomsData.warehouseItems}
				isSaving={bomsData.isSaving}
				onClose={() => bomsData.setModalState(null)}
				onSave={bomsData.handleSaveRule}
				onChangeModalState={(next) => bomsData.setModalState(next)}
			/>

			<MaterialBomsDeleteModal
				confirmDeleteId={bomsData.confirmDeleteId}
				onClose={() => bomsData.setConfirmDeleteId(null)}
				onConfirm={bomsData.handleDeleteRule}
			/>
		</div>
	);
}
