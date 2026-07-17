import { ShieldCheck } from "lucide-react";
import React, { Suspense } from "react";
import { AppLoadingState } from "./AppBootState";
import { CommunicationsView } from "./CommunicationsView";
import { InventoryView } from "./components/InventoryView";
import { LeadsKanbanView } from "./components/leads/LeadsKanbanView";
import { OmnichannelInboxView } from "./components/OmnichannelInboxView";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { DocumentsView } from "./DocumentsView";
import { FinanceView } from "./FinanceView";
import { MarketingView } from "./MarketingView";
import { PatientsView } from "./PatientsView";
import { AnalyticsDashboardView } from "./pages/AnalyticsDashboardView";
import { ScannerView } from "./ScannerView";
import { ScheduleView } from "./ScheduleView";
import { SettingsView } from "./SettingsView";
import { PatientCockpit, ShiftView } from "./ShiftView";
import { VisitView } from "./VisitView";
import { WorkspaceRouteErrorBoundary } from "./workspaceRouteErrorBoundary";
import { viewLabels } from "./workspaceShell";

const ImagingView = React.lazy(() =>
	import("./ImagingView").then((module) => ({ default: module.ImagingView })),
);

export function AppRouter() {
	const appLogic = useAppLogicContext();
	const {
		currentView,
		dashboard,
		activeStaffUser,
		clinicProfileDraft,
		activeWorkspaceProfile,
	} = appLogic;

	return (
		<>
			{currentView === "shift" ? <ShiftView /> : null}
			{["shift", "patients"].includes(currentView) ? <PatientCockpit /> : null}
			{currentView === "imaging" ? (
				<WorkspaceRouteErrorBoundary
					view="imaging"
					label={viewLabels.imaging}
					panelClassName="panel imaging-panel"
					panelId="imaging"
				>
					<Suspense
						fallback={
							<div
								className="panel imaging-panel"
								id="imaging"
								aria-busy="true"
							>
								<div className="panel-heading">
									<h2>Снимки пациента</h2>
									<span className="status-pill status-planned">загрузка</span>
								</div>
							</div>
						}
					>
						<ImagingView />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{[
				"schedule",
				"patients",
				"visit",
				"documents",
				"finance",
				"analytics",
				"communications",
			].includes(currentView) ? (
				<section className="work-grid page-grid">
					{currentView === "schedule" ? (
						<WorkspaceRouteErrorBoundary
							view="schedule"
							label={viewLabels.schedule}
							panelClassName="panel schedule-panel"
							panelId="schedule"
						>
							<Suspense
								fallback={
									<div
										className="panel schedule-panel"
										id="schedule"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Расписание</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</div>
								}
							>
								<ScheduleView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}

					{currentView === "patients" ? (
						<WorkspaceRouteErrorBoundary
							view="patients"
							label={viewLabels.patients}
							panelClassName="panel patients-panel"
							panelId="patients"
						>
							<Suspense
								fallback={
									<div
										className="panel patients-panel"
										id="patients"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Быстрый поиск</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</div>
								}
							>
								<PatientsView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}

					{currentView === "visit" ? (
						<WorkspaceRouteErrorBoundary
							view="visit"
							label={viewLabels.visit}
							panelClassName="panel visit-panel"
							panelId="visit"
						>
							<Suspense
								fallback={
									<div
										className="panel visit-panel"
										id="visit"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Текущий прием</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</div>
								}
							>
								<VisitView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}

					{currentView === "documents" ? (
						<WorkspaceRouteErrorBoundary
							view="documents"
							label={viewLabels.documents}
							panelClassName="panel documents-panel"
							panelId="documents"
						>
							<Suspense
								fallback={
									<div
										className="panel documents-panel"
										id="documents"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Документы и согласия</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</div>
								}
							>
								<DocumentsView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}

					{currentView === "finance" ? (
						<WorkspaceRouteErrorBoundary
							view="finance"
							label={viewLabels.finance}
							panelClassName="panel finance-panel"
							panelId="finance"
						>
							<Suspense
								fallback={
									<div
										className="panel finance-panel"
										id="finance"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Оплаты, план лечения и вычет</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</div>
								}
							>
								<FinanceView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}

					{currentView === "analytics" ? (
						<WorkspaceRouteErrorBoundary
							view="analytics"
							label={viewLabels.analytics}
							panelClassName="panel analytics-panel"
							panelId="analytics"
						>
							<Suspense
								fallback={
									<div
										className="panel analytics-panel"
										id="analytics"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Executive BI Analytics</h2>
											<span className="status-pill status-planned">
												Загрузка...
											</span>
										</div>
									</div>
								}
							>
								<AnalyticsDashboardView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}

					{currentView === "communications" ? (
						<WorkspaceRouteErrorBoundary
							view="communications"
							label={viewLabels.communications}
							panelClassName="panel communications-panel"
							panelId="communications"
						>
							<Suspense
								fallback={
									<div
										className="panel communications-panel"
										id="communications"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Связь с пациентами</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</div>
								}
							>
								<CommunicationsView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
				</section>
			) : null}
			{["documents", "finance", "communications", "settings"].includes(
				currentView,
			) ? (
				<details className="compliance-bar" aria-label="Контроль">
					<summary>
						<ShieldCheck aria-hidden="true" />
						<span>Служебные ограничения</span>
					</summary>
					<div>
						{(dashboard.complianceWarnings ?? []).map((warning) => (
							<p key={warning}>{warning}</p>
						))}
					</div>
				</details>
			) : null}
			{currentView === "settings" ? (
				<WorkspaceRouteErrorBoundary
					view="settings"
					label={viewLabels.settings}
					panelClassName="settings-zone"
					panelId="settings"
				>
					<Suspense
						fallback={
							<section className="settings-zone" id="settings" aria-busy="true">
								<div className="panel-heading settings-heading">
									<h2>Настройки</h2>
									<span className="status-pill status-planned">загрузка</span>
								</div>
							</section>
						}
					>
						<SettingsView activeStaffUser={activeStaffUser} />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "marketing" ? (
				<Suspense fallback={<AppLoadingState message="Загрузка маркетинга" />}>
					<MarketingView
						clinicName={dashboard.clinicName}
						clinicPhone={clinicProfileDraft.phone}
					/>
				</Suspense>
			) : null}
			{currentView === "inventory" ? (
				<Suspense fallback={<AppLoadingState message="Загрузка склада" />}>
					<InventoryView organizationId={activeWorkspaceProfile.id} />
				</Suspense>
			) : null}
			{currentView === "leads" ? (
				<Suspense
					fallback={<AppLoadingState message="Загрузка канбан доски" />}
				>
					<LeadsKanbanView />
				</Suspense>
			) : null}
			{currentView === "inbox" ? (
				<Suspense fallback={<AppLoadingState message="Загрузка сообщений" />}>
					<OmnichannelInboxView />
				</Suspense>
			) : null}
			{currentView === "scanner" ? (
				<Suspense fallback={<AppLoadingState message="Загрузка сканера ЦСО" />}>
					<ScannerView />
				</Suspense>
			) : null}
		</>
	);
}
