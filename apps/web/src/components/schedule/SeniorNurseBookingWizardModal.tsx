import type { Appointment, Dashboard, Patient } from "@dental/shared";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Flame,
	Plus,
	Search,
	Sparkles,
	User,
	UserCheck,
	UserPlus,
	X,
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { searchPatientsQuick } from "./patientSearchEngine";
import { fetchWithHandling } from "../../utils/networkUtils";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { humanizeRussianError } from "../common/humanizeRussianError";
import "./seniorNurseWizard.css";

export interface SeniorNurseBookingWizardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly dashboard?: Dashboard | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly auth?: any;
	readonly onAppointmentCreated?: ((appointment: Appointment) => void) | undefined;
	readonly loadDashboard?: (() => Promise<void>) | undefined;
	readonly setDashboard?: ((dashboard: Dashboard) => void) | undefined;
}

export const COMMON_DENTAL_SERVICES = [
	{ id: "consult", titleRu: "Осмотр и консультация", durationMin: 30, icon: "🦷" },
	{ id: "caries", titleRu: "Лечение кариеса (пломба)", durationMin: 45, icon: "🩺" },
	{ id: "cito", titleRu: "Острая боль (CITO)", durationMin: 20, icon: "⚡" },
	{ id: "hygiene", titleRu: "Профгигиена и чистка", durationMin: 60, icon: "✨" },
	{ id: "surgery", titleRu: "Удаление зуба (хирургия)", durationMin: 45, icon: "💉" },
	{ id: "prostho", titleRu: "Коронка / протезирование", durationMin: 60, icon: "👑" },
];

