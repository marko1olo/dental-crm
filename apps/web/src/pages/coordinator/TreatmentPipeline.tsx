import * as React from "react";
import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
	type PipelineCard,
	type PipelineResponse,
	type PipelineStage,
	type PipelineStageFilter,
	type PipelineViewMode,
} from "./pipeline/types";
import { useTreatmentPipelineState } from "./pipeline/useTreatmentPipelineState";
import { TreatmentPipelineHeader } from "./pipeline/TreatmentPipelineHeader";
import { TreatmentPipelineToolbar } from "./pipeline/TreatmentPipelineToolbar";
import { PipelineKpiSummary } from "./pipeline/PipelineKpiSummary";
import { TreatmentPipelineMobileStages } from "./pipeline/TreatmentPipelineMobileStages";
import { TreatmentPipelineMobileFloatingBar } from "./pipeline/TreatmentPipelineMobileFloatingBar";
import { PipelineBoard } from "./pipeline/PipelineBoard";
import { TreatmentPlanPresenterModal } from "../../components/treatment-plans/TreatmentPlanPresenterModal";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useDocumentBrandingStore } from "../../store/documentBrandingStore";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

export type { PipelineStage, PipelineCard, PipelineResponse, PipelineStageFilter, PipelineViewMode };

export const TreatmentPipeline: React.FC = () => {
	const branding = useDocumentBrandingStore();
	const appLogic = useOptionalAppLogicContext();
	const state = useTreatmentPipelineState();

	const [presenterDoctorOverride, setPresenterDoctorOverride] = useState<string>("");

	const clinicName = branding.clinicName || appLogic?.dashboard?.organization?.name || "";
	const clinicLegalName = branding.clinicLegalName || appLogic?.dashboard?.organization?.legalName || clinicName;
	const clinicInn = branding.clinicInn || appLogic?.dashboard?.organization?.inn || "";
	const clinicOgrn = branding.clinicOgrn || appLogic?.dashboard?.organization?.ogrn || "";
	const clinicAddress = branding.clinicAddress || appLogic?.dashboard?.organization?.address || "";
	const areRequisitesMissing = !clinicInn || !clinicOgrn || !clinicAddress;

	const effectiveDoctorName = useMemo(() => {
		if (presenterDoctorOverride) return presenterDoctorOverride;
		if (state.selectedCardForPresenter?.doctorName) return state.selectedCardForPresenter.doctorName;
		if (appLogic?.dashboard?.activeDoctor?.fullName) return appLogic.dashboard.activeDoctor.fullName;
		return "Врач не назначен";
	}, [presenterDoctorOverride, state.selectedCardForPresenter?.doctorName, appLogic?.dashboard?.activeDoctor?.fullName]);

	const dropoutRiskCount = state.data?.summary.analytics?.dropoutRiskCount ?? 0;

	return (
		<div className="w-full min-h-screen flex flex-col p-2.5 sm:p-4 space-y-4 overflow-x-hidden bg-[var(--bg)] text-[var(--text)] pb-4 md:pb-6">
			{/* Top Header: 1 Row, Mandate 8am Single Primary CTA */}
			<TreatmentPipelineHeader
				dropoutRiskCount={dropoutRiskCount}
				isRunningDropout={state.isRunningDropout}
				isLoading={state.isLoading}
				viewMode={state.viewMode}
				onViewModeChange={state.setViewMode}
				onRunDropoutPrevention={state.handleRunDropoutPrevention}
				onRefresh={state.fetchPipeline}
			/>

			{/* KPI Summary & Interactive Stage Selector */}
			{state.data && (
				<PipelineKpiSummary
					data={state.data}
					selectedStage={state.selectedStage}
					onSelectStage={state.setSelectedStage}
				/>
			)}

			{/* Filter & Search Toolbar */}
			<TreatmentPipelineToolbar
				searchQuery={state.searchQuery}
				onSearchQueryChange={state.setSearchQuery}
				selectedStage={state.selectedStage}
				onResetStageFilter={() => state.setSelectedStage("all")}
				selectedDoctorId={state.selectedDoctorId}
				onDoctorIdChange={state.setSelectedDoctorId}
				accumulatedDoctors={state.accumulatedDoctors}
				dropoutMessage={state.dropoutMessage}
				onDismissDropoutMessage={() => state.setDropoutMessage(null)}
			/>

			{/* Apple HIG Mobile Stage Selector */}
			<TreatmentPipelineMobileStages
				data={state.data}
				activeMobileStage={state.activeMobileStage}
				onSelectMobileStage={(stg) => {
					state.setActiveMobileStage(stg);
					state.setSelectedStage(stg);
				}}
			/>

			{/* Board Content */}
			{state.error ? (
				<div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center space-y-2">
					<AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
					<h3 className="text-sm font-semibold text-rose-500">Ошибка загрузки воронки</h3>
					<p className="text-xs text-[var(--muted)]">{state.error}</p>
				</div>
			) : (
				state.data && (
					<div className="pb-20 md:pb-0">
						<PipelineBoard
							data={state.data}
							selectedStage={state.selectedStage}
							onSelectStage={state.setSelectedStage}
							viewMode={state.viewMode}
							activeMobileStage={state.activeMobileStage}
							copiedToken={state.copiedToken}
							isGeneratingLink={state.isGeneratingLink}
							onCopyOrGenerateLink={state.handleCopyOrGenerateLink}
							onOpenPlan={(card) => state.setSelectedCardForPresenter(card)}
							onTransitionStage={state.handleTransitionStage}
							onCreateRecallTask={state.handleCreatePlanRecall}
							onCreateNewPlan={() => {
								if (typeof window !== "undefined") {
									window.location.hash = "#/patients";
								}
							}}
						/>
					</div>
				)
			)}

			{/* Floating Bottom Bar in Natural Thumb Zone for Mobile */}
			<TreatmentPipelineMobileFloatingBar
				data={state.data}
				activeMobileStage={state.activeMobileStage}
				dropoutRiskCount={dropoutRiskCount}
				isRunningDropout={state.isRunningDropout}
				isLoading={state.isLoading}
				onRunDropoutPrevention={state.handleRunDropoutPrevention}
				onRefresh={state.fetchPipeline}
			/>

			{/* Presenter Modal with Clinic Requisites Guard */}
			{state.selectedCardForPresenter && (
				<>
					{(areRequisitesMissing || (!state.selectedCardForPresenter.doctorName && !presenterDoctorOverride)) && (
						<div
							className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] max-w-xl w-[92vw] flex flex-col gap-1.5 p-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-500/40 shadow-2xl text-xs text-[var(--ink,#0f172a)] backdrop-blur-md"
							data-testid="pipeline-presenter-warning-bar"
						>
							{areRequisitesMissing && (
								<div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
									<AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
									<span>⚠️ Реквизиты клиники не заполнены в профиле организации (Настройки -&gt; Клиника)</span>
								</div>
							)}
							{(!state.selectedCardForPresenter.doctorName && !presenterDoctorOverride) && (
								<div className="flex items-center justify-between gap-2 flex-wrap">
									<span className="text-amber-800 dark:text-amber-200 font-medium">
										Врач не назначен для данного плана:
									</span>
									<select
										value={presenterDoctorOverride}
										onChange={(e) => setPresenterDoctorOverride(e.target.value)}
										className="h-7 px-2 text-xs rounded-md border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] cursor-pointer"
										data-testid="pipeline-doctor-assign-select"
									>
										<option value="">-- Выбрать врача из персонала --</option>
										{state.accumulatedDoctors.map((doc) => (
											<option key={doc.id} value={doc.name}>
												{doc.name}
											</option>
										))}
									</select>
								</div>
							)}
						</div>
					)}

					<TreatmentPlanPresenterModal
						isOpen={Boolean(state.selectedCardForPresenter)}
						onClose={() => {
							state.setSelectedCardForPresenter(null);
							setPresenterDoctorOverride("");
						}}
						patientName={state.selectedCardForPresenter.patientName}
						patientId={state.selectedCardForPresenter.patientId}
						patientPhone={state.selectedCardForPresenter.patientPhone || ""}
						doctorFullName={effectiveDoctorName}
						doctorSpecialty={appLogic?.dashboard?.activeDoctor?.specialty || ""}
						clinicName={clinicName}
						clinicLegalName={clinicLegalName}
						clinicInn={clinicInn}
						clinicOgrn={clinicOgrn}
						clinicAddress={clinicAddress}
						planId={state.selectedCardForPresenter.id}
						planCreatedAtIso={state.selectedCardForPresenter.createdAt}
						onConfirmSelection={async () => {
							await state.fetchPipeline();
						}}
						onApproveAndSign={async () => {
							await state.fetchPipeline();
						}}
						isDemoMode={isDemoShowcaseMode()}
					/>
				</>
			)}
		</div>
	);
};

export default TreatmentPipeline;
