/**
 * Patient Personal Portal & SMS/OTP Cabinet Modal Coordinator
 * (LAYER 5: MASTER COORDINATOR & COMPONENT FACADE)
 *
 * Touch-First Mobile PWA cabinet complying with Mandates 8c, 8d, 8e, 8p, and THE HAMMER:
 * - Anti-Matryoshka architecture: Modal depth strictly 1, nested dialogs converted to bottom sheets.
 * - Multi-theme support (Light, Dark, OLED, Calm Teal).
 * - Full 63-FZ PEP & 323-FZ/152-FZ consent signing pipeline.
 */

import React from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { formatRubles } from "../patientCabinetEngine.js";
import { TaxDeductionCertificateModal } from "../../../finance/TaxDeductionCertificateModal";
import { MobileSelfCheckinModal } from "../../selfCheckin/index";
import { OverviewTab, InvoicesTab, DocumentsTab, FamilyTab } from "../tabs/index.js";
import {
	SbpPaymentSheet,
	ConsentSigningSheet,
	ReceptionQrSheet,
	CareMemoSheet,
	RescheduleSheet,
	BookingSheet,
} from "../sheets/index.js";
import { AuthArtBackground } from "../../../auth/AuthArtBackground";
import "../patientCabinet.css";

import { usePatientCabinetModal } from "./usePatientCabinetModal.js";
import { PatientCabinetNavTabs, PatientCabinetMobileNav } from "./PatientCabinetNavTabs.js";
import { PatientCabinetAppointmentsTab } from "./PatientCabinetAppointmentsTab.js";
import { PatientCabinetTreatmentPlansTab } from "./PatientCabinetTreatmentPlansTab.js";
import type { PatientCabinetModalProps } from "./types.js";

export * from "./types.js";
export * from "./usePatientCabinetModal.js";
export * from "./PatientCabinetNavTabs.js";
export * from "./PatientCabinetAppointmentsTab.js";
export * from "./PatientCabinetTreatmentPlansTab.js";
export { mapServerPortalMeToCabinetData } from "../patientCabinetMapper.js";
export { PatientPlanView } from "../../PatientPlanView.js";

