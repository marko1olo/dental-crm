import { useCallback, useState } from "react";

export type ModalDialogKind =
	| "appointment_editor"
	| "patient_editor"
	| "schedule_warning"
	| "visit_warning"
	| "dicom_viewer"
	| "mpr_workbench"
	| "document_issue"
	| "document_void"
	| "payment_terminal"
	| "quick_consult"
	| "command_palette"
	| "voice_dictation"
	| "unlock_pinpad"
	| "telegram_qr"
	| "staff_editor"
	| "chair_editor"
	| "clinical_rule_editor"
	| "inventory_editor"
	| "sterilization_log"
	| "onboarding_guide"
	| (string & {});

export interface ModalOrchestratorOptions {
	initialOpenModals?: ModalDialogKind[];
	onModalOpen?: (modalId: ModalDialogKind, payload?: unknown) => void;
	onModalClose?: (modalId: ModalDialogKind) => void;
}

export function useModalOrchestrator(options: ModalOrchestratorOptions = {}) {
	const [activeModalId, setActiveModalId] = useState<ModalDialogKind | null>(null);
	const [modalPayloads, setModalPayloads] = useState<Record<string, unknown>>({});
	const [openModalSet, setOpenModalSet] = useState<Set<ModalDialogKind>>(
		() => new Set(options.initialOpenModals ?? []),
	);

	const isModalOpen = useCallback(
		(modalId: ModalDialogKind) => openModalSet.has(modalId) || activeModalId === modalId,
		[activeModalId, openModalSet],
	);

	const getModalPayload = useCallback(
		<T = unknown>(modalId: ModalDialogKind): T | null => {
			return (modalPayloads[modalId] as T) ?? null;
		},
		[modalPayloads],
	);

	const openModal = useCallback(
		(modalId: ModalDialogKind, payload?: unknown) => {
			setActiveModalId(modalId);
			setOpenModalSet((prev) => {
				const next = new Set(prev);
				next.add(modalId);
				return next;
			});
			if (payload !== undefined) {
				setModalPayloads((prev) => ({ ...prev, [modalId]: payload }));
			}
			options.onModalOpen?.(modalId, payload);
		},
		[options],
	);

	const closeModal = useCallback(
		(modalId?: ModalDialogKind) => {
			if (modalId) {
				setOpenModalSet((prev) => {
					const next = new Set(prev);
					next.delete(modalId);
					return next;
				});
				if (activeModalId === modalId) {
					setActiveModalId(null);
				}
				setModalPayloads((prev) => {
					const next = { ...prev };
					delete next[modalId];
					return next;
				});
				options.onModalClose?.(modalId);
			} else {
				if (activeModalId) {
					options.onModalClose?.(activeModalId);
				}
				setActiveModalId(null);
				setOpenModalSet(new Set());
				setModalPayloads({});
			}
		},
		[activeModalId, options],
	);

	const toggleModal = useCallback(
		(modalId: ModalDialogKind, payload?: unknown) => {
			if (isModalOpen(modalId)) {
				closeModal(modalId);
			} else {
				openModal(modalId, payload);
			}
		},
		[closeModal, isModalOpen, openModal],
	);

	const closeAllModals = useCallback(() => {
		setActiveModalId(null);
		setOpenModalSet(new Set());
		setModalPayloads({});
	}, []);

	// Specialized dialog controls
	const openAppointmentModal = useCallback((appointmentId?: string) => openModal("appointment_editor", { appointmentId }), [openModal]);
	const closeAppointmentModal = useCallback(() => closeModal("appointment_editor"), [closeModal]);

	const openPatientModal = useCallback((patientId?: string) => openModal("patient_editor", { patientId }), [openModal]);
	const closePatientModal = useCallback(() => closeModal("patient_editor"), [closeModal]);

	const openScheduleWarningModal = useCallback((warning?: unknown) => openModal("schedule_warning", { warning }), [openModal]);
	const closeScheduleWarningModal = useCallback(() => closeModal("schedule_warning"), [closeModal]);

	const openVisitWarningModal = useCallback((warning?: unknown) => openModal("visit_warning", { warning }), [openModal]);
	const closeVisitWarningModal = useCallback(() => closeModal("visit_warning"), [closeModal]);

	const openDicomViewerModal = useCallback((studyId?: string) => openModal("dicom_viewer", { studyId }), [openModal]);
	const closeDicomViewerModal = useCallback(() => closeModal("dicom_viewer"), [closeModal]);

	const openMprWorkbenchModal = useCallback((seriesId?: string) => openModal("mpr_workbench", { seriesId }), [openModal]);
	const closeMprWorkbenchModal = useCallback(() => closeModal("mpr_workbench"), [closeModal]);

	const openDocumentIssueModal = useCallback((documentId?: string) => openModal("document_issue", { documentId }), [openModal]);
	const closeDocumentIssueModal = useCallback(() => closeModal("document_issue"), [closeModal]);

	const openDocumentVoidModal = useCallback((documentId?: string) => openModal("document_void", { documentId }), [openModal]);
	const closeDocumentVoidModal = useCallback(() => closeModal("document_void"), [closeModal]);

	const openPaymentModal = useCallback((paymentId?: string) => openModal("payment_terminal", { paymentId }), [openModal]);
	const closePaymentModal = useCallback(() => closeModal("payment_terminal"), [closeModal]);

	const openQuickConsultModal = useCallback(() => openModal("quick_consult"), [openModal]);
	const closeQuickConsultModal = useCallback(() => closeModal("quick_consult"), [closeModal]);

	const openCommandPalette = useCallback(() => openModal("command_palette"), [openModal]);
	const closeCommandPalette = useCallback(() => closeModal("command_palette"), [closeModal]);
	const toggleCommandPalette = useCallback(() => toggleModal("command_palette"), [toggleModal]);

	const openVoiceDictation = useCallback(() => openModal("voice_dictation"), [openModal]);
	const closeVoiceDictation = useCallback(() => closeModal("voice_dictation"), [closeModal]);
	const toggleVoiceDictation = useCallback(() => toggleModal("voice_dictation"), [toggleModal]);

	const openTelegramQrModal = useCallback((code?: string) => openModal("telegram_qr", { code }), [openModal]);
	const closeTelegramQrModal = useCallback(() => closeModal("telegram_qr"), [closeModal]);

	return {
		activeModalId,
		openModalSet,
		isModalOpen,
		getModalPayload,
		openModal,
		closeModal,
		toggleModal,
		closeAllModals,
		// Specialized modal helpers
		isAppointmentEditorOpen: isModalOpen("appointment_editor"),
		openAppointmentModal,
		closeAppointmentModal,
		isPatientModalOpen: isModalOpen("patient_editor"),
		openPatientModal,
		closePatientModal,
		isScheduleWarningOpen: isModalOpen("schedule_warning"),
		openScheduleWarningModal,
		closeScheduleWarningModal,
		isVisitWarningOpen: isModalOpen("visit_warning"),
		openVisitWarningModal,
		closeVisitWarningModal,
		isDicomViewerModalOpen: isModalOpen("dicom_viewer"),
		openDicomViewerModal,
		closeDicomViewerModal,
		isMprWorkbenchModalOpen: isModalOpen("mpr_workbench"),
		openMprWorkbenchModal,
		closeMprWorkbenchModal,
		isDocumentIssueModalOpen: isModalOpen("document_issue"),
		openDocumentIssueModal,
		closeDocumentIssueModal,
		isDocumentVoidModalOpen: isModalOpen("document_void"),
		openDocumentVoidModal,
		closeDocumentVoidModal,
		isPaymentModalOpen: isModalOpen("payment_terminal"),
		openPaymentModal,
		closePaymentModal,
		isQuickConsultModalOpen: isModalOpen("quick_consult"),
		openQuickConsultModal,
		closeQuickConsultModal,
		isCommandPaletteOpen: isModalOpen("command_palette"),
		openCommandPalette,
		closeCommandPalette,
		toggleCommandPalette,
		isVoiceDictationOpen: isModalOpen("voice_dictation"),
		openVoiceDictation,
		closeVoiceDictation,
		toggleVoiceDictation,
		isTelegramQrModalOpen: isModalOpen("telegram_qr"),
		openTelegramQrModal,
		closeTelegramQrModal,
	};
}
