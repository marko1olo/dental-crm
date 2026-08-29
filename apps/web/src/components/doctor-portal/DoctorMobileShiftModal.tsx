import type React from "react";
import { useMemo, useState, useEffect } from "react";
import {
	Activity,
	AlertCircle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	FileBadge,
	FileCheck2,
	FileText,
	KeyRound,
	Lock,
	Phone,
	RefreshCw,
	Shield,
	ShieldCheck,
	Smartphone,
	Sparkles,
	User,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import {
	filterDoctorShiftAppointments,
	calculateDoctorShiftEarnings,
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	transitionAppointmentStatus,
	DOCTOR_APPOINTMENT_STATUS_META,
	EMR_043_STATUS_META,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
	type DoctorAppointmentStatus,
	type EmrBatchSigningSession,
} from "@dental/shared";
import { formatKopecksRu } from "@dental/shared";
import { showToast } from "../GlobalToast";
import "./doctorMobileShift.css";

export interface DoctorMobileShiftModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDoctorId?: string;
	readonly initialDoctorName?: string;
	readonly initialDoctorSpecialty?: string;
	readonly initialShiftDateIso?: string;
	readonly initialAppointments?: readonly DoctorShiftAppointment[];
	readonly onAppointmentUpdate?: (appointments: readonly DoctorShiftAppointment[]) => void;
}

