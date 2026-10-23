/**
 * BusinessOperationsViewRouter — Настройки, маркетинг, склад и сканер документов (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { viewLabels } from "../../../workspaceShell";
import { AppLoadingState } from "../../../AppBootState";
import { WorkspaceRouteErrorBoundary } from "../../../workspaceRouteErrorBoundary";
import type { AppViewRouterProps } from "../types";

const SettingsView = lazyWithRetry(() =>
	import("../../../SettingsView").then((m) => ({ default: m.SettingsView })),
);
const MarketingView = lazyWithRetry(() =>
	import("../../../MarketingView").then((m) => ({ default: m.MarketingView })),
);
const InventoryView = lazyWithRetry(() =>
	import("../../InventoryView").then((m) => ({ default: m.InventoryView })),
);
const ScannerView = lazyWithRetry(() =>
	import("../../../ScannerView").then((m) => ({ default: m.ScannerView })),
);

export function BusinessOperationsViewRouter({
	currentView,
	dashboard,
	activeStaffUser,
	activePatient,
	clinicProfileDraft,
	appLogicValue,
}: AppViewRouterProps) {
	if (currentView === "settings") {
		const defaultStaff =
			activeStaffUser ??
			dashboard?.clinicSettings?.staff?.find((s: any) => s.role === "owner") ??
			dashboard?.clinicSettings?.staff?.find((s: any) => s.role === "doctor") ??
			dashboard?.clinicSettings?.staff?.[0] ??
			null;

		return (
			<WorkspaceRouteErrorBoundary view="settings" label={viewLabels.settings} panelClassName="settings-zone" panelId="settings">
				<Suspense fallback={<AppLoadingState message="Загрузка настроек..." />}>
					<SettingsView activeStaffUser={defaultStaff} activePatient={activePatient} {...(appLogicValue as any)} />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "marketing") {
		return (
			<WorkspaceRouteErrorBoundary view="marketing" label="Маркетинг/SEO" panelClassName="panel marketing-panel" panelId="marketing">
				<Suspense fallback={<AppLoadingState message="Загрузка маркетинга..." />}>
					<MarketingView clinicName={dashboard?.clinicName} clinicPhone={clinicProfileDraft?.phone ?? ""} />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "inventory") {
		return (
			<WorkspaceRouteErrorBoundary view="inventory" label={viewLabels.inventory} panelClassName="inventory-panel border-0 bg-transparent p-0 shadow-none" panelId="inventory">
				<Suspense fallback={<AppLoadingState message="Загрузка склада..." />}>
					<InventoryView organizationId={dashboard?.clinicSettings?.profile?.organizationId ?? ""} />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "scanner") {
		return (
			<WorkspaceRouteErrorBoundary view="scanner" label={viewLabels.scanner} panelClassName="panel scanner-panel" panelId="scanner">
				<Suspense fallback={<AppLoadingState message="Загрузка сканера документов..." />}>
					<ScannerView />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	return null;
}
