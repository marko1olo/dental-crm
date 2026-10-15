import type React from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { QuickBookingDrawer } from "../schedule/QuickBookingDrawer";
import { mapRecallCandidateToRecord } from "./recallCandidateAdapter";
import { useRecallHubState } from "./useRecallHubState";
import { useRecallHubActions } from "./useRecallHubActions";
import { RecallHubHeader } from "./RecallHubHeader";
import { RecallCycleSegmentedBar } from "./RecallCycleSegmentedBar";
import { PatientRecallsRegistryView } from "./PatientRecallsRegistryView";
import { RecallDispensaryFunnel } from "./RecallDispensaryFunnel";
import { PatientRecallsTaskCallsTab } from "./PatientRecallsTaskCallsTab";
import { RecallCallScriptDrawer } from "./RecallCallScriptDrawer";
import { PatientRecallsPreviewModals } from "./PatientRecallsPreviewModals";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";
import "./recalls.css";

export { mapRecallCandidateToRecord };

export interface PatientRecallsHubModalProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly clinicName?: string;
	readonly initialCandidates?: readonly PatientRecallRecord[];
	readonly onBookAppointment?: (candidate: PatientRecallRecord) => void;
	readonly onSendWhatsApp?: (c: PatientRecallRecord, m: string) => Promise<void> | void;
	readonly onSendTelegram?: (c: PatientRecallRecord, m: string) => Promise<void> | void;
	readonly onStatusChange?: (id: string, s: RecallContactStatus) => void;
}

export const PatientRecallsHubModal: React.FC<PatientRecallsHubModalProps> = ({
	isOpen = true, onClose, clinicName = "DENTE Clinic", initialCandidates,
	onBookAppointment, onSendWhatsApp, onSendTelegram, onStatusChange,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const authHeaders = appLogic?.auth ? appLogic.auth.denteClinicalReadHeaders() : undefined;
	const hub = useRecallHubState(isOpen, initialCandidates, authHeaders);
	const actions = useRecallHubActions({
		clinicName, setCandidates: hub.setCandidates, setStatusNotice: hub.setStatusNotice,
		setActivePreviewCandidate: hub.setActivePreviewCandidate, setBookingSlot: hub.setBookingSlot,
		onStatusChange, onBookAppointment, onSendWhatsApp, onSendTelegram,
		authHeaders: appLogic?.auth ? appLogic.auth.denteClinicalMutationHeaders() : undefined,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="recall-manager-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="recalls-hub-title">
			<div className="recall-manager-container" data-testid="patient-recalls-hub-modal">
				<RecallHubHeader activeTab={hub.activeTab} onTabChange={hub.setActiveTab} onClose={onClose} />
				<RecallCycleSegmentedBar selectedCycle={hub.selectedCycle} onSelectedCycleChange={hub.setSelectedCycle} />

				<main className="recall-content-area">
					{hub.activeTab === "registry" && (
						<PatientRecallsRegistryView
							filteredCandidates={hub.filteredCandidates}
							activeScriptCandidateId={hub.activeScriptCandidate?.id ?? null}
							uniqueDoctors={hub.uniqueDoctors}
							selectedDoctorId={hub.selectedDoctorId}
							onDoctorChange={hub.setSelectedDoctorId}
							selectedPeriod={hub.selectedPeriod}
							onPeriodChange={hub.setSelectedPeriod}
							searchQuery={hub.searchQuery}
							onSearchChange={hub.setSearchQuery}
							onBook={actions.handleBook}
							onToggleScript={(c) => hub.setActiveScriptCandidate(hub.activeScriptCandidate?.id === c.id ? null : c)}
							onTogglePreview={(c) => hub.setActivePreviewCandidate(c)}
							onWhatsApp={actions.handleWhatsApp}
							onTelegram={actions.handleTelegram}
							onCopySms={actions.handleCopySms}
							onStatusUpdate={actions.handleStatusUpdate}
						/>
					)}

					{hub.activeTab === "funnel" && (
						<RecallDispensaryFunnel
							candidates={hub.filteredCandidates}
							activeScriptCandidateId={hub.activeScriptCandidate?.id ?? null}
							onBook={actions.handleBook}
							onToggleScript={(c) => hub.setActiveScriptCandidate(hub.activeScriptCandidate?.id === c.id ? null : c)}
							onWhatsApp={actions.handleWhatsApp}
							onTelegram={actions.handleTelegram}
							onCopySms={actions.handleCopySms}
							onStatusUpdate={actions.handleStatusUpdate}
						/>
					)}

					{hub.activeTab === "task_calls" && (
						<PatientRecallsTaskCallsTab
							taskCallCandidates={hub.candidates.map((c) => ({ candidate: c, taskType: "preventive_inspection" as const }))}
							searchQuery={hub.searchQuery}
							onSearchQueryChange={hub.setSearchQuery}
							selectedTaskCallType="all"
							onSelectTaskCallType={() => {}}
							activeTaskCallScriptType={null}
							onToggleTaskCallScriptType={() => {}}
							onWhatsApp={actions.handleWhatsApp}
							onTelegram={actions.handleTelegram}
							onBook={actions.handleBook}
							onStatusUpdate={actions.handleStatusUpdate}
						/>
					)}
				</main>

				<RecallCallScriptDrawer candidate={hub.activeScriptCandidate} onClose={() => hub.setActiveScriptCandidate(null)} onBook={actions.handleBook} onWhatsApp={actions.handleWhatsApp} />
				<PatientRecallsPreviewModals activePreviewCandidate={hub.activePreviewCandidate} previewChannel="whatsapp" onPreviewChannelChange={() => {}} onClosePreview={() => hub.setActivePreviewCandidate(null)} clinicName={clinicName} onCopySms={actions.handleCopySms} onWhatsApp={actions.handleWhatsApp} onTelegram={actions.handleTelegram} onBook={actions.handleBook} />

				{hub.bookingSlot && (
					<QuickBookingDrawer isOpen={Boolean(hub.bookingSlot)} initialSlot={hub.bookingSlot} dashboard={appLogic?.dashboard} auth={appLogic?.auth} onClose={() => hub.setBookingSlot(null)} onAppointmentCreated={() => { if (hub.bookingSlot?.patientId) actions.handleStatusUpdate(hub.bookingSlot.patientId, "scheduled"); hub.setBookingSlot(null); }} />
				)}
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default PatientRecallsHubModal;
