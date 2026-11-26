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
import { TreatmentPlanStudioModal } from "../../components/treatment-plans/TreatmentPlanStudioModal";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useDocumentBrandingStore } from "../../store/documentBrandingStore";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

export type { PipelineStage, PipelineCard, PipelineResponse, PipelineStageFilter, PipelineViewMode };

export const TreatmentPipeline: React.FC = () => {
	const branding = useDocumentBrandingStore();
	const appLogic = useOptionalAppLogicContext();
	const state = useTreatmentPipelineState();

	const [presenterDoctorOverride, setPresenterDoctorOverride] = useState<string>("");

	const clinicSettingsProfile = appLogic?.dashboard?.clinicSettings?.profile;
	const clinicName = branding.clinicName || clinicSettingsProfile?.clinicName || "";
	const clinicLegalName = branding.clinicLegalName || clinicSettingsProfile?.legalName || clinicName;
	const clinicInn = branding.clinicInn || clinicSettingsProfile?.inn || "";
	const clinicOgrn = branding.clinicOgrn || clinicSettingsProfile?.ogrn || "";
	const clinicAddress = branding.clinicAddress || clinicSettingsProfile?.address || "";
	const areRequisitesMissing = !clinicInn || !clinicOgrn || !clinicAddress;

	const effectiveDoctorName = useMemo(() => {
		if (presenterDoctorOverride) return presenterDoctorOverride;
		if (state.selectedCardForPresenter?.doctorName) return state.selectedCardForPresenter.doctorName;
		if (appLogic?.activeDoctor?.fullName) return appLogic.activeDoctor.fullName;
		return "Врач не назначен";
	}, [presenterDoctorOverride, state.selectedCardForPresenter?.doctorName, appLogic?.activeDoctor?.fullName]);

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

			{areRequisitesMissing && (
				<div
					className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--warning-soft,rgba(245,158,11,0.1))] border border-[var(--warning-line,rgba(245,158,11,0.35))] text-xs text-[var(--ink)]"
					data-testid="pipeline-requisites-inline-notice"
				>
					<AlertCircle className="w-4 h-4 shrink-0 text-[var(--warning,#f59e0b)]" />
					<span>Реквизиты клиники не заполнены в профиле организации (Настройки → Клиника)</span>
				</div>
			)}

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
				isHidden={Boolean(state.selectedCardForPresenter)}
				onRunDropoutPrevention={state.handleRunDropoutPrevention}
				onRefresh={state.fetchPipeline}
			/>

			{/* Presenter Modal */}
			{state.selectedCardForPresenter && (
				<TreatmentPlanStudioModal
					key={state.selectedCardForPresenter.patientId || "draft"}
					isOpen={Boolean(state.selectedCardForPresenter)}
					onClose={() => {
						state.setSelectedCardForPresenter(null);
						setPresenterDoctorOverride("");
					}}
					patientName={state.selectedCardForPresenter.patientName}
					patientId={state.selectedCardForPresenter.patientId}
					patientPhone={state.selectedCardForPresenter.patientPhone || ""}
					doctorFullName={effectiveDoctorName}
					doctorSpecialty={appLogic?.activeDoctor && "specialty" in appLogic.activeDoctor ? String((appLogic.activeDoctor as { specialty?: unknown }).specialty ?? "") : ""}
					clinicName={clinicName}
					clinicAddress={clinicAddress}
					planId={state.selectedCardForPresenter.id}
					onConfirmSelection={async () => {
						await state.fetchPipeline();
					}}
					onApproveAndSign={async () => {
						await state.fetchPipeline();
					}}
					isDemoMode={isDemoShowcaseMode()}
				/>
			)}
		</div>
	);
};

export default TreatmentPipeline;
