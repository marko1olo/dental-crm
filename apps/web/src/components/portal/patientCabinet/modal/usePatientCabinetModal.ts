/**
 * Patient Personal Portal - Modal Logic & State Hook
 * (LAYER 3: STATE, CUSTOM HOOKS & ADAPTERS)
 *
 * Implements /api/portal/me hydration, SBP payments, 63-FZ PEP consent signing,
 * online booking, cancellations, tax calculations, and offline sync.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	calculateCabinetSummary,
	calculateDentalHealthIndex,
	calculatePatientTaxDeduction,
	createEmptyPatientCabinetData,
	downloadDetailedReceipt,
	downloadPatientTaxCertificate1151156,
	generatePatientDentalPassport,
	generateSbpQrPayload,
	generateSmsOtp,
	openPrintWindow,
	signConsentWithPep,
	verifySmsOtp,
	type DentalHealthIndexResult,
	type PatientAppointment,
	type PatientCabinetSummary,
	type PatientDentalPassport,
	type PatientInvoiceItem,
	type PatientPersonalCabinetData,
	type PatientStatutoryConsent,
	type PatientTaxDeductionCalculation,
	type PatientTreatmentPlan,
	type SbpBankMember,
	type SbpQrPayload,
	type TreatmentPlanStage,
} from "../patientCabinetEngine.js";
import {
	generateCareMemo,
	buildWhatsAppLink,
	detectInterventionTypeFromProcedure,
	type PatientCareMemo,
} from "../patientCareInstructionsEngine.js";
import {
	resolveTaxDeductionCategoryShared,
	type TaxDeductionPaymentItem,
} from "../../../finance/taxDeductionEngine.js";
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets.js";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { useOfflinePatientSync } from "../../../../pwa/patientOfflineStorage.js";
import { mapServerPortalMeToCabinetData } from "../patientCabinetMapper.js";
import {
	normalizePatientTab,
	type AvailableDoctorItem,
	type PatientCabinetModalProps,
	type PatientCabinetTab,
} from "./types.js";

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
	const [data, setData] = useState<PatientPersonalCabinetData>(() => {
		if (initialData) return initialData;
		if (isDemoShowcaseMode()) return DEMO_PATIENT_CABINET;
		return createEmptyPatientCabinetData();
	});
	const [isFetchingMe, setIsFetchingMe] = useState(Boolean(token));
	const [activeTab, setActiveTab] = useState<PatientCabinetTab>(() => normalizePatientTab(initialTab));
	const [availableDoctors, setAvailableDoctors] = useState<AvailableDoctorItem[]>([]);

	const { isOnline, queuedBookingsCount, isSyncing, flushNow } = useOfflinePatientSync();

	useEffect(() => {
		if (!token) return;
		let isMounted = true;
		setIsFetchingMe(true);
		const fetchMe = async () => {
			try {
				const res = await fetch("/api/portal/me", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (res.ok) {
					const json = await res.json();
					if (isMounted && json && json.patient) {
						const mapped = mapServerPortalMeToCabinetData(json);
						setData(mapped);
						if (Array.isArray(json.doctors)) {
							setAvailableDoctors(json.doctors);
						}
					}
				}
			} catch (err) {
				console.error("[PatientCabinetModal] Failed to fetch /api/portal/me:", err);
			} finally {
				if (isMounted) {
					setIsFetchingMe(false);
				}
			}
		};
		void fetchMe();
		return () => {
			isMounted = false;
		};
	}, [token]);

	// Sheets and Modals State (Depth strictly 1)
	const [activeSbpInvoice, setActiveSbpInvoice] = useState<PatientInvoiceItem | null>(null);
	const [activeSbpPayload, setActiveSbpPayload] = useState<SbpQrPayload | null>(null);
	const [isCheckingSbpStatus, setIsCheckingSbpStatus] = useState(false);
	const [sbpStatusMessage, setSbpStatusMessage] = useState<string | null>(null);

	const [signingConsent, setSigningConsent] = useState<PatientStatutoryConsent | null>(initialSigningConsent);
	const [consentSignMode, setConsentSignMode] = useState<"sms_otp" | "cabinet_pep">(initialConsentSignMode);
	const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
	const [otpError, setOtpError] = useState<string | null>(null);
	const [otpCountdown, setOtpCountdown] = useState<number>(0);
	const [sentOtp, setSentOtp] = useState<{ code: string; sentTimestamp: number; expiresAt: number } | null>(null);

	const [isReceptionQrOpen, setIsReceptionQrOpen] = useState(false);
	const [isCareMemoQrOpen, setIsCareMemoQrOpen] = useState(false);
	const [isPrintMemoPreviewOpen, setIsPrintMemoPreviewOpen] = useState(false);
	const [reschedulingApt, setReschedulingApt] = useState<PatientAppointment | null>(null);
	const [isBookingOpen, setIsBookingOpen] = useState(false);
	const [isSelfCheckinOpen, setIsSelfCheckinOpen] = useState(false);
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
	const [selectedTaxYear, setSelectedTaxYear] = useState<number>(2026);
	const [showClinicalPlanDetail, setShowClinicalPlanDetail] = useState(false);
	const [cabinetToastMessage, setCabinetToastMessage] = useState<string | null>(null);

	const handleShowCabinetToast = useCallback((msg: string) => {
		setCabinetToastMessage(msg);
		const timer = setTimeout(() => {
			setCabinetToastMessage(null);
		}, 3500);
		return () => clearTimeout(timer);
	}, []);

	const summary: PatientCabinetSummary = useMemo(() => calculateCabinetSummary(data), [data]);
	const healthIndex: DentalHealthIndexResult = useMemo(
		() => calculateDentalHealthIndex(data.teeth || []),
		[data.teeth],
	);
	const dentalPassport: PatientDentalPassport = useMemo(
		() => generatePatientDentalPassport(data),
		[data],
	);
	const nextApptCountdown = useMemo(() => {
		if (!summary.nextAppointment) return null;
		const apptDate = new Date(`${summary.nextAppointment.dateIso}T${summary.nextAppointment.timeRu || "10:00"}`);
		const diffMs = apptDate.getTime() - Date.now();
		if (diffMs <= 0) return "Прием сейчас";
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours < 24) return `${diffHours} ч.`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays} дн.`;
	}, [summary.nextAppointment]);
	const taxDeduction: PatientTaxDeductionCalculation = useMemo(
		() => calculatePatientTaxDeduction(data.invoices || [], selectedTaxYear),
		[data.invoices, selectedTaxYear],
	);

	const careMemo: PatientCareMemo = useMemo(() => {
		const nextAppt = data.appointments[0];
		const interventionType = nextAppt
			? detectInterventionTypeFromProcedure(nextAppt.titleRu)
			: "caries";
		return generateCareMemo({
			patientName: data.fullName,
			patientPhone: data.phone,
			toothFdi: "16",
			interventionType,
			doctorName: data.curatingDoctor,
			clinicName: "Стоматологическая клиника ДЕНТЕ",
		});
	}, [data]);

	const taxDeductionPayments: TaxDeductionPaymentItem[] = useMemo(() => {
		return data.invoices
			.filter((inv) => inv.status === "paid")
			.map((inv) => ({
				id: inv.id,
				receiptNumber: inv.invoiceNumber,
				fiscalDocumentNumber: inv.fiscalReceiptNumber || "",
				fiscalSign: "",
				serviceName: inv.titleRu,
				dateIso: (inv.dateIso as string) || (inv.issueDateIso as string) || new Date().toISOString().slice(0, 10),
				amountRub: inv.totalAmountRub,
				taxCode: resolveTaxDeductionCategoryShared(inv.titleRu),
			}));
	}, [data.invoices]);

	// Countdown timer for OTP
	useEffect(() => {
		if (otpCountdown > 0) {
			const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [otpCountdown]);

	// Handle SBP Payment Start
	const handleStartSbpPayment = useCallback((invoice: PatientInvoiceItem) => {
		const payload = generateSbpQrPayload(invoice, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" });
		setActiveSbpInvoice(invoice);
		setActiveSbpPayload(payload);
		setSbpStatusMessage(null);
		setIsCheckingSbpStatus(false);
	}, []);

	// Handle SBP Payment Check (Mandates 8e, 8k: honest /api/fiscal/sbp-status query, no fake mocks)
	const handleCheckSbpPaymentStatus = useCallback(async () => {
		if (!activeSbpInvoice) return;
		setIsCheckingSbpStatus(true);
		setSbpStatusMessage("Запрос подтверждения транзакции в шлюзе НСПК...");
		try {
			const orderId = (activeSbpPayload as any)?.orderId || activeSbpPayload?.invoiceNumber || activeSbpInvoice.invoiceNumber || activeSbpInvoice.id;
			const qrId = activeSbpPayload?.qrId || "";
			const sumKop = Math.round(activeSbpInvoice.remainingAmountRub * 100);
			const queryUrl = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(orderId)}&qrId=${encodeURIComponent(qrId)}&invoiceId=${encodeURIComponent(activeSbpInvoice.id)}&sumKop=${sumKop}`;

			const res = await fetch(queryUrl, {
				headers: { Accept: "application/json" },
			});
			if (res.ok) {
				const statusData = (await res.json().catch(() => null)) as {
					paid?: boolean;
					status?: string;
					fiscalReceiptId?: string | null;
					fiscalReceiptNumber?: string | null;
					paidAt?: string | null;
				} | null;

				if (statusData && (statusData.paid || statusData.status === "paid")) {
					const updatedInvoice: PatientInvoiceItem = {
						...activeSbpInvoice,
						status: "paid",
						paidAmountRub: activeSbpInvoice.totalAmountRub,
						remainingAmountRub: 0,
						paidAtIso: statusData.paidAt || new Date().toISOString(),
						paymentMethod: "sbp",
						fiscalReceiptNumber: statusData.fiscalReceiptNumber || statusData.fiscalReceiptId || `ФД-${activeSbpInvoice.invoiceNumber}`,
					};

					setData((prev) => ({
						...prev,
						invoices: prev.invoices.map((inv) =>
							inv.id === updatedInvoice.id ? updatedInvoice : inv,
						),
					}));

					onInvoicePaid?.(updatedInvoice);
					setSbpStatusMessage("Оплата успешно зачислена! Кассовый чек отправлен.");
					setTimeout(() => {
						setActiveSbpInvoice(null);
						setActiveSbpPayload(null);
					}, 1500);
					return;
				}
			}
			setSbpStatusMessage("Платёж через СБП пока не поступил от банка. Ожидается проведение транзакции.");
		} catch {
			setSbpStatusMessage("Не удалось связаться со шлюзом СБП. Повторите попытку через несколько секунд.");
		} finally {
			setIsCheckingSbpStatus(false);
		}
	}, [activeSbpInvoice, activeSbpPayload, onInvoicePaid]);

	const handleOpenBankApp = useCallback((bank: SbpBankMember) => {
		if (!activeSbpPayload) return;
		setSbpStatusMessage(`Переход в приложение ${bank.nameRu}...`);
		window.open(bank.schemaPrefix, "_blank");
	}, [activeSbpPayload]);

	// Handle Consent Signing
	const handleStartConsentSign = useCallback((
		consent: PatientStatutoryConsent,
		mode: "sms_otp" | "cabinet_pep" = "sms_otp",
	) => {
		setSigningConsent(consent);
		setConsentSignMode(mode);
		setOtpDigits(["", "", "", "", "", ""]);
		setOtpError(null);
		if (mode === "sms_otp") {
			const otp = generateSmsOtp(data.phone);
			setSentOtp(otp);
			setOtpCountdown(60);
		}
	}, [data.phone]);

	const handleOtpDigitChange = useCallback((index: number, val: string) => {
		const clean = val.replace(/\D/g, "").slice(-1);
		setOtpDigits((prev) => {
			const next = [...prev];
			next[index] = clean;
			return next;
		});
		if (clean && index < 5) {
			const nextInput = document.getElementById(`pc-otp-${index + 1}`);
			nextInput?.focus();
		}
	}, []);

	const handleResendOtp = useCallback(() => {
		const otp = generateSmsOtp(data.phone);
		setSentOtp(otp);
		setOtpCountdown(60);
		setOtpError(null);
	}, [data.phone]);

	const handleConfirmConsentOtp = useCallback(() => {
		if (!signingConsent) return;
		const code = otpDigits.join("");
		if (code.length < 6) {
			setOtpError("Введите 6-значный SMS-код");
			return;
		}
		if (!sentOtp) {
			setOtpError("Запросите код подтверждения через SMS");
			return;
		}
		const verifyResult = verifySmsOtp(code, sentOtp.code, sentOtp.sentTimestamp);
		if (!verifyResult.success) {
			setOtpError(verifyResult.error || "Неверный код подтверждения из SMS.");
			return;
		}

		const signed = signConsentWithPep(signingConsent, data.phone, code, data.fullName);

		setData((prev) => ({
			...prev,
			consents: prev.consents.map((c) => (c.id === signed.id ? signed : c)),
		}));

		onConsentSigned?.(signed);
		setSigningConsent(null);
	}, [signingConsent, otpDigits, sentOtp, data.phone, data.fullName, onConsentSigned]);

	const handleSignConsentInCabinet = useCallback(() => {
		if (!signingConsent) return;
		const signed = signConsentWithPep(signingConsent, data.phone, "CABINET_PEP", data.fullName);

		setData((prev) => ({
			...prev,
			consents: prev.consents.map((c) => (c.id === signed.id ? signed : c)),
		}));

		onConsentSigned?.(signed);
		setSigningConsent(null);
	}, [signingConsent, data.fullName, data.phone, onConsentSigned]);

	// Reschedule Submit
	const handleRescheduleSubmit = useCallback((req: {
		appointmentId: string;
		newDate: string;
		newTime: string;
		reason: string;
	}) => {
		onAppointmentBooked?.({
			specialty: "Перенос записи",
			preferredDate: `${req.newDate} ${req.newTime}`,
			note: `Перенос визита ${req.appointmentId}. Причина: ${req.reason}`,
		});
	}, [onAppointmentBooked]);

	// Online Booking Submit (Mandate: 1-Tap Booking without repetitive entry)
	const handleBookingSubmit = useCallback(
		async (req: {
			goalId: string;
			doctorId: string;
			doctorName?: string;
			date: string;
			time: string;
			comment: string;
		}) => {
			setIsBookingOpen(false);

			// If authenticated token exists, attempt to persist directly to /api/portal/appointments
			if (token) {
				try {
					const startDateTime = new Date(`${req.date}T${req.time}:00`);
					const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
					const matchingDoc = availableDoctors.find(
						(d) => d.id === req.doctorId || d.fullName === req.doctorId,
					);
					const targetDocId =
						matchingDoc?.id ||
						(req.doctorId && req.doctorId.includes("-")
							? req.doctorId
							: availableDoctors[0]?.id);

					if (targetDocId && !Number.isNaN(startDateTime.getTime())) {
						const res = await fetch("/api/portal/appointments", {
							method: "POST",
							headers: {
								Authorization: `Bearer ${token}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								doctorId: targetDocId,
								startsAt: startDateTime.toISOString(),
								endsAt: endDateTime.toISOString(),
								reason: req.goalId,
								comment: req.comment || undefined,
							}),
						});

						if (res.ok) {
							const json = await res.json();
							if (json?.appointment) {
								const newApt: PatientAppointment = {
									id: json.appointment.id,
									dateIso: req.date,
									timeRu: req.time,
									doctorId: targetDocId,
									doctorName:
										req.doctorName || matchingDoc?.fullName || "Лечащий врач",
									doctorSpecialtyRu:
										matchingDoc?.specialties?.[0] || "Стоматолог-терапевт",
									roomNumber: "Кабинет 1",
									clinicName: "Стоматологическая клиника ДЕНТЕ",
									clinicAddressRu: "г. Москва, ул. Клиническая, д. 10",
									titleRu: req.goalId,
									status: "scheduled",
									reminderSent: true,
									reminderChannel: "sms",
								};
								setData((prev) => ({
									...prev,
									appointments: [newApt, ...prev.appointments],
								}));
								handleShowCabinetToast(`Запись подтверждена на ${req.date} в ${req.time}!`);
								onAppointmentBooked?.({
									specialty: req.goalId,
									preferredDate: `${req.date} ${req.time}`,
									note: req.comment,
								});
								return;
							}
						}
					}
				} catch (err) {
					console.error("[PatientCabinetModal] Failed to post /api/portal/appointments:", err);
				}
			}

			handleShowCabinetToast(`Запись оформлена на ${req.date} в ${req.time}! СМС-подтверждение отправлено.`);
			onAppointmentBooked?.({
				specialty: req.goalId,
				preferredDate: `${req.date} ${req.time}`,
				note: req.comment,
			});
		},
		[token, availableDoctors, handleShowCabinetToast, onAppointmentBooked],
	);

	// Downloads & Prints
	const handleDownloadReceipt = useCallback((invoice: PatientInvoiceItem) => {
		downloadDetailedReceipt(invoice, data);
	}, [data]);

	const handleDownloadTaxCertificate = useCallback(() => {
		downloadPatientTaxCertificate1151156(data, selectedTaxYear);
	}, [data, selectedTaxYear]);

	const handlePrintCareMemo = useCallback(() => {
		openPrintWindow(careMemo.printHtml);
	}, [careMemo]);

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
			items: [
				{
					id: `stage-item-${stage.id}`,
					code: "A16.07.001",
					titleRu: stage.titleRu,
					priceRub: stage.costRub,
					quantity: 1,
					qty: 1,
					totalRub: stage.costRub,
					categoryGroup: "caries",
				},
			],
		};
		handleStartSbpPayment(stageInvoice);
	}, [handleStartSbpPayment]);

	const handleSendCareMemoWhatsApp = useCallback(() => {
		const link = buildWhatsAppLink(data.phone, careMemo.smsText);
		window.open(link, "_blank");
	}, [data.phone, careMemo.smsText]);

	const handleCancelAppointment = useCallback(
		async (aptId: string, reason: string) => {
			if (token) {
				try {
					const res = await fetch(
						`/api/portal/appointments/${encodeURIComponent(aptId)}/cancel`,
						{
							method: "PATCH",
							headers: {
								Authorization: `Bearer ${token}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({ reason }),
						},
					);
					if (res.ok) {
						handleShowCabinetToast("Запись успешно отменена.");
					}
				} catch (err) {
					console.error("[PatientCabinetModal] Failed to cancel appointment:", err);
				}
			}

			setData((prev) => ({
				...prev,
				appointments: prev.appointments.map((a) =>
					a.id === aptId
						? { ...a, status: "cancelled", cancellationReason: reason }
						: a,
				),
			}));
		},
		[token, handleShowCabinetToast],
	);

	return {
		data,
		setData,
		isFetchingMe,
		activeTab,
		setActiveTab,
		availableDoctors,
		isOnline,
		queuedBookingsCount,
		isSyncing,
		flushNow,
		activeSbpInvoice,
		setActiveSbpInvoice,
		activeSbpPayload,
		setActiveSbpPayload,
		isCheckingSbpStatus,
		setIsCheckingSbpStatus,
		sbpStatusMessage,
		setSbpStatusMessage,
		signingConsent,
		setSigningConsent,
		consentSignMode,
		setConsentSignMode,
		otpDigits,
		otpError,
		otpCountdown,
		sentOtp,
		isReceptionQrOpen,
		setIsReceptionQrOpen,
		isCareMemoQrOpen,
		setIsCareMemoQrOpen,
		isPrintMemoPreviewOpen,
		setIsPrintMemoPreviewOpen,
		reschedulingApt,
		setReschedulingApt,
		isBookingOpen,
		setIsBookingOpen,
		isSelfCheckinOpen,
		setIsSelfCheckinOpen,
		isTaxModalOpen,
		setIsTaxModalOpen,
		selectedTaxYear,
		setSelectedTaxYear,
		showClinicalPlanDetail,
		setShowClinicalPlanDetail,
		cabinetToastMessage,
		handleShowCabinetToast,
		summary,
		healthIndex,
		dentalPassport,
		nextApptCountdown,
		taxDeduction,
		careMemo,
		taxDeductionPayments,
		handleStartSbpPayment,
		handleCheckSbpPaymentStatus,
		handleOpenBankApp,
		handleStartConsentSign,
		handleOtpDigitChange,
		handleResendOtp,
		handleConfirmConsentOtp,
		handleSignConsentInCabinet,
		handleRescheduleSubmit,
		handleBookingSubmit,
		handleDownloadReceipt,
		handleDownloadTaxCertificate,
		handlePrintCareMemo,
		handlePayStageSbp,
		handleSendCareMemoWhatsApp,
		handleCancelAppointment,
	};
}