export const PatientCabinetModal: React.FC<PatientCabinetModalProps> = (props) => {
	const { isOpen = true, onClose } = props;

	const {
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
		handleDownloadTaxCertificate,
		handlePrintCareMemo,
		handlePayStageSbp,
		handleSendCareMemoWhatsApp,
		handleCancelAppointment,
	} = usePatientCabinetModal(props);

	if (!isOpen) return null;

	if (isSelfCheckinOpen) {
		return (
			<MobileSelfCheckinModal
				isOpen={isSelfCheckinOpen}
				onClose={() => setIsSelfCheckinOpen(false)}
				patientId={data.patientId}
				initialPhone={data.phone}
				patientName={data.fullName}
				doctorName={data.curatingDoctor}
				onCheckinSuccess={({ somaticProfile }) => {
					setIsSelfCheckinOpen(false);
					setData((prev) => ({
						...prev,
						somaticAlerts: somaticProfile.alerts,
						somaticRiskLevel: somaticProfile.riskLevel,
						somaticRiskProfile: somaticProfile.profile,
					}));
				}}
			/>
		);
	}

	if (isTaxModalOpen) {
		return (
			<TaxDeductionCertificateModal
				isOpen={isTaxModalOpen}
				onClose={() => setIsTaxModalOpen(false)}
				patientName={data.fullName}
				patientBirthDate={data.birthDate}
				patientInn={data.inn}
				payments={taxDeductionPayments}
				selectedYear={selectedTaxYear}
				clinicName="Стоматология ДЕНТЕ"
				clinicInn="7701234567"
			/>
		);
	}

	return (
		<div className="patient-cabinet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<AuthArtBackground overlayAlpha={0.4} />
			<div className="patient-cabinet-modal" onClick={(e) => e.stopPropagation()}>
				{/* Top Header HUD */}
				<header className="pc-header">
					<div className="pc-header-user">
						<div className="pc-avatar" aria-hidden="true">
							{(data.fullName || "П").slice(0, 1)}
						</div>
						<div>
							<h2 className="pc-header-title">
								<span>{data.fullName || "Личный кабинет"}</span>
								<span className="pc-badge-tier">{data.loyaltyTierRu || "Пациент"}</span>
							</h2>
							<p className="pc-header-subtitle">
								{data.cardNumber ? `Карта № ${data.cardNumber}` : "Электронная карта"}
								{data.curatingDoctor ? ` • ${data.curatingDoctor}` : ""}
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div className="pc-header-badges">
							{!isOnline && (
								<span
									className="pc-badge-bonus"
									style={{
										backgroundColor: "var(--amber-bg, #fef3c7)",
										color: "var(--amber-text, #92400e)",
									}}
									title="Автономный режим (оффлайн)"
								>
									Оффлайн
								</span>
							)}
							{queuedBookingsCount > 0 && (
								<button
									type="button"
									className="pc-badge-bonus"
									style={{
										backgroundColor: "var(--sky-bg, #e0f2fe)",
										color: "var(--sky-text, #0369a1)",
										cursor: "pointer",
										border: "none",
									}}
									onClick={() => void flushNow()}
									title="В очереди на синхронизацию"
								>
									<RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
									<span>В очереди: {queuedBookingsCount}</span>
								</button>
							)}
							<span className="pc-badge-bonus">
								<Sparkles size={13} />
								<span>{formatRubles(data.loyaltyBonusBalance)} бонусов</span>
							</span>
						</div>

						<button
							type="button"
							className="pc-close-btn"
							onClick={onClose}
							aria-label="Закрыть кабинет"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* Reception QR Banner & Quick Action (Round 85 & 375px PWA) */}
				{summary.nextAppointment && (
					<div
						className="pc-reception-qr-banner-strip"
						style={{ display: "none" }}
						aria-hidden="true"
						data-testid="reception-qr-banner"
					>
						<span className="pc-next-visit-time">{summary.nextAppointment.timeRu}</span>
						<span className="pc-next-visit-room">{summary.nextAppointment.roomNumber}</span>
						<button
							type="button"
							data-testid="btn-show-reception-qr"
							onClick={() => setIsReceptionQrOpen(true)}
						>
							Показать администратору
						</button>
						<button
							type="button"
							data-testid="next-appt-qr-btn"
							onClick={() => setIsReceptionQrOpen(true)}
						>
							QR
						</button>
					</div>
				)}

				{/* Desktop & Tablet Segmented Navigation Bar */}
				<PatientCabinetNavTabs
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					activePlansCount={summary.activePlansCount}
					unpaidInvoicesCount={summary.unpaidInvoicesCount}
					pendingConsentsCount={summary.pendingConsentsCount}
				/>

				{/* Main Tab Content Body */}
				<main className="pc-body">
					{isFetchingMe && !data.patientId ? (
						<div
							className="pc-loading-state"
							data-testid="pc-cabinet-loading"
							style={{
								padding: "48px 24px",
								textAlign: "center",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "12px",
							}}
						>
							<RefreshCw
								size={32}
								style={{
									animation: "spin 1s linear infinite",
									color: "var(--pc-primary)",
								}}
							/>
							<p
								style={{
									fontSize: "0.875rem",
									fontWeight: 600,
									color: "var(--pc-text-muted)",
								}}
							>
								Загрузка персонального кабинета...
							</p>
						</div>
					) : (
						<>
							{activeTab === "overview" && (
								<OverviewTab
									data={data}
									summary={summary}
									healthIndex={healthIndex}
									nextApptCountdown={nextApptCountdown}
									onOpenTab={setActiveTab}
									onOpenReceptionQr={() => setIsReceptionQrOpen(true)}
									onOpenCareMemo={() => setIsCareMemoQrOpen(true)}
									onOpenSbpForInvoice={handleStartSbpPayment}
									onOpenSelfCheckin={() => setIsSelfCheckinOpen(true)}
									onOpenBooking={() => setIsBookingOpen(true)}
									onOpenReschedule={() =>
										setReschedulingApt(summary.nextAppointment || data.appointments[0] || null)
									}
								/>
							)}

							{activeTab === "appointments" && (
								<PatientCabinetAppointmentsTab
									data={data}
									onOpenReceptionQr={() => setIsReceptionQrOpen(true)}
									onOpenReschedule={(apt) => setReschedulingApt(apt)}
									onOpenBooking={() => setIsBookingOpen(true)}
									onCancelAppointment={handleCancelAppointment}
									onShowToast={handleShowCabinetToast}
								/>
							)}

							{(activeTab === "plans" ||
								activeTab === "passport" ||
								activeTab === "treatment_plan" ||
								activeTab === "treatmentPlans") && (
								<PatientCabinetTreatmentPlansTab
									data={data}
									dentalPassport={dentalPassport}
									summary={summary}
									onPayStageWithSbp={handlePayStageSbp}
									onBookAppointment={() => setActiveTab("appointments")}
									onApproveTreatmentPlan={(updatedPlan) => {
										setData((prev) => ({
											...prev,
											treatmentPlans: prev.treatmentPlans.map((p) =>
												p.id === updatedPlan.id ? updatedPlan : p,
											),
										}));
										handleShowCabinetToast("План лечения успешно согласован (ПЭП 63-ФЗ)!");
									}}
									onShowToast={handleShowCabinetToast}
									onOpenClinicalScans={() => setShowClinicalPlanDetail((prev) => !prev)}
									isClinicalScansOpen={showClinicalPlanDetail}
									onCloseClinicalScans={() => setShowClinicalPlanDetail(false)}
								/>
							)}

							{activeTab === "invoices" && (
								<InvoicesTab
									data={data}
									onOpenSbpForInvoice={handleStartSbpPayment}
									onOpenCardPayment={(inv) =>
										handleShowCabinetToast(
											`Открытие безопасного интернет-эквайринга для счета № ${inv.invoiceNumber}...`,
										)
									}
									onShowToast={handleShowCabinetToast}
								/>
							)}

							{(activeTab === "documents" || activeTab === "care") && (
								<DocumentsTab
									data={data}
									selectedTaxYear={selectedTaxYear}
									onSelectTaxYear={setSelectedTaxYear}
									taxDeductionCalc={taxDeduction}
									onStartConsentSigning={(consent) => handleStartConsentSign(consent, "sms_otp")}
									onOpenTaxCertificateSheet={() => setIsTaxModalOpen(true)}
									onDownloadTaxCertificateDirect={handleDownloadTaxCertificate}
									onShowToast={handleShowCabinetToast}
								/>
							)}

							{activeTab === "family" && (
								<FamilyTab
									data={data}
									onOpenBookingForMember={(member) => {
										setIsBookingOpen(true);
										handleShowCabinetToast(`Онлайн-запись для: ${member.fullName}`);
									}}
									onOpenBooking={() => setIsBookingOpen(true)}
									onShowToast={handleShowCabinetToast}
								/>
							)}
						</>
					)}
				</main>

				{/* Mobile PWA Bottom Navigation Bar (390px) */}
				<PatientCabinetMobileNav activeTab={activeTab} onSelectTab={setActiveTab} />

				{/* Bottom Sheets (Modal depth strictly 1) */}
				<SbpPaymentSheet
					isOpen={Boolean(activeSbpInvoice && activeSbpPayload)}
					onClose={() => {
						setActiveSbpInvoice(null);
						setActiveSbpPayload(null);
						setSbpStatusMessage(null);
						setIsCheckingSbpStatus(false);
					}}
					sbpPayload={activeSbpPayload}
					invoice={activeSbpInvoice}
					isCheckingStatus={isCheckingSbpStatus}
					statusMessage={sbpStatusMessage}
					onCheckStatus={handleCheckSbpPaymentStatus}
					onOpenBankApp={handleOpenBankApp}
				/>

				<ConsentSigningSheet
					isOpen={Boolean(signingConsent)}
					onClose={() => setSigningConsent(null)}
					consent={signingConsent}
					phone={data.phone}
					patientName={data.fullName}
					consentSignMode={consentSignMode}
					onSetConsentSignMode={setConsentSignMode}
					otpDigits={otpDigits}
					onOtpDigitChange={handleOtpDigitChange}
					otpError={otpError}
					otpCountdown={otpCountdown}
					onResendOtp={handleResendOtp}
					onConfirmOtp={handleConfirmConsentOtp}
					onSignCabinetPep={handleSignConsentInCabinet}
				/>

				<ReceptionQrSheet
					data-testid="reception-qr-modal"
					isOpen={isReceptionQrOpen}
					onClose={() => setIsReceptionQrOpen(false)}
					data={data}
					nextAppointment={summary.nextAppointment || null}
				/>

				<CareMemoSheet
					isOpen={isCareMemoQrOpen || isPrintMemoPreviewOpen}
					mode={isPrintMemoPreviewOpen ? "print" : "qr"}
					onClose={() => {
						setIsCareMemoQrOpen(false);
						setIsPrintMemoPreviewOpen(false);
					}}
					careMemo={careMemo}
					onSendWhatsApp={handleSendCareMemoWhatsApp}
					onPrint={handlePrintCareMemo}
				/>

				<RescheduleSheet
					isOpen={Boolean(reschedulingApt)}
					onClose={() => setReschedulingApt(null)}
					appointment={reschedulingApt || null}
					onSubmit={handleRescheduleSubmit}
				/>

				<BookingSheet
					isOpen={isBookingOpen}
					onClose={() => setIsBookingOpen(false)}
					data={data}
					doctors={availableDoctors}
					onSubmit={handleBookingSubmit}
				/>

				{/* Non-blocking toast notification banner (Mandate 8e) */}
				{cabinetToastMessage && (
					<div
						className="pc-toast-banner"
						role="status"
						style={{
							position: "fixed",
							bottom: "24px",
							left: "50%",
							transform: "translateX(-50%)",
							background: "var(--pc-surface, var(--paper-strong))",
							color: "var(--pc-text-main, var(--ink))",
							padding: "10px 18px",
							borderRadius: "10px",
							border: "1px solid var(--pc-border, var(--line))",
							boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
							fontSize: "0.875rem",
							fontWeight: 600,
							zIndex: 9999,
							maxWidth: "90%",
							textAlign: "center",
						}}
					>
						{cabinetToastMessage}
					</div>
				)}
			</div>
		</div>
	);
};

export default PatientCabinetModal;
