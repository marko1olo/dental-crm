import { useCallback, useState } from "react";
import {
	downloadDetailedReceipt,
	downloadPatientTaxCertificate1151156,
	openPrintWindow,
	type PatientAppointment,
	type PatientInvoiceItem,
	type TreatmentPlanStage,
} from "../../patientCabinetEngine.js";
import { buildWhatsAppLink } from "../../patientCareInstructionsEngine.js";
import { normalizePatientTab, type PatientCabinetModalProps, type PatientCabinetTab } from "../types.js";
import { useCabinetDataHydration } from "./useCabinetDataHydration.js";
import { useCabinetSbpState } from "./useCabinetSbpState.js";
import { useCabinetConsentSigning } from "./useCabinetConsentSigning.js";
import { useCabinetAppointmentsBooking } from "./useCabinetAppointmentsBooking.js";
import { useCabinetCalculatedViews } from "./useCabinetCalculatedViews.js";

export function usePatientCabinetModal({
	initialData,
	initialTab = "overview",
	initialSigningConsent = null,
	initialConsentSignMode = "sms_otp",
	token,
	onInvoicePaid,
	onConsentSigned,
	onAppointmentBooked,
}: PatientCabinetModalProps) {
	const [activeTab, setActiveTab] = useState<PatientCabinetTab>(() => normalizePatientTab(initialTab));
	const [isReceptionQrOpen, setIsReceptionQrOpen] = useState(false);
	const [isCareMemoQrOpen, setIsCareMemoQrOpen] = useState(false);
	const [isPrintMemoPreviewOpen, setIsPrintMemoPreviewOpen] = useState(false);
	const [reschedulingApt, setReschedulingApt] = useState<PatientAppointment | null>(null);
	const [isBookingOpen, setIsBookingOpen] = useState(false);
	const [isSelfCheckinOpen, setIsSelfCheckinOpen] = useState(false);
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
	const [selectedTaxYear, setSelectedTaxYear] = useState<number>(2026);
	const [showClinicalPlanDetail, setShowClinicalPlanDetail] = useState(false);

	const hydr = useCabinetDataHydration(initialData, token);
	const sbp = useCabinetSbpState(hydr.setData, onInvoicePaid);
	const signing = useCabinetConsentSigning(hydr.data, hydr.setData, initialSigningConsent, initialConsentSignMode, onConsentSigned);
	const booking = useCabinetAppointmentsBooking(token, hydr.availableDoctors, hydr.setData, hydr.handleShowCabinetToast, onAppointmentBooked);
	const views = useCabinetCalculatedViews(hydr.data, selectedTaxYear);

	const handleDownloadReceipt = useCallback((invoice: PatientInvoiceItem) => {
		downloadDetailedReceipt(invoice, hydr.data);
	}, [hydr.data]);

	const handleDownloadTaxCertificate = useCallback(() => {
		downloadPatientTaxCertificate1151156(hydr.data, selectedTaxYear);
	}, [hydr.data, selectedTaxYear]);

	const handlePrintCareMemo = useCallback(() => {
		openPrintWindow(views.careMemo.printHtml);
	}, [views.careMemo]);

	const handlePayStageSbp = useCallback((stage: TreatmentPlanStage) => {
		const stageInvoice: PatientInvoiceItem = {
			id: `stage-inv-${stage.id}`,
			invoiceNumber: `ЭТАП-${stage.orderIndex + 1}`,
			issueDateIso: new Date().toISOString().slice(0, 10),
			titleRu: stage.titleRu,
			totalAmountRub: stage.costRub,
			paidAmountRub: stage.status === "completed" ? stage.costRub : 0,
			remainingAmountRub: stage.status === "completed" ? 0 : stage.costRub,
			status: stage.status === "completed" ? "paid" : "unpaid",
			items: [{ id: `stage-item-${stage.id}`, code: "A16.07.001", titleRu: stage.titleRu, priceRub: stage.costRub, quantity: 1, qty: 1, totalRub: stage.costRub, categoryGroup: "caries" }],
		};
		sbp.handleStartSbpPayment(stageInvoice);
	}, [sbp]);

	const handleSendCareMemoWhatsApp = useCallback(() => {
		const link = buildWhatsAppLink(hydr.data.phone, views.careMemo.smsText);
		window.open(link, "_blank");
	}, [hydr.data.phone, views.careMemo.smsText]);

	return {
		data: hydr.data, setData: hydr.setData, isFetchingMe: hydr.isFetchingMe, activeTab, setActiveTab,
		availableDoctors: hydr.availableDoctors, isOnline: hydr.isOnline, queuedBookingsCount: hydr.queuedBookingsCount,
		isSyncing: hydr.isSyncing, flushNow: hydr.flushNow, cabinetToastMessage: hydr.cabinetToastMessage,
		handleShowCabinetToast: hydr.handleShowCabinetToast, isReceptionQrOpen, setIsReceptionQrOpen,
		isCareMemoQrOpen, setIsCareMemoQrOpen, isPrintMemoPreviewOpen, setIsPrintMemoPreviewOpen,
		reschedulingApt, setReschedulingApt, isBookingOpen, setIsBookingOpen, isSelfCheckinOpen, setIsSelfCheckinOpen,
		isTaxModalOpen, setIsTaxModalOpen, selectedTaxYear, setSelectedTaxYear, showClinicalPlanDetail, setShowClinicalPlanDetail,
		...sbp, ...signing, ...booking, ...views,
		handleDownloadReceipt, handleDownloadTaxCertificate, handlePrintCareMemo, handlePayStageSbp, handleSendCareMemoWhatsApp,
	};
}

export default usePatientCabinetModal;