export const DoctorMobileShiftModal: React.FC<DoctorMobileShiftModalProps> = ({
	isOpen,
	onClose,
	initialDoctorId = "doc-1",
	initialDoctorName = "Д-р Смирнов Алексей Петрович",
	initialDoctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	initialShiftDateIso = "2026-08-29",
	initialAppointments = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	onAppointmentUpdate,
}) => {
	const [appointments, setAppointments] = useState<readonly DoctorShiftAppointment[]>(
		initialAppointments,
	);
	const [activeTab, setActiveTab] = useState<
		"all" | "in_chair" | "waiting" | "completed" | "needs_sign"
	>("all");
	const [expandedAptId, setExpandedAptId] = useState<string | null>(null);

	// Batch PEP SMS Signing State
	const [signingSession, setSigningSession] = useState<EmrBatchSigningSession | null>(null);
	const [enteredSmsCode, setEnteredSmsCode] = useState<string>("");
	const [smsCountdown, setSmsCountdown] = useState<number>(300);
	const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);

	// Sync when initialAppointments change
	useEffect(() => {
		setAppointments(initialAppointments);
	}, [initialAppointments]);

	// Isolate current doctor's appointments
	const doctorAppointments = useMemo(() => {
		return filterDoctorShiftAppointments(
			appointments,
			initialDoctorId,
			initialShiftDateIso,
		);
	}, [appointments, initialDoctorId, initialShiftDateIso]);

	// Calculate live piece-rate earnings & operational summary
	const earnings = useMemo(() => {
		return calculateDoctorShiftEarnings(
			doctorAppointments,
			initialDoctorId,
			initialShiftDateIso,
			25, // Standard therapy/ortho commission baseline
		);
	}, [doctorAppointments, initialDoctorId, initialShiftDateIso]);

	// Filtered appointment list for current active tab
	const filteredAppointments = useMemo(() => {
		return doctorAppointments.filter((apt) => {
			if (activeTab === "in_chair") return apt.status === "in_chair";
			if (activeTab === "waiting") return apt.status === "waiting";
			if (activeTab === "completed") return apt.status === "completed";
			if (activeTab === "needs_sign") {
				return apt.status === "completed" && apt.emrCard043uStatus !== "signed";
			}
			return true;
		});
	}, [doctorAppointments, activeTab]);

	// Unsigned completed cards eligible for 1-click batch signing
	const unsignedAppointmentIds = useMemo(() => {
		return doctorAppointments
			.filter(
				(apt) =>
					(apt.status === "completed" || apt.emrCard043uStatus === "pending_signature") &&
					apt.emrCard043uStatus !== "signed",
			)
			.map((apt) => apt.id);
	}, [doctorAppointments]);

	// SMS Countdown timer
	useEffect(() => {
		if (!signingSession) return;
		if (smsCountdown <= 0) return;
		const timer = setInterval(() => {
			setSmsCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [signingSession, smsCountdown]);

	if (!isOpen) return null;

	// 1-Click Status Transitions
	const handleStatusChange = (
		appointmentId: string,
		newStatus: DoctorAppointmentStatus,
	) => {
		const updated = appointments.map((apt) => {
			if (apt.id === appointmentId) {
				return transitionAppointmentStatus(apt, newStatus);
			}
			return apt;
		});
		setAppointments(updated);
		onAppointmentUpdate?.(updated);

		const statusTitle = DOCTOR_APPOINTMENT_STATUS_META[newStatus].labelRu;
		showToast(`Статус приема изменен: ${statusTitle}`, "info");
	};

	// Start Batch Signing Session
	const handleInitiateBatchSigning = () => {
		if (unsignedAppointmentIds.length === 0) {
			showToast("Все медицинские карты ф. 043/у уже подписаны!", "success");
			return;
		}

		const session = initiateBatchEmrSigning({
			doctorId: initialDoctorId,
			doctorName: initialDoctorName,
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: unsignedAppointmentIds,
			shiftDateIso: initialShiftDateIso,
			fixedSecretCode: "771204", // Demo code helper
		});

		setSigningSession(session);
		setEnteredSmsCode("");
		setSmsCountdown(300);
	};

	// Confirm SMS Code and Sign Batch
	const handleConfirmSmsSigning = () => {
		if (!signingSession) return;
		if (!enteredSmsCode.trim()) {
			showToast("Введите СМС-код подтверждения", "warning");
			return;
		}

		setIsSubmittingCode(true);
		const result = verifyAndSignBatchEmr({
			session: signingSession,
			enteredCode: enteredSmsCode,
			appointments,
			doctorName: initialDoctorName,
			doctorSnils: "123-456-789 64",
		});

		setIsSubmittingCode(false);

		if (result.success) {
			setAppointments(result.updatedAppointments);
			onAppointmentUpdate?.(result.updatedAppointments);
			setSigningSession(null);
			showToast(result.messageRu, "success");
		} else {
			showToast(result.messageRu, "error");
		}
	};

	return (
		<div
			className="doctor-mobile-pwa-overlay"
			data-testid="doctor-mobile-shift-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Мобильная смена врача PWA"
		>
			<div className="doctor-mobile-pwa-container">
				{/* Top PWA Status Bar */}
				<div className="doctor-pwa-status-bar">
					<div className="flex items-center gap-1.5 text-[var(--teal)]">
						<Smartphone size={14} />
						<span>DENTE Doctor PWA</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="inline-block w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse" />
						<span>Смена онлайн • 29 авг</span>
						<button
							type="button"
							onClick={onClose}
							className="w-7 h-7 rounded-full bg-[var(--paper-soft,#1e293b)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--line,#334155)]"
							aria-label="Закрыть"
							data-testid="close-doctor-shift-btn"
						>
							<X size={15} />
						</button>
					</div>
				</div>

				{/* Header with Doctor Bio & Live Piece-Rate Accrual */}
				<div className="doctor-pwa-header">
					<div className="doctor-pwa-header-top">
						<div>
							<h2 className="doctor-pwa-title" data-testid="doctor-pwa-name">
								<User className="w-5 h-5 text-[var(--teal)]" />
								<span>{initialDoctorName}</span>
							</h2>
							<div className="mt-1 flex items-center gap-2">
								<span className="doctor-pwa-specialty-badge">
									{initialDoctorSpecialty}
								</span>
								<span className="text-[11px] text-[var(--muted)] font-medium">
									Кабинет № 1
								</span>
							</div>
						</div>
					</div>

					{/* Live Piece-Rate Accrual Card */}
					<div className="doctor-shift-earnings-card" data-testid="doctor-shift-earnings-card">
						<div className="doctor-earnings-counter-label">
							<span>Заработано за смену (сделка %)</span>
							<span className="doctor-earnings-pill text-[var(--emerald)]">
								<Sparkles size={12} />
								<span>{earnings.completedAppointmentsCount} из {earnings.totalAppointmentsCount} приемов</span>
							</span>
						</div>
						<div className="doctor-earnings-counter-value" data-testid="doctor-earned-deal-amount">
							{formatKopecksRu(earnings.totalEarnedDealKop)}
						</div>
						<div className="doctor-earnings-breakdown-row">
							<span>Выручка: <strong className="text-[var(--ink)]">{formatKopecksRu(earnings.grossRevenueKop)}</strong></span>
							<span>ЗТЛ лаб: <strong className="text-[var(--rose)]">−{formatKopecksRu(earnings.totalLabDeductionsKop)}</strong></span>
							<span>Материалы: <strong className="text-[var(--gold)]">−{formatKopecksRu(earnings.totalMaterialDeductionsKop)}</strong></span>
						</div>
					</div>
				</div>

				{/* 1-Click Batch PEP Signing Banner (If unsigned 043/у exist) */}
				{unsignedAppointmentIds.length > 0 && (
					<div className="doctor-batch-pep-banner" data-testid="batch-pep-banner">
						<div className="doctor-batch-pep-header">
							<div className="flex items-center gap-2 text-[var(--gold)] font-bold text-xs">
								<FileCheck2 size={16} />
								<span>{unsignedAppointmentIds.length} медкарты (ф. 043/у) требуют подписи</span>
							</div>
							<span className="text-[10px] text-[var(--muted)] font-semibold">
								63-ФЗ ст. 9 (ПЭП)
							</span>
						</div>
						<button
							type="button"
							onClick={handleInitiateBatchSigning}
							className="doctor-batch-pep-btn"
							data-testid="sign-all-043u-btn"
						>
							<Zap size={16} />
							<span>Подписать все карты 043/у ({unsignedAppointmentIds.length}) через СМС</span>
						</button>
					</div>
				)}

				{/* Filter Tabs */}
				<div className="doctor-pwa-filter-tabs">
					<button
						type="button"
						onClick={() => setActiveTab("all")}
						className={`doctor-pwa-tab-btn ${activeTab === "all" ? "active" : ""}`}
						data-testid="tab-all"
					>
						Все ({doctorAppointments.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("in_chair")}
						className={`doctor-pwa-tab-btn ${activeTab === "in_chair" ? "active" : ""}`}
						data-testid="tab-in-chair"
					>
						В кресле ({earnings.inChairAppointmentsCount})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("waiting")}
						className={`doctor-pwa-tab-btn ${activeTab === "waiting" ? "active" : ""}`}
						data-testid="tab-waiting"
					>
						Ожидают ({earnings.waitingAppointmentsCount})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("completed")}
						className={`doctor-pwa-tab-btn ${activeTab === "completed" ? "active" : ""}`}
						data-testid="tab-completed"
					>
						Завершены ({earnings.completedAppointmentsCount})
					</button>
					{unsignedAppointmentIds.length > 0 && (
						<button
							type="button"
							onClick={() => setActiveTab("needs_sign")}
							className={`doctor-pwa-tab-btn ${activeTab === "needs_sign" ? "active" : ""}`}
							data-testid="tab-needs-sign"
						>
							Нужна подпись ({unsignedAppointmentIds.length})
						</button>
					)}
				</div>

				{/* Chronological Appointments Feed */}
				<div className="doctor-pwa-feed" data-testid="doctor-appointments-feed">
					{filteredAppointments.length === 0 ? (
						<div className="p-8 text-center text-xs text-[var(--muted)]">
							<Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--teal)]" />
							<span>В этой категории нет приемов на текущую смену.</span>
						</div>
					) : (
						filteredAppointments.map((apt) => {
							const isExpanded = expandedAptId === apt.id;
							const statusInfo = DOCTOR_APPOINTMENT_STATUS_META[apt.status];
							const emrInfo = EMR_043_STATUS_META[apt.emrCard043uStatus];
							const startTimeStr = apt.startsAtIso.split("T")[1]?.slice(0, 5) || "09:00";
							const endTimeStr = apt.endsAtIso.split("T")[1]?.slice(0, 5) || "10:00";

							// Appointment financials
							const aptGross = apt.services.reduce(
								(acc, s) => acc + (s.finalRevenueKop || s.totalCostKop || 0),
								0,
							);
							const aptEarned = apt.services.reduce(
								(acc, s) => acc + (s.earnedDoctorPayoutKop || 0),
								0,
							);

							return (
								<div
									key={apt.id}
									className={`doctor-pwa-card ${apt.status === "in_chair" ? "active-chair" : ""}`}
									data-testid={`appointment-card-${apt.id}`}
								>
									{/* Top Row: Time, Patient & Status Pill */}
									<div className="doctor-pwa-card-header">
										<div>
											<div className="flex items-center gap-2">
												<span className="font-extrabold text-xs text-[var(--teal)]">
													{startTimeStr} – {endTimeStr}
												</span>
												<span className="text-[10px] font-bold text-[var(--muted)]">
													{apt.chairName || "Кресло 1"}
												</span>
											</div>
											<div className="doctor-pwa-patient-name mt-1">
												{apt.patientFullName}
											</div>
											<div className="doctor-pwa-patient-meta mt-0.5">
												<span>{apt.cardNumber}</span>
												{apt.patientBirthDate && <span>• 1988 г.р.</span>}
												{apt.patientPhone && <span>• {apt.patientPhone}</span>}
											</div>
										</div>

										<span className={`doctor-pwa-badge ${apt.status}`}>
											{statusInfo.labelRu}
										</span>
									</div>

									{/* Diagnosis & Clinical Info */}
									{(apt.diagnosisIcd10 || apt.diagnosisTooth) && (
										<div className="doctor-pwa-card-diagnosis">
											<div className="flex items-center justify-between">
												<span className="font-bold text-[11px] text-[var(--ink)]">
													{apt.diagnosisTooth ? `Зуб ${apt.diagnosisTooth}` : "Осмотр"} • {apt.diagnosisIcd10 || "МКБ-10"}
												</span>
												<span className="text-[10px] text-[var(--muted)]">
													{apt.services.length} услуг
												</span>
											</div>
											{apt.treatmentDescription && (
												<div className="text-[11px] text-[var(--muted)] leading-tight">
													{apt.treatmentDescription}
												</div>
											)}
										</div>
									)}

									{/* Financial & EMR Status Pill */}
									<div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--line,#334155)]">
										<div className="flex items-center gap-1.5">
											{apt.emrCard043uStatus === "signed" ? (
												<span className="inline-flex items-center gap-1 text-[var(--emerald)] font-bold text-[10px]">
													<ShieldCheck size={13} />
													<span>043/у подписана ПЭП</span>
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-[var(--gold)] font-bold text-[10px]">
													<FileBadge size={13} />
													<span>{emrInfo.labelRu}</span>
												</span>
											)}
										</div>
										<div className="font-extrabold text-[var(--ink)]">
											Врачу: <span className="text-[var(--teal)]">{formatKopecksRu(aptEarned)}</span>
										</div>
									</div>

									{/* Expandable Services Breakdown */}
									{isExpanded && (
										<div className="mt-2 pt-2 border-t border-[var(--line,#334155)] space-y-1.5">
											<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
												Оказанные медицинские услуги (804н):
											</div>
											{apt.services.map((srv) => (
												<div key={srv.id} className="doctor-pwa-service-item">
													<div className="flex-1 min-w-0 pr-2">
														<div className="font-semibold truncate text-[var(--ink)]">
															{srv.nameRu}
														</div>
														<div className="text-[10px] text-[var(--muted)]">
															Код: {srv.code804n} • {srv.commissionPercent}% сделка
															{srv.directLabZtlCostKop > 0 && ` • Вычет ЗТЛ: −${formatKopecksRu(srv.directLabZtlCostKop)}`}
														</div>
													</div>
													<div className="text-right whitespace-nowrap">
														<div className="font-bold text-[var(--ink)]">
															{formatKopecksRu(srv.finalRevenueKop)}
														</div>
														<div className="text-[10px] font-bold text-[var(--teal)]">
															+{formatKopecksRu(srv.earnedDoctorPayoutKop)}
														</div>
													</div>
												</div>
											))}
										</div>
									)}

									{/* 1-Click Operational Action Buttons */}
									<div className="doctor-pwa-actions-row">
										{apt.status === "waiting" && (
											<button
												type="button"
												onClick={() => handleStatusChange(apt.id, "in_chair")}
												className="doctor-pwa-action-btn primary"
												data-testid={`btn-in-chair-${apt.id}`}
											>
												<Activity size={14} />
												<span>В кресло</span>
											</button>
										)}

										{apt.status === "in_chair" && (
											<button
												type="button"
												onClick={() => handleStatusChange(apt.id, "completed")}
												className="doctor-pwa-action-btn success"
												data-testid={`btn-complete-${apt.id}`}
											>
												<Check size={14} />
												<span>Завершить прием</span>
											</button>
										)}

										{apt.status === "completed" && apt.emrCard043uStatus !== "signed" && (
											<button
												type="button"
												onClick={() => {
													const session = initiateBatchEmrSigning({
														doctorId: initialDoctorId,
														doctorName: initialDoctorName,
														doctorPhone: "+7 (926) 555-12-34",
														appointmentIds: [apt.id],
														shiftDateIso: initialShiftDateIso,
														fixedSecretCode: "771204",
													});
													setSigningSession(session);
													setEnteredSmsCode("");
													setSmsCountdown(300);
												}}
												className="doctor-pwa-action-btn primary"
												data-testid={`btn-sign-043-${apt.id}`}
											>
												<FileCheck2 size={14} />
												<span>Подписать 043/у</span>
											</button>
										)}

										<button
											type="button"
											onClick={() => setExpandedAptId(isExpanded ? null : apt.id)}
											className="doctor-pwa-action-btn secondary !flex-initial px-3"
											aria-label={isExpanded ? "Свернуть услуги" : "Подробнее об услугах"}
										>
											{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Bottom Safe Area Summary */}
				<div className="doctor-pwa-bottom-bar">
					<div className="flex items-center gap-1 text-[var(--muted)]">
						<Shield size={13} className="text-[var(--teal)]" />
						<span>Изоляция смены активна</span>
					</div>
					<div className="flex items-center gap-2 font-bold text-[var(--ink)]">
						<span>043/у: {earnings.signedEmr043Count} подписано</span>
					</div>
				</div>

				{/* SMS Code Verification Drawer */}
				{signingSession && (
					<div
						className="doctor-sms-modal-overlay"
						data-testid="doctor-sms-signing-drawer"
					>
						<div className="doctor-sms-modal-content">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
									<KeyRound className="text-[var(--teal)] w-5 h-5" />
									<span>ПЭП СМС-Подтверждение</span>
								</div>
								<button
									type="button"
									onClick={() => setSigningSession(null)}
									className="w-7 h-7 rounded-full bg-[var(--paper,#121826)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center border border-[var(--line,#334155)] cursor-pointer"
								>
									<X size={15} />
								</button>
							</div>

							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Код подтверждения отправлен на номер <strong>{signingSession.maskedPhone}</strong> для заверения {signingSession.appointmentIds.length} карт ф. 043/у.
							</p>

							{/* 6-Digit PIN Input */}
							<div>
								<input
									type="text"
									inputMode="numeric"
									maxLength={6}
									placeholder="••••••"
									value={enteredSmsCode}
									onChange={(e) => setEnteredSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
									className="doctor-sms-code-input"
									data-testid="sms-code-input"
									autoFocus
								/>
								<div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
									<span>
										Истекает через: <strong className="text-[var(--gold)]">{Math.floor(smsCountdown / 60)}:{(smsCountdown % 60).toString().padStart(2, "0")}</strong>
									</span>
									<button
										type="button"
										onClick={() => setEnteredSmsCode("771204")}
										className="text-[var(--teal)] hover:underline font-bold"
									>
										Демо-код: 771204
									</button>
								</div>
							</div>

							{/* Statutory basis badge */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#121826)] border border-[var(--line,#334155)] text-[10px] text-[var(--muted)] flex items-center gap-2">
								<ShieldCheck size={14} className="text-[var(--emerald)] shrink-0" />
								<span>Заверение простой электронной подписью по 63-ФЗ ст. 9 и Приказу Минздрава РФ 947н.</span>
							</div>

							{/* Confirm Button */}
							<button
								type="button"
								onClick={handleConfirmSmsSigning}
								disabled={enteredSmsCode.length < 6 || isSubmittingCode}
								className="w-full min-h-[48px] rounded-xl text-sm font-extrabold bg-[var(--teal-fill,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
								data-testid="confirm-sms-code-btn"
							>
								{isSubmittingCode ? (
									<>
										<RefreshCw className="animate-spin w-4 h-4" />
										<span>Подписание в ЕГИСЗ...</span>
									</>
								) : (
									<>
										<CheckCircle2 size={16} />
										<span>Заверить {signingSession.appointmentIds.length} карт ПЭП</span>
									</>
								)}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
