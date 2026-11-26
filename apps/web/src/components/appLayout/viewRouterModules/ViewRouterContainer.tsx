/**
 * ViewRouterContainer — Контейнер рабочей области и маршрутизации представлений CRM (Мандат 8b, <= 120 строк).
 */

import React, { useEffect } from "react";
import { staffRoleSchema } from "@dental/shared";
import { ClinicalViewRouter } from "./ClinicalViewRouter";
import { AdministrativeViewRouter } from "./AdministrativeViewRouter";
import { ManagementViewRouter } from "./ManagementViewRouter";
import { GlobalDoctorPayrollModal } from "./GlobalDoctorPayrollModal";
import { useAppStore } from "../../../store/appStore";
import {
	type AppView,
	getFallbackAppView,
	getFilteredAppViews,
	viewLabels,
} from "../../../utils/routeUtils";
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
	const { currentView, dashboard, topBar, toastPortal, activeStaffUser } = props;
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const parsedUserRole = staffRoleSchema.safeParse(activeStaffUser?.role);
	const effectiveRole = parsedUserRole.success ? parsedUserRole.data : selectedWorkspaceRole;
	const allowedViews = getFilteredAppViews(effectiveRole);
	const isAllowedView = allowedViews.includes(currentView as AppView);
	const fallbackView = getFallbackAppView(effectiveRole);

	useEffect(() => {
		if (!isAllowedView) {
			useAppStore.getState().setCurrentView(fallbackView);
		}
	}, [isAllowedView, fallbackView]);

	const isGridView = isAllowedView && GRID_VIEWS.has(currentView);

	return (
		<section
			className={`workspace view-${currentView}`}
			id="workspace-content"
			tabIndex={-1}
			aria-label="Рабочая область"
		>
			{topBar}

			{!isAllowedView ? (
				<div
					className="m-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs flex flex-col items-start gap-3 max-w-lg"
					role="alert"
				>
					<h2 className="text-base font-semibold text-[var(--ink)]">
						Раздел недоступен для выбранной роли
					</h2>
					<p className="text-sm text-[var(--ink-muted)]">
						У текущей роли нет прав для просмотра раздела «{viewLabels[currentView as AppView] ?? currentView}».
					</p>
					<button
						type="button"
						onClick={() => useAppStore.getState().setCurrentView(fallbackView)}
						className="h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center shrink-0 cursor-pointer"
					>
						Перейти в раздел «{viewLabels[fallbackView]}»
					</button>
				</div>
			) : (
				<>
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
				</>
			)}

			<GlobalDoctorPayrollModal clinicSettings={dashboard?.clinicSettings} />
			{toastPortal}
		</section>
	);
}
