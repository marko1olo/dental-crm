/**
 * ViewRouterContainer — Контейнер рабочей области и маршрутизации представлений CRM (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { ClinicalViewRouter } from "./ClinicalViewRouter";
import { AdministrativeViewRouter } from "./AdministrativeViewRouter";
import { ManagementViewRouter } from "./ManagementViewRouter";
import { GlobalDoctorPayrollModal } from "./GlobalDoctorPayrollModal";
import type { AppViewRouterProps } from "../types";

const GRID_VIEWS = new Set([
	"schedule",
	"patients",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
]);

export function ViewRouterContainer(props: AppViewRouterProps) {
	const { currentView, dashboard, topBar, toastPortal } = props;
	const isGridView = GRID_VIEWS.has(currentView);

	return (
		<section
			className={`workspace view-${currentView}`}
			id="workspace-content"
			tabIndex={-1}
			aria-label="Рабочая область"
		>
			{topBar}

			{/* Вне сеточной структуры: смена и снимки */}
			{(currentView === "shift" || currentView === "imaging") && (
				<ClinicalViewRouter {...props} />
			)}

			{/* Рабочая сетка основных клинических и административных экранов */}
			{isGridView && (
				<section className="work-grid page-grid">
					{currentView === "visit" && <ClinicalViewRouter {...props} />}
					<AdministrativeViewRouter {...props} />
					{currentView === "analytics" && <ManagementViewRouter {...props} />}
				</section>
			)}

			{/* Управленческие и сервисные экраны (настройки, склад, маркетинг, лаборатория) */}
			{!isGridView && currentView !== "shift" && currentView !== "imaging" && (
				<ManagementViewRouter {...props} />
			)}

			<GlobalDoctorPayrollModal clinicSettings={dashboard?.clinicSettings} />
			{toastPortal}
		</section>
	);
}
