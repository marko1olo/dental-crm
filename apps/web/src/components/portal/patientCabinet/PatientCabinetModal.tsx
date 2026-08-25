/**
 * Patient Personal Portal & SMS/OTP Cabinet Modal HUD
 * (DOMAIN: PORTAL PATIENT CABINET)
 *
 * Интерактивный Touch-First портал пациента с полной поддержкой тем (Dark/Light):
 * - Обзор: ключевые метрики, следующий визит, бонусы лояльности, срочные оповещения.
 * - Счета и оплата: 1-клик оплата через СБП по QR-коду НСПК, интеграция банков (Сбер, Т-Банк, Альфа).
 * - Планы лечения: прогресс-бары этапов, остаток к оплате, список процедур.
 * - Документы и ИДС: подписание 323-ФЗ согласий по SMS/OTP (63-ФЗ ПЭП), гарантийные паспорта с таймером чекапа.
 * - Запись на прием: расписание визитов, управление записью, форма онлайн-заявки.
 */

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Award,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	Download,
	ExternalLink,
	Eye,
	FileCheck,
	FileText,
	Heart,
	Info,
	KeyRound,
	Lock,
	MapPin,
	Percent,
	Phone,
	Plus,
	QrCode,
	RefreshCw,
	Send,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Star,
	Trash2,
	User,
	X,
} from "lucide-react";
import {
	calculateCabinetSummary,
	calculateCheckupDaysRemaining,
	calculateDentalHealthIndex,
	calculateWarrantyValidity,
	downloadDetailedReceipt,
	downloadPatientTaxCertificate1151156,
	filterAppointments,
	filterInvoices,
	formatKopecksToRub,
	formatRubles,
	formatRussianDateIso,
	generatePatientTaxCertificate1151156,
	generateReceptionCheckinQrPayload,
	generateSbpQrPayload,
	generateSmsOtp,
	openPrintWindow,
	processSbpPayment,
	signConsentWithPep,
	verifySmsOtp,
	type DentalHealthIndexResult,
	type PatientAppointment,
	type PatientCabinetSummary,
	type PatientInvoiceItem,
	type PatientPersonalCabinetData,
	type PatientStatutoryConsent,
	type PatientTreatmentPlan,
	type PatientWarrantyCard,
	type SbpQrPayload,
	type TreatmentPlanStage,
	type TreatmentPlanTier,
} from "./patientCabinetEngine";
import {
	generateCareMemo,
	buildWhatsAppLink,
	groupServicesIntoFriendlyBlocks,
	DEFAULT_CARIES_RECOMMENDATIONS,
	type PatientCareMemo,
	type CareRecommendationItem,
	type FriendlyBillingBreakdown,
} from "./patientCareInstructionsEngine";
import { SignaturePadCanvas, MobileSelfCheckinModal } from "../selfCheckin";
import { PatientFriendlyOdontogram } from "../../patient-portal/PatientFriendlyOdontogram";
import { TreatmentPlanStageCard } from "../../patient-portal/TreatmentPlanStageCard";
import { PatientPlanView } from "../../patient-portal/PatientPlanView";
import { DEMO_PATIENT_CABINET } from "./patientCabinetPresets";
import "./patientCabinet.css";

export interface PatientCabinetModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly initialData?: PatientPersonalCabinetData | undefined;
	readonly onInvoicePaid?: ((invoice: PatientInvoiceItem) => void) | undefined;
	readonly onConsentSigned?: ((consent: PatientStatutoryConsent) => void) | undefined;
	readonly onAppointmentBooked?: ((appointmentReq: { specialty: string; preferredDate: string; note: string }) => void) | undefined;
}

