import React, { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import type { AppViewRouterProps } from "./types";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { viewLabels } from "../../workspaceShell";
import { AppLoadingState } from "../../AppBootState";
import { WorkspaceRouteErrorBoundary } from "../../WorkspaceRouteErrorBoundary";
import { ClinicalErrorBoundary } from "../common/ClinicalErrorBoundary";
import { loadStoredTeethData } from "../odontogram/odontogramStorage";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { VisitView } from "../../VisitView";
import { FinanceView } from "../../FinanceView";

const ShiftView = lazyWithRetry(() =>
	import("../../ShiftView").then((module) => ({ default: module.ShiftView })),
);
const PatientCockpit = lazyWithRetry(() =>
	import("../../ShiftView").then((module) => ({ default: module.PatientCockpit })),
);
const ImagingView = lazyWithRetry(() =>
	import("../../ImagingView").then((module) => ({ default: module.ImagingView })),
);
const ScheduleView = lazyWithRetry(() =>
	import("../../ScheduleView").then((module) => ({ default: module.ScheduleView })),
);
const PatientsView = lazyWithRetry(() =>
	import("../../PatientsView").then((module) => ({ default: module.PatientsView })),
);

const TreatmentPlanModule = lazyWithRetry(() =>
	import("../treatment-plans/TreatmentPlanModule").then((module) => ({
		default: module.TreatmentPlanModule,
	})),
);
const OrthodonticPerspectiveView = lazyWithRetry(() =>
	import("../orthodontics/OrthodonticPerspectiveView").then((module) => ({
		default: module.OrthodonticPerspectiveView,
	})),
);
const DocumentsView = lazyWithRetry(() =>
	import("../../DocumentsView").then((module) => ({
		default: module.DocumentsView,
	})),
);

const CommunicationsView = lazyWithRetry(() =>
	import("../../CommunicationsView").then((module) => ({
		default: module.CommunicationsView,
	})),
);
const AnalyticsDashboardView = lazyWithRetry(() =>
	import("../../pages/AnalyticsDashboardView").then((module) => ({
		default: module.AnalyticsDashboardView,
	})),
);
const ManagerReportsPanel = lazyWithRetry(() =>
	import("../reports/ManagerReportsPanel").then((module) => ({
		default: module.ManagerReportsPanel,
	})),
);
const SettingsView = lazyWithRetry(() =>
	import("../../SettingsView").then((module) => ({ default: module.SettingsView })),
);
const MarketingView = lazyWithRetry(() =>
	import("../../MarketingView").then((module) => ({
		default: module.MarketingView,
	})),
);
const InventoryView = lazyWithRetry(() =>
	import("../InventoryView").then((module) => ({
		default: module.InventoryView,
	})),
);
const ScannerView = lazyWithRetry(() =>
	import("../../ScannerView").then((module) => ({ default: module.ScannerView })),
);
const LeadsKanbanView = lazyWithRetry(() =>
	import("../leads/LeadsKanbanView").then((module) => ({
		default: module.LeadsKanbanView,
	})),
);
const LabOrdersPage = lazyWithRetry(() =>
	import("../../pages/LabOrdersPage").then((module) => ({
		default: module.LabOrdersPage,
	})),
);
const TreatmentPipeline = lazyWithRetry(() =>
	import("../../pages/coordinator/TreatmentPipeline").then((module) => ({
		default: module.TreatmentPipeline,
	})),
);

export function AppViewRouter({
	currentView,
	dashboard,
	activeStaffUser,
	activeVisitPatient,
	activePatient,
	activePatientInsight,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
	patientId,
	perspective,
	clinicProfileDraft,
	appLogicValue,
	topBar,
	toastPortal,
}: AppViewRouterProps) {
	const storePerspective = usePerspectiveStore((s) => s.perspective);
	const activePerspective = perspective ?? storePerspective;
	return (
		<section
			className={`workspace view-${currentView}`}
			id="workspace-content"
			tabIndex={-1}
			aria-label="Рабочая область"
		>
			{topBar}
			{currentView === "shift" ? (
				<WorkspaceRouteErrorBoundary
					view="shift"
					label={viewLabels.shift}
					panelClassName="panel shift-panel"
					panelId="shift"
				>
					<Suspense
						fallback={
							<section
								className="panel shift-panel"
								id="shift"
								aria-label={viewLabels.shift}
								aria-busy="true"
							>
								<div className="panel-heading">
									<h2>{viewLabels.shift}</h2>
									<span className="status-pill status-planned">загрузка</span>
								</div>
							</section>
						}
					>
						<ShiftView />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "shift" ? (
				<WorkspaceRouteErrorBoundary
					view="shift"
					label="Карточка пациента"
					panelClassName="patient-cockpit"
					panelId="patient-cockpit"
				>
					<Suspense
						fallback={
							<section
								className="patient-cockpit dnt-cockpit"
								aria-label="Карточка пациента"
								aria-busy="true"
							>
								<div className="panel-heading">
									<h2>Карточка пациента</h2>
									<span className="status-pill status-planned">загрузка</span>
								</div>
							</section>
						}
					>
						<PatientCockpit
							activePatient={
								currentView === "shift" ? activeVisitPatient : activePatient
							}
							activePatientInsight={activePatientInsight}
							dashboard={dashboard}
							activeCommunicationTasks={activeCommunicationTasks}
							activeImagingStudies={activeImagingStudies}
							activeUsableDocuments={activeUsableDocuments}
						/>
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "imaging" ? (
				<WorkspaceRouteErrorBoundary
					view="imaging"
					label={viewLabels.imaging}
					panelClassName="panel imaging-panel"
					panelId="imaging"
				>
					<Suspense
						fallback={
							<section
								className="panel imaging-panel"
								id="imaging"
								aria-label="Снимки пациента"
								aria-busy="true"
							>
								<div className="panel-heading">
									<h2>Снимки пациента</h2>
									<span className="status-pill status-planned">загрузка</span>
								</div>
							</section>
						}
					>
						<ImagingView
							{...(appLogicValue as any)}
							activePatient={activePatient}
							activeImagingStudies={activeImagingStudies}
							currentView={currentView}
						/>
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
									<section
										className="panel schedule-panel min-w-0 max-w-full overflow-hidden"
										id="schedule"
										aria-label="Расписание"
										aria-busy="true"
									>
										<div className="panel-heading flex items-center justify-between gap-3">
											<h2>Расписание приемов</h2>
											<span className="status-pill status-planned">
												Загрузка...
											</span>
										</div>
										<div className="p-8 sm:p-12 flex flex-col items-center justify-center gap-3 text-center min-h-[350px]">
											<RefreshCw className="w-8 h-8 animate-spin text-[var(--teal,#0d9488)]" />
											<p className="text-sm font-medium text-[var(--muted)]">
												Подготовка модулей расписания...
											</p>
										</div>
									</section>
								}
							>
								<ClinicalErrorBoundary
									workspaceName="Расписание приёмов"
									workspaceKey="schedule"
								>
									<ScheduleView
										{...(appLogicValue as any)}
										dashboard={dashboard}
										patientName={appLogicValue?.patientName}
										loadDashboard={appLogicValue?.loadDashboard}
										lockScheduleAdminSession={() =>
											appLogicValue?.lockTelegramAdminSession?.("schedule")
										}
										unlockScheduleAdminSession={() =>
											appLogicValue?.unlockTelegramAdminSession?.("schedule")
										}
									/>
								</ClinicalErrorBoundary>
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
									<section
										className="panel patients-panel"
										id="patients"
										aria-label="Пациенты"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Быстрый поиск</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</section>
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
									<section
										className="panel visit-panel"
										id="visit"
										aria-label="Текущий прием"
										aria-busy="true"
									>
										<AppLoadingState
											title="Загрузка клинического приёма..."
											hint="Подготовка карты и данных пациента"
										/>
									</section>
								}
							>
								{activePerspective === "orthodontic" ? (
									<OrthodonticPerspectiveView />
								) : activePerspective === "presentation" ? (
									<TreatmentPlanModule
										patientId={patientId || "anonymous"}
										patientName={activePatient?.fullName || "Пациент"}
										teethData={(patientId && loadStoredTeethData(patientId)) || []}
									/>
								) : (
									<ClinicalErrorBoundary
										workspaceName="Приём пациента"
										workspaceKey="visit"
										visitId={dashboard?.activeVisit?.id}
									>
										<VisitView />
									</ClinicalErrorBoundary>
								)}
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
							panelClassName="finance-panel border-0 bg-transparent p-0 shadow-none"
							panelId="finance"
						>
							<Suspense
								fallback={
									<section
										className="finance-panel border-0 bg-transparent p-0 shadow-none"
										id="finance"
										aria-label="Финансы"
										aria-busy="true"
									>
										<AppLoadingState
											title="Загрузка кассы и оплат..."
											hint="Синхронизация счетов и фискальных чеков"
										/>
									</section>
								}
							>
								<FinanceView />
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
									<section
										className="panel communications-panel"
										id="communications"
										aria-label="Обращения"
										aria-busy="true"
									>
										<div className="panel-heading">
											<h2>Связь с пациентами</h2>
											<span className="status-pill status-planned">
												загрузка
											</span>
										</div>
									</section>
								}
							>
								<CommunicationsView />
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
					{currentView === "analytics" ? (
						<WorkspaceRouteErrorBoundary
							view="analytics"
							label="Аналитика"
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
								{typeof window === "undefined" || !window.location.hash.includes("payout") ? (
									<AnalyticsDashboardView />
								) : null}
							</Suspense>
							<Suspense fallback={null}>
								<ManagerReportsPanel
									clinicMode={
										dashboard?.clinicSettings?.profile?.mode ?? null
									}
								/>
							</Suspense>
						</WorkspaceRouteErrorBoundary>
					) : null}
				</section>
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
							<section
								className="settings-zone"
								id="settings"
								aria-label="Настройки"
								aria-busy="true"
							>
								<div className="panel-heading settings-heading">
									<h2>Настройки</h2>
									<span className="status-pill status-planned">
										загрузка
									</span>
								</div>
							</section>
						}
					>
						<SettingsView
							activeStaffUser={activeStaffUser}
							activePatient={activePatient}
							{...(appLogicValue as any)}
						/>
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "marketing" ? (
				<WorkspaceRouteErrorBoundary
					view="marketing"
					label="Маркетинг/SEO"
					panelClassName="panel marketing-panel"
					panelId="marketing"
				>
					<Suspense
						fallback={<AppLoadingState message="Загрузка маркетинга" />}
					>
						<MarketingView
							clinicName={dashboard?.clinicName}
							clinicPhone={clinicProfileDraft?.phone ?? ""}
						/>
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "inventory" ? (
				<WorkspaceRouteErrorBoundary
					view="inventory"
					label={viewLabels.inventory}
					panelClassName="inventory-panel border-0 bg-transparent p-0 shadow-none"
					panelId="inventory"
				>
					<Suspense
						fallback={<AppLoadingState message="Загрузка склада" />}
					>
						<InventoryView
							organizationId={
								dashboard?.clinicSettings?.profile?.organizationId ?? ""
							}
						/>
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "scanner" ? (
				<WorkspaceRouteErrorBoundary
					view="scanner"
					label={viewLabels.scanner}
					panelClassName="panel scanner-panel"
					panelId="scanner"
				>
					<Suspense
						fallback={
							<AppLoadingState message="Загрузка журнала стерилизации" />
						}
					>
						<ScannerView />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "leads" ? (
				<WorkspaceRouteErrorBoundary
					view="leads"
					label={viewLabels.leads}
					panelClassName="panel leads-panel"
					panelId="leads"
				>
					<Suspense
						fallback={<AppLoadingState message="Загрузка обращений" />}
					>
						<ClinicalErrorBoundary
							workspaceName="Канбан обращений"
							workspaceKey="leads"
						>
							<LeadsKanbanView />
						</ClinicalErrorBoundary>
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "lab" ? (
				<WorkspaceRouteErrorBoundary
					view="lab"
					label={viewLabels.lab}
					panelClassName="panel lab-panel p-2 sm:p-3 overflow-hidden max-w-full"
					panelId="lab"
				>
					<Suspense
						fallback={
							<section
								className="panel lab-panel"
								id="lab"
								aria-label={viewLabels.lab}
								aria-busy="true"
							>
								<div className="panel-heading">
									<h2>{viewLabels.lab}</h2>
								</div>
							</section>
						}
					>
						<LabOrdersPage />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{currentView === "pipeline" ? (
				<WorkspaceRouteErrorBoundary
					view="pipeline"
					label={viewLabels.pipeline}
					panelClassName="panel pipeline-panel p-2 sm:p-4 overflow-hidden max-w-full"
					panelId="pipeline"
				>
					<Suspense
						fallback={<AppLoadingState message="Загрузка воронки планов лечения" />}
					>
						<TreatmentPipeline />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			) : null}
			{toastPortal}
		</section>
	);
}