export function SeniorNurseBookingWizardModal({
	isOpen,
	onClose,
	dashboard,
	auth,
	onAppointmentCreated,
	loadDashboard,
	setDashboard,
}: SeniorNurseBookingWizardModalProps) {
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

	// Step 1: Patient
	const [patientSearch, setPatientSearch] = useState("");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [isInlineNewOpen, setIsInlineNewOpen] = useState(false);
	const [newPatientName, setNewPatientName] = useState("");
	const [newPatientPhone, setNewPatientPhone] = useState("");
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);

	// Step 2: Doctor & Service
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
	const [selectedService, setSelectedService] = useState<typeof COMMON_DENTAL_SERVICES[number]>(
		COMMON_DENTAL_SERVICES[0] ?? { id: "consult", titleRu: "Осмотр и консультация", durationMin: 30, icon: "🦷" },
	);

	// Step 3: Day & Time
	const [dayOffset, setDayOffset] = useState<0 | 1 | 2>(0); // 0: today, 1: tomorrow, 2: after tomorrow
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("10:00");

	// Step 4: Submission
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const patients = useMemo(() => dashboard?.patients ?? [], [dashboard?.patients]);
	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = useMemo(
		() => staff.filter((m) => m.active && (m.role === "doctor" || m.role === "owner")),
		[staff],
	);
	const chairs = useMemo(
		() => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active),
		[dashboard?.clinicSettings?.chairs],
	);

	// Initialize on open
	useEffect(() => {
		if (isOpen) {
			setCurrentStep(1);
			setPatientSearch("");
			setSelectedPatient(null);
			setIsInlineNewOpen(false);
			setNewPatientName("");
			setNewPatientPhone("");
			setSelectedDoctorId(doctors[0]?.id || "");
			setSelectedService(COMMON_DENTAL_SERVICES[0] ?? { id: "consult", titleRu: "Осмотр и консультация", durationMin: 30, icon: "🦷" });
			setDayOffset(0);
			setSelectedTimeSlot("10:00");
			setSubmitError(null);
		}
	}, [isOpen, doctors]);

	// Search patients
	const searchResults = useMemo(() => {
		const q = patientSearch.trim();
		if (!q) {
			return patients.filter((p) => p.status === "active").slice(0, 5);
		}
		return searchPatientsQuick(patients, q, 5).map((r) => r.patient);
	}, [patients, patientSearch]);

	// Compute selected date ISO
	const targetDateIso = useMemo(() => {
		const d = new Date();
		d.setDate(d.getDate() + dayOffset);
		return d.toISOString().slice(0, 10);
	}, [dayOffset]);

	const startsAtIso = useMemo(() => {
		return `${targetDateIso}T${selectedTimeSlot}:00.000Z`;
	}, [targetDateIso, selectedTimeSlot]);

	const endsAtIso = useMemo(() => {
		const sMs = Date.parse(startsAtIso);
		const durMs = (selectedService?.durationMin || 30) * 60_000;
		return new Date(sMs + durMs).toISOString();
	}, [startsAtIso, selectedService]);

	// Check schedule collisions
	const collision = useMemo(() => {
		if (!selectedDoctorId || !startsAtIso || !endsAtIso) {
			return { hasCollision: false, message: null };
		}
		return checkAppointmentResourceCollision(
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			{
				startsAt: startsAtIso,
				endsAt: endsAtIso,
				doctorUserId: selectedDoctorId,
				chairId: chairs[0]?.id || null,
				patientId: selectedPatient?.id || null,
			} as any,
			dashboard?.appointments,
			{
				staff: dashboard?.clinicSettings?.staff ?? [],
				chairs: dashboard?.clinicSettings?.chairs ?? [],
				patients: dashboard?.patients ?? [],
				formatTimeFn: (iso) => iso.slice(11, 16),
			},
		);
	}, [selectedDoctorId, startsAtIso, endsAtIso, chairs, selectedPatient, dashboard]);

	const handleCreateInlinePatient = async (e: React.FormEvent) => {
		e.preventDefault();
		const name = newPatientName.trim();
		if (!name) {
			showToast("Введите ФИО нового пациента", "error");
			return;
		}

		setIsCreatingPatient(true);
		try {
			const headers =
				typeof auth?.denteClinicalMutationHeaders === "function"
					? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

			const res = await fetchWithHandling("/api/patients", {
				method: "POST",
				headers,
				body: JSON.stringify({
					fullName: name,
					phone: newPatientPhone.trim() || null,
				}),
			});

			if (!res.ok) {
				showToast("Не удалось зарегистрировать пациента", "error");
				return;
			}

			const created = (await res.json()) as Patient;
			if (created?.id) {
				if (typeof setDashboard === "function" && dashboard) {
					setDashboard({
						...dashboard,
						patients: [created, ...(dashboard.patients ?? []).filter((p) => p.id !== created.id)],
					});
				}
				setSelectedPatient(created);
				setIsInlineNewOpen(false);
				showToast(`Пациент «${created.fullName}» успешно зарегистрирован!`, "success");
			}
		} catch (err) {
			const humanErr = humanizeRussianError(err);
			showToast(humanErr.titleRu, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleFinalSubmit = async () => {
		if (!selectedPatient) {
			setCurrentStep(1);
			showToast("Сначала выберите пациента", "warning");
			return;
		}

		if (!selectedDoctorId) {
			setCurrentStep(2);
			showToast("Выберите лечащего врача", "warning");
			return;
		}

		if (collision.hasCollision) {
			showToast(collision.message || "Выбранное время уже занято", "error");
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const mutationHeaders =
				typeof auth?.scheduleMutationHeaders === "function"
					? auth.scheduleMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

			const payload = {
				patientId: selectedPatient.id,
				doctorUserId: selectedDoctorId,
				chairId: chairs[0]?.id || null,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
				status: selectedService.id === "cito" ? "confirmed" : "planned",
				reason: selectedService.titleRu,
				comment: `Запись через пошаговый мастер (${selectedService.titleRu})`,
				clientMutationId: `wizard-booking-${Date.now()}`,
			};

			const res = await fetchWithHandling("/api/appointments", {
				method: "POST",
				headers: mutationHeaders,
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const humanErr = humanizeRussianError(new Error(res.status === 409 ? "409 Conflict" : "Server Error"));
				setSubmitError(humanErr.titleRu + ". " + humanErr.actionAdviceRu);
				showToast(humanErr.titleRu, "error");
				return;
			}

			const nextDashboard = (await res.json()) as Dashboard;
			if (nextDashboard && typeof nextDashboard === "object" && typeof setDashboard === "function") {
				setDashboard(nextDashboard);
			}

			if (typeof loadDashboard === "function") {
				void loadDashboard();
			}

			const timeLabel = selectedTimeSlot;
			showToast(`✓ Пациент «${selectedPatient.fullName}» записан на ${timeLabel}!`, "success", 5000);

			if (typeof onAppointmentCreated === "function" && nextDashboard?.appointments) {
				const created = nextDashboard.appointments.find(
					(a) => a.patientId === selectedPatient.id && a.startsAt === startsAtIso,
				);
				if (created) onAppointmentCreated(created);
			}

			onClose();
		} catch (err) {
			const humanErr = humanizeRussianError(err);
			setSubmitError(humanErr.titleRu + ". " + humanErr.actionAdviceRu);
			showToast(humanErr.titleRu, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

	const modalContent = (
		<div
			className="snw-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="snw-modal-title"
			onClick={(e) => e.target === e.currentTarget && onClose()}
			data-testid="senior-nurse-wizard-modal"
		>
			<div className="snw-modal">
				{/* Header */}
				<div className="snw-header">
					<div className="snw-title-group">
						<div className="snw-icon-badge">
							<Calendar size={26} />
						</div>
						<div>
							<h3 id="snw-modal-title" className="snw-title">
								Пошаговый мастер записи пациента
							</h3>
							<p className="snw-subtitle">
								Простая запись без сложных терминов • Шаг {currentStep} из 4
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="snw-close-btn"
						aria-label="Закрыть мастер"
						data-testid="snw-close-btn"
					>
						<X size={22} />
					</button>
				</div>

				{/* Steps Ribbon */}
				<div className="snw-steps-ribbon">
					<button
						type="button"
						onClick={() => setCurrentStep(1)}
						className={`snw-step-tab ${currentStep === 1 ? "active" : selectedPatient ? "completed" : ""}`}
					>
						<span className="snw-step-num">{selectedPatient ? "✓" : "1"}</span>
						<span className="snw-step-label">1. Пациент</span>
					</button>

					<button
						type="button"
						onClick={() => selectedPatient && setCurrentStep(2)}
						disabled={!selectedPatient}
						className={`snw-step-tab ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""}`}
					>
						<span className="snw-step-num">{currentStep > 2 ? "✓" : "2"}</span>
						<span className="snw-step-label">2. Врач и услуга</span>
					</button>

					<button
						type="button"
						onClick={() => selectedPatient && selectedDoctorId && setCurrentStep(3)}
						disabled={!selectedPatient || !selectedDoctorId}
						className={`snw-step-tab ${currentStep === 3 ? "active" : currentStep > 3 ? "completed" : ""}`}
					>
						<span className="snw-step-num">{currentStep > 3 ? "✓" : "3"}</span>
						<span className="snw-step-label">3. День и время</span>
					</button>

					<button
						type="button"
						onClick={() => selectedPatient && selectedDoctorId && setCurrentStep(4)}
						disabled={!selectedPatient || !selectedDoctorId}
						className={`snw-step-tab ${currentStep === 4 ? "active" : ""}`}
					>
						<span className="snw-step-num">4</span>
						<span className="snw-step-label">4. Запись</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="snw-body">
					{/* STEP 1: PATIENT */}
					{currentStep === 1 && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<label style={{ fontSize: "1rem", fontWeight: 800 }}>
								Шаг 1: Найдите пациента или создайте нового
							</label>

							{/* Search input */}
							<div style={{ position: "relative" }}>
								<input
									type="text"
									placeholder="Введите фамилию или номер телефона (+7...)..."
									value={patientSearch}
									onChange={(e) => setPatientSearch(e.target.value)}
									className="snw-search-input"
									data-testid="snw-patient-search-input"
								/>
							</div>

							{/* Search Results List */}
							<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								{searchResults.map((p) => {
									const isSel = selectedPatient?.id === p.id;
									return (
										<div
											key={p.id}
											onClick={() => {
												setSelectedPatient(p);
												showToast(`Пациент «${p.fullName}» выбран!`, "info");
											}}
											className={`snw-patient-card ${isSel ? "selected" : ""}`}
											data-testid={`snw-patient-item-${p.id}`}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
												<div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0d9488", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
													{p.fullName.slice(0, 2).toUpperCase()}
												</div>
												<div>
													<div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{p.fullName}</div>
													<div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
														{p.phone || "Телефон не указан"} {p.birthDate ? `• д.р. ${p.birthDate}` : ""}
													</div>
												</div>
											</div>
											{isSel && (
												<span style={{ color: "#059669", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
													<Check size={18} /> Выбран
												</span>
											)}
										</div>
									);
								})}
							</div>

							{/* Inline New Patient Form Toggle */}
							{!isInlineNewOpen ? (
								<button
									type="button"
									onClick={() => {
										setIsInlineNewOpen(true);
										setNewPatientName(patientSearch);
									}}
									className="snw-btn-back"
									style={{ borderStyle: "dashed", borderColor: "#0d9488", color: "#0d9488", fontWeight: 800 }}
									data-testid="snw-open-new-patient-btn"
								>
									<UserPlus size={18} style={{ display: "inline", marginRight: "6px" }} />
									+ Пациента нет в базе? Создать новую карту
								</button>
							) : (
								<form onSubmit={handleCreateInlinePatient} style={{ padding: "1rem", borderRadius: "14px", background: "var(--paper-soft)", border: "2px solid #0d9488", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
									<div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f766e" }}>
										Быстрая регистрация нового пациента:
									</div>
									<input
										type="text"
										placeholder="ФИО пациента (например: Сидоров Иван Петрович)..."
										value={newPatientName}
										onChange={(e) => setNewPatientName(e.target.value)}
										className="snw-search-input"
										style={{ minHeight: "48px", fontSize: "1rem" }}
										data-testid="snw-new-patient-name"
									/>
									<input
										type="tel"
										placeholder="Номер телефона (+7 999 123-45-67)..."
										value={newPatientPhone}
										onChange={(e) => setNewPatientPhone(e.target.value)}
										className="snw-search-input"
										style={{ minHeight: "48px", fontSize: "1rem" }}
										data-testid="snw-new-patient-phone"
									/>
									<div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
										<button
											type="button"
											onClick={() => setIsInlineNewOpen(false)}
											className="snw-btn-back"
											style={{ minHeight: "44px", padding: "0.4rem 1rem", fontSize: "0.9rem" }}
										>
											Отмена
										</button>
										<button
											type="submit"
											disabled={isCreatingPatient}
											className="snw-btn-next"
											style={{ minHeight: "44px", padding: "0.4rem 1.25rem", fontSize: "0.95rem" }}
											data-testid="snw-save-new-patient-btn"
										>
											Зарегистрировать
										</button>
									</div>
								</form>
							)}
						</div>
					)}

					{/* STEP 2: DOCTOR & SERVICE */}
					{currentStep === 2 && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							<div>
								<label style={{ fontSize: "1rem", fontWeight: 800, display: "block", marginBottom: "0.5rem" }}>
									1. Выберите лечащего врача:
								</label>
								<div className="snw-doctors-grid">
									{doctors.map((doc) => {
										const isSel = selectedDoctorId === doc.id;
										return (
											<div
												key={doc.id}
												onClick={() => setSelectedDoctorId(doc.id)}
												className={`snw-doctor-card ${isSel ? "selected" : ""}`}
												data-testid={`snw-doc-${doc.id}`}
											>
												<div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#0d9488", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
													👨‍⚕️
												</div>
												<div>
													<div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{doc.fullName}</div>
													<div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Врач-стоматолог</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							<div>
								<label style={{ fontSize: "1rem", fontWeight: 800, display: "block", marginBottom: "0.5rem" }}>
									2. Выберите причину обращения (услугу):
								</label>
								<div className="snw-services-grid">
									{COMMON_DENTAL_SERVICES.map((srv) => {
										const isSel = selectedService.id === srv.id;
										return (
											<div
												key={srv.id}
												onClick={() => setSelectedService(srv)}
												className={`snw-service-tile ${isSel ? "selected" : ""}`}
												data-testid={`snw-srv-${srv.id}`}
											>
												<div style={{ fontSize: "1.3rem" }}>{srv.icon}</div>
												<div style={{ fontWeight: 800, fontSize: "0.95rem", marginTop: "2px" }}>{srv.titleRu}</div>
												<div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
													{srv.durationMin} минут
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* STEP 3: DAY & TIME */}
					{currentStep === 3 && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							<div>
								<label style={{ fontSize: "1rem", fontWeight: 800, display: "block", marginBottom: "0.5rem" }}>
									1. Выберите день приёма:
								</label>
								<div className="snw-days-strip">
									<button
										type="button"
										onClick={() => setDayOffset(0)}
										className={`snw-day-pill ${dayOffset === 0 ? "active" : ""}`}
										data-testid="snw-day-today"
									>
										Сегодня ({new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})
									</button>
									<button
										type="button"
										onClick={() => setDayOffset(1)}
										className={`snw-day-pill ${dayOffset === 1 ? "active" : ""}`}
										data-testid="snw-day-tomorrow"
									>
										Завтра ({new Date(Date.now() + 86400000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})
									</button>
									<button
										type="button"
										onClick={() => setDayOffset(2)}
										className={`snw-day-pill ${dayOffset === 2 ? "active" : ""}`}
										data-testid="snw-day-after"
									>
										Послезавтра ({new Date(Date.now() + 172800000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})
									</button>
								</div>
							</div>

							<div>
								<label style={{ fontSize: "1rem", fontWeight: 800, display: "block", marginBottom: "0.5rem" }}>
									2. Выберите удобное время:
								</label>
								<div className="snw-slots-grid">
									{["09:00", "10:00", "11:00", "12:00", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"].map((slot) => {
										const isSel = selectedTimeSlot === slot;
										return (
											<button
												key={slot}
												type="button"
												onClick={() => setSelectedTimeSlot(slot)}
												className={`snw-time-slot-btn ${isSel ? "selected" : ""}`}
												data-testid={`snw-slot-${slot.replace(":", "")}`}
											>
												{slot}
											</button>
										);
									})}
								</div>
							</div>

							{collision.hasCollision && (
								<div style={{ padding: "0.85rem", borderRadius: "12px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid #ef4444", color: "#dc2626", fontSize: "0.95rem", fontWeight: 700 }}>
									⛔ {collision.message}
								</div>
							)}
						</div>
					)}

					{/* STEP 4: VERIFICATION & SUMMARY */}
					{currentStep === 4 && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div className="snw-summary-card">
								<div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#0f766e" }}>
									Проверьте данные перед записью:
								</div>

								<div className="snw-summary-row">
									<span className="snw-summary-label">Пациент:</span>
									<span className="snw-summary-val font-bold">
										{selectedPatient?.fullName} ({selectedPatient?.phone || "без телефона"})
									</span>
								</div>

								<div className="snw-summary-row">
									<span className="snw-summary-label">Врач:</span>
									<span className="snw-summary-val">{selectedDoctor?.fullName}</span>
								</div>

								<div className="snw-summary-row">
									<span className="snw-summary-label">Причина приёма:</span>
									<span className="snw-summary-val">
										{selectedService.titleRu} ({selectedService.durationMin} мин)
									</span>
								</div>

								<div className="snw-summary-row">
									<span className="snw-summary-label">Дата и время:</span>
									<span className="snw-summary-val font-mono font-bold" style={{ color: "#0d9488" }}>
										{new Date(targetDateIso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}, {selectedTimeSlot}
									</span>
								</div>
							</div>

							{submitError && (
								<div style={{ padding: "0.85rem", borderRadius: "12px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid #ef4444", color: "#dc2626", fontSize: "0.95rem", fontWeight: 700 }}>
									⛔ {submitError}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer Navigation */}
				<div className="snw-footer">
					{currentStep > 1 ? (
						<button
							type="button"
							onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
							className="snw-btn-back"
							data-testid="snw-prev-btn"
						>
							<ArrowLeft size={18} style={{ display: "inline", marginRight: "4px" }} />
							Назад
						</button>
					) : (
						<button
							type="button"
							onClick={onClose}
							className="snw-btn-back"
							data-testid="snw-cancel-btn"
						>
							Отмена
						</button>
					)}

					{currentStep < 4 ? (
						<button
							type="button"
							onClick={() => {
								if (currentStep === 1 && !selectedPatient) {
									showToast("Выберите пациента перед переходом к следующему шагу", "warning");
									return;
								}
								setCurrentStep((prev) => (prev + 1) as 2 | 3 | 4);
							}}
							disabled={currentStep === 1 && !selectedPatient}
							className="snw-btn-next"
							data-testid="snw-next-btn"
						>
							Далее
							<ArrowRight size={18} style={{ display: "inline", marginLeft: "4px" }} />
						</button>
					) : (
						<button
							type="button"
							onClick={handleFinalSubmit}
							disabled={isSubmitting || collision.hasCollision}
							className="snw-btn-complete"
							data-testid="snw-submit-booking-btn"
						>
							<CheckCircle2 size={24} />
							<span>[ ✓ ЗАПИСАТЬ ПАЦИЕНТА НА ПРИЁМ ]</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
