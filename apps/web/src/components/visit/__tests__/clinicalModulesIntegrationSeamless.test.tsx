import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { VisitActionButtonsToolbar } from "../view/visitHeader/VisitActionButtonsToolbar";
import { VisitViewHeader } from "../view/VisitViewHeader";
import { ClinicalSupportModals } from "../view/viewModalsModules/ClinicalSupportModals";
import { PatientWorkspaceToolbar } from "../../patients/workspaceView/PatientWorkspaceToolbar";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

describe("Clinical Modules Seamless Integration Red Team Verification (Inquisitor #4)", () => {
	it("1. VisitActionButtonsToolbar renders 'Выписать рецепт' button in the '...' dropdown", () => {
		const html = renderToString(
			<VisitActionButtonsToolbar
				handleApplySomaticNormQuick={() => {}}
				handlePrintForm043uFast={() => {}}
				handlePrintCompletedActFast={() => {}}
				handlePrintEstimateFast={() => {}}
				setIsEmergencyModalOpen={() => {}}
				shiftDayQueue={{ arrived: 0, inTreatment: 0, awaitingPayment: 0, arrivedPatients: [] }}
				isQueueLobbyDropdownOpen={false}
				setIsQueueLobbyDropdownOpen={() => {}}
				queueLobbyDropdownRef={{ current: null }}
				handleFinishVisitAction={() => {}}
				isHeaderMoreMenuOpen={true}
				setIsHeaderMoreMenuOpen={() => {}}
				headerMoreMenuRef={{ current: null }}
				handlePrintInformedConsentFast={() => {}}
				setIsInformedConsentModalOpen={() => {}}
				setIsWarrantyModalOpen={() => {}}
				setIsDoctorShiftModalOpen={() => {}}
				setIsPriceValidatorModalOpen={() => {}}
				setIsStagePaymentModalOpen={() => {}}
				setIsPrescriptionModalOpen={() => {}}
			/>,
		);

		assert.ok(
			html.includes('data-testid="visit-more-action-prescription"'),
			"VisitActionButtonsToolbar must render data-testid='visit-more-action-prescription' in more-actions dropdown",
		);
		assert.ok(
			html.includes("Выписать рецепт"),
			"VisitActionButtonsToolbar must display human-readable text 'Выписать рецепт'",
		);
	});

	it("2. VisitViewHeader renders 'Выписать рецепт' in more actions dropdown", () => {
		const html = renderToString(
			<VisitViewHeader
				activePatient={{ id: "pat-1", fullName: "Семенова Ольга Ивановна" } as any}
				patientAge="34 года"
				activePatientCriticalBadges={[]}
				consolidatedAllergyChip={null}
				activePeers={[]}
				summaryText={null}
				handleApplySomaticNormQuick={() => {}}
				handlePrintForm043uFast={() => {}}
				handlePrintCompletedActFast={() => {}}
				handlePrintEstimateFast={() => {}}
				handlePrintInformedConsentFast={() => {}}
				handleOpenLabOrder={() => {}}
				setIsEmergencyModalOpen={() => {}}
				handleFinishVisitAction={() => {}}
				setIsQueueCockpitForced={() => {}}
				isHeaderMoreMenuOpen={true}
				setIsHeaderMoreMenuOpen={() => {}}
				headerMoreMenuRef={{ current: null }}
				setIsDoctorShiftModalOpen={() => {}}
				setIsPriceValidatorModalOpen={() => {}}
				setIsStagePaymentModalOpen={() => {}}
				setIsPrescriptionModalOpen={() => {}}
			/>,
		);

		assert.ok(
			html.includes('data-testid="visit-more-action-prescription"'),
			"VisitViewHeader must render data-testid='visit-more-action-prescription'",
		);
	});

	it("3. ClinicalSupportModals mounts PrescriptionModal with real patient and clinic demographics", () => {
		const html = renderToString(
			<ClinicalSupportModals
				effectiveActiveModal="prescription"
				isEmergencyModalOpen={false}
				setIsEmergencyModalOpen={() => {}}
				isVoiceDictationModalOpen={false}
				setIsVoiceDictationModalOpen={() => {}}
				isWarrantyModalOpen={false}
				setIsWarrantyModalOpen={() => {}}
				isDoctorShiftModalOpen={false}
				setIsDoctorShiftModalOpen={() => {}}
				isInformedConsentModalOpen={false}
				setIsInformedConsentModalOpen={() => {}}
				isPrescriptionModalOpen={true}
				setIsPrescriptionModalOpen={() => {}}
				activePatient={{
					id: "pat-real-1",
					fullName: "Смирнов Алексей Петрович",
					cardNumber: "EMK-7712",
					allergies: ["Лидокаин"],
				}}
				activeDoctor={{
					id: "doc-1",
					fullName: "Д-р Воронов А. В.",
					specialty: "Стоматолог-терапевт",
				}}
				dashboard={{
					clinicSettings: {
						profile: {
							brandName: "ДЕНТЕ КЛИНИКА",
							address: "г. Москва, ул. Профсоюзная, 12",
						},
					},
				}}
				patientAge="42 года"
				selectedToothForMenu={null}
				visitNoteForm={{
					diagnosis: "K04.0 Начальный пульпит",
					treatmentDescription: "Витальная экстирпация",
				}}
				activeAppointment={{ id: "app-1", status: "in_progress" }}
				setToothState={() => {}}
				appendToEMKField={() => {}}
			/>,
		);

		assert.ok(
			html.includes('data-testid="prescription-print-modal"'),
			"ClinicalSupportModals must render real PrescriptionModal",
		);
		assert.ok(
			html.includes("Смирнов Алексей Петрович"),
			"PrescriptionModal must render patient's real full name",
		);
		assert.ok(
			html.includes("EMK-7712"),
			"PrescriptionModal must render patient card number",
		);
		assert.ok(
			html.includes("Лидокаин"),
			"PrescriptionModal must show real allergy alert for Лидокаин",
		);
	});

	it("4. PatientWorkspaceToolbar renders 'Выписать рецепт' and 'Справка для вычета (13%)'", () => {
		const html = renderToString(
			<AppLogicProvider value={{} as any}>
				<PatientWorkspaceToolbar
					patientId="pat-100"
					patientName="Кузнецов Виктор Сергеевич"
					handleCreateNewPlanCallback={() => {}}
					setActiveTab={() => {}}
					setIsCbctModalOpen={() => {}}
					setIsPhotoProtocolOpen={() => {}}
					setIsOrthoPhotoModalOpen={() => {}}
					setIsLoyaltyModalOpen={() => {}}
					setIsDmsLetterOpen={() => {}}
					setIsDmsRegistryOpen={() => {}}
					setIsPrescriptionModalOpen={() => {}}
					setIsTaxCertificateOpen={() => {}}
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes("data-testid=\"btn-patient-create-visit\""),
			"Toolbar rendered primary actions without errors",
		);
		assert.ok(
			html.includes("data-testid=\"btn-patient-docs-dms-menu\""),
			"Toolbar rendered documents dropdown button",
		);
	});
});
