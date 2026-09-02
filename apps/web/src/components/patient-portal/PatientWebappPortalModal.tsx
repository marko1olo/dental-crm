/**
 * PatientWebappPortalModal.tsx — Модальное окно мобильного кабинета пациента (PWA Simulator)
 *
 * (DOMAIN: PATIENT PORTAL & MOBILE WEBAPP SIMULATOR)
 *
 * Возможности:
 * 1. Реалистичный симулятор экрана смартфона (390x844) с динамическим островом, статус-баром и нижним таббаром.
 * 2. 5 интерактивных разделов:
 *    - Главная: карточка следующего визита, быстрые действия, баланс бонусов и долг.
 *    - Записи: предстоящие визиты и архив приемов с подготовкой к визиту.
 *    - План лечения: этапы 804н, FDI-зубы, суммы в копейках, 1-клик оплата СБП.
 *    - Фотопротокол: интерактивная шторка «До / После» со слайдером и шкалой VITA.
 *    - Документы и Оплата: счета СБП (НСПК), онлайн-подписание ИДС и Договора по СМС (63-ФЗ ПЭП).
 * 3. Переключатель режимов: «Смартфон (390px)» vs «Полный экран» vs «QR Magic Link».
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Award,
	Calendar,
	Camera,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	Download,
	ExternalLink,
	Eye,
	FileBadge,
	FileCheck,
	FileText,
	Flame,
	Heart,
	HeartPulse,
	HelpCircle,
	Info,
	Layers,
	Lock,
	Maximize2,
	Minimize2,
	MessageCircle,
	MoveHorizontal,
	Phone,
	PhoneCall,
	QrCode,
	RotateCcw,
	Send,
	Share2,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Smartphone,
	Smile,
	Sparkles,
	Star,
	Stethoscope,
	Tag,
	TrendingUp,
	Trash2,
	User,
	UserCheck,
	Users,
	Wand2,
	Wallet,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	assemblePatientWebappProfile,
	calculatePlanFinancials,
	calculateSplitClipPath,
	calculateWiperPointerPercent,
	generatePatientMagicLink,
	generatePatientWebappSession,
	generateSbpPaymentQrModel,
	generateSmsOtpForSigning,
	getPresetBeforeAfterGalleries,
	getPresetSignableDocuments,
	kopecksToRubles,
	rublesToKopecks,
	formatKopecksToCurrencyRu,
	signDocumentWithPep,
	verifySmsOtpForSigning,
	type BeforeAfterComparisonPair,
	type PatientAppointmentItem,
	type PatientInvoiceBillItem,
	type PatientTreatmentPlanProfile,
	type PatientTreatmentPlanStage,
	type PatientWebappAggregatedProfile,
	type SbpDynamicQrModel,
	type SignableStatutoryDocument,
} from "./patientWebappEngine.js";
import { InteractiveTreatmentTimelineWidget } from "./InteractiveTreatmentTimelineWidget.js";
import "./patientWebapp.css";

export interface PatientWebappPortalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | undefined;
	readonly initialTab?: "home" | "appointments" | "plan" | "photos" | "payments" | "documents" | "postop" | undefined;
	readonly customProfile?: PatientWebappAggregatedProfile | undefined;
	readonly onAppointmentBook?: (() => void) | undefined;
	readonly onAppointmentReschedule?: ((appointmentId: string) => void) | undefined;
	readonly onPaymentComplete?: ((invoiceNumber: string, amountRub: number) => void) | undefined;
	readonly onDocumentSigned?: ((documentId: string) => void) | undefined;
}

export const PatientWebappPortalModal: React.FC<PatientWebappPortalModalProps> = ({
	isOpen,
	onClose,
	initialPatientId = "pat-043-982",
	initialTab = "home",
	customProfile,
	onAppointmentBook,
	onAppointmentReschedule,
	onPaymentComplete,
	onDocumentSigned,
}) => {
	// Active Tab State
	const [activeTab, setActiveTab] = useState<"home" | "appointments" | "plan" | "photos" | "payments" | "postop">(
		initialTab === "documents" ? "payments" : initialTab,
	);

	// Simulator Frame Mode: Phone (390px) vs Fullscreen
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [showShareModal, setShowShareModal] = useState<boolean>(false);
	const [magicLinkCopied, setMagicLinkCopied] = useState<boolean>(false);
	const [showSmartBooking, setShowSmartBooking] = useState<boolean>(false);

	// Appointments Sub-tab (upcoming vs history vs postop vs family_care)
	const [appointmentsSubTab, setAppointmentsSubTab] = useState<"upcoming" | "history" | "postop" | "family_care">("upcoming");

	// Before/After Photo Protocol State
	const [galleries, setGalleries] = useState<readonly BeforeAfterComparisonPair[]>([]);
	const [selectedGalleryId, setSelectedGalleryId] = useState<string>("");
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const isDraggingSplitRef = useRef<boolean>(false);
	const sliderRef = useRef<HTMLDivElement | null>(null);

	// SBP Payment Sheet State
	const [activeSbpQr, setActiveSbpQr] = useState<SbpDynamicQrModel | null>(null);
	const [selectedInvoice, setSelectedInvoice] = useState<PatientInvoiceBillItem | null>(null);
	const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
	const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

	// SMS-OTP 63-FZ PEP Document Signing State
	const [signingDoc, setSigningDoc] = useState<SignableStatutoryDocument | null>(null);
	const [smsOtpInput, setSmsOtpInput] = useState<string>("");
	const [activeOtpCode, setActiveOtpCode] = useState<string>("");
	const [otpSentTimestamp, setOtpSentTimestamp] = useState<number>(0);
	const [otpResendCountdown, setOtpResendCountdown] = useState<number>(60);
	const [signingError, setSigningError] = useState<string | null>(null);
	const [signSuccessToast, setSignSuccessToast] = useState<string | null>(null);

	// Initialize Profile & Mock Data
	const [profile, setProfile] = useState<PatientWebappAggregatedProfile>(() => {
		if (customProfile) return customProfile;

		const defaultStages: readonly PatientTreatmentPlanStage[] = [
			{
				id: "stage-1-diag",
				orderIndex: 1,
				titleRu: "Комплексная диагностика и 3D-сканирование",
				categoryRu: "Диагностика",
				teethFdi: ["11", "21", "16", "26"],
				costKopecks: 850000,
				costRub: 8500,
				status: "completed",
				procedures: [
					{
						id: "proc-1",
						code804n: "A06.07.012",
						nameRu: "Конусно-лучевая компьютерная томография (КЛКТ)",
						quantity: 1,
						unitPriceKopecks: 450000,
						unitPriceRub: 4500,
						totalKopecks: 450000,
						totalRub: 4500,
					},
					{
						id: "proc-2",
						code804n: "A02.07.001",
						nameRu: "Интраоральное 3D-сканирование зубных рядов",
						quantity: 1,
						unitPriceKopecks: 400000,
						unitPriceRub: 4000,
						totalKopecks: 400000,
						totalRub: 4000,
					},
				],
			},
			{
				id: "stage-2-endo",
				orderIndex: 2,
				titleRu: "Эндодонтическое лечение зуба 1.6 под микроскопом",
				categoryRu: "Терапия",
				teethFdi: ["16"],
				costKopecks: 2400000,
				costRub: 24000,
				status: "in_progress",
				procedures: [
					{
						id: "proc-3",
						code804n: "A16.07.008.002",
						nameRu: "Инструментальная обработка 3 корневых каналов ProTaper",
						toothFdi: "16",
						quantity: 3,
						unitPriceKopecks: 500000,
						unitPriceRub: 5000,
						totalKopecks: 1500000,
						totalRub: 15000,
					},
					{
						id: "proc-4",
						code804n: "A16.07.008.003",
						nameRu: "Пломбирование каналов биокерамикой BioRoot RCS",
						toothFdi: "16",
						quantity: 3,
						unitPriceKopecks: 300000,
						unitPriceRub: 3000,
						totalKopecks: 900000,
						totalRub: 9000,
					},
				],
			},
			{
				id: "stage-3-crown",
				orderIndex: 3,
				titleRu: "Фиксация циркониевой коронки Katana HTML (зуб 1.6)",
				categoryRu: "Ортопедия",
				teethFdi: ["16"],
				costKopecks: 3200000,
				costRub: 32000,
				status: "planned",
				procedures: [
					{
						id: "proc-5",
						code804n: "A16.07.004",
						nameRu: "Коронка из диоксида циркония Katana HTML",
						toothFdi: "16",
						quantity: 1,
						unitPriceKopecks: 3200000,
						unitPriceRub: 32000,
						totalKopecks: 3200000,
						totalRub: 32000,
					},
				],
			},
		];

		const planFinancials = calculatePlanFinancials(defaultStages);

		const defaultPlan: PatientTreatmentPlanProfile = {
			id: "plan-2026-08-01",
			planNumber: "ПЛ-2026/043",
			titleRu: "Комплексная стоматологическая реабилитация",
			curatingDoctor: "Д-р Смирнова Анна Сергеевна",
			createdAtIso: "2026-08-01",
			totalCostKopecks: planFinancials.totalCostKopecks,
			totalCostRub: planFinancials.totalCostRub,
			paidCostKopecks: planFinancials.paidCostKopecks,
			paidCostRub: planFinancials.paidCostRub,
			remainingDueKopecks: planFinancials.remainingDueKopecks,
			remainingDueRub: planFinancials.remainingDueRub,
			progressPercent: planFinancials.progressPercent,
			status: "in_progress",
			stages: defaultStages,
		};

		const defaultAppointments: readonly PatientAppointmentItem[] = [
			{
				id: "apt-upcoming-1",
				dateIso: "2026-08-30",
				timeRu: "14:30",
				doctorId: "doc-smirnova",
				doctorName: "Смирнова Анна Сергеевна",
				doctorSpecialtyRu: "Врач-стоматолог-терапевт",
				roomNumber: "Кабинет № 3 (Микроскоп)",
				clinicName: 'ООО "Денте Клиник"',
				clinicAddressRu: "г. Москва, ул. Стоматологическая, д. 10",
				clinicPhone: "+7 (495) 789-01-23",
				titleRu: "2-й этап: Пломбирование корневых каналов зуба 1.6",
				status: "confirmed",
				priceKopecks: 900000,
				priceRub: 9000,
				reminderSent: true,
				preparationInstructionsRu: [
					"Принять пищу за 1–1.5 часа до визита.",
					"Не принимать алкоголь и аспирин накануне приема.",
					"Взять с собой паспорт для подтверждения личности.",
				],
			},
			{
				id: "apt-history-1",
				dateIso: "2026-08-10",
				timeRu: "11:00",
				doctorId: "doc-smirnova",
				doctorName: "Смирнова Анна Сергеевна",
				doctorSpecialtyRu: "Врач-стоматолог-терапевт",
				roomNumber: "Кабинет № 3",
				clinicName: 'ООО "Денте Клиник"',
				clinicAddressRu: "г. Москва, ул. Стоматологическая, д. 10",
				clinicPhone: "+7 (495) 789-01-23",
				titleRu: "1-й этап: Первичный осмотр, КЛКТ и девитализация 1.6",
				status: "completed",
				priceKopecks: 850000,
				priceRub: 8500,
				reminderSent: true,
			},
		];

		const defaultInvoices: readonly PatientInvoiceBillItem[] = [
			{
				id: "inv-2026-08-01",
				invoiceNumber: "СЧ-2026/08-043",
				issueDateIso: "2026-08-28",
				dueDateIso: "2026-08-30",
				titleRu: "Оплата 2-го этапа лечения зуба 1.6",
				totalAmountKopecks: 900000,
				totalAmountRub: 9000,
				paidAmountKopecks: 0,
				paidAmountRub: 0,
				remainingAmountKopecks: 900000,
				remainingAmountRub: 9000,
				status: "unpaid",
			},
			{
				id: "inv-2026-08-02",
				invoiceNumber: "СЧ-2026/08-012",
				issueDateIso: "2026-08-10",
				dueDateIso: "2026-08-10",
				titleRu: "Оплата диагностики и КЛКТ 3D",
				totalAmountKopecks: 850000,
				totalAmountRub: 8500,
				paidAmountKopecks: 850000,
				paidAmountRub: 8500,
				remainingAmountKopecks: 0,
				remainingAmountRub: 0,
				status: "paid",
				paymentMethod: "sbp",
				paidAtIso: "2026-08-10T11:45:00Z",
				fiscalReceiptNumber: "ФД-984210",
			},
		];

		const photoGalleries = getPresetBeforeAfterGalleries(initialPatientId);
		const signDocs = getPresetSignableDocuments("Воронов Алексей Владимирович", "+7 (999) 123-45-67");

		return assemblePatientWebappProfile({
			patientId: initialPatientId,
			fullName: "Воронов Алексей Владимирович",
			phone: "+7 (999) 123-45-67",
			birthDate: "1984-05-14",
			cardNumber: "043-8842",
			curatingDoctor: "Д-р Смирнова Анна Сергеевна",
			appointments: defaultAppointments,
			treatmentPlan: defaultPlan,
			invoices: defaultInvoices,
			beforeAfterGalleries: photoGalleries,
			signableDocuments: signDocs,
			loyaltyBonusBalance: 7500,
			loyaltyCashbackRub: 1850,
		});
	});

	// Load galleries into state
	useEffect(() => {
		if (profile.beforeAfterGalleries && profile.beforeAfterGalleries.length > 0) {
			setGalleries(profile.beforeAfterGalleries);
			setSelectedGalleryId(profile.beforeAfterGalleries[0]?.id || "");
		}
	}, [profile.beforeAfterGalleries]);

	// Current selected gallery
	const currentGallery = useMemo(() => {
		return galleries.find((g) => g.id === selectedGalleryId) || galleries[0];
	}, [galleries, selectedGalleryId]);

	// Session token generation for Magic link
	const magicLinkUrl = useMemo(() => {
		const { encodedToken } = generatePatientWebappSession({
			patientId: profile.patientId,
			phone: profile.phone,
			ttlHours: 72,
		});
		const targetTab = (activeTab === "home" || activeTab === "postop" ? "plan" : activeTab) as "plan" | "home" | "appointments" | "photos" | "payments" | "documents" | undefined;
		return generatePatientMagicLink(window.location.origin, encodedToken, targetTab);
	}, [profile.patientId, profile.phone, activeTab]);

	// OTP Timer countdown
	useEffect(() => {
		let timer: any;
		if (signingDoc && otpResendCountdown > 0) {
			timer = setInterval(() => {
				setOtpResendCountdown((prev) => Math.max(0, prev - 1));
			}, 1000);
		}
		return () => clearInterval(timer);
	}, [signingDoc, otpResendCountdown]);

	if (!isOpen) return null;

	// Pointer Handlers for Before/After Slider
	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingSplitRef.current = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		updateSliderFromEvent(e);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingSplitRef.current) return;
		updateSliderFromEvent(e);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingSplitRef.current = false;
		try {
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}
	};

	const updateSliderFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!sliderRef.current) return;
		const rect = sliderRef.current.getBoundingClientRect();
		const pct = calculateWiperPointerPercent(
			{ clientX: e.clientX, clientY: e.clientY },
			rect,
			"vertical",
		);
		setSplitPercent(pct);
	};

	// Open SBP QR Sheet for an Invoice or Plan Stage
	const handleOpenSbpPayment = (inv: PatientInvoiceBillItem) => {
		setSelectedInvoice(inv);
		const qrModel = generateSbpPaymentQrModel({
			sumKopecks: inv.remainingAmountKopecks > 0 ? inv.remainingAmountKopecks : inv.totalAmountKopecks,
			orderId: inv.invoiceNumber,
			purpose: `Оплата лечения по счету №${inv.invoiceNumber} (${profile.clinicName})`,
			clinicLegalName: profile.clinicName,
			clinicInn: profile.clinicInn,
		});
		setActiveSbpQr(qrModel);
	};

	const handlePayStageSbp = (stage: PatientTreatmentPlanStage) => {
		const stageInvoice: PatientInvoiceBillItem = {
			id: `stage-inv-${stage.id}`,
			invoiceNumber: `ЭТАП-${stage.orderIndex}-${Date.now().toString().slice(-4)}`,
			issueDateIso: new Date().toISOString().slice(0, 10),
			dueDateIso: new Date().toISOString().slice(0, 10),
			titleRu: stage.titleRu,
			totalAmountKopecks: stage.costKopecks,
			totalAmountRub: stage.costRub,
			paidAmountKopecks: 0,
			paidAmountRub: 0,
			remainingAmountKopecks: stage.costKopecks,
			remainingAmountRub: stage.costRub,
			status: "unpaid",
		};
		handleOpenSbpPayment(stageInvoice);
	};

	// Simulate Instant SBP Payment Success
	const handleSimulateSbpSuccess = () => {
		if (!selectedInvoice || isProcessingPayment) return;
		setIsProcessingPayment(true);

		setTimeout(() => {
			setIsProcessingPayment(false);
			const paidInvNumber = selectedInvoice.invoiceNumber;
			const paidRub = selectedInvoice.remainingAmountRub;

			// Update Invoices State
			setProfile((prev) => {
				const updatedInvoices = prev.invoices.map((inv) =>
					inv.invoiceNumber === paidInvNumber
						? {
								...inv,
								status: "paid" as const,
								paidAmountKopecks: inv.totalAmountKopecks,
								paidAmountRub: inv.totalAmountRub,
								remainingAmountKopecks: 0,
								remainingAmountRub: 0,
								paidAtIso: new Date().toISOString(),
								fiscalReceiptNumber: `ФД-${Math.floor(100000 + Math.random() * 900000)}`,
							}
						: inv,
				);
				return {
					...prev,
					invoices: updatedInvoices,
					totalDebtKopecks: Math.max(0, prev.totalDebtKopecks - selectedInvoice.remainingAmountKopecks),
					totalDebtRub: kopecksToRubles(
						Math.max(0, prev.totalDebtKopecks - selectedInvoice.remainingAmountKopecks),
					),
				};
			});

			setActiveSbpQr(null);
			setSelectedInvoice(null);
			setPaymentSuccessToast(`Оплата ${paidRub.toLocaleString("ru-RU")} ₽ успешно подтверждена банком через СБП! Чек 54-ФЗ сформирован.`);
			onPaymentComplete?.(paidInvNumber, paidRub);

			setTimeout(() => setPaymentSuccessToast(null), 5000);
		}, 1200);
	};

	// Open SMS-OTP Document Sign Modal
	const handleStartDocumentSign = (doc: SignableStatutoryDocument) => {
		setSigningDoc(doc);
		setSmsOtpInput("");
		setSigningError(null);
		const otp = generateSmsOtpForSigning(profile.phone, doc.id);
		setActiveOtpCode(otp.code);
		setOtpSentTimestamp(otp.sentTimestamp);
		setOtpResendCountdown(60);
	};

	// Resend SMS-OTP code
	const handleResendOtp = () => {
		if (otpResendCountdown > 0 || !signingDoc) return;
		const otp = generateSmsOtpForSigning(profile.phone, signingDoc.id);
		setActiveOtpCode(otp.code);
		setOtpSentTimestamp(otp.sentTimestamp);
		setOtpResendCountdown(60);
		setSigningError(null);
	};

	// Confirm PEP 63-FZ Signature
	const handleConfirmDocumentSign = () => {
		if (!signingDoc) return;
		setSigningError(null);

		const verification = verifySmsOtpForSigning(smsOtpInput, activeOtpCode, otpSentTimestamp);
		if (!verification.isSuccess) {
			setSigningError(verification.error || "Неверный код СМС.");
			return;
		}

		const signed = signDocumentWithPep({
			document: signingDoc,
			patientPhone: profile.phone,
			smsOtpCode: smsOtpInput,
			signerFullName: profile.fullName,
		});

		setProfile((prev) => ({
			...prev,
			signableDocuments: prev.signableDocuments.map((d) => (d.id === signed.id ? signed : d)),
		}));

		const signedTitle = signed.titleRu;
		setSigningDoc(null);
		setSignSuccessToast(`Документ «${signedTitle}» успешно подписан простой электронной подписью (63-ФЗ ПЭП)!`);
		onDocumentSigned?.(signed.id);

		setTimeout(() => setSignSuccessToast(null), 5000);
	};

	const handleCopyMagicLink = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(magicLinkUrl);
			setMagicLinkCopied(true);
			setTimeout(() => setMagicLinkCopied(false), 3000);
		}
	};

	return (
		<div className="pwa-simulator-overlay" data-testid="patient-webapp-portal-modal">
			<div className="pwa-simulator-wrapper">
				{/* Top Controls Bar */}
				<div className="pwa-simulator-topbar">
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Smartphone size={18} style={{ color: "var(--brand-500, #0d9488)" }} />
						<span style={{ fontSize: "13px", fontWeight: 800 }}>
							Мобильный веб-кабинет пациента (PWA)
						</span>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<button
							type="button"
							className={`pwa-mode-toggle-btn ${isFullscreen ? "active" : ""}`}
							onClick={() => setIsFullscreen(!isFullscreen)}
							title={isFullscreen ? "Режим смартфона (390px)" : "Полный экран"}
						>
							{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
							<span>{isFullscreen ? "Смартфон" : "На весь экран"}</span>
						</button>

						<button
							type="button"
							className="pwa-mode-toggle-btn"
							onClick={() => setShowShareModal(true)}
							title="Поделиться Magic Link"
						>
							<Share2 size={14} />
							<span>QR-доступ</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="pwa-mode-toggle-btn"
							style={{ color: "var(--danger, #ef4444)" }}
							title="Закрыть симулятор"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* Global Toast Notifications */}
				{paymentSuccessToast && (
					<div
						style={{
							backgroundColor: "rgba(16, 185, 129, 0.95)",
							color: "var(--on-teal, #ffffff)",
							padding: "10px 16px",
							borderRadius: "14px",
							fontSize: "12px",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							gap: "8px",
							boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
							zIndex: 200,
							maxWidth: "480px",
							textAlign: "left",
						}}
					>
						<CheckCircle2 size={18} className="shrink-0" />
						<span>{paymentSuccessToast}</span>
					</div>
				)}

				{signSuccessToast && (
					<div
						style={{
							backgroundColor: "rgba(13, 148, 136, 0.95)",
							color: "var(--on-teal, #ffffff)",
							padding: "10px 16px",
							borderRadius: "14px",
							fontSize: "12px",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							gap: "8px",
							boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
							zIndex: 200,
							maxWidth: "480px",
							textAlign: "left",
						}}
					>
						<FileCheck size={18} className="shrink-0" />
						<span>{signSuccessToast}</span>
					</div>
				)}

				{/* 2. Device Frame (Smartphone Mockup) */}
				<div className={`pwa-device-frame ${isFullscreen ? "fullscreen" : ""}`}>
					{/* Dynamic Island on Top */}
					{!isFullscreen && (
						<div className="pwa-dynamic-island">
							<div className="pwa-island-camera" />
							<div className="pwa-island-sensor" />
						</div>
					)}

					{/* Status Bar */}
					<div className="pwa-status-bar">
						<span>09:41</span>
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<span style={{ fontSize: "10px", fontWeight: 700 }}>5G</span>
							<Zap size={13} style={{ color: "var(--brand-500, #0d9488)" }} />
							<div
								style={{
									width: "20px",
									height: "10px",
									borderRadius: "3px",
									border: "1.5px solid currentColor",
									padding: "1px",
									display: "flex",
									alignItems: "center",
								}}
							>
								<div style={{ width: "80%", height: "100%", background: "currentColor", borderRadius: "1px" }} />
							</div>
						</div>
					</div>

					{/* App Viewport */}
					<div className="pwa-app-viewport">
						{/* App Header */}
						<header className="pwa-app-header">
							<div>
								<span style={{ fontSize: "10px", fontWeight: 800, color: "var(--brand-500, #0d9488)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									{profile.clinicName}
								</span>
								<h2 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
									{profile.fullName}
								</h2>
								<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
									Карта № {profile.cardNumber} • {profile.curatingDoctor}
								</span>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<div
									style={{
										padding: "4px 8px",
										borderRadius: "10px",
										background: "rgba(13, 148, 136, 0.1)",
										color: "var(--brand-500, #0d9488)",
										fontSize: "11px",
										fontWeight: 800,
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}}
								>
									<Award size={13} />
									<span>{profile.loyaltyBonusBalance} Б</span>
								</div>
							</div>
						</header>

						{/* App Content Tabs */}
						<main className="pwa-app-content">
									{/* TAB 1: ГЛАВНАЯ (HOME) */}
									{activeTab === "home" && (
										<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
											{/* Next Visit Banner */}
											{profile.nextAppointment ? (
												<div className="pwa-card pwa-hero-next-visit">
													<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
														<span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", opacity: 0.9 }}>
															Ближайший прием
														</span>
														<span style={{ fontSize: "11px", fontWeight: 700, opacity: 0.85 }}>
															{profile.nextAppointment.roomNumber}
														</span>
													</div>

													<div>
														<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900 }}>
															{profile.nextAppointment.titleRu}
														</h3>
														<p style={{ margin: "3px 0 0 0", fontSize: "12px", opacity: 0.9 }}>
															{profile.nextAppointment.dateIso} в {profile.nextAppointment.timeRu} • {profile.nextAppointment.doctorName}
														</p>
													</div>

													<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
														<button
															type="button"
															onClick={() => setActiveTab("appointments")}
															style={{
																flex: 1,
																minHeight: "44px",
																borderRadius: "10px",
																border: "none",
																background: "var(--paper-strong, #ffffff)",
																color: "var(--teal-strong, #0f766e)",
																fontSize: "12px",
																fontWeight: 800,
																cursor: "pointer",
															}}
														>
															Детали приема
														</button>
														<a
															href={`tel:${profile.clinicPhone.replace(/\D/g, "")}`}
															style={{
																display: "inline-flex",
																alignItems: "center",
																justifyContent: "center",
																minWidth: "44px",
																minHeight: "44px",
																borderRadius: "10px",
																background: "rgba(255, 255, 255, 0.2)",
																color: "var(--on-teal, #ffffff)",
																textDecoration: "none",
															}}
															title="Позвонить в клинику"
														>
															<PhoneCall size={16} />
														</a>
													</div>
												</div>
											) : (
												<div className="pwa-card" style={{ textAlign: "center", padding: "16px" }}>
													<p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
														У вас нет активных записей на прием
													</p>
													<button
														type="button"
														onClick={() => setShowSmartBooking(true)}
														className="pwa-action-btn-primary"
														style={{ marginTop: "10px", minHeight: "44px" }}
													>
														<Calendar size={15} />
														<span>Записаться к врачу</span>
													</button>
												</div>
											)}

									{/* Quick Action Buttons Grid */}
									<div className="pwa-quick-action-grid">
										<button
											type="button"
											className="pwa-quick-action-btn"
											onClick={() => setActiveTab("plan")}
										>
											<div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(13, 148, 136, 0.15)", color: "var(--brand-500, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }}>
												<Activity size={18} />
											</div>
											<div>
												<span style={{ display: "block" }}>План лечения</span>
												<small style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>
													{profile.activeTreatmentPlan ? `${profile.activeTreatmentPlan.progressPercent}% выполнено` : "Нет активного плана"}
												</small>
											</div>
										</button>

										<button
											type="button"
											className="pwa-quick-action-btn"
											onClick={() => setActiveTab("payments")}
										>
											<div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "var(--success, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
												<QrCode size={18} />
											</div>
											<div>
												<span style={{ display: "block" }}>Оплата СБП</span>
												<small style={{ fontSize: "10px", color: profile.totalDebtRub > 0 ? "var(--danger, #ef4444)" : "var(--success, #10b981)" }}>
													{profile.totalDebtRub > 0 ? `К оплате ${profile.totalDebtRub.toLocaleString("ru-RU")} ₽` : "Все оплачено"}
												</small>
											</div>
										</button>

										<button
											type="button"
											className="pwa-quick-action-btn"
											onClick={() => setActiveTab("photos")}
										>
											<div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(37, 99, 235, 0.15)", color: "var(--info-fg, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
												<Camera size={18} />
											</div>
											<div>
												<span style={{ display: "block" }}>Фото «До/После»</span>
												<small style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>
													{galleries.length} фотопротокола
												</small>
											</div>
										</button>

										<button
											type="button"
											className="pwa-quick-action-btn"
											onClick={() => setActiveTab("payments")}
										>
											<div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "var(--warning, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
												<FileText size={18} />
											</div>
											<div>
												<span style={{ display: "block" }}>ИДС и Договор</span>
												<small style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>
													Подпись по 63-ФЗ
												</small>
											</div>
										</button>
									</div>

									{/* Family Wallet Quick Banner */}
									<div
										className="pwa-card"
										style={{
											background: "linear-gradient(135deg, var(--teal-soft, #f0fdfa) 0%, var(--paper-strong, #ffffff) 100%)",
											border: "1px solid var(--teal-surface, rgba(13, 148, 136, 0.25))",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											padding: "12px 14px",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
											<div
												style={{
													width: "34px",
													height: "34px",
													borderRadius: "8px",
													backgroundColor: "var(--teal, #0d9488)",
													color: "var(--on-teal, #ffffff)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													flexShrink: 0,
												}}
											>
												<Wallet size={18} />
											</div>
											<div>
												<div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
													Семейный кошелёк (323-ФЗ)
												</div>
												<div style={{ fontSize: "11px", color: "var(--teal-strong, #0f766e)", fontWeight: 600 }}>
													Доступно 45 000 ₽ • Скидка 7%
												</div>
											</div>
										</div>

										<button
											type="button"
											onClick={() => setActiveTab("payments")}
											style={{
												padding: "6px 10px",
												borderRadius: "6px",
												backgroundColor: "var(--teal, #0d9488)",
												color: "var(--on-teal, #ffffff)",
												border: "none",
												fontSize: "11px",
												fontWeight: 700,
												cursor: "pointer",
											}}
										>
											Кошелёк
										</button>
									</div>

									{/* 24/7 SOS Emergency Doctor Hotline */}
									<div className="pwa-card" style={{ borderLeft: "4px solid var(--danger, #ef4444)" }}>
										<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<ShieldAlert size={18} style={{ color: "var(--danger, #ef4444)" }} />
												<strong style={{ fontSize: "13px" }}>Линия заботы о пациентах 24/7</strong>
											</div>
											<span style={{ fontSize: "10px", fontWeight: 800, background: "rgba(239, 68, 68, 0.1)", color: "var(--danger, #ef4444)", padding: "2px 6px", borderRadius: "6px" }}>
												SOS
											</span>
										</div>
										<p style={{ margin: 0, fontSize: "11px", color: "var(--muted, #64748b)", lineHeight: "1.4" }}>
											Если после лечения возникла ноющая боль или отек — напишите дежурному врачу в WhatsApp или позвоните в клинику.
										</p>
										<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
											<a
												href="https://wa.me/79991234567"
												target="_blank"
												rel="noreferrer"
												className="pwa-action-btn-primary"
												style={{ background: "var(--ok-fg, #25d366)", fontSize: "12px", minHeight: "44px", flex: 1 }}
											>
												<MessageCircle size={15} />
												<span>WhatsApp</span>
											</a>
											<a
												href={`tel:${profile.clinicPhone.replace(/\D/g, "")}`}
												className="pwa-action-btn-secondary"
												style={{ fontSize: "12px", minHeight: "44px", flex: 1 }}
											>
												<Phone size={15} />
												<span>Позвонить</span>
											</a>
										</div>
									</div>
								</div>
							)}

							{/* TAB 2: ЗАПИСИ И ВИЗИТЫ (APPOINTMENTS) */}
							{activeTab === "appointments" && (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									{/* Quick Action: New Appointment */}
									<button
										type="button"
										onClick={onAppointmentBook}
										className="pwa-action-btn-primary"
										style={{ minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
									>
										<Calendar size={16} />
										<span>Записаться на прием к врачу</span>
									</button>

									{/* Sub-tab pills */}
									<div style={{ display: "flex", background: "var(--paper, #ffffff)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border, #e2e8f0)", gap: "4px", overflowX: "auto" }}>
										<button
											type="button"
											onClick={() => setAppointmentsSubTab("upcoming")}
											style={{
												flex: 1,
												minHeight: "40px",
												borderRadius: "8px",
												border: "none",
												background: appointmentsSubTab === "upcoming" ? "var(--brand-500, #0d9488)" : "transparent",
												color: appointmentsSubTab === "upcoming" ? "var(--on-teal, #ffffff)" : "var(--muted, #64748b)",
												fontSize: "12px",
												fontWeight: 700,
												cursor: "pointer",
												whiteSpace: "nowrap",
												padding: "0 8px",
											}}
										>
											Предстоящие ({profile.upcomingAppointments.length})
										</button>
										<button
											type="button"
											onClick={() => setAppointmentsSubTab("history")}
											style={{
												flex: 1,
												minHeight: "40px",
												borderRadius: "8px",
												border: "none",
												background: appointmentsSubTab === "history" ? "var(--brand-500, #0d9488)" : "transparent",
												color: appointmentsSubTab === "history" ? "var(--on-teal, #ffffff)" : "var(--muted, #64748b)",
												fontSize: "12px",
												fontWeight: 700,
												cursor: "pointer",
												whiteSpace: "nowrap",
												padding: "0 8px",
											}}
										>
											История ({profile.pastAppointments.length})
										</button>
									</div>

									{appointmentsSubTab === "upcoming" && (
										profile.upcomingAppointments.length > 0 ? (
											profile.upcomingAppointments.map((apt) => (
												<div key={apt.id} className="pwa-card">
													<div className="pwa-card-header">
														<span style={{ color: "var(--brand-500, #0d9488)", fontWeight: 800 }}>
															{apt.dateIso} в {apt.timeRu}
														</span>
														<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
															{apt.roomNumber}
														</span>
													</div>

													<div>
														<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>
															{apt.titleRu}
														</h4>
														<span style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "block", marginTop: "2px" }}>
															Врач: <strong>{apt.doctorName}</strong> ({apt.doctorSpecialtyRu})
														</span>
													</div>

													{apt.preparationInstructionsRu && apt.preparationInstructionsRu.length > 0 && (
														<div style={{ background: "var(--paper-soft, #f8fafc)", padding: "8px 10px", borderRadius: "10px", fontSize: "11px" }}>
															<strong style={{ color: "var(--brand-500, #0d9488)", display: "block", marginBottom: "3px" }}>
																Памятка перед приемом:
															</strong>
															<ul style={{ margin: 0, paddingLeft: "16px", color: "var(--muted, #64748b)" }}>
																{apt.preparationInstructionsRu.map((item, i) => (
																	<li key={i}>{item}</li>
																))}
															</ul>
														</div>
													)}

													<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
														<button
															type="button"
															onClick={() => onAppointmentReschedule?.(apt.id)}
															className="pwa-action-btn-secondary"
															style={{ minHeight: "44px", flex: 1 }}
														>
															<Clock size={14} />
															<span>Перенести запись</span>
														</button>
													</div>
												</div>
											))
										) : (
											<div className="pwa-card" style={{ textAlign: "center", padding: "20px" }}>
												<p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
													Нет предстоящих визитов
												</p>
											</div>
										)
									)}

									{appointmentsSubTab === "history" && (
										profile.pastAppointments.map((apt) => (
											<div key={apt.id} className="pwa-card">
												<div className="pwa-card-header">
													<span style={{ fontWeight: 700 }}>{apt.dateIso} в {apt.timeRu}</span>
													<span style={{ fontSize: "11px", color: "var(--success, #10b981)", fontWeight: 800 }}>
														✓ Прием завершен
													</span>
												</div>
												<div>
													<h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>
														{apt.titleRu}
													</h4>
													<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
														Врач: {apt.doctorName}
													</span>
												</div>
												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: "8px" }}>
													<span>Стоимость услуг:</span>
													<strong style={{ fontFamily: "monospace" }}>
														{apt.priceRub.toLocaleString("ru-RU")} ₽
													</strong>
												</div>
											</div>
										))
									)}
								</div>
							)}

							{/* TAB: ПОСЛЕ ОПЕРАЦИИ / РЕАБИЛИТАЦИЯ (POST-OP) */}
							{activeTab === "postop" && (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									<div className="pwa-card" style={{ borderLeft: "4px solid var(--danger, #ef4444)" }}>
										<strong style={{ fontSize: "14px" }}>Памятка после приёма</strong>
										<p style={{ margin: "8px 0", fontSize: "12px", color: "var(--muted, #64748b)", lineHeight: "1.5" }}>
											Соблюдайте назначения лечащего врача. При возникновении острой боли или отёка свяжитесь с клиникой.
										</p>
										<a
											href={`tel:${profile.clinicPhone.replace(/\D/g, "")}`}
											className="pwa-action-btn-primary"
											style={{ fontSize: "12px", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
										>
											<Phone size={15} />
											<span>Позвонить в клинику</span>
										</a>
									</div>
								</div>
							)}

							{/* TAB 3: ПЛАН ЛЕЧЕНИЯ (TREATMENT PLAN) */}
							{activeTab === "plan" && (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									<InteractiveTreatmentTimelineWidget
										planProfile={profile.activeTreatmentPlan ?? undefined}
										onBookStage={onAppointmentBook}
										onPayStageSbp={(stageId) => {
											const st = profile.activeTreatmentPlan?.stages.find((s) => s.id === stageId);
											if (st) handlePayStageSbp(st);
										}}
										onSignStatutoryConsent={(stageId) => {
											onDocumentSigned?.(stageId);
										}}
									/>
								</div>
							)}

							{/* TAB 4: ФОТОПРОТОКОЛ «ДО / ПОСЛЕ» (BEFORE / AFTER PHOTOS) */}
							{activeTab === "photos" && (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									{/* Gallery selector pills */}
									{galleries.length > 1 && (
										<div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
											{galleries.map((gal) => (
												<button
													key={gal.id}
													type="button"
													onClick={() => setSelectedGalleryId(gal.id)}
													style={{
														padding: "6px 12px",
														minHeight: "40px",
														borderRadius: "10px",
														border: selectedGalleryId === gal.id ? "2px solid var(--brand-500, #0d9488)" : "1px solid var(--border, #cbd5e1)",
														background: selectedGalleryId === gal.id ? "rgba(13, 148, 136, 0.1)" : "var(--paper, #ffffff)",
														color: "var(--ink, #0f172a)",
														fontSize: "11px",
														fontWeight: 700,
														whiteSpace: "nowrap",
														cursor: "pointer",
													}}
												>
													{gal.titleRu.slice(0, 24)}...
												</button>
											))}
										</div>
									)}

									{currentGallery ? (
										<div className="pwa-card">
											<div>
												<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>
													{currentGallery.titleRu}
												</h4>
												<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", display: "block", marginTop: "2px" }}>
													{currentGallery.procedureNameRu}
												</span>
											</div>

											{/* Interactive Wiper Slider Canvas */}
											<div
												ref={sliderRef}
												className="pwa-slider-canvas-container"
												onPointerDown={handlePointerDown}
												onPointerMove={handlePointerMove}
												onPointerUp={handlePointerUp}
											>
												{/* Before Layer */}
												<img
													src={currentGallery.beforeSlot.imageUrl}
													alt="До"
													style={{
														position: "absolute",
														inset: 0,
														width: "100%",
														height: "100%",
														objectFit: "cover",
													}}
												/>

												{/* After Layer with Clip-path */}
												<img
													src={currentGallery.afterSlot.imageUrl}
													alt="После"
													style={{
														position: "absolute",
														inset: 0,
														width: "100%",
														height: "100%",
														objectFit: "cover",
														clipPath: calculateSplitClipPath(splitPercent, "vertical"),
													}}
												/>

												{/* Wiper handle line */}
												<div
													className="pwa-slider-handle-line"
													style={{ left: `${splitPercent}%` }}
												>
													<div className="pwa-slider-handle-circle">
														<MoveHorizontal size={18} />
													</div>
												</div>

												{/* Badges */}
												<div className="pwa-slider-pill before">
													ДО ({currentGallery.beforeSlot.vitaShade || "A3.5"})
												</div>
												<div className="pwa-slider-pill after">
													ПОСЛЕ ({currentGallery.afterSlot.vitaShade || "BL2"}) • {splitPercent}%
												</div>
											</div>

											{/* Range slider for accessibility */}
											<div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
												<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 700 }}>До</span>
												<input
													type="range"
													min="0"
													max="100"
													value={splitPercent}
													onChange={(e) => setSplitPercent(parseInt(e.target.value, 10))}
													style={{ flex: 1 }}
													aria-label="Сравнение До и После"
												/>
												<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 700 }}>После</span>
											</div>

											{currentGallery.doctorNotesRu && (
												<div style={{ background: "var(--paper-soft, #f8fafc)", padding: "8px 10px", borderRadius: "10px", fontSize: "11px", color: "var(--muted, #64748b)" }}>
													<strong style={{ color: "var(--ink, #0f172a)", display: "block" }}>Комментарий врача:</strong>
													{currentGallery.doctorNotesRu}
												</div>
											)}
										</div>
									) : (
										<div className="pwa-card" style={{ textAlign: "center", padding: "20px" }}>
											<p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
												Фотопротокол появится после первого визита в клинику.
											</p>
										</div>
									)}
								</div>
							)}

							{/* TAB 5: ОПЛАТА И ДОКУМЕНТЫ (PAYMENTS & DOCUMENTS) */}
							{activeTab === "payments" && (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									{/* Unpaid Invoices Section */}
									<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800 }}>
												Счета к оплате ({profile.invoices.length}):
											</h4>
											<span style={{ fontSize: "11px", fontWeight: 800, color: profile.totalDebtRub > 0 ? "var(--danger, #ef4444)" : "var(--success, #10b981)" }}>
												Долг: {profile.totalDebtRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>

										{profile.invoices.map((inv) => {
											const isPaid = inv.status === "paid";
											return (
												<div key={inv.id} className="pwa-card">
													<div className="pwa-card-header">
														<span style={{ fontFamily: "monospace", fontWeight: 800 }}>
															{inv.invoiceNumber}
														</span>
														<span style={{ fontSize: "11px", fontWeight: 800, color: isPaid ? "var(--success, #10b981)" : "var(--danger, #ef4444)" }}>
															{isPaid ? "✓ Оплачен" : "Ожидает оплаты"}
														</span>
													</div>

													<div>
														<h5 style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>
															{inv.titleRu}
														</h5>
														<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
															Дата: {inv.issueDateIso}
														</span>
													</div>

													<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: "6px" }}>
														<span style={{ fontSize: "12px" }}>Сумма к оплате:</span>
														<strong style={{ fontSize: "14px", fontFamily: "monospace", color: isPaid ? "var(--success, #10b981)" : "var(--danger, #ef4444)" }}>
															{inv.totalAmountRub.toLocaleString("ru-RU")} ₽
														</strong>
													</div>

													{!isPaid ? (
														<button
															type="button"
															onClick={() => handleOpenSbpPayment(inv)}
															className="pwa-action-btn-primary"
															style={{ minHeight: "44px", marginTop: "4px" }}
														>
															<QrCode size={16} />
															<span>Оплатить через СБП (0% комиссии)</span>
														</button>
													) : (
														inv.fiscalReceiptNumber && (
															<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
																Чек 54-ФЗ: {inv.fiscalReceiptNumber}
															</span>
														)
													)}
												</div>
											);
										})}
									</div>

									{/* Signable Documents (63-FZ PEP) */}
									<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
										<h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800 }}>
											Медицинские согласия и договоры (63-ФЗ):
										</h4>

										{profile.signableDocuments.map((doc) => {
											const isSigned = doc.status === "signed";
											return (
												<div key={doc.id} className="pwa-card">
													<div className="pwa-card-header">
														<span style={{ fontSize: "11px", fontWeight: 800, color: "var(--brand-500, #0d9488)" }}>
															{doc.documentNumber}
														</span>
														<span style={{ fontSize: "11px", fontWeight: 800, color: isSigned ? "var(--success, #10b981)" : "var(--warning, #f59e0b)" }}>
															{isSigned ? "✓ Подписано (ПЭП)" : "Требует подписи"}
														</span>
													</div>

													<div>
														<h5 style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>
															{doc.titleRu}
														</h5>
														<p style={{ margin: "3px 0 0 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>
															{doc.summaryTextRu}
														</p>
													</div>

													{isSigned ? (
														<div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "8px 10px", borderRadius: "10px", fontSize: "11px", color: "var(--success, #10b981)" }}>
															<span>✓ Подписано СМС-кодом {doc.signatureAudit?.smsOtpCode} ({doc.signatureAudit?.signedAtIso.slice(0, 10)})</span>
															<span style={{ display: "block", fontSize: "9px", fontFamily: "monospace", opacity: 0.8 }}>
																SHA-256: {doc.signatureAudit?.integritySha256.slice(0, 24)}...
															</span>
														</div>
													) : (
														<button
															type="button"
															onClick={() => handleStartDocumentSign(doc)}
															className="pwa-action-btn-primary"
															style={{ minHeight: "44px", marginTop: "4px" }}
														>
															<Lock size={15} />
															<span>Подписать по СМС (63-ФЗ)</span>
														</button>
													)}
												</div>
											);
										})}
									</div>

								</div>
							)}
						</main>

						{/* Bottom Navigation Bar */}
						<nav className="pwa-bottom-tabbar">
							<button
								type="button"
								className={`pwa-tab-button ${activeTab === "home" ? "active" : ""}`}
								onClick={() => setActiveTab("home")}
							>
								<Smile size={20} />
								<span>Главная</span>
							</button>

							<button
								type="button"
								className={`pwa-tab-button ${activeTab === "appointments" ? "active" : ""}`}
								onClick={() => setActiveTab("appointments")}
							>
								<Calendar size={20} />
								<span>Записи</span>
								{profile.upcomingAppointments.length > 0 && (
									<span className="pwa-tab-badge">{profile.upcomingAppointments.length}</span>
								)}
							</button>

							<button
								type="button"
								className={`pwa-tab-button ${activeTab === "plan" ? "active" : ""}`}
								onClick={() => setActiveTab("plan")}
							>
								<Activity size={20} />
								<span>План</span>
							</button>

							<button
								type="button"
								className={`pwa-tab-button ${activeTab === "photos" ? "active" : ""}`}
								onClick={() => setActiveTab("photos")}
							>
								<Camera size={20} />
								<span>До/После</span>
							</button>

							<button
								type="button"
								className={`pwa-tab-button ${activeTab === "payments" ? "active" : ""}`}
								onClick={() => setActiveTab("payments")}
							>
								<CreditCard size={20} />
								<span>Оплата</span>
								{profile.totalDebtRub > 0 && (
									<span className="pwa-tab-badge">!</span>
								)}
							</button>
						</nav>

						{/* Home Indicator */}
						<div style={{ height: "14px", display: "flex", alignItems: "center", background: "var(--paper, #ffffff)" }}>
							<div className="pwa-home-indicator-bar" />
						</div>

						{/* 3. SBP QR MODAL SHEET */}
						{activeSbpQr && (
							<div className="pwa-modal-backdrop" onClick={() => setActiveSbpQr(null)}>
								<div className="pwa-sheet-card" onClick={(e) => e.stopPropagation()}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<QrCode size={20} style={{ color: "var(--brand-500, #0d9488)" }} />
											<strong style={{ fontSize: "14px" }}>Оплата через СБП</strong>
										</div>
										<button
											type="button"
											onClick={() => setActiveSbpQr(null)}
											style={{ background: "none", border: "none", color: "var(--muted, #64748b)", cursor: "pointer" }}
										>
											<X size={20} />
										</button>
									</div>

									<div style={{ textAlign: "center" }}>
										<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>Сумма к оплате:</span>
										<div style={{ fontSize: "24px", fontWeight: 900, fontFamily: "monospace", color: "var(--brand-500, #0d9488)" }}>
											{activeSbpQr.sumFormattedRu}
										</div>
										<p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>
											{activeSbpQr.paymentPurpose}
										</p>
									</div>

									{/* QR Code Container */}
									<div className="pwa-qr-box">
										<div
											style={{
												width: "160px",
												height: "160px",
												background: "var(--ink, #0f172a)",
												borderRadius: "12px",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "var(--paper, #ffffff)",
											}}
										>
											<QrCode size={120} />
										</div>
										<span style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>
											Наведите камеру смартфона для оплаты
										</span>
									</div>

									{/* Bank Direct Deep Links */}
									<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
										<span style={{ fontSize: "11px", fontWeight: 700 }}>
											Или выберите мобильный банк:
										</span>
										<div className="pwa-bank-grid">
											{activeSbpQr.deepLinks.slice(0, 4).map((b) => (
												<a
													key={b.bankId}
													href={b.appUrl}
													target="_blank"
													rel="noreferrer"
													className="pwa-bank-btn"
												>
													<div style={{ width: "10px", height: "10px", borderRadius: "50%", background: b.brandColor }} />
													<span>{b.bankNameRu}</span>
												</a>
											))}
										</div>
									</div>

									{/* Simulate instant confirmation */}
									<button
										type="button"
										onClick={handleSimulateSbpSuccess}
										disabled={isProcessingPayment}
										className="pwa-action-btn-primary"
										style={{ minHeight: "46px" }}
									>
										{isProcessingPayment ? "Проверка платежа в банке..." : "Подтвердить тестовую оплату (Эмуляция)"}
									</button>
								</div>
							</div>
						)}

						{/* 4. SMS-OTP 63-FZ PEP SIGNING SHEET */}
						{signingDoc && (
							<div className="pwa-modal-backdrop" onClick={() => setSigningDoc(null)}>
								<div className="pwa-sheet-card" onClick={(e) => e.stopPropagation()}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<Lock size={18} style={{ color: "var(--brand-500, #0d9488)" }} />
											<strong style={{ fontSize: "14px" }}>Электронная подпись (63-ФЗ ПЭП)</strong>
										</div>
										<button
											type="button"
											onClick={() => setSigningDoc(null)}
											style={{ background: "none", border: "none", color: "var(--muted, #64748b)", cursor: "pointer" }}
										>
											<X size={20} />
										</button>
									</div>

									<div>
										<h5 style={{ margin: 0, fontSize: "13px", fontWeight: 800 }}>
											{signingDoc.titleRu}
										</h5>
										<p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--muted, #64748b)", lineHeight: "1.4" }}>
											Для подписания документа введите 6-значный код, отправленный на номер <strong>{profile.phone}</strong>:
										</p>
									</div>

									{/* OTP Input with auto-fill test hint */}
									<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
										<input
											type="text"
											maxLength={6}
											inputMode="numeric"
											value={smsOtpInput}
											onChange={(e) => setSmsOtpInput(e.target.value.replace(/\D/g, ""))}
											placeholder="• • • • • •"
											className="pwa-otp-input"
											autoFocus
										/>
										<div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
											<button
												type="button"
												onClick={() => setSmsOtpInput(activeOtpCode)}
												style={{ background: "none", border: "none", color: "var(--brand-500, #0d9488)", cursor: "pointer", fontWeight: 700 }}
											>
												Вставить код ({activeOtpCode})
											</button>
											<span style={{ color: "var(--muted, #64748b)" }}>
												{otpResendCountdown > 0 ? `Повтор через ${otpResendCountdown} сек.` : (
													<button
														type="button"
														onClick={handleResendOtp}
														style={{ background: "none", border: "none", color: "var(--brand-500, #0d9488)", cursor: "pointer", fontWeight: 700 }}
													>
														Отправить повторно
													</button>
												)}
											</span>
										</div>
									</div>

									{signingError && (
										<div style={{ color: "var(--danger, #ef4444)", fontSize: "11px", fontWeight: 700 }}>
											{signingError}
										</div>
									)}

									<button
										type="button"
										onClick={handleConfirmDocumentSign}
										disabled={smsOtpInput.length !== 6}
										className="pwa-action-btn-primary"
										style={{ minHeight: "46px" }}
									>
										<Check size={16} />
										<span>Подтвердить подпись документа</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 5. Magic Link & QR Sharing Modal */}
				{showShareModal && (
					<div className="pwa-simulator-overlay" onClick={() => setShowShareModal(false)}>
						<div
							className="pwa-card"
							style={{ maxWidth: "420px", width: "100%", padding: "20px" }}
							onClick={(e) => e.stopPropagation()}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<strong style={{ fontSize: "15px" }}>Ссылка на кабинет пациента</strong>
								<button
									type="button"
									onClick={() => setShowShareModal(false)}
									style={{ background: "none", border: "none", cursor: "pointer" }}
								>
									<X size={18} />
								</button>
							</div>

							<p style={{ margin: "4px 0 10px 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Отправьте пациенту защищенную ссылку или покажите QR-код для открытия веб-кабинета на телефоне:
							</p>

							<div className="pwa-qr-box">
								<QrCode size={130} />
								<span style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>
									Действует 72 часа (HMAC-SHA256)
								</span>
							</div>

							<div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
								<input
									type="text"
									readOnly
									value={magicLinkUrl}
									style={{
										flex: 1,
										padding: "8px 10px",
										borderRadius: "8px",
										border: "1px solid var(--border, #cbd5e1)",
										fontSize: "11px",
										fontFamily: "monospace",
									}}
								/>
								<button
									type="button"
									onClick={handleCopyMagicLink}
									className="pwa-action-btn-primary"
									style={{ minWidth: "100px", minHeight: "40px" }}
								>
									{magicLinkCopied ? <Check size={14} /> : <Copy size={14} />}
									<span>{magicLinkCopied ? "Скопировано!" : "Копировать"}</span>
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PatientWebappPortalModal;
