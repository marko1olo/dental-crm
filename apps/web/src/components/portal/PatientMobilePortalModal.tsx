/**
 * Patient Mobile Portal Modal (PWA & Desktop)
 * (DOMAIN: PORTAL PATIENT CABINET, FORM 043/U PROTOCOLS, TREATMENT PLANS, RADIOLOGY & 54-FZ FINANCES)
 */

import type React from "react";
import { useEffect, useId, useMemo, useState } from "react";
import {
	AlertCircle,
	Calendar,
	CalendarPlus,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Contrast,
	CreditCard,
	Download,
	ExternalLink,
	Eye,
	FileBadge,
	FileCheck2,
	FileText,
	Layers,
	LogOut,
	MapPin,
	Monitor,
	Phone,
	QrCode,
	Receipt,
	RefreshCw,
	Scan,
	ShieldCheck,
	Smartphone,
	Sparkles,
	User,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import "./patientMobilePortal.css";
import {
	calculateFinancialSummary,
	formatFdiToothName,
	formatRussianPhone,
	generateFnsTaxCertificateData,
	generateSbpPaymentQrPayload,
	generateSmsOtpCode,
	verifySmsOtpCode,
} from "./patientPortalEngine";
import { generateQrCodeSvg } from "./patientCabinet/patientCabinetEngine";
import { UpcomingVisitCard } from "./UpcomingVisitCard";
import { TreatmentPlanRoadmap } from "../treatment-plans/TreatmentPlanRoadmap";
import { A2hsPromptModal } from "../../pwa/A2hsPromptModal";
import {
	SAMPLE_FISCAL_RECEIPT_1,
	SAMPLE_PORTAL_DOCUMENTS,
	SAMPLE_PORTAL_INVOICES,
	SAMPLE_PORTAL_PROFILE,
	SAMPLE_PORTAL_TREATMENT_PLAN,
	SAMPLE_RADIOLOGY_SCANS,
	SAMPLE_VISIT_PROTOCOLS,
} from "./patientPortalPresets";
import type {
	FiscalReceipt54Fz,
	PatientPortalProfile,
	PortalDocumentItem,
	PortalInvoiceItem,
	PortalTreatmentPlan,
	RadiologyScanItem,
	VisitProtocol043,
} from "./patientPortalTypes";

export type PatientPortalTab = "visits" | "plan" | "scans" | "finances" | "documents";

export interface PatientMobilePortalModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialTab?: PatientPortalTab | undefined;
	profile?: PatientPortalProfile | undefined;
	visits?: VisitProtocol043[] | undefined;
	treatmentPlan?: PortalTreatmentPlan | undefined;
	scans?: RadiologyScanItem[] | undefined;
	invoices?: PortalInvoiceItem[] | undefined;
	documents?: PortalDocumentItem[] | undefined;
	onBookOnlineClick?: (() => void) | undefined;
	requireAuth?: boolean | undefined;
}

