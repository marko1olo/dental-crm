import React from "react";
import { EndoCanalLogModal } from "../../endo/EndoCanalLogModal";
import { DentalLabOrderModal } from "../../lab/DentalLabOrderModal";
import { StagePaymentPlanModal } from "../../treatment-plans/stagePayment/StagePaymentPlanModal";
import { TreatmentPlanPriceValidatorModal } from "../../treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { EmergencyRescueModal } from "../../emergency/EmergencyRescueModal";
import {
	VoiceDictationAssistantModal,
	type DictationCommand,
} from "../../voice/VoiceDictationAssistantModal";
import { WarrantyPassportModal } from "../../warranty/WarrantyPassportModal";
import { DoctorMobileShiftModal } from "../../doctor-portal/DoctorMobileShiftModal";
import { InformedConsentModal } from "../../consents/InformedConsentModal";
import { VisiographComparisonModal } from "../../visiograph/VisiographComparisonModal";
import { showToast } from "../../GlobalToast";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { useVisitStore } from "../../../store/visitStore";
import {
	extractAppointmentStageInfo,
	getStandardStageTitle,
} from "../visitPlanStageHandoff";

export interface VisitViewModalsProps {
	loadedTreatmentPlan?: any;
	isVisiographComparisonModalOpen?: boolean;
	setIsVisiographComparisonModalOpen?: (v: boolean) => void;
	endoModalToothNumber: string | null;
	endoModalToothState?: string;
	isEndoModalOpen: boolean;
	setIsEndoModalOpen: (v: boolean) => void;
	setEndoModalToothNumber: (v: string | null) => void;
	isLabOrderModalOpen: boolean;
	setIsLabOrderModalOpen: (v: boolean) => void;
	labOrderModalToothNumber: string | null;
	setLabOrderModalToothNumber: (v: string | null) => void;
	isStagePaymentModalOpen: boolean;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	isPriceValidatorModalOpen: boolean;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: modal payloads
	priceValidatorPlanPayload: any;
	// biome-ignore lint/suspicious/noExplicitAny: modal payloads
	priceValidatorCatalogList: any;
	isEmergencyModalOpen: boolean;
	setIsEmergencyModalOpen: (v: boolean) => void;
	isVoiceDictationModalOpen: boolean;
	setIsVoiceDictationModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: menu selection
	selectedToothForMenu: any;
	isWarrantyModalOpen: boolean;
	setIsWarrantyModalOpen: (v: boolean) => void;
	isDoctorShiftModalOpen: boolean;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpen: boolean;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: patient & doctor
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard: any;
	patientAge?: string | null;
	appendToEMKField: (field: string, text: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: tooth state
	setToothState: (code: string, state: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: visit note form
	visitNoteForm: any;
	// biome-ignore lint/suspicious/noExplicitAny: active appointment
	activeAppointment: any;
}

export function VisitViewModals({
	loadedTreatmentPlan,
	isVisiographComparisonModalOpen,
	setIsVisiographComparisonModalOpen,
	endoModalToothNumber,
	endoModalToothState,
	isEndoModalOpen,
	setIsEndoModalOpen,
	setEndoModalToothNumber,
	isLabOrderModalOpen,
	setIsLabOrderModalOpen,
	labOrderModalToothNumber,
	setLabOrderModalToothNumber,
	isStagePaymentModalOpen,
	setIsStagePaymentModalOpen,
	isPriceValidatorModalOpen,
	setIsPriceValidatorModalOpen,
	priceValidatorPlanPayload,
	priceValidatorCatalogList,
	isEmergencyModalOpen,
	setIsEmergencyModalOpen,
	isVoiceDictationModalOpen,
	setIsVoiceDictationModalOpen,
	selectedToothForMenu,
	isWarrantyModalOpen,
	setIsWarrantyModalOpen,
	isDoctorShiftModalOpen,
	setIsDoctorShiftModalOpen,
	isInformedConsentModalOpen,
	setIsInformedConsentModalOpen,
	activePatient,
	activeDoctor,
	dashboard,
	patientAge,
	appendToEMKField,
	setToothState,
	visitNoteForm,
	activeAppointment,
}: VisitViewModalsProps) {
	// ─── STAGE TARGETING FOR DENTAL LAB ORDERS & ORTHOPEDIC HANDOFF ───
	const appointmentStageTarget = React.useMemo(() => {
		return extractAppointmentStageInfo(activeAppointment);
	}, [activeAppointment]);

	const effectiveTreatmentPlanId =
		loadedTreatmentPlan?.id ||
		activeAppointment?.treatmentPlanId ||
		appointmentStageTarget.treatmentPlanId ||
		undefined;
	const effectiveStageNumber =
		activeAppointment?.stageNumber ??
		appointmentStageTarget.stageNumber ??
		1;
	const effectiveStageTitle =
		activeAppointment?.stageTitle ||
		appointmentStageTarget.stageTitle ||
		getStandardStageTitle(effectiveStageNumber);
	const effectiveStageId =
		activeAppointment?.stageId ||
		appointmentStageTarget.stageId ||
		undefined;

	// Вычисление единственной активной клинической модалки (ИНВАРИАНТ 1: Clinical Visit Exclusivity)
	// Экстренная помощь (emergency_rescue) имеет абсолютный клинический приоритет при анафилаксии/шоке.
	const effectiveActiveModal = React.useMemo<string | null>(() => {
		if (isEmergencyModalOpen) return "emergency_rescue";
		if (isVisiographComparisonModalOpen) return "visiograph_comparison";
		if (isLabOrderModalOpen) return "lab_order";
		if (isEndoModalOpen) return "endo_canal";
		if (isStagePaymentModalOpen) return "stage_payment";
		if (isPriceValidatorModalOpen) return "price_validator";
		if (isVoiceDictationModalOpen) return "voice_dictation";
		if (isWarrantyModalOpen) return "warranty_passport";
		if (isDoctorShiftModalOpen) return "doctor_mobile_shift";
		if (isInformedConsentModalOpen) return "informed_consent";
		return null;
	}, [
		isEmergencyModalOpen,
		isVisiographComparisonModalOpen,
		isLabOrderModalOpen,
		isEndoModalOpen,
		isStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		isVoiceDictationModalOpen,
		isWarrantyModalOpen,
		isDoctorShiftModalOpen,
		isInformedConsentModalOpen,
	]);

	// Взаимное исключение модалок приёма врача (Мандаты 8b, 8e):
	// При открытии любой клинической модалки все остальные конкурирующие модалки принудительно закрываются.
	React.useEffect(() => {
		if (!effectiveActiveModal) {
			const current = useUiSurfaceStore.getState().primaryModal?.id;
			if (
				current === "lab_order" ||
				current === "endo_canal" ||
				current === "stage_payment" ||
				current === "price_validator" ||
				current === "emergency_rescue" ||
				current === "voice_dictation" ||
				current === "warranty_passport" ||
				current === "doctor_mobile_shift" ||
				current === "informed_consent"
			) {
				useUiSurfaceStore.getState().closePrimaryModal();
			}
			return;
		}

		useUiSurfaceStore.getState().openPrimaryModal(effectiveActiveModal as any);

		// Автоматическое закрытие конкурирующих флагов состояний родителя
		if (effectiveActiveModal === "emergency_rescue") {
			if (isLabOrderModalOpen) setIsLabOrderModalOpen(false);
			if (isEndoModalOpen) setIsEndoModalOpen(false);
			if (isStagePaymentModalOpen) setIsStagePaymentModalOpen(false);
			if (isPriceValidatorModalOpen) setIsPriceValidatorModalOpen(false);
			if (isVoiceDictationModalOpen) setIsVoiceDictationModalOpen(false);
			if (isWarrantyModalOpen) setIsWarrantyModalOpen(false);
			if (isDoctorShiftModalOpen) setIsDoctorShiftModalOpen(false);
			if (isInformedConsentModalOpen) setIsInformedConsentModalOpen(false);
		} else if (effectiveActiveModal === "lab_order") {
			if (isEndoModalOpen) setIsEndoModalOpen(false);
			if (isStagePaymentModalOpen) setIsStagePaymentModalOpen(false);
			if (isPriceValidatorModalOpen) setIsPriceValidatorModalOpen(false);
			if (isVoiceDictationModalOpen) setIsVoiceDictationModalOpen(false);
			if (isWarrantyModalOpen) setIsWarrantyModalOpen(false);
			if (isDoctorShiftModalOpen) setIsDoctorShiftModalOpen(false);
			if (isInformedConsentModalOpen) setIsInformedConsentModalOpen(false);
		} else if (effectiveActiveModal === "endo_canal") {
			if (isLabOrderModalOpen) setIsLabOrderModalOpen(false);
			if (isStagePaymentModalOpen) setIsStagePaymentModalOpen(false);
			if (isPriceValidatorModalOpen) setIsPriceValidatorModalOpen(false);
			if (isVoiceDictationModalOpen) setIsVoiceDictationModalOpen(false);
			if (isWarrantyModalOpen) setIsWarrantyModalOpen(false);
			if (isDoctorShiftModalOpen) setIsDoctorShiftModalOpen(false);
			if (isInformedConsentModalOpen) setIsInformedConsentModalOpen(false);
		} else if (effectiveActiveModal === "stage_payment") {
			if (isLabOrderModalOpen) setIsLabOrderModalOpen(false);
			if (isEndoModalOpen) setIsEndoModalOpen(false);
			if (isPriceValidatorModalOpen) setIsPriceValidatorModalOpen(false);
			if (isVoiceDictationModalOpen) setIsVoiceDictationModalOpen(false);
			if (isWarrantyModalOpen) setIsWarrantyModalOpen(false);
			if (isDoctorShiftModalOpen) setIsDoctorShiftModalOpen(false);
			if (isInformedConsentModalOpen) setIsInformedConsentModalOpen(false);
		} else if (effectiveActiveModal === "warranty_passport") {
			if (isLabOrderModalOpen) setIsLabOrderModalOpen(false);
			if (isEndoModalOpen) setIsEndoModalOpen(false);
			if (isStagePaymentModalOpen) setIsStagePaymentModalOpen(false);
			if (isPriceValidatorModalOpen) setIsPriceValidatorModalOpen(false);
			if (isVoiceDictationModalOpen) setIsVoiceDictationModalOpen(false);
			if (isDoctorShiftModalOpen) setIsDoctorShiftModalOpen(false);
			if (isInformedConsentModalOpen) setIsInformedConsentModalOpen(false);
		} else if (effectiveActiveModal === "informed_consent") {
			if (isLabOrderModalOpen) setIsLabOrderModalOpen(false);
			if (isEndoModalOpen) setIsEndoModalOpen(false);
			if (isStagePaymentModalOpen) setIsStagePaymentModalOpen(false);
			if (isPriceValidatorModalOpen) setIsPriceValidatorModalOpen(false);
			if (isVoiceDictationModalOpen) setIsVoiceDictationModalOpen(false);
			if (isWarrantyModalOpen) setIsWarrantyModalOpen(false);
			if (isDoctorShiftModalOpen) setIsDoctorShiftModalOpen(false);
		}
	}, [
		effectiveActiveModal,
		isEmergencyModalOpen,
		isLabOrderModalOpen,
		isEndoModalOpen,
		isStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		isVoiceDictationModalOpen,
		isWarrantyModalOpen,
		isDoctorShiftModalOpen,
		isInformedConsentModalOpen,
		setIsEmergencyModalOpen,
		setIsLabOrderModalOpen,
		setIsEndoModalOpen,
		setIsStagePaymentModalOpen,
		setIsPriceValidatorModalOpen,
		setIsVoiceDictationModalOpen,
		setIsWarrantyModalOpen,
		setIsDoctorShiftModalOpen,
		setIsInformedConsentModalOpen,
	]);

	// Закрытие всех модалок по внешнему событию dente:close-all-surfaces
	React.useEffect(() => {
		const handleCloseAll = () => {
			setIsLabOrderModalOpen(false);
			setIsEndoModalOpen(false);
			setIsStagePaymentModalOpen(false);
			setIsPriceValidatorModalOpen(false);
			setIsEmergencyModalOpen(false);
			setIsVoiceDictationModalOpen(false);
			setIsWarrantyModalOpen(false);
			setIsDoctorShiftModalOpen(false);
			setIsInformedConsentModalOpen(false);
		};
		window.addEventListener("dente:close-all-surfaces", handleCloseAll);
		return () => {
			window.removeEventListener("dente:close-all-surfaces", handleCloseAll);
		};
	}, [
		setIsLabOrderModalOpen,
		setIsEndoModalOpen,
		setIsStagePaymentModalOpen,
		setIsPriceValidatorModalOpen,
		setIsEmergencyModalOpen,
		setIsVoiceDictationModalOpen,
		setIsWarrantyModalOpen,
		setIsDoctorShiftModalOpen,
		setIsInformedConsentModalOpen,
	]);

	return (
		<>
			{/* Endodontic Root Canal Log Modal */}
			{effectiveActiveModal === "endo_canal" && endoModalToothNumber && (
				<EndoCanalLogModal
					isOpen={isEndoModalOpen}
					onClose={() => {
						setIsEndoModalOpen(false);
						setEndoModalToothNumber(null);
						useUiSurfaceStore.getState().closePrimaryModal("endo_canal");
					}}
					toothNumber={Number(endoModalToothNumber)}
					toothState={endoModalToothState}
					patientId={
						activePatient?.id ||
						(typeof dashboard?.activeVisit?.patientId === "string"
							? dashboard.activeVisit.patientId
							: undefined)
					}
					onInsertToProtocol={(protocolText) => {
						appendToEMKField("treatmentPlan", protocolText);
					}}
				/>
			)}

			{/* Dental Lab Order Modal (ЗТЛ) */}
			{effectiveActiveModal === "lab_order" && (
				<DentalLabOrderModal
					isOpen={isLabOrderModalOpen}
					onClose={() => {
						setIsLabOrderModalOpen(false);
						setLabOrderModalToothNumber(null);
						useUiSurfaceStore.getState().closePrimaryModal("lab_order");
					}}
					patientId={
						activePatient?.id ||
						activePatient?.patientId ||
						activeAppointment?.patientId ||
						(typeof dashboard?.activeVisit?.patientId === "string"
							? dashboard.activeVisit.patientId
							: undefined)
					}
					patientName={
						activePatient?.fullName ||
						activePatient?.name ||
						activeAppointment?.patientName ||
						"Пациент"
					}
					doctorId={
						activeDoctor?.id ||
						activeDoctor?.userId ||
						activeAppointment?.doctorId ||
						undefined
					}
					doctorName={
						activeDoctor?.fullName ||
						activeDoctor?.name ||
						activeAppointment?.doctorName ||
						"Лечащий врач"
					}
					treatmentPlanId={effectiveTreatmentPlanId}
					stageId={effectiveStageId}
					stageNumber={effectiveStageNumber}
					stageTitle={effectiveStageTitle}
					initialToothFdi={labOrderModalToothNumber ?? undefined}
					scheduledVisitDate={
						activeAppointment?.startTime ||
						activeAppointment?.startAt ||
						activeAppointment?.date ||
						undefined
					}
					patientChartNumber={
						activePatient?.medCardNumber ||
						activePatient?.cardNumber ||
						undefined
					}
					onOrderSaved={(order) => {
						if (!order) return;
						const targetTeeth =
							Array.isArray(order.selectedTeeth) && order.selectedTeeth.length > 0
								? order.selectedTeeth
								: order.toothFdi
									? [Number(order.toothFdi)]
									: [];

						if (targetTeeth.length > 0 && order.material) {
							const teethLabel = targetTeeth.join(", ");
							appendToEMKField(
								"treatmentPlan",
								`Оформлен наряд ЗТЛ на ${targetTeeth.length > 1 ? `зубы ${teethLabel}` : `зуб ${teethLabel}`} (${order.material}, цвет ${order.colorVita || "A2"}).`,
							);
						}

						const unitPrice =
							order.priceRub && targetTeeth.length > 0
								? Math.round(order.priceRub / targetTeeth.length)
								: order.priceRub || 18000;

						for (const tooth of targetTeeth) {
							if (!tooth) continue;
							const toothStr = String(tooth);
							setToothState(toothStr, "crown");
							useVisitStore.getState().setToothState(toothStr, "crown");

							const serviceTitle = `Восстановление зуба коронкой (${order.constructionType || "ортопедия"}, ${order.material || "ZrO2"}, зуб ${toothStr})`;
							useVisitStore.getState().addCompletedService({
								serviceId: `lab-order-${order.id || Date.now()}-${tooth}`,
								code804n: "A16.07.004",
								toothNumber: tooth,
								toothCode: toothStr,
								name: serviceTitle,
								priceRub: unitPrice,
								quantity: 1,
								category: "Ортопедия",
							});

							if (typeof window !== "undefined") {
								window.dispatchEvent(
									new CustomEvent("dente-add-billing-item", {
										detail: {
											item: {
												code804n: "A16.07.004",
												title: serviceTitle,
												toothCode: toothStr,
												quantity: 1,
												unitPriceRub: unitPrice,
												discountRub: 0,
											},
										},
									}),
								);
							}
						}

						// ─── СВЯЗКА СО СНЯТИЕМ СЛЕПКА (ОТТИСКА) В СЧЁТ ПРИЁМА ───
						if (order.includeImpressionBilling !== false) {
							const primaryTooth = targetTeeth[0];
							const primaryToothStr = primaryTooth ? String(primaryTooth) : undefined;
							const impressionKind =
								order.impressionType === "digital_scan_stl_ply"
									? "цифровой оптический оттиск"
									: order.impressionType === "polyether"
										? "полиэфирный оттиск"
										: "прецизионный силиконовый оттиск";
							const impressionTitle = `Снятие оттиска с челюсти (${impressionKind})`;
							const impressionPriceRub = 2500;

							useVisitStore.getState().addCompletedService({
								serviceId: `lab-order-impression-${order.id || Date.now()}`,
								code804n: "A02.07.010",
								toothNumber: primaryTooth,
								toothCode: primaryToothStr,
								name: impressionTitle,
								priceRub: impressionPriceRub,
								quantity: 1,
								category: "Ортопедия",
							});

							if (typeof window !== "undefined") {
								window.dispatchEvent(
									new CustomEvent("dente-add-billing-item", {
										detail: {
											item: {
												code804n: "A02.07.010",
												title: impressionTitle,
												toothCode: primaryToothStr,
												quantity: 1,
												unitPriceRub: impressionPriceRub,
												discountRub: 0,
											},
										},
									}),
								);
							}

							appendToEMKField(
								"treatmentPlan",
								`Выполнено клиническое снятие оттиска${primaryToothStr ? ` в области зуба ${primaryToothStr}` : ""}.`,
							);
						}

						// ─── СВЯЗКА СО СТАТУСОМ ЭТАПА ПЛАНА ЛЕЧЕНИЯ («В работе в ЗТЛ») ───
						const targetPlanId = order.treatmentPlanId || effectiveTreatmentPlanId;
						const targetStageNum = order.stageNumber ?? effectiveStageNumber;
						const targetStageName = order.stageTitle || effectiveStageTitle;
						const targetStageIdentifier = order.stageId || effectiveStageId;

						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente-treatment-plan-stage-status", {
									detail: {
										treatmentPlanId: targetPlanId,
										planId: targetPlanId,
										stageNumber: targetStageNum,
										stageId: targetStageIdentifier,
										stageTitle: targetStageName,
										status: "in_lab",
										statusRu: "В работе в ЗТЛ",
										orderId: order.id,
										orderNumber: order.orderNumber,
										timestamp: new Date().toISOString(),
									},
								}),
							);

							if (targetPlanId) {
								window.dispatchEvent(
									new CustomEvent("dente-treatment-plans-reload", {
										detail: {
											patientId: activePatient?.id,
											planId: targetPlanId,
											status: "in_lab",
										},
									}),
								);
							}
						}

						showToast(
							order.includeImpressionBilling !== false
								? "Наряд ЗТЛ сохранен. Снятие слепка (2 500 ₽) включено в счёт визита"
								: "Наряд ЗТЛ сохранен",
							"success",
						);
					}}
				/>
			)}

			{/* Stage Payment & Milestone Escrow Modal */}
			{effectiveActiveModal === "stage_payment" && (
				<StagePaymentPlanModal
					isOpen={isStagePaymentModalOpen}
					onClose={() => {
						setIsStagePaymentModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("stage_payment");
					}}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName}
					doctorFullName={activeDoctor?.fullName}
				/>
			)}

			{/* Treatment Plan Price Lock & Pricelist Validator Modal */}
			{effectiveActiveModal === "price_validator" && isPriceValidatorModalOpen && (
				<TreatmentPlanPriceValidatorModal
					isOpen={isPriceValidatorModalOpen}
					onClose={() => {
						setIsPriceValidatorModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("price_validator");
					}}
					planPayload={priceValidatorPlanPayload}
					catalogPricelist={priceValidatorCatalogList}
					onExportWorkOrder={(exportData) => {
						appendToEMKField(
							"treatmentPlan",
							`Сформирован наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽. Фиксация цен: ${exportData.isApprovedByManager ? "Согласовано управляющим" : "По гарантии"}.`,
						);
						showToast(
							`Зуботехнический наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ добавлен в протокол приема.`,
							"success",
						);
					}}
					onExportCompletedAct={(exportData) => {
						appendToEMKField(
							"treatmentPlan",
							`Сформирован счёт и акт услуг ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽.`,
						);
						showToast(
							`Счёт и акт услуг ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ готов к подписанию.`,
							"success",
						);
					}}
				/>
			)}

			{/* Emergency Rescue / Anaphylaxis Anti-Shock Modal (Мандаты 8c, 8e) */}
			{effectiveActiveModal === "emergency_rescue" && (
				<EmergencyRescueModal
					isOpen={isEmergencyModalOpen}
					onClose={() => {
						setIsEmergencyModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("emergency_rescue");
					}}
					onApplyToDiary={(protocolText) => {
						appendToEMKField("diary", protocolText);
						showToast(
							"Протокол оказания экстренной помощи внесён в дневник приёма",
							"warning",
						);
					}}
					initialPatientName={activePatient?.fullName || ""}
					initialPatientAgeYears={
						patientAge
							? Number.parseInt(patientAge, 10) || undefined
							: undefined
					}
					doctorFullName={
						activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог"
					}
					medCardNumber={
						activePatient?.medCardNumber ||
						activePatient?.cardNumber ||
						activePatient?.id ||
						""
					}
					clinicName={
						dashboard?.organization?.name || "Стоматологическая клиника"
					}
				/>
			)}

			{/* AI Voice Dictation Assistant Modal */}
			{effectiveActiveModal === "voice_dictation" && (
				<VoiceDictationAssistantModal
					isOpen={isVoiceDictationModalOpen}
					onClose={() => {
						setIsVoiceDictationModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("voice_dictation");
					}}
					activeToothNumber={
						selectedToothForMenu?.code
							? Number.parseInt(selectedToothForMenu.code, 10) || null
							: null
					}
					onApplySoapNote={(soap) => {
						if (soap.subjective) appendToEMKField("complaints", soap.subjective);
						if (soap.objective)
							appendToEMKField("objectiveInspection", soap.objective);
						if (soap.assessment) appendToEMKField("diagnosis", soap.assessment);
						if (soap.plan) appendToEMKField("treatmentPlan", soap.plan);
						if (soap.recommendations)
							appendToEMKField("recommendations", soap.recommendations);
						showToast("SOAP-запись внесена в медицинскую карту", "success");
					}}
					onApplyCommand={(cmd: DictationCommand) => {
						if (cmd.toothNumber && cmd.clinicalStatus) {
							setToothState(String(cmd.toothNumber), cmd.clinicalStatus as any);
						}
						if (cmd.soapText || cmd.summary) {
							appendToEMKField(
								"objectiveInspection",
								cmd.soapText || cmd.summary,
							);
						}
					}}
					onApplyAllCommands={(cmds: DictationCommand[]) => {
						for (const cmd of cmds) {
							if (cmd.toothNumber && cmd.clinicalStatus) {
								setToothState(String(cmd.toothNumber), cmd.clinicalStatus as any);
							}
							if (cmd.soapText || cmd.summary) {
								appendToEMKField(
									"objectiveInspection",
									cmd.soapText || cmd.summary,
								);
							}
						}
						showToast(`Применено команд: ${cmds.length}`, "success");
					}}
				/>
			)}

			{/* Warranty Passport Modal */}
			{effectiveActiveModal === "warranty_passport" && (
				<WarrantyPassportModal
					isOpen={isWarrantyModalOpen}
					onClose={() => {
						setIsWarrantyModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("warranty_passport");
					}}
					patient={
						activePatient
							? {
									id: activePatient.id,
									fullName: activePatient.fullName,
									birthDate: activePatient.birthDate,
									phone: activePatient.phone,
								}
							: null
					}
					doctorName={activeDoctor?.fullName}
					clinicName={
						(
							dashboard as {
								clinicSettings?: { profile?: { brandName?: string } };
							} | null
						)?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					}
					initialDiagnosis={
						visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование"
					}
					onCertificateIssued={(passport: any) => {
						appendToEMKField(
							"recommendations",
							`Оформлен гарантийный паспорт № ${passport.passportNumber || passport.certificateId} (гарантия ${passport.warrantyMonths} мес. до ${passport.warrantyUntilDate}).`,
						);
						showToast("Гарантийный паспорт оформлен", "success");
					}}
				/>
			)}

			{/* Doctor Mobile Shift Modal */}
			{effectiveActiveModal === "doctor_mobile_shift" && (
				<DoctorMobileShiftModal
					isOpen={isDoctorShiftModalOpen}
					onClose={() => {
						setIsDoctorShiftModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("doctor_mobile_shift");
					}}
					initialDoctorId={activeDoctor?.id}
					initialDoctorName={activeDoctor?.fullName}
				/>
			)}

			{/* Informed Consent Modal */}
			{effectiveActiveModal === "informed_consent" && (
				<InformedConsentModal
					isOpen={isInformedConsentModalOpen}
					onClose={() => {
						setIsInformedConsentModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("informed_consent");
					}}
					patient={
						activePatient
							? {
									fullName: activePatient.fullName || activePatient.name,
									birthDate: activePatient.birthDate,
								}
							: null
					}
					doctorName={activeDoctor?.fullName || activeDoctor?.name}
					clinicName={
						(
							dashboard as {
								clinicSettings?: { profile?: { brandName?: string } };
							} | null
						)?.clinicSettings?.profile?.brandName ||
						dashboard?.organization?.name ||
						"ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					}
					licenseNumber={
						(
							dashboard as {
								clinicSettings?: { profile?: { medicalLicenseNumber?: string } };
							} | null
						)?.clinicSettings?.profile?.medicalLicenseNumber ||
						"ЛО41-01137-77/00368421"
					}
					diagnosisIcd={
						visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование"
					}
					toothNumbers={
						typeof selectedToothForMenu === "number"
							? String(selectedToothForMenu)
							: undefined
					}
					isSigned={
						activeAppointment?.status === "completed" ||
						activeAppointment?.status === "signed" ||
						visitNoteForm?.status === "signed"
					}
					status={activeAppointment?.status}
					onConsentConfirmed={(payload) => {
						appendToEMKField(
							"recommendations",
							`Пациент ознакомлен и подписал ${payload.consentType} (${payload.intervention}, область: ${payload.toothOrArea || "по плану"}).`,
						);
						showToast(
							"Информированное согласие прикреплено к протоколу приёма",
							"success",
						);
					}}
				/>
			)}

			{/* ─── 10. МОДАЛЬНОЕ ОКНО СПЛИТ-СРАВНЕНИЯ ВИЗИОГРАФА (EZDENT-I DUAL VIEW) ─── */}
			{isVisiographComparisonModalOpen && effectiveActiveModal === "visiograph_comparison" && (
				<VisiographComparisonModal
					isOpen={Boolean(isVisiographComparisonModalOpen)}
					onClose={() => setIsVisiographComparisonModalOpen?.(false)}
					patientName={activePatient?.fullName || activePatient?.name}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medicalCardNumber}
					activeToothFdi={endoModalToothNumber ?? undefined}
					patientAge={patientAge ?? undefined}
					onInsertProtocol={(note) => appendToEMKField("anamnesis", note)}
				/>
			)}
		</>
	);
}