export const PatientCabinetModal: React.FC<PatientCabinetModalProps> = ({
	isOpen = true,
	onClose,
	initialData,
	onInvoicePaid,
	onConsentSigned,
	onAppointmentBooked,
}) => {
	// Основные данные кабинета
	const [data, setData] = useState<PatientPersonalCabinetData>(initialData || DEMO_PATIENT_CABINET);

	// Активный таб
	const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "plans" | "documents" | "appointments" | "care">("overview");

	// Режим отображения счетов: понятный (без латыни) или стандартный
	const [billingViewMode, setBillingViewMode] = useState<"friendly" | "standard">("friendly");

	// Состояние модального окна QR памятки для телефона
	const [isCareMemoQrOpen, setIsCareMemoQrOpen] = useState(false);

	// Фильтры
	const [invoiceFilter, setInvoiceFilter] = useState<"all" | "unpaid" | "paid">("all");
	const [appointmentFilter, setAppointmentFilter] = useState<"upcoming" | "past" | "all">("upcoming");

	// Состояние модального окна СБП QR оплаты
	const [activeSbpInvoice, setActiveSbpInvoice] = useState<PatientInvoiceItem | null>(null);
	const [activeSbpPayload, setActiveSbpPayload] = useState<SbpQrPayload | null>(null);

	// Состояние SMS/OTP подписания согласия
	const [signingConsent, setSigningConsent] = useState<PatientStatutoryConsent | null>(null);
	const [consentSignMode, setConsentSignMode] = useState<"sms_otp" | "touch_screen">("sms_otp");
	const [touchSvgSignature, setTouchSvgSignature] = useState<string>("");
	const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
	const [otpExpectedCode, setOtpExpectedCode] = useState<string>("748291");
	const [otpSentTimestamp, setOtpSentTimestamp] = useState<number>(0);
	const [otpCountdown, setOtpCountdown] = useState<number>(0);
	const [otpError, setOtpError] = useState<string | null>(null);

	// Состояние мобильного самочекина
	const [isSelfCheckinOpen, setIsSelfCheckinOpen] = useState(false);

	// Состояние QR-кода быстрой регистрации на ресепшене
	const [isReceptionQrOpen, setIsReceptionQrOpen] = useState(false);

	// Выбранный уровень 3-Tier плана лечения
	const [selectedTierTab, setSelectedTierTab] = useState<"basic" | "standard" | "premium">(
		initialData?.threeTierModel?.selectedTier || "standard",
	);

	// Состояние формы онлайн-записи
	const [bookingSpecialty, setBookingSpecialty] = useState<string>("Терапевт");
	const [bookingDate, setBookingDate] = useState<string>("2026-09-01");
	const [bookingNote, setBookingNote] = useState<string>("");

	// Состояние переноса записи
	const [reschedulingApt, setReschedulingApt] = useState<PatientAppointment | null>(null);
	const [rescheduleDate, setRescheduleDate] = useState<string>("2026-09-02");
	const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState<string>("10:00 – 11:00");
	const [rescheduleReason, setRescheduleReason] = useState<string>("");

	// Баннер уведомления
	const [toastNotice, setToastNotice] = useState<string | null>(null);

	// Синхронизация данных при смене initialData
	useEffect(() => {
		if (initialData) {
			setData(initialData);
		}
	}, [initialData]);

	// Таймер обратного отсчета SMS OTP
	useEffect(() => {
		if (otpCountdown <= 0) return;
		const timer = setInterval(() => {
			setOtpCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [otpCountdown]);

	// Esc для закрытия
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (activeSbpInvoice) {
					setActiveSbpInvoice(null);
				} else if (signingConsent) {
					setSigningConsent(null);
				} else if (onClose) {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, activeSbpInvoice, signingConsent]);

	// Расчет сводной статистики
	const summary: PatientCabinetSummary = useMemo(() => {
		return calculateCabinetSummary(data);
	}, [data]);

	// Индекс здоровья зубов
	const healthIndex: DentalHealthIndexResult = useMemo(() => {
		return calculateDentalHealthIndex();
	}, []);

	// Расчет суммы к возврату по налоговому вычету 13% (КНД 1151156)
	const estimatedTaxRefundRub = useMemo(() => {
		const paidSum = data.invoices
			.filter((i) => i.status === "paid")
			.reduce((sum, i) => sum + i.paidAmountRub, 0);
		return Math.round(paidSum * 0.13);
	}, [data.invoices]);

	// Отфильтрованные списки
	const filteredInvoices = useMemo(() => {
		return filterInvoices(data.invoices, invoiceFilter);
	}, [data.invoices, invoiceFilter]);

	const filteredAppointments = useMemo(() => {
		return filterAppointments(data.appointments, appointmentFilter);
	}, [data.appointments, appointmentFilter]);

	// Показать всплывающее уведомление
	const showToast = (msg: string) => {
		setToastNotice(msg);
		setTimeout(() => setToastNotice(null), 4000);
	};

	// Персональная электронная памятка после лечения
	const careMemo: PatientCareMemo = useMemo(() => {
		return generateCareMemo({
			patientName: data.fullName,
			patientPhone: data.phone,
			toothFdi: "16",
			procedureName: "Лечение кариеса и эстетическая нанокомпозитная реставрация",
			doctorName: data.curatingDoctor,
			clinicName: "Стоматологическая клиника ДЕНТЕ",
			clinicPhone: "+7 (495) 789-01-23",
			clinicEmergencyPhone: "+7 (999) 123-45-67",
		});
	}, [data.fullName, data.phone, data.curatingDoctor]);

	// 1-Клик отправка персональных рекомендаций врача в WhatsApp
	const handleSendCareMemoWhatsApp = () => {
		window.open(careMemo.whatsAppDeepLink, "_blank");
		showToast(`Рекомендации после лечения зуба №${careMemo.toothFdi} отправлены в WhatsApp!`);
	};

	// 1-Клик вызов СБП QR оплаты
	const handleOpenSbpModal = (inv: PatientInvoiceItem) => {
		const payload = generateSbpQrPayload(inv);
		setActiveSbpInvoice(inv);
		setActiveSbpPayload(payload);
	};

	// Симуляция успешной оплаты через СБП
	const handleSimulateSbpSuccess = () => {
		if (!activeSbpInvoice) return;
		const paidInv = processSbpPayment(activeSbpInvoice);

		setData((prev) => ({
			...prev,
			invoices: prev.invoices.map((inv) => (inv.id === paidInv.id ? paidInv : inv)),
		}));

		if (onInvoicePaid) {
			onInvoicePaid(paidInv);
		}

		setActiveSbpInvoice(null);
		setActiveSbpPayload(null);
		showToast(`Счет № ${paidInv.invoiceNumber} на сумму ${formatRubles(paidInv.totalAmountRub)} успешно оплачен через СБП!`);
	};

	// Открытие модального окна SMS/OTP подписания
	const handleStartConsentSigning = (consent: PatientStatutoryConsent) => {
		const otp = generateSmsOtp(data.phone, "842109");
		setSigningConsent(consent);
		setOtpDigits(["", "", "", "", "", ""]);
		setOtpExpectedCode(otp.code);
		setOtpSentTimestamp(otp.sentTimestamp);
		setOtpCountdown(60);
		setOtpError(null);
	};

	// Повторная отправка SMS кода
	const handleResendOtp = () => {
		const otp = generateSmsOtp(data.phone);
		setOtpDigits(["", "", "", "", "", ""]);
		setOtpExpectedCode(otp.code);
		setOtpSentTimestamp(otp.sentTimestamp);
		setOtpCountdown(60);
		setOtpError(null);
		showToast(`Новый SMS-код отправлен на номер ${data.phone}`);
	};

	// Ввод цифры SMS-кода
	const handleOtpDigitChange = (index: number, val: string) => {
		const digit = val.replace(/\D/g, "").slice(-1);
		const newDigits = [...otpDigits];
		newDigits[index] = digit;
		setOtpDigits(newDigits);
		setOtpError(null);

		// Автопереход к следующей ячейке
		if (digit && index < 5) {
			const next = document.getElementById(`pc-otp-${index + 1}`);
			next?.focus();
		}
	};

	// Подтверждение SMS-кода и подписание ИДС по 63-ФЗ
	const handleConfirmConsentOtp = () => {
		if (!signingConsent) return;
		const codeStr = otpDigits.join("");
		const verifyResult = verifySmsOtp(codeStr, otpExpectedCode, otpSentTimestamp);

		if (!verifyResult.success) {
			setOtpError(verifyResult.error || "Неверный код подтверждения");
			return;
		}

		const signed = signConsentWithPep(signingConsent, data.phone, codeStr, data.fullName);

		setData((prev) => ({
			...prev,
			consents: prev.consents.map((c) => (c.id === signed.id ? signed : c)),
		}));

		if (onConsentSigned) {
			onConsentSigned(signed);
		}

		setSigningConsent(null);
		showToast(`Согласие ${signed.code} успешно подписано простой электронной подписью (63-ФЗ ПЭП)!`);
	};

	// Подписание согласия пальцем на сенсорном экране (Векторный SVG)
	const handleSignConsentWithTouch = () => {
		if (!signingConsent || !touchSvgSignature) return;

		const signedConsent: PatientStatutoryConsent = {
			...signingConsent,
			status: "signed",
			signedAtIso: new Date().toISOString(),
			signatureAudit: {
				verificationMethod: "touch_screen",
				phone: data.phone,
				integrityHash: "sha256-" + Math.random().toString(36).substring(2) + Date.now().toString(36),
				timestamp: Date.now(),
				signedAtIso: new Date().toISOString(),
				legalBasis: "63-ФЗ ПЭП",
				signatureSvg: touchSvgSignature,
				ipAddress: "127.0.0.1",
			},
		};

		setData((prev) => ({
			...prev,
			consents: prev.consents.map((c) =>
				c.id === signedConsent.id ? signedConsent : c,
			),
		}));

		if (onConsentSigned) {
			onConsentSigned(signedConsent);
		}

		setSigningConsent(null);
		setTouchSvgSignature("");
		showToast(`Согласие ${signedConsent.code} успешно подписано на экране!`);
	};

	// Оплата конкретного этапа плана лечения через СБП QR
	const handlePayStageWithSbp = (stage: TreatmentPlanStage) => {
		const virtualInvoice: PatientInvoiceItem = {
			id: `inv-stage-${stage.id}`,
			invoiceNumber: `СЧ-ЭТАП-${stage.orderIndex}`,
			issueDateIso: new Date().toISOString().slice(0, 10),
			dueDateIso: new Date().toISOString().slice(0, 10),
			titleRu: `Оплата этапа: ${stage.titleRu}`,
			totalAmountRub: stage.costRub,
			paidAmountRub: 0,
			remainingAmountRub: stage.costRub,
			status: "unpaid",
			items: stage.procedures.map((proc, idx) => ({
				code: `A16.00.${idx + 1}`,
				titleRu: proc,
				quantity: 1,
				priceRub: Math.round(stage.costRub / Math.max(1, stage.procedures.length)),
				totalRub: Math.round(stage.costRub / Math.max(1, stage.procedures.length)),
				toothFdi: stage.teethFdi.join(", "),
			})),
		};
		handleOpenSbpModal(virtualInvoice);
	};

	// Отправка заявки на запись
	const handleSendBookingRequest = (e: React.FormEvent) => {
		e.preventDefault();
		if (onAppointmentBooked) {
			onAppointmentBooked({
				specialty: bookingSpecialty,
				preferredDate: bookingDate,
				note: bookingNote,
			});
		}

		showToast(`Заявка на прием к специалисту (${bookingSpecialty}) на ${bookingDate} успешно отправлена администратору!`);
		setBookingNote("");
	};

	// Отправка заявки на перенос визита
	const handleSendRescheduleRequest = (e: React.FormEvent) => {
		e.preventDefault();
		if (!reschedulingApt) return;
		showToast(`Заявка на перенос визита к врачу (${reschedulingApt.doctorName}) на ${rescheduleDate} в ${rescheduleTimeSlot} успешно отправлена администратору!`);
		setReschedulingApt(null);
		setRescheduleReason("");
	};

	if (!isOpen) return null;

	return (
		<div className="patient-cabinet-backdrop" role="dialog" aria-modal="true" aria-labelledby="patient-cabinet-title">
			<div className="patient-cabinet-modal" data-testid="patient-personal-cabinet-modal">
				{/* Header */}
				<header className="pc-header">
					<div className="pc-header-user">
						<div className="pc-avatar" aria-hidden="true">
							{data.fullName.charAt(0)}
						</div>
						<div>
							<h2 id="patient-cabinet-title" className="pc-header-title">
								<span>Личный кабинет: {data.fullName}</span>
							</h2>
							<p className="pc-header-subtitle">
								Медкарта № {data.cardNumber} &bull; {data.phone} &bull; Врач: {data.curatingDoctor}
							</p>
						</div>
					</div>

					<div className="pc-header-badges">
						<div className="pc-badge-bonus" title="Баланс бонусных баллов DENTE">
							<Sparkles size={14} />
							<span>{data.loyaltyBonusBalance.toLocaleString("ru-RU")} баллов</span>
						</div>

						<div className="pc-badge-tier" title="Уровень в программе лояльности">
							<Award size={14} />
							<span>{data.loyaltyTierRu}</span>
						</div>

						{onClose && (
							<button
								type="button"
								className="pc-close-btn"
								onClick={onClose}
								aria-label="Закрыть личный кабинет"
							>
								<X size={20} />
							</button>
						)}
					</div>
				</header>

				{/* Toast Banner */}
				{toastNotice && (
					<div
						style={{
							background: "var(--pc-success-light)",
							color: "var(--pc-success)",
							padding: "10px 20px",
							fontSize: "0.875rem",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							gap: "10px",
							borderBottom: "1px solid var(--pc-success)",
						}}
					>
						<CheckCircle2 size={18} />
						<span>{toastNotice}</span>
					</div>
				)}

				{/* Navigation Tabs */}
				<nav className="pc-nav-bar" aria-label="Разделы личного кабинета">
					<button
						type="button"
						className={`pc-tab-btn ${activeTab === "overview" ? "active" : ""}`}
						onClick={() => setActiveTab("overview")}
					>
						<Sparkles size={16} />
						<span>Обзор</span>
					</button>

					<button
						type="button"
						className={`pc-tab-btn ${activeTab === "invoices" ? "active" : ""}`}
						onClick={() => setActiveTab("invoices")}
					>
						<CreditCard size={16} />
						<span>Счета и оплата</span>
						{summary.unpaidInvoicesCount > 0 && (
							<span className="pc-tab-counter">{summary.unpaidInvoicesCount}</span>
						)}
					</button>

					<button
						type="button"
						className={`pc-tab-btn ${activeTab === "plans" ? "active" : ""}`}
						onClick={() => setActiveTab("plans")}
					>
						<Percent size={16} />
						<span>Планы лечения</span>
					</button>

					<button
						type="button"
						className={`pc-tab-btn ${activeTab === "documents" ? "active" : ""}`}
						onClick={() => setActiveTab("documents")}
					>
						<FileCheck size={16} />
						<span>Документы и ИДС</span>
						{summary.pendingConsentsCount > 0 && (
							<span className="pc-tab-counter">{summary.pendingConsentsCount}</span>
						)}
					</button>

					<button
						type="button"
						className={`pc-tab-btn ${activeTab === "care" ? "active" : ""}`}
						onClick={() => setActiveTab("care")}
						data-testid="tab-care-instructions"
					>
						<Heart size={16} />
						<span>Памятка после приёма</span>
					</button>

					<button
						type="button"
						className={`pc-tab-btn ${activeTab === "appointments" ? "active" : ""}`}
						onClick={() => setActiveTab("appointments")}
					>
						<Calendar size={16} />
						<span>Запись на прием</span>
					</button>
				</nav>

				{/* Modal Body */}
				<div className="pc-body">
					{/* TAB 1: ОБЗОР (OVERVIEW) */}
					{activeTab === "overview" && (
						<>
							{/* Post-Visit Care Memo & WhatsApp 1-Click Banner */}
							<div className="pc-care-memo-card" data-testid="overview-care-memo-banner">
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div
											style={{
												width: "44px",
												height: "44px",
												borderRadius: "12px",
												background: "var(--pc-primary)",
												color: "#ffffff",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
												boxShadow: "0 4px 12px rgba(13, 148, 136, 0.35)",
											}}
										>
											<Heart size={24} />
										</div>
										<div>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
												<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
													Памятка после лечения зуба №{careMemo.toothFdi}
												</h3>
												<span className="pc-status-badge paid" style={{ fontSize: "0.75rem" }}>
													Свежие рекомендации
												</span>
											</div>
											<p style={{ margin: "2px 0 0 0", fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
												Врач: <strong>{careMemo.doctorName}</strong> &bull; {careMemo.procedureName}
											</p>
										</div>
									</div>

									<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
										<button
											type="button"
											className="pc-whatsapp-btn"
											onClick={handleSendCareMemoWhatsApp}
											data-testid="btn-overview-send-care-whatsapp"
										>
											<Send size={16} />
											<span>В WhatsApp (1 клик)</span>
										</button>
										<button
											type="button"
											className="pc-btn-secondary"
											style={{ minHeight: "48px", padding: "10px 16px", fontWeight: 700 }}
											onClick={() => setIsCareMemoQrOpen(true)}
											data-testid="btn-overview-show-care-qr"
										>
											<QrCode size={16} />
											<span>QR для телефона</span>
										</button>
									</div>
								</div>

								{/* Recommendation Callout Cards with Large Icons */}
								<div className="pc-care-rec-grid">
									{careMemo.recommendations.map((rec) => (
										<div
											key={rec.id}
											className={`pc-care-rec-item ${rec.isUrgent ? "urgent" : ""}`}
											data-testid={`overview-care-rec-${rec.id}`}
										>
											<div className="pc-care-rec-icon" aria-hidden="true">
												{rec.icon}
											</div>
											<div className="pc-care-rec-content">
												<div className="pc-care-rec-title">
													<span>{rec.title}</span>
													{rec.badgeText && (
														<span
															style={{
																fontSize: "0.6875rem",
																padding: "2px 6px",
																borderRadius: "4px",
																background: rec.isUrgent
																	? "var(--pc-danger)"
																	: "var(--pc-primary-light)",
																color: rec.isUrgent
																	? "#ffffff"
																	: "var(--pc-primary)",
																fontWeight: 700,
															}}
														>
															{rec.badgeText}
														</span>
													)}
												</div>
												<p className="pc-care-rec-desc">{rec.description}</p>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Reception Quick Check-in QR Banner */}
							<div
								className="pc-card pc-reception-qr-card"
								data-testid="reception-qr-banner"
								style={{
									border: "2px solid var(--pc-primary)",
									background: "linear-gradient(135deg, var(--pc-surface) 0%, var(--pc-primary-light, rgba(13, 148, 136, 0.1)) 100%)",
									borderRadius: "var(--pc-radius-md)",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									gap: "12px",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
										<div
											style={{
												width: "44px",
												height: "44px",
												borderRadius: "12px",
												background: "var(--pc-primary)",
												color: "#ffffff",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
												boxShadow: "0 4px 12px rgba(13, 148, 136, 0.35)",
											}}
										>
											<QrCode size={24} />
										</div>
										<div>
											<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
												QR-код для ресепшена
											</h3>
											<p style={{ margin: "2px 0 0 0", fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
												Покажите администратору при входе для быстрой отметки о прибытии
											</p>
										</div>
									</div>

									<button
										type="button"
										className="pc-btn-primary"
										style={{
											minHeight: "48px",
											padding: "12px 20px",
											fontSize: "0.9375rem",
											fontWeight: 800,
											display: "inline-flex",
											alignItems: "center",
											gap: "8px",
											touchAction: "manipulation",
										}}
										onClick={() => setIsReceptionQrOpen(true)}
										data-testid="btn-show-reception-qr"
									>
										<Sparkles size={18} />
										<span>Показать администратору</span>
									</button>
								</div>

								{summary.nextAppointment && (
									<div
										style={{
											backgroundColor: "var(--pc-bg)",
											border: "1px solid var(--pc-border)",
											borderRadius: "var(--pc-radius-sm)",
											padding: "10px 14px",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											flexWrap: "wrap",
											gap: "8px",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
											<div className="pc-next-visit-time">
												{summary.nextAppointment.timeRu}
											</div>
											<div style={{ fontSize: "0.875rem", color: "var(--pc-text-main)" }}>
												<div><strong>{summary.nextAppointment.dateIso}</strong> &bull; {summary.nextAppointment.titleRu}</div>
												<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
													Врач: {summary.nextAppointment.doctorName}
												</div>
											</div>
										</div>

										<div className="pc-next-visit-room">
											{summary.nextAppointment.roomNumber}
										</div>
									</div>
								)}
							</div>

							{/* Urgent Alerts: Unpaid Invoices or Pending Consents */}
							{summary.unpaidInvoicesCount > 0 && (
								<div className="pc-alert-banner warning">
									<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
										<AlertCircle size={22} style={{ color: "var(--pc-warning)", flexShrink: 0 }} />
										<div>
											<strong>У вас есть неоплаченный счет на сумму {formatRubles(summary.totalUnpaidAmountRub)}</strong>
											<p style={{ fontSize: "0.8125rem", margin: "2px 0 0 0", color: "var(--pc-text-muted)" }}>
												Вы можете моментально оплатить счет без комиссии через Систему Быстрых Платежей (СБП).
											</p>
										</div>
									</div>

									<button
										type="button"
										className="pc-btn-primary"
										onClick={() => {
											const firstUnpaid = data.invoices.find((i) => i.status === "unpaid" || i.status === "partially_paid");
											if (firstUnpaid) handleOpenSbpModal(firstUnpaid);
										}}
									>
										<QrCode size={16} />
										<span>Оплатить через СБП</span>
									</button>
								</div>
							)}

							{summary.pendingConsentsCount > 0 && (
								<div className="pc-alert-banner danger">
									<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
										<ShieldAlert size={22} style={{ color: "var(--pc-danger)", flexShrink: 0 }} />
										<div>
											<strong>Требуется подписать {summary.pendingConsentsCount} обязательное согласие (ИДС 323-ФЗ)</strong>
											<p style={{ fontSize: "0.8125rem", margin: "2px 0 0 0", color: "var(--pc-text-muted)" }}>
												Подтвердите согласие на медицинское вмешательство по SMS (63-ФЗ ПЭП) до начала приема.
											</p>
										</div>
									</div>

									<button
										type="button"
										className="pc-btn-primary"
										style={{ background: "var(--pc-danger)" }}
										onClick={() => setActiveTab("documents")}
									>
										<Smartphone size={16} />
										<span>Подписать по SMS</span>
									</button>
								</div>
							)}

							{/* Somatic Health & Mobile Self-Checkin Banner */}
							<div
								className="pc-card"
								style={{
									borderColor:
										data.somaticRiskLevel === "high"
											? "var(--pc-danger)"
											: data.somaticRiskLevel === "moderate"
												? "var(--pc-warning)"
												: "var(--pc-border)",
								}}
							>
								<div className="pc-card-header">
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<Heart
											size={18}
											style={{
												color:
													data.somaticRiskLevel === "high"
														? "var(--pc-danger)"
														: data.somaticRiskLevel === "moderate"
															? "var(--pc-warning)"
															: "var(--pc-primary)",
											}}
										/>
										<h3 className="pc-card-title">
											<span>Анкета соматического здоровья и факторов риска</span>
										</h3>
									</div>
									<button
										type="button"
										className="pc-btn-primary"
										style={{ minHeight: "36px", padding: "6px 14px", fontSize: "0.8125rem" }}
										onClick={() => setIsSelfCheckinOpen(true)}
										data-testid="open-self-checkin-btn"
									>
										<Smartphone size={14} />
										<span>Мобильный самочекин</span>
									</button>
								</div>

								{data.somaticAlerts && data.somaticAlerts.length > 0 ? (
									<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
										{data.somaticAlerts.map((alert) => (
											<div
												key={alert.id}
												style={{
													background:
														alert.severity === "danger"
															? "var(--pc-danger-light)"
															: "var(--pc-warning-light)",
													border: `1px solid ${
														alert.severity === "danger"
															? "var(--pc-danger)"
															: "var(--pc-warning)"
													}`,
													borderRadius: "var(--pc-radius-sm)",
													padding: "8px 12px",
													fontSize: "0.8125rem",
												}}
											>
												<strong
													style={{
														color:
															alert.severity === "danger"
																? "var(--pc-danger)"
																: "var(--pc-warning)",
													}}
												>
													{alert.severity === "danger" ? "🚨 " : "⚠️ "}
													{alert.title}
												</strong>
												<p style={{ margin: "2px 0 0 0", color: "var(--pc-text-main)" }}>
													{alert.message}
												</p>
												<div style={{ marginTop: "4px", fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
													<strong>Рекомендация врача:</strong> {alert.recommendedAction}
												</div>
											</div>
										))}
									</div>
								) : (
									<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
										Анкета здоровья заполнена. Выраженных противопоказаний к анестетикам и амбулаторной хирургии не выявлено.
									</p>
								)}
							</div>

							{/* Interactive Dental Health & Sanitation Index Card */}
							<div
								className="pc-card dental-health-index-card"
								data-testid="pc-overview-health-index"
								style={{
									borderColor: "var(--pc-primary)",
									backgroundColor: "var(--pc-surface)",
									borderRadius: "var(--pc-radius-md)",
									padding: "14px 16px",
									display: "flex",
									flexDirection: "column",
									gap: "10px",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<ShieldCheck size={20} style={{ color: "var(--pc-primary)" }} />
										<div>
											<strong style={{ fontSize: "0.9375rem" }}>Интерактивный индекс здоровья зубов</strong>
											<div style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
												{healthIndex.statusLabelRu} &bull; Клиническая формула FDI (32 зуба)
											</div>
										</div>
									</div>

									<span
										className="pc-status-badge paid"
										style={{ fontWeight: 800, fontSize: "0.8125rem", padding: "4px 10px" }}
									>
										Санация: {healthIndex.sanitationPercent}%
									</span>
								</div>

								<div
									style={{
										backgroundColor: "var(--pc-bg)",
										border: "1px solid var(--pc-border)",
										borderRadius: "var(--pc-radius-sm)",
										padding: "8px 12px",
										fontSize: "0.8125rem",
										fontWeight: 700,
										color: "var(--pc-text-main)",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										flexWrap: "wrap",
										gap: "6px",
									}}
								>
									<span>{healthIndex.formattedIndexRu}</span>
									<button
										type="button"
										className="pc-btn-secondary"
										style={{ padding: "4px 8px", fontSize: "0.75rem" }}
										onClick={() => setActiveTab("plans")}
									>
										Показать формулу
									</button>
								</div>

								<div className="pc-progress-bar-bg" style={{ height: "8px", borderRadius: "4px" }}>
									<div
										className="pc-progress-bar-fill"
										style={{
											width: `${healthIndex.sanitationPercent}%`,
											backgroundColor: healthIndex.sanitationPercent >= 90 ? "var(--pc-success)" : "var(--pc-primary)",
										}}
									/>
								</div>
							</div>

							{/* Summary Metrics Grid */}
							<div className="pc-summary-grid">
								<div className="pc-metric-card">
									<div className="pc-metric-icon" style={{ background: "var(--pc-primary-light)", color: "var(--pc-primary)" }}>
										<CreditCard size={22} />
									</div>
									<div className="pc-metric-content">
										<span className="pc-metric-label">Счета к оплате</span>
										<span className="pc-metric-value">{formatRubles(summary.totalUnpaidAmountRub)}</span>
									</div>
								</div>

								<div className="pc-metric-card">
									<div className="pc-metric-icon" style={{ background: "var(--pc-success-light)", color: "var(--pc-success)" }}>
										<ShieldCheck size={22} />
									</div>
									<div className="pc-metric-content">
										<span className="pc-metric-label">Гарантийных паспортов</span>
										<span className="pc-metric-value">{summary.activeWarrantiesCount} активных</span>
									</div>
								</div>

								<div className="pc-metric-card">
									<div className="pc-metric-icon" style={{ background: "var(--pc-warning-light)", color: "var(--pc-warning)" }}>
										<Sparkles size={22} />
									</div>
									<div className="pc-metric-content">
										<span className="pc-metric-label">Кэшбэк & Бонусы</span>
										<span className="pc-metric-value">{summary.loyaltyBonusBalance.toLocaleString("ru-RU")} баллов</span>
									</div>
								</div>

								<div className="pc-metric-card">
									<div className="pc-metric-icon" style={{ background: "var(--pc-primary-light)", color: "var(--pc-primary)" }}>
										<Calendar size={22} />
									</div>
									<div className="pc-metric-content">
										<span className="pc-metric-label">Предстоящие визиты</span>
										<span className="pc-metric-value">{summary.upcomingAppointmentsCount} запланировано</span>
									</div>
								</div>
							</div>

							{/* Next Appointment Card */}
							{summary.nextAppointment ? (
								<div className="pc-card" style={{ borderColor: "var(--pc-primary)" }}>
									<div className="pc-card-header">
										<h3 className="pc-card-title">
											<Calendar size={18} style={{ color: "var(--pc-primary)" }} />
											<span>Ближайший запланированный прием</span>
										</h3>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<span className="pc-status-badge paid">
												<Check size={14} />
												<span>Запись подтверждена</span>
											</span>
											<button
												type="button"
												className="pc-btn-primary"
												style={{ minHeight: "48px", padding: "8px 16px", fontSize: "0.875rem", fontWeight: 700 }}
												onClick={() => setIsReceptionQrOpen(true)}
												data-testid="next-appt-qr-btn"
											>
												<QrCode size={16} />
												<span>Показать администратору</span>
											</button>
										</div>
									</div>

									<div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
										{summary.nextAppointment.doctorAvatarUrl && (
											<img
												src={summary.nextAppointment.doctorAvatarUrl}
												alt={summary.nextAppointment.doctorName}
												style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--pc-primary)" }}
											/>
										)}

										<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
												<span className="pc-next-visit-time">
													{summary.nextAppointment.timeRu}
												</span>
												<strong style={{ fontSize: "1.0625rem", color: "var(--pc-text-main)" }}>
													{summary.nextAppointment.dateIso} &bull; {summary.nextAppointment.titleRu}
												</strong>
											</div>
											<div style={{ fontSize: "0.875rem", color: "var(--pc-text-muted)" }}>
												Врач: <strong>{summary.nextAppointment.doctorName}</strong> ({summary.nextAppointment.doctorSpecialtyRu})
											</div>
											<div style={{ fontSize: "0.875rem", color: "var(--pc-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
												<MapPin size={14} />
												<strong style={{ color: "var(--pc-text-main)" }}>
													{summary.nextAppointment.clinicName} &bull; {summary.nextAppointment.roomNumber}
												</strong>
											</div>
										</div>
									</div>

									{summary.nextAppointment.preparationInstructionsRu && summary.nextAppointment.preparationInstructionsRu.length > 0 && (
										<div style={{ background: "var(--pc-primary-light)", borderRadius: "var(--pc-radius-sm)", padding: "10px 14px", fontSize: "0.8125rem" }}>
											<strong style={{ color: "var(--pc-primary)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
												<Heart size={14} />
												<span>Памятка подготовки к приему:</span>
											</strong>
											<ul style={{ margin: 0, paddingLeft: "18px", color: "var(--pc-text-main)" }}>
												{summary.nextAppointment.preparationInstructionsRu.map((item, idx) => (
													<li key={idx}>{item}</li>
												))}
											</ul>
										</div>
									)}
								</div>
							) : null}

							{/* Active Treatment Plans Mini-Progress */}
							{data.treatmentPlans.length > 0 && (() => {
								const currentPlan = data.treatmentPlans[0];
								if (!currentPlan) return null;
								const compStages = currentPlan.stages.filter((s) => s.status === "completed").length;
								const totalStages = currentPlan.stages.length;

								return (
									<div className="pc-card">
										<div className="pc-card-header">
											<h3 className="pc-card-title">
												<Percent size={18} style={{ color: "var(--pc-primary)" }} />
												<span>Текущий план лечения: {currentPlan.titleRu}</span>
											</h3>
											<button
												type="button"
												className="pc-btn-secondary"
												onClick={() => setActiveTab("plans")}
											>
												<span>Подробнее</span>
											</button>
										</div>

										<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
											<div
												style={{
													backgroundColor: "var(--pc-bg, #0f172a)",
													border: "1px solid var(--pc-border, #334155)",
													borderRadius: "8px",
													padding: "10px 12px",
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													flexWrap: "wrap",
													gap: "8px",
													fontSize: "0.875rem",
												}}
											>
												<strong style={{ color: "var(--pc-text-main)" }}>
													Выполнено {compStages} из {totalStages} этапов ({currentPlan.progressPercent}%)
												</strong>
												<div style={{ display: "flex", gap: "10px", fontSize: "0.8125rem", flexWrap: "wrap" }}>
													<span style={{ color: "var(--pc-success)", fontWeight: 700 }}>
														Оплачено: {formatRubles(currentPlan.paidCostRub)}
													</span>
													<span style={{ color: "var(--pc-text-muted)" }}>&bull;</span>
													<span style={{ color: currentPlan.remainingDueRub > 0 ? "var(--pc-warning)" : "var(--pc-success)", fontWeight: 700 }}>
														{currentPlan.remainingDueRub > 0 ? `Остаток: ${formatRubles(currentPlan.remainingDueRub)}` : "Оплачено полностью"}
													</span>
												</div>
											</div>

											<div className="pc-progress-bar-bg">
												<div
													className="pc-progress-bar-fill"
													style={{ width: `${currentPlan.progressPercent}%` }}
												/>
											</div>
										</div>
									</div>
								);
							})()}
						</>
					)}

					{/* TAB 2: СЧЕТА И ОПЛАТА (INVOICES & PAYMENTS) */}
					{activeTab === "invoices" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							{/* Filter Bar */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
								<div style={{ display: "flex", gap: "6px" }}>
									<button
										type="button"
										className={`pc-btn-secondary ${invoiceFilter === "all" ? "active" : ""}`}
										style={{ fontWeight: invoiceFilter === "all" ? 700 : 500 }}
										onClick={() => setInvoiceFilter("all")}
									>
										Все счета ({data.invoices.length})
									</button>
									<button
										type="button"
										className={`pc-btn-secondary ${invoiceFilter === "unpaid" ? "active" : ""}`}
										style={{ fontWeight: invoiceFilter === "unpaid" ? 700 : 500, color: "var(--pc-warning)" }}
										onClick={() => setInvoiceFilter("unpaid")}
									>
										К оплате ({data.invoices.filter((i) => i.status === "unpaid" || i.status === "partially_paid").length})
									</button>
									<button
										type="button"
										className={`pc-btn-secondary ${invoiceFilter === "paid" ? "active" : ""}`}
										style={{ fontWeight: invoiceFilter === "paid" ? 700 : 500, color: "var(--pc-success)" }}
										onClick={() => setInvoiceFilter("paid")}
									>
										Оплаченные ({data.invoices.filter((i) => i.status === "paid").length})
									</button>
								</div>

								<div style={{ display: "flex", gap: "6px" }}>
									<button
										type="button"
										className={`pc-btn-secondary ${billingViewMode === "friendly" ? "active" : ""}`}
										style={{ fontWeight: billingViewMode === "friendly" ? 700 : 500 }}
										onClick={() => setBillingViewMode(billingViewMode === "friendly" ? "standard" : "friendly")}
										data-testid="toggle-friendly-invoices"
									>
										<Sparkles size={14} />
										<span>{billingViewMode === "friendly" ? "Понятные блоки (без латыни)" : "Таблица"}</span>
									</button>
								</div>
							</div>

							{/* Invoices List */}
							<div className="pc-invoices-grid">
								{filteredInvoices.map((inv) => {
									const isUnpaid = inv.status === "unpaid" || inv.status === "partially_paid";
									const breakdown = groupServicesIntoFriendlyBlocks(inv.items);

									return (
										<div key={inv.id} className={`pc-invoice-card ${isUnpaid ? "unpaid" : "paid"}`} data-testid={`invoice-card-${inv.id}`}>
											<div className="pc-invoice-header">
												<div>
													<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
														<strong style={{ fontSize: "1rem" }}>Счет {inv.invoiceNumber}</strong>
														<span className={`pc-status-badge ${isUnpaid ? "unpaid" : "paid"}`}>
															{isUnpaid ? <Clock size={12} /> : <CheckCircle2 size={12} />}
															<span>{isUnpaid ? "Ожидает оплаты" : "Оплачен"}</span>
														</span>
													</div>
													<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "2px 0 0 0" }}>
														От {formatRussianDateIso(inv.issueDateIso)} &bull; {inv.titleRu}
													</p>
												</div>

												<div style={{ textAlign: "right" }}>
													<div style={{ fontSize: "1.125rem", fontWeight: 800, color: isUnpaid ? "var(--pc-warning)" : "var(--pc-success)" }}>
														{formatRubles(inv.totalAmountRub)}
													</div>
													{inv.paidAmountRub > 0 && inv.remainingAmountRub > 0 && (
														<div style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
															Оплачено: {formatRubles(inv.paidAmountRub)} &bull; Остаток: {formatRubles(inv.remainingAmountRub)}
														</div>
													)}
												</div>
											</div>

											{/* Breakdown: Friendly Blocks or Table */}
											{billingViewMode === "friendly" ? (
												<div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0" }} data-testid={`friendly-blocks-${inv.id}`}>
													{breakdown.groups.map((grp) => (
														<div
															key={grp.categoryGroup}
															style={{
																backgroundColor: "var(--pc-surface)",
																border: "1px solid var(--pc-border)",
																borderRadius: "8px",
																padding: "10px 12px",
																display: "flex",
																flexDirection: "column",
																gap: "6px",
															}}
														>
															<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
																<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
																	<span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{grp.groupIcon}</span>
																	<div>
																		<strong style={{ fontSize: "0.875rem", color: "var(--pc-text-main)" }}>
																			{grp.categoryGroupRu}
																		</strong>
																		<div style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
																			{grp.summaryRu}
																		</div>
																	</div>
																</div>
																<div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--pc-primary)" }}>
																	{formatRubles(grp.subtotalRub)}
																</div>
															</div>

															<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
																{grp.items.map((it) => (
																	<div
																		key={it.id}
																		style={{
																			fontSize: "0.8125rem",
																			display: "flex",
																			justifyContent: "space-between",
																			backgroundColor: "var(--pc-bg)",
																			padding: "6px 8px",
																			borderRadius: "6px",
																			border: "1px solid var(--pc-border)",
																		}}
																	>
																		<div style={{ flex: 1, minWidth: 0 }}>
																			<span style={{ fontWeight: 600, color: "var(--pc-text-main)" }}>
																				{it.friendlyName}
																			</span>
																			<div style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
																				{it.plainDescriptionRu}
																			</div>
																		</div>
																		<div style={{ fontWeight: 700, color: "var(--pc-text-main)", marginLeft: "10px", whiteSpace: "nowrap" }}>
																			{formatRubles(it.totalRub)}
																		</div>
																	</div>
																))}
															</div>
														</div>
													))}
												</div>
											) : (
												<table className="pc-invoice-items-table">
													<thead>
														<tr>
															<th>Наименование услуги</th>
															<th>Зуб</th>
															<th>Кол-во</th>
															<th>Цена</th>
															<th style={{ textAlign: "right" }}>Сумма</th>
														</tr>
													</thead>
													<tbody>
														{inv.items.map((item, idx) => (
															<tr key={idx}>
																<td>{item.titleRu}</td>
																<td>{item.toothFdi || "—"}</td>
																<td>{item.quantity}</td>
																<td>{formatRubles(item.priceRub)}</td>
																<td style={{ textAlign: "right", fontWeight: 700 }}>{formatRubles(item.totalRub)}</td>
															</tr>
														))}
													</tbody>
												</table>
											)}

											{/* Actions */}
											<div className="pc-invoice-actions">
												{isUnpaid ? (
													<>
														<button
															type="button"
															className="pc-btn-primary"
															onClick={() => handleOpenSbpModal(inv)}
															data-testid={`pay-sbp-btn-${inv.id}`}
														>
															<QrCode size={16} />
															<span>Оплатить через СБП (0% комиссии)</span>
														</button>
														<button
															type="button"
															className="pc-btn-outline"
															onClick={() => handleOpenSbpModal(inv)}
														>
															<CreditCard size={16} />
															<span>Банковской картой</span>
														</button>
													</>
												) : (
													<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
														{inv.fiscalReceiptNumber && (
															<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
																Чек 54-ФЗ № {inv.fiscalReceiptNumber}
															</span>
														)}
														<button
															type="button"
															className="pc-btn-primary"
															data-testid={`download-receipt-btn-${inv.id}`}
															onClick={() => {
																downloadDetailedReceipt(inv, data);
																showToast(`Детализированный чек 54-ФЗ № ${inv.invoiceNumber} сохранен!`);
															}}
															style={{ minHeight: "36px", padding: "6px 12px", fontSize: "0.8125rem" }}
														>
															<Download size={14} />
															<span>Детализированный чек (54-ФЗ)</span>
														</button>
														{inv.fiscalReceiptUrl && (
															<a
																href={inv.fiscalReceiptUrl}
																target="_blank"
																rel="noreferrer"
																className="pc-btn-secondary"
																style={{ textDecoration: "none", minHeight: "36px", padding: "6px 12px", fontSize: "0.8125rem" }}
															>
																<ExternalLink size={14} />
																<span>ФНС</span>
															</a>
														)}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* TAB 3: ПЛАНЫ ЛЕЧЕНИЯ (TREATMENT PLANS & 3-TIER COMPARISON) */}
					{activeTab === "plans" && (
						<PatientPlanView
							plan={data.treatmentPlans[0]}
							threeTierModel={data.threeTierModel}
							patientName={data.fullName}
							cardNumber={data.cardNumber}
							phone={data.phone}
							birthDate={data.birthDate}
							fullCabinetData={data}
							onPayStageSbp={handlePayStageWithSbp}
							onBookAppointment={() => setActiveTab("appointments")}
							onDownloadTaxCertificate={() => {
								downloadPatientTaxCertificate1151156(data, 2026);
								showToast("Официальная справка для налогового вычета (КНД 1151156) сохранена!");
							}}
							onRescheduleAppointment={() => {
								const upcoming = data.appointments.find((a) => a.status === "scheduled");
								if (upcoming) {
									setReschedulingApt(upcoming);
								} else {
									setActiveTab("appointments");
								}
							}}
						/>
					)}

					{/* TAB 4: ДОКУМЕНТЫ И ИДС (DOCUMENTS & CONSENTS & WARRANTIES) */}
					{activeTab === "documents" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
							{/* Section 1: Statutory Consents (323-FZ) */}
							<section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<h3 className="pc-card-title">
										<FileCheck size={18} style={{ color: "var(--pc-primary)" }} />
										<span>Информированные добровольные согласия (ИДС 323-ФЗ)</span>
									</h3>
									<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
										Юридическая сила по 63-ФЗ ст. 6
									</span>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									{data.consents.map((consent) => {
										const isSigned = consent.status === "signed";

										return (
											<div key={consent.id} className="pc-consent-card" data-testid={`consent-card-${consent.id}`}>
												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
													<div>
														<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
															<span style={{ fontSize: "0.75rem", fontWeight: 700, background: "var(--pc-primary-light)", color: "var(--pc-primary)", padding: "2px 8px", borderRadius: "4px" }}>
																{consent.code}
															</span>
															<strong style={{ fontSize: "0.9375rem" }}>{consent.titleRu}</strong>
														</div>
														<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
															{consent.summaryTextRu}
														</p>
													</div>

													<div>
														<span className={`pc-status-badge ${isSigned ? "paid" : "unpaid"}`}>
															{isSigned ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
															<span>{isSigned ? "Подписано по 63-ФЗ" : "Ожидает подписи"}</span>
														</span>
													</div>
												</div>

												{/* If Signed: Audit Record */}
												{isSigned && consent.signatureAudit && (
													<div className="pc-audit-hash-badge">
														<span>Криптографический хеш ПЭП (SHA-256): {consent.signatureAudit.integrityHash}</span>
														{consent.pdfDownloadUrl && (
															<a
																href={consent.pdfDownloadUrl}
																target="_blank"
																rel="noreferrer"
																className="pc-btn-secondary"
																style={{ padding: "2px 8px", fontSize: "0.6875rem", textDecoration: "none" }}
															>
																<Download size={12} />
																<span>PDF</span>
															</a>
														)}
													</div>
												)}

												{/* If Pending: 1-Click SMS Sign */}
												{!isSigned && (
													<div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "6px" }}>
														<button
															type="button"
															className="pc-btn-primary"
															onClick={() => handleStartConsentSigning(consent)}
															data-testid={`sign-sms-btn-${consent.id}`}
														>
															<Smartphone size={16} />
															<span>Подписать по SMS (63-ФЗ ПЭП)</span>
														</button>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</section>

							{/* Section 2: Electronic Warranty Passports */}
							<section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<h3 className="pc-card-title">
										<Award size={18} style={{ color: "var(--pc-primary)" }} />
										<span>Электронные гарантийные паспорта и сертификаты качества</span>
									</h3>
									<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
										Положение СтАР • Закон РФ № 2300-1
									</span>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									{data.warranties.map((war) => {
										const checkupCalc = calculateCheckupDaysRemaining(war.nextCheckupDueDateIso);
										const validityCalc = calculateWarrantyValidity(war.expirationDateIso);

										const countdownBadgeClass = checkupCalc.isOverdue
											? "overdue"
											: checkupCalc.isUrgent
												? "urgent"
												: "normal";

										return (
											<div key={war.certificateId} className="pc-warranty-card" data-testid={`warranty-card-${war.certificateId}`}>
												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
													<div>
														<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
															<strong style={{ fontSize: "0.9375rem" }}>
																Сертификат № {war.certificateId}
															</strong>
															<span className={`pc-warranty-countdown-badge ${countdownBadgeClass}`}>
																<Clock size={12} />
																<span>Чекап: {checkupCalc.labelRu}</span>
															</span>
														</div>
														<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "2px 0 0 0" }}>
															Выдан: {formatRussianDateIso(war.issueDateIso)} &bull; Врач: {war.doctorName} &bull; {validityCalc.labelRu}
														</p>
													</div>

													<a
														href={war.verificationUrl}
														target="_blank"
														rel="noreferrer"
														className="pc-btn-secondary"
														style={{ textDecoration: "none" }}
													>
														<ExternalLink size={14} />
														<span>Проверить онлайн</span>
													</a>
												</div>

												{/* Items list */}
												<div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "var(--pc-surface)", padding: "10px 12px", borderRadius: "var(--pc-radius-sm)" }}>
													{war.items.map((item, idx) => (
														<div key={idx} style={{ fontSize: "0.8125rem", display: "flex", justifyContent: "space-between" }}>
															<div>
																<strong>Зуб #{item.toothFdi}</strong>: {item.workTitleRu} ({item.materialName})
															</div>
															{item.lotNumber && (
																<span style={{ color: "var(--pc-text-muted)", fontFamily: "monospace", fontSize: "0.75rem" }}>
																	{item.lotNumber}
																</span>
															)}
														</div>
													))}
												</div>
											</div>
										);
									})}
								</div>
							</section>

							{/* Section 3: Statutory Prescriptions (Order 1094n Form 107-1/u) */}
							<section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<h3 className="pc-card-title">
										<FileText size={18} style={{ color: "var(--pc-primary)" }} />
										<span>Электронные рецепты на лекарства (Приказ Минздрава № 1094н, форма № 107-1/у)</span>
									</h3>
									<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
										С QR-кодом для аптеки
									</span>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									<div className="pc-card" style={{ background: "var(--pc-surface)" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
											<div>
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<strong style={{ fontSize: "0.9375rem" }}>Амоксициллин 500 мг (капсулы №20)</strong>
													<span className="pc-status-badge paid">
														<CheckCircle2 size={12} />
														<span>Действителен (60 дней)</span>
													</span>
												</div>
												<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
													Rp.: Amoxicillini 500 mg &bull; Внутрь по 1 капсуле 3 раза в день через 8 ч, курс 5–7 дней
												</p>
											</div>

											<button
												type="button"
												className="pc-btn-primary"
												style={{ minHeight: "44px", padding: "8px 16px", fontSize: "0.875rem", touchAction: "manipulation" }}
												onClick={() => showToast("Официальный рецепт 107-1/у с QR-кодом и МДЛП сохранен в PDF!")}
											>
												<Download size={16} />
												<span>Скачать рецепт (PDF)</span>
											</button>
										</div>
									</div>

									<div className="pc-card" style={{ background: "var(--pc-surface)" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
											<div>
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<strong style={{ fontSize: "0.9375rem" }}>Ибупрофен 400 мг (таблетки №20)</strong>
													<span className="pc-status-badge paid">
														<CheckCircle2 size={12} />
														<span>Действителен (60 дней)</span>
													</span>
												</div>
												<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
													Rp.: Ibuprofeni 400 mg &bull; При зубной боли по 1 таб. после еды (макс. 3 таб./сутки)
												</p>
											</div>

											<button
												type="button"
												className="pc-btn-primary"
												style={{ minHeight: "44px", padding: "8px 16px", fontSize: "0.875rem", touchAction: "manipulation" }}
												onClick={() => showToast("Официальный рецепт 107-1/у сохранен в PDF!")}
											>
												<Download size={16} />
												<span>Скачать рецепт (PDF)</span>
											</button>
										</div>
									</div>
								</div>
							</section>

							{/* Section 4: Tax Deduction Certificate 13% (Order FNS KND 1151156) */}
							<section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<h3 className="pc-card-title">
										<DollarSign size={18} style={{ color: "var(--pc-primary)" }} />
										<span>Налоговый вычет 13% за лечение (Справка ФНС КНД 1151156)</span>
									</h3>
									<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
										Возврат до 19 500 ₽ в год (ст. 219 НК РФ)
									</span>
								</div>

								<div className="pc-card" style={{ background: "var(--pc-surface)" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
										<div>
											<strong style={{ fontSize: "0.9375rem" }}>
												Справка об оплате медицинских услуг за 2026 год (КНД 1151156)
											</strong>
											<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
												Включает все фискальные чеки (Код 1: обычное лечение, Код 2: дорогостоящая имплантация). Расчетный возврат 13%: <strong style={{ color: "var(--pc-success)" }}>~{formatRubles(estimatedTaxRefundRub)}</strong>.
											</p>
										</div>

										<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
											<button
												type="button"
												className="pc-btn-primary"
												data-testid="download-tax-knd-btn"
												style={{ minHeight: "44px", padding: "8px 16px", fontSize: "0.875rem", touchAction: "manipulation" }}
												onClick={() => {
													downloadPatientTaxCertificate1151156(data, 2026);
													showToast("Официальная справка КНД 1151156 сформирована и скачана!");
												}}
											>
												<Download size={16} />
												<span>Скачать справку (КНД 1151156)</span>
											</button>
											<button
												type="button"
												className="pc-btn-secondary"
												data-testid="print-tax-knd-btn"
												style={{ minHeight: "44px", padding: "8px 16px", fontSize: "0.875rem", touchAction: "manipulation" }}
												onClick={() => {
													const html = generatePatientTaxCertificate1151156(data, 2026);
													openPrintWindow(html);
												}}
											>
												<Eye size={16} />
												<span>Печать / Просмотр</span>
											</button>
										</div>
									</div>
								</div>
							</section>
						</div>
					)}

					{/* TAB 5: ЗАПИСЬ НА ПРИЕМ (APPOINTMENTS & BOOKING) */}
					{activeTab === "appointments" && (
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
							{/* Left: Appointments List */}
							<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<h3 className="pc-card-title">
										<Calendar size={18} style={{ color: "var(--pc-primary)" }} />
										<span>История & график визитов</span>
									</h3>
									<div style={{ display: "flex", gap: "4px" }}>
										<button
											type="button"
											className={`pc-btn-secondary ${appointmentFilter === "upcoming" ? "active" : ""}`}
											onClick={() => setAppointmentFilter("upcoming")}
										>
											Предстоящие
										</button>
										<button
											type="button"
											className={`pc-btn-secondary ${appointmentFilter === "past" ? "active" : ""}`}
											onClick={() => setAppointmentFilter("past")}
										>
											Архив
										</button>
									</div>
								</div>

								{filteredAppointments.map((apt) => (
									<div key={apt.id} className="pc-appointment-card" data-testid={`appointment-card-${apt.id}`}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<strong style={{ fontSize: "0.9375rem" }}>
												{apt.dateIso} в {apt.timeRu}
											</strong>
											<span className="pc-status-badge paid">
												{apt.status === "completed" ? "Завершен" : "Запланирован"}
											</span>
										</div>

										<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-main)" }}>
											<strong>{apt.titleRu}</strong>
										</div>

										<div style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
											{apt.doctorName} ({apt.doctorSpecialtyRu}) &bull; {apt.roomNumber}
										</div>

										{apt.status === "scheduled" && (
											<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
												<button
													type="button"
													className="pc-btn-secondary"
													style={{ color: "var(--pc-danger)" }}
													onClick={() => showToast(`Запрос на отмену визита ${apt.dateIso} отправлен администратору клиники.`)}
												>
													Отменить
												</button>
												<button
													type="button"
													className="pc-btn-secondary"
													onClick={() => setReschedulingApt(apt)}
												>
													Запросить перенос
												</button>
											</div>
										)}
									</div>
								))}
							</div>

							{/* Right: New Appointment Booking Form */}
							<div className="pc-card">
								<h3 className="pc-card-title">
									<Plus size={18} style={{ color: "var(--pc-primary)" }} />
									<span>Онлайн-запись на прием</span>
								</h3>

								<form onSubmit={handleSendBookingRequest} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
											Специализация врача
										</label>
										<select
											value={bookingSpecialty}
											onChange={(e) => setBookingSpecialty(e.target.value)}
											style={{
												width: "100%",
												minHeight: "44px",
												borderRadius: "var(--pc-radius-sm)",
												border: "1px solid var(--pc-border)",
												background: "var(--pc-bg)",
												color: "var(--pc-text-main)",
												padding: "8px 12px",
												fontSize: "0.875rem",
											}}
										>
											<option value="Терапевт-эндодонтист">Терапевт (Лечение кариеса, каналов)</option>
											<option value="Ортопед">Ортопед (Коронки, виниры)</option>
											<option value="Хирург-имплантолог">Хирург-имплантолог (Удаление, имплантация)</option>
											<option value="Гигиенист-пародонтолог">Гигиенист (Чистка Air-Flow, отбеливание)</option>
											<option value="Ортодонт">Ортодонт (Брекеты, элайнеры)</option>
										</select>
									</div>

									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
											Желаемая дата
										</label>
										<input
											type="date"
											value={bookingDate}
											onChange={(e) => setBookingDate(e.target.value)}
											style={{
												width: "100%",
												minHeight: "44px",
												borderRadius: "var(--pc-radius-sm)",
												border: "1px solid var(--pc-border)",
												background: "var(--pc-bg)",
												color: "var(--pc-text-main)",
												padding: "8px 12px",
												fontSize: "0.875rem",
											}}
										/>
									</div>

									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
											Комментарий или жалоба (необязательно)
										</label>
										<textarea
											rows={3}
											value={bookingNote}
											onChange={(e) => setBookingNote(e.target.value)}
											placeholder="Например: Плановый осмотр коронки или чувствительность зуба..."
											style={{
												width: "100%",
												borderRadius: "var(--pc-radius-sm)",
												border: "1px solid var(--pc-border)",
												background: "var(--pc-bg)",
												color: "var(--pc-text-main)",
												padding: "8px 12px",
												fontSize: "0.875rem",
												resize: "vertical",
											}}
										/>
									</div>

									<button type="submit" className="pc-btn-primary" style={{ width: "100%" }}>
										<Send size={16} />
										<span>Отправить заявку администратору</span>
									</button>
								</form>
							</div>
						</div>
					)}

					{/* TAB 6: ЭЛЕКТРОННЫЕ ПАМЯТКИ И УХОД ПОСЛЕ ПРИЁМА */}
					{activeTab === "care" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }} data-testid="care-instructions-tab-view">
							{/* Hero Care Card */}
							<div className="pc-care-memo-card">
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div
											style={{
												width: "52px",
												height: "52px",
												borderRadius: "16px",
												background: "var(--pc-primary)",
												color: "#ffffff",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
												boxShadow: "0 6px 16px rgba(13, 148, 136, 0.35)",
											}}
										>
											<Heart size={28} />
										</div>
										<div>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
												<h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "var(--pc-text-main)" }}>
													Персональная памятка пациента после лечения
												</h3>
												<span className="pc-status-badge paid" style={{ fontSize: "0.8125rem", padding: "4px 10px" }}>
													Зуб №{careMemo.toothFdi}
												</span>
											</div>
											<p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "var(--pc-text-muted)" }}>
												Лечащий врач: <strong>{careMemo.doctorName}</strong> ({careMemo.doctorSpecialty}) &bull; {careMemo.clinicName}
											</p>
										</div>
									</div>

									<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
										<button
											type="button"
											className="pc-whatsapp-btn"
											onClick={handleSendCareMemoWhatsApp}
											data-testid="btn-care-tab-whatsapp"
										>
											<Send size={18} />
											<span>Отправить в WhatsApp (1 клик)</span>
										</button>
										<button
											type="button"
											className="pc-btn-primary"
											style={{ minHeight: "48px", padding: "10px 18px", fontWeight: 800 }}
											onClick={() => setIsCareMemoQrOpen(true)}
											data-testid="btn-care-tab-qr"
										>
											<QrCode size={18} />
											<span>QR для телефона</span>
										</button>
									</div>
								</div>

								{/* Large High-Contrast Recommendation Cards */}
								<div className="pc-care-rec-grid" style={{ marginTop: "6px" }}>
									{careMemo.recommendations.map((rec) => (
										<div
											key={rec.id}
											className={`pc-care-rec-item ${rec.isUrgent ? "urgent" : ""}`}
											data-testid={`care-tab-rec-${rec.id}`}
										>
											<div className="pc-care-rec-icon" aria-hidden="true">
												{rec.icon}
											</div>
											<div className="pc-care-rec-content">
												<div className="pc-care-rec-title">
													<span>{rec.title}</span>
													{rec.badgeText && (
														<span
															style={{
																fontSize: "0.6875rem",
																padding: "2px 6px",
																borderRadius: "4px",
																background: rec.isUrgent
																	? "var(--pc-danger)"
																	: "var(--pc-primary-light)",
																color: rec.isUrgent
																	? "#ffffff"
																	: "var(--pc-primary)",
																fontWeight: 700,
															}}
														>
															{rec.badgeText}
														</span>
													)}
												</div>
												<p className="pc-care-rec-desc">{rec.description}</p>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Prescribed Medications & Safety Information */}
							<div className="pc-card" style={{ background: "var(--pc-surface)" }}>
								<div className="pc-card-header">
									<h3 className="pc-card-title" style={{ margin: 0 }}>
										<FileText size={18} style={{ color: "var(--pc-primary)" }} />
										<span>Назначенные медикаменты и схема приёма</span>
									</h3>
								</div>
								<div style={{ fontSize: "0.875rem", color: "var(--pc-text-main)", lineHeight: 1.6 }}>
									<p style={{ margin: "0 0 8px 0" }}>
										💊 <strong>Обезболивающее:</strong> Нимесил 100 мг (1 саше) растворить в 100 мл теплой воды после еды при появлении боли (не более 2 раз в сутки). Альтернатива: Ибупрофен 400 мг.
									</p>
									<p style={{ margin: "0 0 8px 0" }}>
										🍵 <strong>Антисептический уход:</strong> Ротовые ванночки с хлоргексидином 0.05% или мирамистином (подержать во рту 1 минуту, не полоскать активно) 2–3 раза в день после еды, начиная со 2-х суток.
									</p>
								</div>
							</div>

							{/* Warning signs & Clinic SOS Hotline */}
							<div className="pc-alert-banner danger" style={{ padding: "16px" }}>
								<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<AlertTriangle size={20} style={{ color: "var(--pc-danger)" }} />
										<strong style={{ fontSize: "0.9375rem" }}>Когда необходимо срочно связаться с клиникой:</strong>
									</div>
									<ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", fontSize: "0.8125rem", color: "var(--pc-text-main)" }}>
										{careMemo.warningSigns.map((w, idx) => (
											<li key={idx}>{w}</li>
										))}
									</ul>
									<div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
										<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
											Телефон клиники: <strong>{careMemo.clinicPhone}</strong> &bull; Дежурный врач: <strong>{careMemo.clinicEmergencyPhone}</strong>
										</span>
										<a
											href={`tel:${careMemo.clinicEmergencyPhone?.replace(/\D/g, "")}`}
											className="pc-btn-primary"
											style={{ background: "var(--pc-danger)", textDecoration: "none", minHeight: "40px", padding: "6px 14px", fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
										>
											<Phone size={14} />
											<span>Позвонить дежурному врачу</span>
										</a>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* SBP QR PAYMENT MODAL SHEET */}
				{activeSbpInvoice && activeSbpPayload && (
					<div className="pc-sheet-overlay" onClick={() => setActiveSbpInvoice(null)} role="dialog" aria-modal="true">
						<div className="pc-sheet-window" onClick={(e) => e.stopPropagation()} data-testid="sbp-payment-modal-sheet">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<QrCode size={22} style={{ color: "var(--pc-primary)" }} />
									<strong style={{ fontSize: "1.0625rem" }}>Оплата через СБП без комиссии</strong>
								</div>
								<button
									type="button"
									className="pc-close-btn"
									onClick={() => setActiveSbpInvoice(null)}
									aria-label="Закрыть"
								>
									<X size={18} />
								</button>
							</div>

							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
									{formatRubles(activeSbpPayload.amountRub)}
								</div>
								<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
									Счет {activeSbpPayload.invoiceNumber} &bull; {activeSbpPayload.recipientLegalName}
								</p>
							</div>

							{/* Dynamic QR Code */}
							<div
								className="pc-qr-container"
								dangerouslySetInnerHTML={{ __html: activeSbpPayload.qrSvg }}
								data-testid="sbp-qr-svg-wrapper"
							/>

							<p style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)", textAlign: "center", margin: 0 }}>
								Отсканируйте QR-код камерой смартфона или нажмите на ваш банк:
							</p>

							{/* Bank Apps Quick Buttons */}
							<div className="pc-bank-buttons-grid">
								{activeSbpPayload.availableBanks.map((bank) => (
									<button
										key={bank.id}
										type="button"
										className="pc-bank-btn"
										onClick={handleSimulateSbpSuccess}
									>
										<span style={{ width: "10px", height: "10px", borderRadius: "50%", background: bank.brandColorHex }} />
										<span>{bank.nameRu}</span>
									</button>
								))}
							</div>

							<div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
								<button
									type="button"
									className="pc-btn-primary"
									style={{ flex: 1 }}
									onClick={handleSimulateSbpSuccess}
									data-testid="confirm-sbp-payment-btn"
								>
									<CheckCircle2 size={16} />
									<span>Я оплатил (Проверить статус)</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* SIGNING MODAL DIALOG (SMS/OTP 63-FZ or TOUCH DRAWING) */}
				{signingConsent && (
					<div className="pc-sheet-overlay" onClick={() => setSigningConsent(null)} role="dialog" aria-modal="true">
						<div className="pc-sheet-window" onClick={(e) => e.stopPropagation()} data-testid="sms-otp-signing-dialog">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<Smartphone size={22} style={{ color: "var(--pc-primary)" }} />
									<strong style={{ fontSize: "1.0625rem" }}>Подписание ИДС (63-ФЗ)</strong>
								</div>
								<button
									type="button"
									className="pc-close-btn"
									onClick={() => setSigningConsent(null)}
									aria-label="Закрыть"
								>
									<X size={18} />
								</button>
							</div>

							<div>
								<strong style={{ fontSize: "0.9375rem" }}>{signingConsent.titleRu}</strong>
								<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
									{signingConsent.summaryTextRu}
								</p>
							</div>

							{/* Mode Switcher */}
							<div style={{ display: "flex", gap: "8px", background: "var(--pc-surface)", padding: "4px", borderRadius: "8px" }}>
								<button
									type="button"
									className={`pc-btn-secondary ${consentSignMode === "sms_otp" ? "active" : ""}`}
									style={{ flex: 1, fontWeight: consentSignMode === "sms_otp" ? 700 : 500 }}
									onClick={() => setConsentSignMode("sms_otp")}
								>
									<Smartphone size={14} />
									<span>SMS-код (63-ФЗ)</span>
								</button>
								<button
									type="button"
									className={`pc-btn-secondary ${consentSignMode === "touch_screen" ? "active" : ""}`}
									style={{ flex: 1, fontWeight: consentSignMode === "touch_screen" ? 700 : 500 }}
									onClick={() => setConsentSignMode("touch_screen")}
								>
									<FileCheck size={14} />
									<span>Росчерк пальцем (SVG)</span>
								</button>
							</div>

							{consentSignMode === "sms_otp" ? (
								<>
									<div style={{ background: "var(--pc-surface)", padding: "12px", borderRadius: "var(--pc-radius-sm)", fontSize: "0.8125rem" }}>
										Мы отправили одноразовый 6-значный SMS-код на ваш номер <strong>{data.phone}</strong>:
									</div>

									{/* 6-Digit PIN Inputs */}
									<div className="pc-otp-container">
										{otpDigits.map((digit, idx) => (
											<input
												key={idx}
												id={`pc-otp-${idx}`}
												type="text"
												inputMode="numeric"
												maxLength={1}
												value={digit}
												onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
												className="pc-otp-digit"
												aria-label={`Цифра ${idx + 1} SMS кода`}
												autoFocus={idx === 0}
											/>
										))}
									</div>

									{otpError && (
										<div style={{ color: "var(--pc-danger)", fontSize: "0.8125rem", textAlign: "center", fontWeight: 700 }}>
											{otpError}
										</div>
									)}

									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<button
											type="button"
											className="pc-btn-secondary"
											onClick={handleResendOtp}
											disabled={otpCountdown > 0}
										>
											<RefreshCw size={14} className={otpCountdown > 0 ? "animate-spin" : ""} />
											<span>
												{otpCountdown > 0 ? `Повтор через ${otpCountdown} сек.` : "Отправить код повторно"}
											</span>
										</button>

										<span style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
											Демо-код: <strong>{otpExpectedCode}</strong>
										</span>
									</div>

									<div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
										<button
											type="button"
											className="pc-btn-primary"
											style={{ flex: 1 }}
											onClick={handleConfirmConsentOtp}
											data-testid="verify-otp-btn"
										>
											<Lock size={16} />
											<span>Подписать документ (63-ФЗ ПЭП)</span>
										</button>
									</div>
								</>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
										Распишитесь пальцем или стилусом на экране в поле ниже:
									</div>
									<SignaturePadCanvas
										width={360}
										height={160}
										onSignatureChange={(svg) => setTouchSvgSignature(svg)}
									/>
									<button
										type="button"
										className="pc-btn-primary"
										onClick={handleSignConsentWithTouch}
										disabled={!touchSvgSignature}
										data-testid="confirm-touch-signature-btn"
									>
										<CheckCircle2 size={16} />
										<span>Подтвердить росчерк (63-ФЗ)</span>
									</button>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Mobile Self-Checkin & Somatic Health Questionnaire Modal */}
				{isSelfCheckinOpen && (
					<MobileSelfCheckinModal
						isOpen={isSelfCheckinOpen}
						onClose={() => setIsSelfCheckinOpen(false)}
						initialPhone={data.phone}
						patientName={data.fullName}
						doctorName={data.curatingDoctor}
						onCheckinSuccess={({ signedConsents, somaticProfile }) => {
							setIsSelfCheckinOpen(false);
							showToast("Самочекин успешно пройден! Данные переданы лечащему врачу.");
							setData((prev) => ({
								...prev,
								somaticAlerts: somaticProfile.alerts,
								somaticRiskLevel: somaticProfile.riskLevel,
								somaticRiskProfile: somaticProfile.profile,
							}));
						}}
					/>
				)}

				{/* Reschedule Appointment Modal Dialog */}
				{reschedulingApt && (
					<div className="pc-submodal-backdrop" role="dialog" aria-modal="true">
						<div className="pc-submodal-card" style={{ maxWidth: "480px" }}>
							<div className="pc-submodal-header">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<Calendar size={20} style={{ color: "var(--pc-primary)" }} />
									<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 800 }}>
										Запрос на перенос записи
									</h3>
								</div>
								<button
									type="button"
									className="pc-close-btn"
									onClick={() => setReschedulingApt(null)}
									aria-label="Закрыть"
								>
									<X size={18} />
								</button>
							</div>

							<div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
								<div style={{ backgroundColor: "var(--pc-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--pc-border)" }}>
									<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>Текущая запись:</div>
									<strong style={{ fontSize: "0.9375rem", display: "block", marginTop: "2px" }}>
										{reschedulingApt.titleRu}
									</strong>
									<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", marginTop: "4px" }}>
										📅 {reschedulingApt.dateIso} в {reschedulingApt.timeRu} &bull; Врач: {reschedulingApt.doctorName} ({reschedulingApt.roomNumber})
									</div>
								</div>

								<form onSubmit={handleSendRescheduleRequest} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									<div>
										<label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
											Выберите желаемую новую дату:
										</label>
										<input
											type="date"
											value={rescheduleDate}
											onChange={(e) => setRescheduleDate(e.target.value)}
											required
											style={{
												width: "100%",
												minHeight: "44px",
												borderRadius: "var(--pc-radius-sm)",
												border: "1px solid var(--pc-border)",
												background: "var(--pc-bg)",
												color: "var(--pc-text-main)",
												padding: "8px 12px",
												fontSize: "0.875rem",
											}}
										/>
									</div>

									<div>
										<label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "6px" }}>
											Удобное время (свободные окна врача):
										</label>
										<div className="pc-slot-chips-grid">
											{[
												"09:00 – 10:00",
												"10:30 – 11:30",
												"12:00 – 13:00",
												"14:30 – 15:30",
												"16:00 – 17:00",
												"17:30 – 18:30",
											].map((slot) => {
												const isSelected = rescheduleTimeSlot === slot;
												return (
													<button
														key={slot}
														type="button"
														onClick={() => setRescheduleTimeSlot(slot)}
														className={`pc-slot-chip-btn ${isSelected ? "selected" : ""}`}
														data-testid={`reschedule-slot-${slot.replace(/\s+/g, "_")}`}
													>
														{slot}
													</button>
												);
											})}
										</div>
									</div>

									<div>
										<label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
											Причина переноса (необязательно):
										</label>
										<input
											type="text"
											value={rescheduleReason}
											onChange={(e) => setRescheduleReason(e.target.value)}
											placeholder="Например: Задержка на работе или командировка"
											style={{
												width: "100%",
												minHeight: "44px",
												borderRadius: "var(--pc-radius-sm)",
												border: "1px solid var(--pc-border)",
												background: "var(--pc-bg)",
												color: "var(--pc-text-main)",
												padding: "8px 12px",
												fontSize: "0.875rem",
											}}
										/>
									</div>

									<div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
										<button
											type="button"
											className="pc-btn-secondary"
											onClick={() => setReschedulingApt(null)}
											style={{ flex: 1, minHeight: "44px" }}
										>
											Отмена
										</button>
										<button
											type="submit"
											className="pc-btn-primary"
											style={{ flex: 2, minHeight: "44px" }}
										>
											<CheckCircle2 size={16} />
											<span>Отправить заявку</span>
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				)}
				{/* MODAL 5: QR-КОД БЫСТРОЙ РЕГИСТРАЦИИ НА РЕСЕПШЕНЕ (375PX) */}
				{isReceptionQrOpen && (
					<div
						className="pc-modal-backdrop"
						data-testid="reception-qr-modal"
						style={{
							position: "fixed",
							inset: 0,
							backgroundColor: "rgba(0, 0, 0, 0.85)",
							backdropFilter: "blur(8px)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: 99999,
							padding: "16px",
							overscrollBehavior: "contain",
							touchAction: "pan-y",
						}}
						onClick={(e) => {
							if (e.target === e.currentTarget) setIsReceptionQrOpen(false);
						}}
					>
						<div
							className="pc-modal-content"
							style={{
								backgroundColor: "#ffffff",
								color: "#0f172a",
								borderRadius: "24px",
								padding: "24px",
								width: "100%",
								maxWidth: "380px",
								boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								textAlign: "center",
								gap: "16px",
								boxSizing: "border-box",
							}}
						>
							<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0d9488", fontWeight: 800, fontSize: "0.875rem" }}>
									<Sparkles size={18} />
									<span>МАКСИМАЛЬНАЯ ЯРКОСТЬ</span>
								</div>
								<button
									type="button"
									onClick={() => setIsReceptionQrOpen(false)}
									style={{
										background: "none",
										border: "none",
										fontSize: "24px",
										cursor: "pointer",
										color: "#64748b",
										minHeight: "48px",
										minWidth: "48px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
									aria-label="Закрыть"
								>
									✕
								</button>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>
									{data.fullName}
								</h3>
								<div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 600 }}>
									Карта пациента № {data.cardNumber}
								</div>
							</div>

							{/* High-Contrast Pure White & Black QR Matrix */}
							<div
								style={{
									background: "#ffffff",
									padding: "16px",
									borderRadius: "16px",
									border: "3px solid #0f172a",
									boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
								}}
								dangerouslySetInnerHTML={{
									__html: generateReceptionCheckinQrPayload(data).qrCodeSvg,
								}}
							/>

							{summary.nextAppointment && (
								<div
									style={{
										width: "100%",
										background: "#f0fdfa",
										border: "1px solid #99f6e4",
										borderRadius: "12px",
										padding: "12px 14px",
										display: "flex",
										flexDirection: "column",
										gap: "4px",
										textAlign: "left",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f766e", textTransform: "uppercase" }}>
											Ближайший прием
										</span>
										<span className="pc-next-visit-time" style={{ color: "#0f766e" }}>
											{summary.nextAppointment.timeRu}
										</span>
									</div>
									<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>
										{summary.nextAppointment.dateIso} &bull; {summary.nextAppointment.titleRu}
									</div>
									<div style={{ fontSize: "0.8125rem", color: "#334155" }}>
										Врач: <strong>{summary.nextAppointment.doctorName}</strong>
									</div>
									<div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0d9488", marginTop: "2px" }}>
										📍 {summary.nextAppointment.roomNumber}
									</div>
								</div>
							)}

							<p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.4 }}>
								Поднесите экран к сканеру на стойке ресепшена или покажите администратору для мгновенной отметки о прибытии.
							</p>

							<button
								type="button"
								onClick={() => setIsReceptionQrOpen(false)}
								style={{
									width: "100%",
									minHeight: "48px",
									backgroundColor: "#0d9488",
									color: "#ffffff",
									border: "none",
									borderRadius: "12px",
									fontSize: "1rem",
									fontWeight: 800,
									cursor: "pointer",
									boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)",
									touchAction: "manipulation",
								}}
							>
								Готово
							</button>
						</div>
					</div>
				)}

				{/* MODAL: QR-КОД ПАМЯТКИ ДЛЯ ТЕЛЕФОНА */}
				{isCareMemoQrOpen && (
					<div
						className="pc-modal-backdrop"
						data-testid="care-memo-qr-modal"
						style={{
							position: "fixed",
							inset: 0,
							backgroundColor: "rgba(0, 0, 0, 0.85)",
							backdropFilter: "blur(8px)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: 99999,
							padding: "16px",
							overscrollBehavior: "contain",
							touchAction: "pan-y",
						}}
						onClick={(e) => {
							if (e.target === e.currentTarget) setIsCareMemoQrOpen(false);
						}}
					>
						<div
							className="pc-modal-content"
							style={{
								backgroundColor: "#ffffff",
								color: "#0f172a",
								borderRadius: "24px",
								padding: "24px",
								width: "100%",
								maxWidth: "380px",
								boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								textAlign: "center",
								gap: "16px",
								boxSizing: "border-box",
							}}
						>
							<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0d9488", fontWeight: 800, fontSize: "0.875rem" }}>
									<Heart size={18} />
									<span>ПАМЯТКА НА СМАРТФОНЕ</span>
								</div>
								<button
									type="button"
									onClick={() => setIsCareMemoQrOpen(false)}
									style={{
										background: "none",
										border: "none",
										fontSize: "24px",
										cursor: "pointer",
										color: "#64748b",
										minHeight: "48px",
										minWidth: "48px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
									aria-label="Закрыть"
								>
									✕
								</button>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>
									{careMemo.patientName}
								</h3>
								<div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 600 }}>
									Рекомендации после лечения зуба №{careMemo.toothFdi}
								</div>
							</div>

							<div
								style={{
									background: "#ffffff",
									padding: "16px",
									borderRadius: "16px",
									border: "3px solid #0f172a",
									boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
								}}
								dangerouslySetInnerHTML={{
									__html: careMemo.qrCodeSvg,
								}}
							/>

							<p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.4 }}>
								Отсканируйте QR-код камерой смартфона, чтобы открыть электронную памятку и сохранить контакты клиники.
							</p>

							<div style={{ width: "100%", display: "flex", gap: "8px" }}>
								<button
									type="button"
									onClick={handleSendCareMemoWhatsApp}
									style={{
										flex: 1,
										minHeight: "48px",
										backgroundColor: "#25d366",
										color: "#ffffff",
										border: "none",
										borderRadius: "12px",
										fontSize: "0.9375rem",
										fontWeight: 800,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
										boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
										touchAction: "manipulation",
									}}
								>
									<Send size={16} />
									<span>WhatsApp</span>
								</button>
								<button
									type="button"
									onClick={() => setIsCareMemoQrOpen(false)}
									style={{
										flex: 1,
										minHeight: "48px",
										backgroundColor: "#0d9488",
										color: "#ffffff",
										border: "none",
										borderRadius: "12px",
										fontSize: "0.9375rem",
										fontWeight: 800,
										cursor: "pointer",
										boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)",
										touchAction: "manipulation",
									}}
								>
									Готово
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PatientCabinetModal;