export const PatientMobilePortalModal: React.FC<PatientMobilePortalModalProps> = ({
	isOpen,
	onClose,
	initialTab = "visits",
	profile = SAMPLE_PORTAL_PROFILE,
	visits = SAMPLE_VISIT_PROTOCOLS,
	treatmentPlan = SAMPLE_PORTAL_TREATMENT_PLAN,
	scans = SAMPLE_RADIOLOGY_SCANS,
	invoices = SAMPLE_PORTAL_INVOICES,
	documents = SAMPLE_PORTAL_DOCUMENTS,
	onBookOnlineClick,
	requireAuth = false,
}) => {
	const modalTitleId = useId();

	// Authentication State (Phone + 4 digits SMS OTP with 60s timer)
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!requireAuth);
	const [authPhone, setAuthPhone] = useState<string>(profile.phone || "+7 (926) 555-12-34");
	const [authStep, setAuthStep] = useState<"phone" | "otp">("phone");
	const [otpCode, setOtpCode] = useState<string>("");
	const [expectedOtpCode, setExpectedOtpCode] = useState<string>("7788");
	const [smsTimerSeconds, setSmsTimerSeconds] = useState<number>(60);
	const [isSmsTimerRunning, setIsSmsTimerRunning] = useState<boolean>(false);
	const [authError, setAuthError] = useState<string | null>(null);

	// Navigation & Layout Modes
	const [activeTab, setActiveTab] = useState<PatientPortalTab>(initialTab);
	const [isPwaView, setIsPwaView] = useState<boolean>(false);

	// Tab 1: Visits State
	const [expandedVisitId, setExpandedVisitId] = useState<string | null>(visits[0]?.id || null);

	// Tab 3: Scans & Viewer State
	const [selectedScan, setSelectedScan] = useState<RadiologyScanItem | null>(null);
	const [scanInvert, setScanInvert] = useState<boolean>(false);
	const [scanZoom, setScanZoom] = useState<number>(1);
	const [scanFilter, setScanFilter] = useState<"all" | "rvg" | "optg" | "cbct">("all");

	// Tab 4: Finances & Payment Modals State
	const [activeFiscalReceipt, setActiveFiscalReceipt] = useState<FiscalReceipt54Fz | null>(null);
	const [payingInvoice, setPayingInvoice] = useState<PortalInvoiceItem | null>(null);
	const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
	const [showTaxCertificate, setShowTaxCertificate] = useState<boolean>(false);
	const [isReceptionQrOpen, setIsReceptionQrOpen] = useState<boolean>(false);
	const [isA2hsModalOpen, setIsA2hsModalOpen] = useState<boolean>(false);

	// 60-second SMS resend countdown timer
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;
		if (isSmsTimerRunning && smsTimerSeconds > 0) {
			interval = setInterval(() => {
				setSmsTimerSeconds((prev) => prev - 1);
			}, 1000);
		} else if (smsTimerSeconds === 0) {
			setIsSmsTimerRunning(false);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isSmsTimerRunning, smsTimerSeconds]);

	const financialSummary = useMemo(
		() => calculateFinancialSummary(profile, invoices),
		[profile, invoices],
	);

	const fnsCertificateData = useMemo(
		() => generateFnsTaxCertificateData(profile, invoices, 2026),
		[profile, invoices],
	);

	const filteredScans = useMemo(() => {
		if (scanFilter === "all") return scans;
		return scans.filter((s) => s.modality === scanFilter);
	}, [scans, scanFilter]);

	const nextApptCountdown = useMemo(() => {
		const targetMs = new Date("2026-09-01T14:30:00+03:00").getTime();
		const nowMs = Date.now();
		const diffMs = targetMs - nowMs;
		if (diffMs <= 0) return "Приём начался";
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const diffDays = Math.floor(diffHours / 24);
		const remHours = diffHours % 24;
		if (diffDays > 0) return `${diffDays} д ${remHours} ч ${diffMins} мин`;
		return `${diffHours} ч ${diffMins} мин`;
	}, []);

	if (!isOpen) return null;

	// SMS Authentication Handlers
	const handleRequestSmsCode = () => {
		if (!authPhone || authPhone.length < 10) {
			setAuthError("Пожалуйста, введите корректный номер телефона");
			return;
		}
		const { code } = generateSmsOtpCode(authPhone, "7788");
		setExpectedOtpCode(code);
		setAuthStep("otp");
		setSmsTimerSeconds(60);
		setIsSmsTimerRunning(true);
		setAuthError(null);
	};

	const handleVerifySmsCode = () => {
		if (!verifySmsOtpCode(otpCode, expectedOtpCode) && otpCode !== "7788") {
			setAuthError("Неверный код из СМС. Введите 7788 для тестового входа.");
			return;
		}
		setIsAuthenticated(true);
		setAuthError(null);
	};

	const handleFastDemoLogin = () => {
		setAuthPhone(profile.phone);
		setIsAuthenticated(true);
		setAuthError(null);
	};

	const handleLogout = () => {
		setIsAuthenticated(false);
		setAuthStep("phone");
		setOtpCode("");
		setAuthError(null);
	};

	const handlePaySbpSimulate = () => {
		setPaymentSuccess(true);
		setTimeout(() => {
			setPayingInvoice(null);
			setPaymentSuccess(false);
		}, 1800);
	};

	const handleDownloadIcs = () => {
		const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DENTE Dental CRM//Mobile Portal//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:dente-appt-next-${Date.now()}@dente.ru\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART:20260901T113000Z\r\nDTEND:20260901T123000Z\r\nSUMMARY:Прием в DENTE: ${profile.curatingDoctor || "Д-р Смирнова Е.В."}\r\nDESCRIPTION:Плановый прием: ${profile.curatingDoctorSpecialty || "Стоматолог-терапевт"}\\nАдрес: Клиника DENTE на Невском, Кабинет 104\\nТел: +7 (812) 309-88-99\r\nLOCATION:Клиника DENTE на Невском, Кабинет 104\r\nSTATUS:CONFIRMED\r\nBEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Напоминание о приеме в клинике DENTE через 2 часа\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
		const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "Dente_Appointment_2026-09-01.ics";
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleOpenGoogleCalendar = () => {
		const title = encodeURIComponent(`Прием в DENTE: ${profile.curatingDoctor || "Д-р Смирнова Е.В."}`);
		const details = encodeURIComponent(`Плановый прием: ${profile.curatingDoctorSpecialty || "Стоматолог-терапевт"}\nАдрес: Клиника DENTE на Невском, Кабинет 104\nТел: +7 (812) 309-88-99`);
		const location = encodeURIComponent("Клиника DENTE на Невском, Кабинет 104");
		const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260901T113000Z/20260901T123000Z&details=${details}&location=${location}`;
		window.open(url, "_blank");
	};

	const handleOpenYandexCalendar = () => {
		const name = encodeURIComponent(`Прием в DENTE: ${profile.curatingDoctor || "Д-р Смирнова Е.В."}`);
		const desc = encodeURIComponent(`Плановый прием: ${profile.curatingDoctorSpecialty || "Стоматолог-терапевт"}\nАдрес: Клиника DENTE на Невском, Кабинет 104\nТел: +7 (812) 309-88-99`);
		const location = encodeURIComponent("Клиника DENTE на Невском, Кабинет 104");
		const url = `https://calendar.yandex.ru/event/new?name=${name}&start_ts=2026-09-01T14:30:00&end_ts=2026-09-01T15:30:00&description=${desc}&location=${location}`;
		window.open(url, "_blank");
	};

	return (
		<div
			className="patient-portal-overlay"
			data-testid="patient-mobile-portal-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
		>
			<div
				className={`patient-portal-modal-window ${isPwaView ? "mode-mobile-pwa" : ""}`}
				data-testid="portal-modal-window"
			>
				{/* Top Smartphone Frame Notch (PWA Mode Only) */}
				{isPwaView && (
					<div className="patient-portal-notch">
						<div className="patient-portal-notch-camera" />
						<div className="patient-portal-notch-speaker" />
					</div>
				)}

				{/* Header */}
				<header className="patient-portal-header">
					<div className="patient-portal-brand">
						<div className="patient-portal-brand-logo">
							<Sparkles className="w-5 h-5 text-white" />
						</div>
						<div className="patient-portal-brand-text">
							<h2 id={modalTitleId}>ДЕНТЕ МОБИЛЬНЫЙ ПОРТАЛ</h2>
							<p>Личный кабинет & Электронная карта (Ф. 043/у)</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* PWA Install Button */}
						<button
							type="button"
							onClick={() => setIsA2hsModalOpen(true)}
							className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--brand,#0d9488)]/20 text-[var(--brand,#0d9488)] border border-[var(--brand,#0d9488)]/30 hover:bg-[var(--brand,#0d9488)]/30 transition-all flex items-center gap-1.5"
							title="Установить DENTE на главный экран"
							data-testid="open-a2hs-modal-btn"
						>
							<Download className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">PWA</span>
						</button>

						{/* Viewport Mode Toggle */}
						<button
							type="button"
							onClick={() => setIsPwaView(!isPwaView)}
							className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--paper-soft,#334155)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.1))] hover:border-[var(--teal,#0d9488)] transition-all flex items-center gap-1.5"
							title={isPwaView ? "Развернуть на весь экран (Десктоп)" : "Переключить в мобильный PWA-вид (375px)"}
							data-testid="toggle-pwa-view-btn"
						>
							{isPwaView ? <Monitor className="w-3.5 h-3.5 text-teal-400" /> : <Smartphone className="w-3.5 h-3.5 text-teal-400" />}
							<span className="hidden sm:inline">{isPwaView ? "Десктоп" : "PWA Смартфон"}</span>
						</button>

						{/* Logout Button (When Logged In) */}
						{isAuthenticated && (
							<button
								type="button"
								onClick={handleLogout}
								className="p-2 rounded-xl text-[var(--muted,#94a3b8)] hover:text-rose-400 hover:bg-[var(--paper-soft,#334155)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
								title="Сменить номер телефона / Выйти"
								data-testid="portal-logout-btn"
							>
								<LogOut className="w-4 h-4" />
							</button>
						)}

						{/* Close Button */}
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#334155)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
							data-testid="close-patient-portal-btn"
							aria-label="Закрыть личный кабинет"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ============================================================ */}
				{/* AUTHENTICATION VIEW: SMS LOGIN WITH 60s RESEND TIMER */}
				{/* ============================================================ */}
				{!isAuthenticated ? (
					<main className="patient-portal-content flex-1 flex flex-col justify-center">
						<div className="portal-auth-container" data-testid="portal-auth-screen">
							<div className="portal-auth-logo-badge">
								<Smartphone className="w-8 h-8 text-white" />
							</div>

							<div>
								<h3 className="portal-auth-title">Вход в мобильный кабинет</h3>
								<p className="portal-auth-subtitle">
									Введите номер телефона для получения 4-значного кода в СМС
								</p>
							</div>

							{authStep === "phone" ? (
								<div className="w-full space-y-3">
									<div className="portal-auth-input-group">
										<label className="portal-auth-input-label">Номер телефона:</label>
										<input
											type="tel"
											value={authPhone}
											onChange={(e) => setAuthPhone(formatRussianPhone(e.target.value))}
											placeholder="+7 (999) 000-00-00"
											className="portal-phone-input"
											data-testid="auth-phone-input"
										/>
									</div>

									{authError && (
										<div className="text-rose-400 text-xs font-semibold flex items-center gap-1.5 text-left">
											<AlertCircle className="w-4 h-4 shrink-0" />
											<span>{authError}</span>
										</div>
									)}

									<button
										type="button"
										onClick={handleRequestSmsCode}
										className="w-full min-h-[48px] rounded-xl font-bold text-xs bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
										data-testid="request-sms-code-btn"
									>
										<Phone className="w-4 h-4" />
										<span>Получить СМС с кодом</span>
									</button>

									<button
										type="button"
										onClick={handleFastDemoLogin}
										className="w-full py-2 text-xs font-semibold text-teal-400 hover:underline"
										data-testid="fast-demo-login-btn"
									>
										Войти как {profile.fullName} (Демо)
									</button>
								</div>
							) : (
								<div className="w-full space-y-3">
									<p className="text-xs text-[var(--muted,#94a3b8)]">
										Код отправлен на номер <strong className="text-white">{authPhone}</strong>. (Тестовый код: <strong className="text-teal-400">7788</strong>)
									</p>

									<div className="portal-otp-boxes">
										<input
											type="text"
											maxLength={4}
											value={otpCode}
											onChange={(e) => setOtpCode(e.target.value)}
											placeholder="7788"
											className="portal-otp-digit w-36"
											autoFocus
											data-testid="auth-sms-otp-input"
										/>
									</div>

									<div className="flex flex-col items-center gap-1">
										{isSmsTimerRunning ? (
											<div className="portal-sms-timer">
												<Clock className="w-3.5 h-3.5 text-teal-400" />
												<span>Повторная отправка через {smsTimerSeconds} сек</span>
											</div>
										) : (
											<button
												type="button"
												onClick={handleRequestSmsCode}
												className="portal-resend-sms-btn"
												data-testid="resend-sms-code-btn"
											>
												<RefreshCw className="w-3.5 h-3.5 mr-1" />
												<span>Отправить код повторно</span>
											</button>
										)}
									</div>

									{authError && (
										<div className="text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5">
											<AlertCircle className="w-4 h-4 shrink-0" />
											<span>{authError}</span>
										</div>
									)}

									<button
										type="button"
										onClick={handleVerifySmsCode}
										className="w-full min-h-[48px] rounded-xl font-bold text-xs bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
										data-testid="verify-sms-code-btn"
									>
										<ShieldCheck className="w-4 h-4" />
										<span>Войти в личный кабинет</span>
									</button>

									<button
										type="button"
										onClick={() => {
											setAuthStep("phone");
											setAuthError(null);
										}}
										className="text-xs text-[var(--muted,#94a3b8)] hover:text-white underline"
									>
										Изменить номер телефона
									</button>
								</div>
							)}
						</div>
					</main>
				) : (
					<>
						{/* Patient Identity & Quick Telemetry Ribbon */}
						<div className="patient-identity-ribbon">
							<div className="patient-info-block">
								<div className="patient-avatar">
									{profile.curatingDoctorAvatar ? (
										<img src={profile.curatingDoctorAvatar} alt={profile.fullName} />
									) : (
										<User className="w-5 h-5" />
									)}
								</div>
								<div>
									<div className="patient-details-name">{profile.fullName}</div>
									<div className="patient-details-meta">
										<span className="patient-card-badge">{profile.cardNumber}</span>
										<span>{profile.phone}</span>
									</div>
								</div>
							</div>

							<div className="patient-finances-quick">
								<div className="quick-balance-chip">
									<div className="quick-balance-label">Депозит</div>
									<div className="quick-balance-val">{profile.depositBalanceRub.toLocaleString("ru-RU")} ₽</div>
								</div>
								<div className="quick-balance-chip">
									<div className="quick-balance-label">{profile.loyaltyTier}</div>
									<div className="quick-balance-val text-amber-400">+{profile.loyaltyBonusRub} Б</div>
								</div>
								{onBookOnlineClick && (
									<button
										type="button"
										onClick={onBookOnlineClick}
										className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md"
										data-testid="portal-quick-book-btn"
									>
										<Calendar className="w-3.5 h-3.5" />
										<span>Записаться онлайн</span>
									</button>
								)}
							</div>
						</div>

						{/* 4 Primary Navigation Tabs */}
						<nav className="patient-portal-tabs" aria-label="Разделы мобильного кабинета">
							<button
								type="button"
								onClick={() => setActiveTab("visits")}
								className={`patient-portal-tab-btn ${activeTab === "visits" ? "active" : ""}`}
								data-testid="tab-visits-btn"
							>
								<Clock className="w-4 h-4" />
								<span>Мои визиты</span>
								<span className="tab-counter-badge">{visits.length}</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("plan")}
								className={`patient-portal-tab-btn ${activeTab === "plan" ? "active" : ""}`}
								data-testid="tab-plan-btn"
							>
								<Layers className="w-4 h-4" />
								<span>План лечения</span>
								<span className="tab-counter-badge">{treatmentPlan.stages.length}</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("scans")}
								className={`patient-portal-tab-btn ${activeTab === "scans" ? "active" : ""}`}
								data-testid="tab-scans-btn"
							>
								<Scan className="w-4 h-4" />
								<span>Снимки</span>
								<span className="tab-counter-badge">{scans.length}</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("finances")}
								className={`patient-portal-tab-btn ${activeTab === "finances" ? "active" : ""}`}
								data-testid="tab-finances-btn"
							>
								<CreditCard className="w-4 h-4" />
								<span>Чеки и счета</span>
								{financialSummary.hasUnpaidInvoices && (
									<span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
										{financialSummary.unpaidInvoicesCount}
									</span>
								)}
							</button>
						</nav>

						{/* Main Body Content Area */}
						<main className="patient-portal-content">
							{/* ============================================================ */}
							{/* TAB 1: МОИ ВИЗИТЫ (VISIT PROTOCOLS & FORM 043/U) */}
							{/* ============================================================ */}
							{activeTab === "visits" && (
								<div className="space-y-4" data-testid="portal-tab-visits-content">
									{/* Subway Offline Ready Upcoming Appointment Card */}
									<UpcomingVisitCard
										onRescheduleClick={onBookOnlineClick}
									/>

									<div className="flex items-center justify-between pt-2">
										<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
											<Clock className="w-4 h-4 text-teal-400" />
											<span>История приемов & Клинические протоколы (ф. 043/у)</span>
										</h3>
										<span className="text-xs text-[var(--muted,#94a3b8)]">Всего визитов: {visits.length}</span>
									</div>

									<div className="space-y-3">
										{visits.map((visit) => {
											const isExpanded = expandedVisitId === visit.id;
											return (
												<div
													key={visit.id}
													className="visit-protocol-card"
													data-testid={`visit-card-${visit.id}`}
												>
													<div
														className="visit-protocol-header cursor-pointer select-none"
														onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
													>
														<div className="space-y-1">
															<div className="flex flex-wrap items-center gap-2">
																<div className="visit-date-badge">
																	<Calendar className="w-3.5 h-3.5" />
																	<span>{visit.dateIso} в {visit.timeRu}</span>
																</div>
																<div className="visit-diagnosis-badge">
																	<span>МКБ-10: {visit.diagnosisIcd10}</span>
																</div>
																{visit.toothFdi && (
																	<span className="visit-tooth-tag">
																		Зуб {visit.toothFdi}
																	</span>
																)}
															</div>
															<div className="text-xs font-bold text-[var(--ink,#f8fafc)]">
																{visit.diagnosisText}
															</div>
															<div className="visit-doctor-meta">
																<span>{visit.doctorName}</span>
																<span>•</span>
																<span>{visit.cabinetNumber}</span>
															</div>
														</div>

														<button
															type="button"
															className="p-1 rounded-lg text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] min-h-[44px] min-w-[44px] flex items-center justify-center"
															aria-label={isExpanded ? "Свернуть протокол" : "Развернуть протокол"}
														>
															{isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
														</button>
													</div>

													{/* Expanded Clinical Details */}
													{isExpanded && (
														<div className="pt-2 border-t border-[var(--line,rgba(255,255,255,0.08))] space-y-3">
															{/* Complaints & Anamnesis */}
															<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
																<div className="p-2.5 rounded-lg bg-[var(--paper-strong,#0f172a)] border border-[var(--line,rgba(255,255,255,0.05))]">
																	<div className="font-bold text-[var(--muted,#94a3b8)] mb-1">Жалобы:</div>
																	<div>{visit.complaints}</div>
																</div>
																<div className="p-2.5 rounded-lg bg-[var(--paper-strong,#0f172a)] border border-[var(--line,rgba(255,255,255,0.05))]">
																	<div className="font-bold text-[var(--muted,#94a3b8)] mb-1">Status Localis (Осмотр):</div>
																	<div>{visit.statusLocalis}</div>
																</div>
															</div>

															{/* Treatment Protocol Body */}
															<div className="visit-protocol-body">
																<div className="font-bold text-teal-400 text-xs mb-1">
																	Протокол лечения & Манипуляции:
																</div>
																<div>{visit.treatmentProtocol}</div>

																{/* Anesthesia Info */}
																<div className="mt-2.5 pt-2 border-t border-[var(--line,rgba(255,255,255,0.08))] flex flex-wrap items-center justify-between text-[11px] text-[var(--muted,#94a3b8)]">
																	<div>
																		<span className="font-bold text-[var(--ink,#f8fafc)]">Анестезия:</span> {visit.anesthesia.anestheticName} ({visit.anesthesia.volumeMl} мл, {visit.anesthesia.method})
																	</div>
																	<div className="flex items-center gap-1 text-emerald-400 font-bold">
																		<CheckCircle2 className="w-3 h-3" />
																		<span>Без осложнений</span>
																	</div>
																</div>
															</div>

															{/* Post-Op Recommendations Memo */}
															{visit.postOpRecommendations && visit.postOpRecommendations.length > 0 && (
																<div className="post-op-memo-box">
																	<div className="post-op-memo-title">
																		<AlertCircle className="w-3.5 h-3.5" />
																		<span>Рекомендации врача после приема:</span>
																	</div>
																	<ul className="post-op-memo-list">
																		{visit.postOpRecommendations.map((rec, idx) => (
																			<li key={idx}>{rec}</li>
																		))}
																	</ul>
																</div>
															)}

															{/* Download Extract Action */}
															<div className="flex items-center justify-end gap-2 pt-1">
																<button
																	type="button"
																	onClick={() => {
																		const blob = new Blob([JSON.stringify(visit, null, 2)], { type: "application/json" });
																		const url = URL.createObjectURL(blob);
																		const a = document.createElement("a");
																		a.href = url;
																		a.download = `Extract_043U_${visit.dateIso}_${visit.toothFdi || "general"}.json`;
																		a.click();
																		URL.revokeObjectURL(url);
																	}}
																	className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.1))] hover:border-[var(--teal,#0d9488)] transition-all flex items-center gap-1.5"
																	data-testid={`download-extract-${visit.id}`}
																>
																	<Download className="w-3.5 h-3.5 text-teal-400" />
																	<span>Скачать выписку ф. 043/у</span>
																</button>
															</div>
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* ============================================================ */}
							{/* TAB 2: ПЛАН ЛЕЧЕНИЯ (TREATMENT PLAN ROADMAP & 13% NDFL) */}
							{/* ============================================================ */}
							{activeTab === "plan" && (
								<div className="space-y-4" data-testid="portal-tab-plan-content">
									<TreatmentPlanRoadmap
										planTitle={treatmentPlan.titleRu}
										planNumber={treatmentPlan.planNumber}
										curatingDoctorName={treatmentPlan.curatingDoctorName}
										patientFullName={profile.fullName}
										onBookStage={() => onBookOnlineClick?.()}
										onRequestTaxCertificate={() => setActiveTab("documents")}
									/>
								</div>
							)}

							{/* ============================================================ */}
							{/* TAB 3: СНИМКИ (RADIOLOGY & X-RAY GALLERY) */}
							{/* ============================================================ */}
							{activeTab === "scans" && (
								<div className="space-y-4" data-testid="portal-tab-scans-content">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
											<Scan className="w-4 h-4 text-teal-400" />
											<span>Рентгенологическая галерея & Лучевой паспорт</span>
										</h3>

										{/* Modality Filter */}
										<div className="flex items-center gap-1 bg-[var(--paper-strong,#0f172a)] p-1 rounded-xl border border-[var(--line,rgba(255,255,255,0.1))]">
											{(["all", "rvg", "optg", "cbct"] as const).map((mode) => (
												<button
													key={mode}
													type="button"
													onClick={() => setScanFilter(mode)}
													className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all min-h-[44px] flex items-center justify-center ${
														scanFilter === mode
															? "bg-[var(--teal-fill,#0d9488)] text-white"
															: "text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
													}`}
													data-testid={`filter-scan-${mode}`}
												>
													{mode === "all" ? "Все" : mode.toUpperCase()}
												</button>
											))}
										</div>
									</div>

									{/* Scans Grid */}
									<div className="radiology-grid">
										{filteredScans.map((scan) => (
											<div
												key={scan.id}
												className="radiology-card"
												data-testid={`scan-card-${scan.id}`}
											>
												<div
													className="radiology-thumb-container"
													onClick={() => {
														setSelectedScan(scan);
														setScanZoom(1);
														setScanInvert(false);
													}}
												>
													<img src={scan.imageUrl} alt={scan.modalityLabel} loading="lazy" />
													<div className="radiology-dose-tag flex items-center gap-1">
														<Sparkles className="w-3 h-3 text-amber-400" />
														<span>{scan.effectiveDoseMicrosv} мкЗв</span>
													</div>
												</div>

												<div className="radiology-card-body">
													<div className="flex items-center justify-between text-[11px] text-[var(--muted,#94a3b8)]">
														<span>{scan.studyDateIso}</span>
														<span className="font-mono font-bold text-teal-400 uppercase">
															{scan.modality}
														</span>
													</div>

													<div className="radiology-card-title">{scan.modalityLabel}</div>

													{scan.toothFdi && scan.toothFdi.length > 0 && (
														<div className="flex flex-wrap gap-1 my-1">
															{scan.toothFdi.map((tooth) => (
																<span
																	key={tooth}
																	className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20"
																>
																	{formatFdiToothName(tooth)}
																</span>
															))}
														</div>
													)}

													<p className="radiology-card-conclusion">{scan.diagnosticConclusion}</p>

													<button
														type="button"
														onClick={() => {
															setSelectedScan(scan);
															setScanZoom(1);
															setScanInvert(false);
														}}
														className="w-full min-h-[44px] py-1.5 rounded-xl text-xs font-bold bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.1))] hover:border-[var(--teal,#0d9488)] transition-all flex items-center justify-center gap-1.5 mt-auto"
														data-testid={`open-scan-viewer-${scan.id}`}
													>
														<Eye className="w-3.5 h-3.5 text-teal-400" />
														<span>Просмотр снимка</span>
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* ============================================================ */}
							{/* TAB 4: ЧЕКИ И СЧЕТА (54-FZ FISCAL RECEIPT, SBP & TAX REFUND) */}
							{/* ============================================================ */}
							{activeTab === "finances" && (
								<div className="space-y-4" data-testid="portal-tab-finances-content">
									{/* Financial Summary Hero Grid */}
									<div className="finances-summary-hero">
										<div className="fin-metric-item">
											<div className="fin-metric-label">Баланс депозита</div>
											<div className="fin-metric-val deposit">
												{financialSummary.depositBalanceRub.toLocaleString("ru-RU")} ₽
											</div>
										</div>

										<div className="fin-metric-item">
											<div className="fin-metric-label">Всего оплачено</div>
											<div className="fin-metric-val">
												{financialSummary.totalPaidRub.toLocaleString("ru-RU")} ₽
											</div>
										</div>

										<div className="fin-metric-item">
											<div className="fin-metric-label">К оплате (Остаток)</div>
											<div className={`fin-metric-val ${financialSummary.totalRemainingRub > 0 ? "unpaid" : ""}`}>
												{financialSummary.totalRemainingRub.toLocaleString("ru-RU")} ₽
											</div>
										</div>

										<div className="fin-metric-item">
											<div className="fin-metric-label">Бонусный кэшбэк</div>
											<div className="fin-metric-val bonus">
												{financialSummary.loyaltyBonusRub.toLocaleString("ru-RU")} Б
											</div>
										</div>
									</div>

									{/* Installment Plan Status Card */}
									<div className="p-4 rounded-2xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,rgba(255,255,255,0.1))] space-y-2.5" data-testid="installment-plan-card">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<CreditCard className="w-4 h-4 text-amber-400" />
												<strong className="text-xs font-bold text-[var(--ink,#f8fafc)]">Беспроцентная рассрочка клиники (0-0-12)</strong>
											</div>
											<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
												Активна: 4 из 12 взносов
											</span>
										</div>
										<div className="w-full bg-[var(--paper-strong,#0f172a)] h-2 rounded-full overflow-hidden">
											<div className="bg-amber-400 h-full rounded-full" style={{ width: "33.3%" }} />
										</div>
										<div className="flex items-center justify-between text-[11px] text-[var(--muted,#94a3b8)]">
											<span>Выплачено: <strong className="text-[var(--ink,#f8fafc)]">45 000 ₽</strong> из 135 000 ₽</span>
											<span>Следующий платёж: <strong className="text-amber-400">11 250 ₽ до 15.09</strong></span>
										</div>
									</div>

									{/* Invoices & 54-FZ Checks List */}
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<h4 className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
												Счета за оказанные услуги & Фискальные чеки (54-ФЗ)
											</h4>
											<button
												type="button"
												onClick={() => setShowTaxCertificate(true)}
												className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 transition-all flex items-center gap-1.5"
												data-testid="generate-tax-certificate-btn"
											>
												<FileCheck2 className="w-3.5 h-3.5" />
												<span>Справка для ФНС (13%)</span>
											</button>
										</div>

										{invoices.map((inv) => (
											<div
												key={inv.id}
												className={`invoice-item-card ${inv.status === "unpaid" ? "unpaid" : ""}`}
												data-testid={`invoice-card-${inv.id}`}
											>
												<div className="flex flex-wrap items-start justify-between gap-2">
													<div>
														<div className="flex items-center gap-2">
															<span className="font-mono font-bold text-xs text-[var(--ink,#f8fafc)]">
																{inv.invoiceNumber}
															</span>
															<span
																className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
																	inv.status === "paid"
																		? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
																		: "bg-rose-500/10 text-rose-400 border border-rose-500/20"
																}`}
															>
																{inv.status === "paid" ? "Оплачено" : "Ожидает оплаты"}
															</span>
														</div>
														<div className="text-xs font-bold text-[var(--ink,#f8fafc)] mt-1">
															{inv.titleRu}
														</div>
														<div className="text-[11px] text-[var(--muted,#94a3b8)]">
															Дата выставления: {inv.issueDateIso}
														</div>
													</div>

													<div className="text-right">
														<div className="text-base font-black text-[var(--ink,#f8fafc)]">
															{inv.totalAmountRub.toLocaleString("ru-RU")} ₽
														</div>
														{inv.status === "paid" && (
															<div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
																<CheckCircle2 className="w-3 h-3" />
																<span>Оплачено через СБП</span>
															</div>
														)}
													</div>
												</div>

												{/* Items list */}
												<div className="p-2.5 rounded-xl bg-[var(--paper-strong,#0f172a)] space-y-1.5 text-xs">
													{inv.items.map((item, idx) => (
														<div key={idx} className="flex items-center justify-between text-[11px]">
															<span className="text-[var(--muted,#94a3b8)]">
																{item.titleRu} {item.toothFdi ? `(зуб ${item.toothFdi})` : ""}
															</span>
															<span className="font-bold text-[var(--ink,#f8fafc)]">
																{item.totalRub.toLocaleString("ru-RU")} ₽
															</span>
														</div>
													))}
												</div>

												{/* Action buttons */}
												<div className="flex flex-wrap items-center justify-end gap-2">
													{inv.fiscalReceipt && (
														<button
															type="button"
															onClick={() => setActiveFiscalReceipt(inv.fiscalReceipt || null)}
															className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.1))] hover:border-[var(--teal,#0d9488)] transition-all flex items-center gap-1.5"
															data-testid={`view-fiscal-receipt-${inv.id}`}
														>
															<Receipt className="w-3.5 h-3.5 text-teal-400" />
															<span>Фискальный чек 54-ФЗ (ФД-{inv.fiscalReceipt.fdNumber})</span>
														</button>
													)}

													{inv.status === "unpaid" && (
														<button
															type="button"
															onClick={() => setPayingInvoice(inv)}
															className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md"
															data-testid={`pay-invoice-sbp-btn-${inv.id}`}
														>
															<QrCode className="w-3.5 h-3.5" />
															<span>Оплатить через СБП ({inv.remainingAmountRub.toLocaleString("ru-RU")} ₽)</span>
														</button>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</main>
					</>
				)}

				{/* PWA Simulated Bottom Home Indicator */}
				{isPwaView && <div className="patient-portal-home-bar" />}
			</div>

			{/* ============================================================ */}
			{/* SUB-MODAL: INTERACTIVE RADIOLOGY VIEWER */}
			{/* ============================================================ */}
			{selectedScan && (
				<div className="patient-portal-overlay z-50" data-testid="radiology-scan-viewer-modal">
					<div className="bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] border border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.15))] rounded-2xl p-4 max-w-2xl w-full flex flex-col gap-3 shadow-2xl">
						<div className="flex items-center justify-between border-b border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.1))] pb-3">
							<div>
								<h3 className="font-bold text-sm text-[var(--ink,#f8fafc)] flex items-center gap-2">
									<Scan className="w-4 h-4 text-teal-400" />
									<span>{selectedScan.modalityLabel}</span>
								</h3>
								<p className="text-xs text-[var(--muted,#94a3b8)]">
									{selectedScan.studyDateIso} • Доза: {selectedScan.effectiveDoseMicrosv} мкЗв ({selectedScan.apparatusModel || "Vatech"})
								</p>
							</div>
							<button
								type="button"
								onClick={() => setSelectedScan(null)}
								className="p-1 rounded-xl text-[var(--muted,#94a3b8)] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
								data-testid="close-scan-viewer-btn"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Interactive Viewer Toolbar */}
						<div className="flex items-center justify-between gap-2 bg-[var(--paper-strong,#0f172a)] p-2 rounded-xl border border-[var(--line,rgba(255,255,255,0.08))]">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setScanZoom((prev) => Math.min(prev + 0.25, 3))}
									className="min-h-[44px] min-w-[44px] px-3 py-1 text-xs rounded bg-[var(--paper-soft,#334155)] hover:bg-[var(--teal,#0d9488)] flex items-center justify-center gap-1 font-bold"
									title="Увеличить масштаб"
								>
									<ZoomIn className="w-3.5 h-3.5" />
									<span>+</span>
								</button>
								<button
									type="button"
									onClick={() => setScanZoom((prev) => Math.max(prev - 0.25, 0.75))}
									className="min-h-[44px] min-w-[44px] px-3 py-1 text-xs rounded bg-[var(--paper-soft,#334155)] hover:bg-[var(--teal,#0d9488)] flex items-center justify-center gap-1 font-bold"
									title="Уменьшить масштаб"
								>
									<ZoomOut className="w-3.5 h-3.5" />
									<span>-</span>
								</button>
								<button
									type="button"
									onClick={() => setScanInvert(!scanInvert)}
									className={`min-h-[44px] px-3 py-1 text-xs rounded flex items-center gap-1 font-bold ${
										scanInvert ? "bg-teal-500 text-white" : "bg-[var(--paper-soft,#334155)] text-[var(--ink,#f8fafc)]"
									}`}
									title="Инвертировать рентгеновский контраст"
									data-testid="toggle-scan-invert-btn"
								>
									<Contrast className="w-3.5 h-3.5" />
									<span>Негатив</span>
								</button>
							</div>

							<div className="text-xs font-mono text-teal-400 font-bold">
								{Math.round(scanZoom * 100)}%
							</div>
						</div>

						{/* Image Canvas Container */}
						<div className="relative bg-black rounded-xl overflow-hidden h-[340px] flex items-center justify-center border border-[var(--line,rgba(255,255,255,0.1))]">
							<img
								src={selectedScan.imageUrl}
								alt={selectedScan.modalityLabel}
								style={{
									transform: `scale(${scanZoom})`,
									filter: scanInvert ? "invert(1) contrast(1.3)" : "contrast(1.1)",
									transition: "transform 0.15s ease",
									maxWidth: "100%",
									maxHeight: "100%",
									objectFit: "contain",
								}}
							/>
						</div>

						<div className="text-xs text-[var(--muted,#94a3b8)] bg-[var(--paper-strong,#0f172a)] p-3 rounded-xl">
							<span className="font-bold text-[var(--ink,#f8fafc)]">Заключение: </span>
							{selectedScan.diagnosticConclusion}
						</div>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* SUB-MODAL: 54-FZ FISCAL RECEIPT THERMAL PREVIEW */}
			{/* ============================================================ */}
			{activeFiscalReceipt && (
				<div className="patient-portal-overlay z-50" data-testid="fiscal-receipt-modal">
					<div className="bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] border border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.15))] rounded-2xl p-4 max-w-sm w-full flex flex-col gap-3 shadow-2xl">
						<div className="flex items-center justify-between pb-2 border-b border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.1))]">
							<h3 className="font-bold text-xs text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)]">
								Кассовый чек (54-ФЗ ОФД)
							</h3>
							<button
								type="button"
								onClick={() => setActiveFiscalReceipt(null)}
								className="p-1 rounded-xl text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)] hover:text-slate-900 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
								data-testid="close-fiscal-receipt-btn"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="fiscal-receipt-thermal" data-testid="thermal-receipt-paper">
							<div className="fiscal-receipt-header">
								<div className="font-black text-sm">ООО «СТОМАТОЛОГИЯ ДЕНТЕ»</div>
								<div>ИНН 7701234567 • КПП 770101001</div>
								<div>г. Санкт-Петербург, Невский пр-т, 140</div>
								<div className="mt-1 font-bold">КАССОВЫЙ ЧЕК / ПРИХОД</div>
							</div>

							<div className="space-y-1.5 my-2">
								{activeFiscalReceipt.items.map((it, idx) => (
									<div key={idx} className="flex justify-between items-start gap-2">
										<div className="text-xs break-words flex-1 leading-snug">{it.titleRu}</div>
										<div className="font-bold whitespace-nowrap">{it.totalRub.toFixed(2)}</div>
									</div>
								))}
							</div>

							<div className="border-t border-dashed border-slate-600 pt-1.5 mt-2 flex justify-between font-black text-sm">
								<div>ИТОГО К ОПЛАТЕ:</div>
								<div>{activeFiscalReceipt.totalAmountRub.toFixed(2)} ₽</div>
							</div>
							<div className="text-[10px] text-slate-600">{activeFiscalReceipt.vatRateRu}</div>

							<div className="fiscal-receipt-qr">
								<div className="p-2 bg-white rounded border border-slate-300 flex flex-col items-center">
									<div
										dangerouslySetInnerHTML={{
											__html: generateQrCodeSvg(
												`https://receipt.nalog.ru/v1/check?fn=${activeFiscalReceipt.fnNumber}&fd=${activeFiscalReceipt.fdNumber}&fpd=${activeFiscalReceipt.fpdNumber}&sum=${Math.round(activeFiscalReceipt.totalAmountRub * 100)}`,
												{ size: 110, color: "#0f172a", background: "#ffffff" },
											),
										}}
									/>
									<div className="text-[9px] font-mono mt-1 text-slate-500 font-bold">Проверка в ФНС РФ (54-ФЗ)</div>
								</div>
							</div>

							<div className="text-[10px] space-y-0.5 text-slate-700 font-mono">
								<div>ФН: {activeFiscalReceipt.fnNumber}</div>
								<div>ФД: {activeFiscalReceipt.fdNumber}</div>
								<div>ФПД: {activeFiscalReceipt.fpdNumber}</div>
								<div>ОФД: {activeFiscalReceipt.ofdName}</div>
								<div>ДАТА: {activeFiscalReceipt.dateIso}</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* SUB-MODAL: 1-CLICK SBP PAYMENT QR SHEET */}
			{/* ============================================================ */}
			{payingInvoice && (
				<div className="patient-portal-overlay z-50" data-testid="sbp-payment-modal">
					<div className="bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] border border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.15))] rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
						<div className="flex items-center justify-between pb-2 border-b border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.1))]">
							<div className="sbp-logo-badge">
								<QrCode className="w-4 h-4 text-teal-700 dark:text-teal-400" />
								<span>СБП ПЛАТЕЖ</span>
							</div>
							<button
								type="button"
								onClick={() => setPayingInvoice(null)}
								className="p-1 rounded-xl text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)] hover:text-slate-900 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
								data-testid="close-sbp-modal-btn"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{paymentSuccess ? (
							<div className="py-8 flex flex-col items-center text-center gap-3">
								<div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
									<CheckCircle2 className="w-10 h-10" />
								</div>
								<div className="font-bold text-base text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)]">Оплата успешно проведена!</div>
								<p className="text-xs text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)]">
									Счет {payingInvoice.invoiceNumber} оплачен. Фискальный чек отправлен в личный кабинет и налоговую по 54-ФЗ.
								</p>
							</div>
						) : (
							<div className="flex flex-col items-center text-center gap-3">
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)]">К оплате по счету {payingInvoice.invoiceNumber}:</div>
									<div className="text-2xl font-black text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] mt-1">
										{payingInvoice.remainingAmountRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>

								<div
									className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center mx-auto"
									dangerouslySetInnerHTML={{
										__html: generateQrCodeSvg(
											generateSbpPaymentQrPayload(
												payingInvoice.id,
												payingInvoice.remainingAmountRub,
												`Оплата по счету ${payingInvoice.invoiceNumber}`,
											),
											{ size: 160, color: "#0f172a", background: "#ffffff" },
										),
									}}
									data-testid="sbp-mobile-qr-svg-wrapper"
								/>

								<p className="text-xs text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)] leading-relaxed">
									Отсканируйте QR-код в приложении любого банка (Сбер, Т-Банк, ВТБ, Альфа) без комиссии.
								</p>

								<button
									type="button"
									onClick={handlePaySbpSimulate}
									className="w-full min-h-[48px] rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
									data-testid="confirm-sbp-payment-sim-btn"
								>
									<CheckCircle2 className="w-4 h-4" />
									<span>Я оплатил в банковском приложении</span>
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* SUB-MODAL: FNS TAX DEDUCTION CERTIFICATE (КНД 1151156) */}
			{/* ============================================================ */}
			{showTaxCertificate && (
				<div className="patient-portal-overlay z-50" data-testid="tax-certificate-modal">
					<div className="bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] border border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.15))] rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.1))]">
							<div>
								<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] flex items-center gap-2">
									<FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
									<span>Справка об оплате медицинских услуг (ФНС КНД 1151156)</span>
								</h3>
								<p className="text-xs text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)]">Для социального налогового вычета по НДФЛ 13%</p>
							</div>
							<button
								type="button"
								onClick={() => setShowTaxCertificate(false)}
								className="p-1 rounded-xl text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)] hover:text-slate-900 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
								data-testid="close-tax-certificate-btn"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-4 rounded-xl bg-[var(--paper-strong,#0f172a)] space-y-2.5 text-xs">
							<div className="flex justify-between pb-2 border-b border-[var(--line,rgba(255,255,255,0.08))]">
								<span className="text-[var(--muted,#94a3b8)]">Налогоплательщик (Пациент):</span>
								<span className="font-bold text-[var(--ink,#f8fafc)]">{fnsCertificateData.patientFullName}</span>
							</div>
							<div className="flex justify-between pb-2 border-b border-[var(--line,rgba(255,255,255,0.08))]">
								<span className="text-[var(--muted,#94a3b8)]">Медицинская организация:</span>
								<span className="font-bold text-[var(--ink,#f8fafc)]">{fnsCertificateData.clinicName}</span>
							</div>
							<div className="flex justify-between pb-2 border-b border-[var(--line,rgba(255,255,255,0.08))]">
								<span className="text-[var(--muted,#94a3b8)]">ИНН / КПП клиники:</span>
								<span className="font-mono text-[var(--ink,#f8fafc)]">{fnsCertificateData.clinicInn} / {fnsCertificateData.clinicKpp}</span>
							</div>
							<div className="flex justify-between pb-2 border-b border-[var(--line,rgba(255,255,255,0.08))]">
								<span className="text-[var(--muted,#94a3b8)]">Сумма расходов за {fnsCertificateData.taxYear} г.:</span>
								<span className="font-bold text-teal-400 text-sm">
									{fnsCertificateData.totalPaidEligibleRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<div className="flex justify-between pt-1 font-bold text-emerald-400">
								<span>Расчетный возврат 13% НДФЛ:</span>
								<span>+{fnsCertificateData.maxDeductionRefundRub.toLocaleString("ru-RU")} ₽</span>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									const blob = new Blob([JSON.stringify(fnsCertificateData, null, 2)], { type: "application/json" });
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = `FNS_Tax_1151156_${fnsCertificateData.taxYear}.json`;
									a.click();
									URL.revokeObjectURL(url);
								}}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md"
								data-testid="download-fns-certificate-btn"
							>
								<Download className="w-3.5 h-3.5" />
								<span>Скачать справку (КНД 1151156)</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* SUB-MODAL: RECEPTION CHECK-IN QR */}
			{/* ============================================================ */}
			{isReceptionQrOpen && (
				<div className="patient-portal-overlay z-50" data-testid="reception-qr-modal">
					<div className="bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] border border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.15))] rounded-2xl p-5 max-w-sm w-full flex flex-col items-center text-center gap-3 shadow-2xl">
						<div className="flex items-center justify-between w-full pb-2 border-b border-[var(--border,#e2e8f0)] dark:border-[var(--line,rgba(255,255,255,0.1))]">
							<strong className="text-sm font-bold flex items-center gap-1.5">
								<QrCode className="w-4 h-4 text-teal-400" />
								<span>Быстрая регистрация</span>
							</strong>
							<button
								type="button"
								onClick={() => setIsReceptionQrOpen(false)}
								className="p-1 rounded-xl text-[var(--muted,#94a3b8)] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
								data-testid="close-reception-qr-btn"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div
							className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200"
							dangerouslySetInnerHTML={{
								__html: generateQrCodeSvg(`https://dente.ru/checkin?patientId=${profile.cardNumber}&t=nextAppt`, {
									size: 180,
									color: "#0f172a",
									background: "#ffffff",
								}),
							}}
						/>

						<div className="space-y-1">
							<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)]">
								{profile.fullName} ({profile.cardNumber})
							</div>
							<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)]">
								Покажите этот экран администратору при входе для автоматической отметки о прибытии на приём без очереди.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* SUB-MODAL: ADD TO HOME SCREEN (A2HS) PROMPT */}
			{/* ============================================================ */}
			<A2hsPromptModal
				isOpen={isA2hsModalOpen}
				onClose={() => setIsA2hsModalOpen(false)}
			/>
		</div>
	);
};

export default PatientMobilePortalModal;

