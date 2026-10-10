import { useEffect, useState, useMemo, useRef } from "react";
import type { Appointment } from "@dental/shared";
import type { VisitDiaryEntry043, FdiToothRecord, ToothSurface } from "../../emr";
import type { PaymentMethodTab } from "../../finance/modal/payment/paymentModalTypes.js";
import { useVisitCompletion, assembleVisitStoreCompletedServices } from "../useVisitCompletion";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { logger } from "../../../utils/logger";
import {
	formatPatientFullName,
	resolveChairsideServices,
	calculateServicesTotalRub,
	resolveEffectiveTotalDueRub,
	resolveEffectiveDepositRub,
	resolveEffectiveFamilyBalanceRub,
	extractAbnormalTeeth,
} from "./summaryCalculations";
import {
	detectUnbilledConsumables,
	convertUnbilledConsumableToChairsideService,
	type ConsumablesReconciliationResult,
} from "../../odontogram/treatmentEstimatorReconciler";
import type { VisitSummaryModalProps } from "./types";

export function useVisitSummaryModalState(
	props: VisitSummaryModalProps,
	appLogic: any,
) {
	const {
		isOpen,
		onClose,
		patient,
		diary,
		doctorName,
		doctorSpecialty,
		teethData = [],
		onScheduleNextVisit,
		onCompleteVisit,
		services: servicesProp,
		totalDueRub: totalDueRubProp,
		patientDepositRub: patientDepositRubProp,
		patientFamilyBalanceRub: patientFamilyBalanceRubProp,
		isPaid: isPaidProp,
		defaultDocsDropupOpen,
		onPaymentSuccess,
	} = props;

	const [isNextStageModalOpen, setIsNextStageModalOpen] = useState(false);
	const [nextVisitDraft, setNextVisitDraft] = useState<Appointment | null>(null);
	const [zoomImage, setZoomImage] = useState<{
		url: string;
		title?: string;
	} | null>(null);
	const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState(false);
	const [synthesizedDiaryPreview, setSynthesizedDiaryPreview] = useState<VisitDiaryEntry043 | null>(null);
	const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
	const [isDocsDropupOpen, setIsDocsDropupOpen] = useState(Boolean(defaultDocsDropupOpen));
	const docsDropupRef = useRef<HTMLDivElement>(null);

	// Chairside POS state (Mandates 8b, 8d, 8e, 8n)
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodTab>("sbp_qr");
	const [isVisitPaid, setIsVisitPaid] = useState(Boolean(isPaidProp));
	const [paidAmountRub, setPaidAmountRub] = useState<number>(0);
	const [paidTenderMethod, setPaidTenderMethod] = useState<PaymentMethodTab>("sbp_qr");

	useEffect(() => {
		if (typeof isPaidProp === "boolean") {
			setIsVisitPaid(isPaidProp);
		}
	}, [isPaidProp]);

	const [appendedServices, setAppendedServices] = useState<readonly any[]>([]);

	const chairsideServices = useMemo(() => {
		const storeServices = assembleVisitStoreCompletedServices();
		const activeVisitServices = appLogic?.dashboard?.activeVisit?.completedServices;
		return resolveChairsideServices(servicesProp, storeServices, activeVisitServices, patient?.id);
	}, [servicesProp, patient?.id, appLogic?.dashboard?.activeVisit?.completedServices]);

	const effectiveChairsideServices = useMemo(() => {
		return [...chairsideServices, ...appendedServices];
	}, [chairsideServices, appendedServices]);

	const calculatedServicesTotalRub = useMemo(() => {
		return calculateServicesTotalRub(effectiveChairsideServices);
	}, [effectiveChairsideServices]);

	const protocolSource = useMemo(() => ({
		treatmentDescription: diary?.treatmentDescription,
		procedureProtocol: synthesizedDiaryPreview?.procedureProtocol,
		statusLocalis: diary?.statusLocalis,
		objectiveStatusLocalis: synthesizedDiaryPreview?.objectiveStatusLocalis,
		treatmentPlan: appLogic?.visitNoteForm?.treatmentPlan,
		diagnosis: diary?.diagnosisIcd10,
	}), [
		diary?.treatmentDescription,
		diary?.statusLocalis,
		diary?.diagnosisIcd10,
		synthesizedDiaryPreview?.procedureProtocol,
		synthesizedDiaryPreview?.objectiveStatusLocalis,
		appLogic?.visitNoteForm?.treatmentPlan,
	]);

	const consumablesReconciliation = useMemo(() => {
		const catalog =
			(appLogic?.catalog as any[]) ||
			(appLogic?.dashboard?.clinicSettings?.priceList as any[]) ||
			[];
		return detectUnbilledConsumables(protocolSource, effectiveChairsideServices, catalog);
	}, [protocolSource, effectiveChairsideServices, appLogic?.catalog, appLogic?.dashboard?.clinicSettings?.priceList]);

	const handleAddAllUnbilledToBill = () => {
		if (!consumablesReconciliation.hasUnbilled) return;
		const newServices = consumablesReconciliation.unbilledItems.map(convertUnbilledConsumableToChairsideService);
		setAppendedServices((prev) => [...prev, ...newServices]);
		showToast(
			`В счёт добавлено: ${consumablesReconciliation.detectedMarkers.join(", ")} (+${consumablesReconciliation.totalUnbilledRub.toLocaleString("ru-RU")} ₽)`,
			"success",
			3500,
		);
	};

	const effectiveTotalDueRub = useMemo(() => {
		const baseDue = resolveEffectiveTotalDueRub(totalDueRubProp, calculateServicesTotalRub(chairsideServices), patient?.id);
		const addedRub = calculateServicesTotalRub(appendedServices);
		return baseDue + addedRub;
	}, [totalDueRubProp, chairsideServices, appendedServices, patient?.id]);

	const effectiveDepositRub = useMemo(() => {
		return resolveEffectiveDepositRub(
			patientDepositRubProp,
			patient,
			appLogic?.dashboard?.activePatient?.balanceRub,
		);
	}, [patientDepositRubProp, patient, appLogic?.dashboard?.activePatient]);

	const effectiveFamilyBalanceRub = useMemo(() => {
		return resolveEffectiveFamilyBalanceRub(patientFamilyBalanceRubProp, patient);
	}, [patientFamilyBalanceRubProp, patient]);

	const handleOpenPaymentModal = (method: PaymentMethodTab = "sbp_qr") => {
		setSelectedPaymentMethod(method);
		setIsPaymentModalOpen(true);
	};

	const mappedOdontogramTeeth = useMemo<FdiToothRecord[]>(() => {
		return (teethData ?? []).map((t) => ({
			toothNumber: t.toothNumber,
			statusCode: (t.state as any) || "healthy",
			surfaces: (t.surfaces as ToothSurface[]) || [],
			mobility: "none",
			furcationInvolvement: "none",
		}));
	}, [teethData]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (zoomImage) {
					setZoomImage(null);
				} else if (isDocsDropupOpen) {
					setIsDocsDropupOpen(false);
				} else {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, zoomImage, isDocsDropupOpen]);

	useEffect(() => {
		if (!isDocsDropupOpen) return;
		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (docsDropupRef.current && !docsDropupRef.current.contains(e.target as Node)) {
				setIsDocsDropupOpen(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
		};
	}, [isDocsDropupOpen]);

	const formattedPatientName = useMemo(() => {
		return patient ? formatPatientFullName(patient) : "Пациент";
	}, [patient]);

	const { completeVisit, isCompleting } = useVisitCompletion({
		visitId: appLogic?.activeVisitId,
		patientId: patient?.id,
		patientName: formattedPatientName,
		patientPhone: patient?.phone || "",
		doctorName: doctorName || appLogic?.activeDoctor?.fullName,
		doctorSpecialty: doctorSpecialty || appLogic?.activeDoctor?.specialties?.[0],
		diary,
		completedPlanItems: appLogic?.activeTreatmentPlanItems || [],
	});

	const patientName = formatPatientFullName(patient);
	const patientBirth =
		typeof patient?.birthDate === "string" && patient.birthDate
			? patient.birthDate
			: typeof patient?.dateOfBirth === "string" && patient.dateOfBirth
				? patient.dateOfBirth
				: "";
	const patientCard =
		typeof patient?.cardNumber === "string" && patient.cardNumber
			? patient.cardNumber
			: typeof patient?.medicalCardNumber === "string" &&
					patient.medicalCardNumber
				? patient.medicalCardNumber
				: typeof patient?.chartNumber === "string" && patient.chartNumber
					? patient.chartNumber
					: "";

	const patientPassport =
		(typeof patient?.administrativeProfile?.identityDocument === "string" &&
			patient.administrativeProfile?.identityDocument?.trim()) ||
		(typeof patient?.passport === "string" && patient.passport.trim()) ||
		(typeof patient?.identityDocument === "string" &&
			patient.identityDocument.trim()) ||
		"";

	const patientOms =
		(typeof patient?.administrativeProfile?.omsPolis === "string" &&
			patient.administrativeProfile?.omsPolis?.trim()) ||
		(typeof patient?.administrativeProfile?.insurancePolicyNumber === "string" &&
			patient.administrativeProfile?.insurancePolicyNumber?.trim()) ||
		(typeof patient?.omsPolis === "string" && patient.omsPolis.trim()) ||
		(typeof patient?.insurancePolicyNumber === "string" &&
			patient.insurancePolicyNumber.trim()) ||
		"";

	const patientSnils =
		(typeof patient?.administrativeProfile?.snils === "string" &&
			patient.administrativeProfile?.snils?.trim()) ||
		(typeof patient?.snils === "string" && patient.snils.trim()) ||
		"";

	const abnormalTeeth = extractAbnormalTeeth(teethData);

	const handleScheduleNextStage = () => {
		if (onScheduleNextVisit) {
			onClose();
			onScheduleNextVisit();
		} else {
			const d = new Date();
			d.setDate(d.getDate() + 5);
			d.setHours(10, 0, 0, 0);
			const draft: Appointment = {
				id: `new-stage-${Date.now()}`,
				organizationId: appLogic?.dashboard?.activeVisit?.organizationId || "org-1",
				patientId: patient?.id || "",
				doctorUserId: (appLogic?.dashboard?.clinicSettings?.staff || []).find(
					(s: any) => s.active && (s.role === "doctor" || s.role === "owner"),
				)?.id || "",
				assistantUserId: null,
				chairId: (appLogic?.dashboard?.clinicSettings?.chairs || []).find((c: any) => c.active)?.id || "",
				startsAt: d.toISOString(),
				endsAt: new Date(d.getTime() + 45 * 60 * 1000).toISOString(),
				status: "planned",
				reason: `Следующий этап лечения: ${diary.diagnosisIcd10 || "Стоматологический приём"}`,
				comment: `Назначено из сводки визита от ${new Date().toLocaleDateString("ru-RU")}`,
			};
			setNextVisitDraft(draft);
			setIsNextStageModalOpen(true);
		}
	};

	const handleSaveNextStageAppointment = async (_appointmentId: string, draft: any) => {
		try {
			const res = await fetch("/api/appointments", {
				method: "POST",
				headers: appLogic?.auth?.scheduleMutationHeaders
					? appLogic.auth.scheduleMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId: draft.patientId,
					doctorUserId: draft.doctorUserId,
					assistantUserId: draft.assistantUserId,
					chairId: draft.chairId,
					startsAt: draft.startsAt,
					endsAt: draft.endsAt,
					status: draft.status,
					reason: draft.reason,
					comment: draft.comment,
					clientMutationId: `next-visit-${Date.now()}`,
				}),
			});
			if (!res.ok) {
				showToast("Не удалось записать пациента на прием", "error");
				return false;
			}
			const nextDash = await res.json();
			if (appLogic?.setDashboard) appLogic.setDashboard(nextDash);
			showToast("Пациент успешно записан на следующий этап!", "success", 4000);
			setIsNextStageModalOpen(false);
			return true;
		} catch {
			showToast("Ошибка сохранения записи", "error");
			return false;
		}
	};

	const handlePaymentSuccessCallback = (paymentData: any) => {
		setIsPaymentModalOpen(false);
		setIsVisitPaid(true);
		setPaidAmountRub(effectiveTotalDueRub);
		setPaidTenderMethod(selectedPaymentMethod);
		showToast(
			`Оплата ${effectiveTotalDueRub.toLocaleString("ru-RU")} ₽ успешно принята. Чек выдан!`,
			"success",
			4000,
		);
		onPaymentSuccess?.(paymentData);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-payment-completed", {
					detail: {
						visitId: appLogic?.activeVisitId,
						patientId: patient?.id,
						amountRub: effectiveTotalDueRub,
						method: selectedPaymentMethod,
						paymentData,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-treatment-plans-reload", {
					detail: {
						patientId: patient?.id,
						visitId: appLogic?.activeVisitId,
						amountRub: effectiveTotalDueRub,
					},
				}),
			);
		}
	};

	const handleCompleteVisitAction = async () => {
		try {
			if (onCompleteVisit) {
				await onCompleteVisit();
			} else {
				await completeVisit();
			}
			onClose();
		} catch (err) {
			logger.error("[VisitSummaryModal] Ошибка завершения приёма:", err);
		}
	};

	return {
		isNextStageModalOpen,
		setIsNextStageModalOpen,
		nextVisitDraft,
		zoomImage,
		setZoomImage,
		isProtocolGeneratorOpen,
		setIsProtocolGeneratorOpen,
		synthesizedDiaryPreview,
		setSynthesizedDiaryPreview,
		isMemoModalOpen,
		setIsMemoModalOpen,
		isDocsDropupOpen,
		setIsDocsDropupOpen,
		docsDropupRef,
		isPaymentModalOpen,
		setIsPaymentModalOpen,
		selectedPaymentMethod,
		isVisitPaid,
		paidAmountRub,
		paidTenderMethod,
		effectiveTotalDueRub,
		effectiveDepositRub,
		effectiveFamilyBalanceRub,
		mappedOdontogramTeeth,
		patientName,
		patientBirth,
		patientCard,
		patientPassport,
		patientOms,
		patientSnils,
		doctorSpecialty,
		abnormalTeeth,
		isCompleting,
		handleOpenPaymentModal,
		handleScheduleNextStage,
		handleSaveNextStageAppointment,
		handlePaymentSuccessCallback,
		handleCompleteVisitAction,
		consumablesReconciliation,
		handleAddAllUnbilledToBill,
		appendedServices,
		effectiveChairsideServices,
	};
}

export type VisitSummaryModalState = ReturnType<typeof useVisitSummaryModalState>;
