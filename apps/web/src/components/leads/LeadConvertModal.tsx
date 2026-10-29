/**
 * DENTE Dental CRM — Leads Kanban Convert Modal
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Deduplication)
 * Mandate 8x & 8ap (Human Clinical Terminology: Zero Soviet Law Ciphers)
 * Mandate 8b (Sweet Spot 200–300 lines)
 */

import { motion } from "framer-motion";
import { User, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Lead } from "../../store/leadsStore";
import { isLeadBookingDisabled } from "./LeadsKanbanView";
import { LeadConvertAttributionCard } from "./leadConvertModules/LeadConvertAttributionCard";
import { LeadConvertConsentSection } from "./leadConvertModules/LeadConvertConsentSection";
import type {
	LeadConvertModalProps,
	LeadConvertMode,
	LeadConvertSubmitOptions,
} from "./leadConvertModules/leadConvertTypes";

export type {
	LeadConvertModalProps,
	LeadConvertMode,
	LeadConvertSubmitOptions,
};

export const LeadConvertModal: React.FC<LeadConvertModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
	staff,
	chairs,
	effectiveStaff,
	effectiveChairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	appointmentDate,
	setAppointmentDate,
	appointmentTime,
	setAppointmentTime,
	isBooking,
	lead = null,
	consentMedical: controlledConsentMedical,
	setConsentMedical: controlledSetConsentMedical,
	consentMarketing: controlledConsentMarketing,
	setConsentMarketing: controlledSetConsentMarketing,
	cardBg = "var(--paper)",
	colBg = "var(--paper-soft)",
	borderColor = "var(--line)",
}) => {
	const [mode, setMode] = useState<LeadConvertMode>("patient_and_appointment");
	const [localConsentMedical, setLocalConsentMedical] = useState(true);
	const [localConsentMarketing, setLocalConsentMarketing] = useState(false);
	const [reason, setReason] = useState("");
	const [comment, setComment] = useState("");

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	useEffect(() => {
		if (isOpen && lead) {
			const tagReason = Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
				? lead.clinicalTags.join(", ")
				: "";
			setReason(tagReason || "Первичная консультация");
			setComment(lead.notes || "");

			if (!selectedDoctorId && effectiveStaff.length > 0) {
				setSelectedDoctorId(effectiveStaff[0]!.id);
			}
			if (!selectedChairId && effectiveChairs.length > 0) {
				setSelectedChairId(effectiveChairs[0]!.id);
			}
		}
	}, [isOpen, lead, effectiveStaff, effectiveChairs, selectedDoctorId, selectedChairId, setSelectedDoctorId, setSelectedChairId]);

	const consentMedical = controlledConsentMedical !== undefined ? controlledConsentMedical : localConsentMedical;
	const setConsentMedical = controlledSetConsentMedical || setLocalConsentMedical;
	const consentMarketing = controlledConsentMarketing !== undefined ? controlledConsentMarketing : localConsentMarketing;
	const setConsentMarketing = controlledSetConsentMarketing || setLocalConsentMarketing;

	if (!isOpen) return null;

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(e, {
			mode,
			consentMedical,
			consentMarketing,
			reason: mode === "patient_and_appointment" ? reason.trim() || undefined : undefined,
			comment: comment.trim() || undefined,
		});
	};

	const submitTitle = isBooking
		? "Сохраняем..."
		: mode === "patient_only"
			? "Создать карту пациента"
			: lead?.existingPatient
				? "Подтвердить запись на приём"
				: "Подтвердить запись и создать карту";

	const inputStyle: React.CSSProperties = {
		padding: "5px 8px",
		borderRadius: 6,
		border: `1px solid ${borderColor}`,
		background: colBg,
		color: "var(--ink)",
		fontSize: 12.5,
		outline: "none",
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100,
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",
				paddingTop: 36,
				paddingBottom: 24,
				paddingLeft: 16,
				paddingRight: 16,
				background: "rgba(0,0,0,0.5)",
				backdropFilter: "blur(4px)",
				overflowY: "auto",
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				style={{
					background: cardBg,
					borderRadius: 14,
					padding: "14px 18px",
					width: 460,
					maxWidth: "95%",
					maxHeight: "88vh",
					display: "flex",
					flexDirection: "column",
					border: `1px solid ${borderColor}`,
					boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
				}}
			>
				{/* Шапка модалки */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexShrink: 0 }}>
					<div>
						<h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
							{lead?.existingPatient ? "Запись постоянного пациента" : "Конверсия обращения"}
						</h3>
						<p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted)" }}>
							Создание слота в расписании и привязка к медицинской карте
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: 4,
							borderRadius: 6,
							color: "var(--muted)",
						}}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Переключатель режима конверсии */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 4,
						background: colBg,
						padding: 3,
						borderRadius: 8,
						marginBottom: 8,
						border: `1px solid ${borderColor}`,
						flexShrink: 0,
					}}
				>
					<button
						type="button"
						onClick={() => setMode("patient_and_appointment")}
						style={{
							padding: "5px 10px",
							borderRadius: 6,
							fontSize: 11.5,
							fontWeight: 600,
							cursor: "pointer",
							border: "none",
							background: mode === "patient_and_appointment" ? "var(--paper)" : "transparent",
							color: mode === "patient_and_appointment" ? "var(--teal-dark, var(--teal))" : "var(--muted)",
							boxShadow: mode === "patient_and_appointment" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
							transition: "all 0.15s ease",
						}}
					>
						Запись и карта
					</button>
					<button
						type="button"
						onClick={() => setMode("patient_only")}
						style={{
							padding: "5px 10px",
							borderRadius: 6,
							fontSize: 11.5,
							fontWeight: 600,
							cursor: "pointer",
							border: "none",
							background: mode === "patient_only" ? "var(--paper)" : "transparent",
							color: mode === "patient_only" ? "var(--teal-dark, var(--teal))" : "var(--muted)",
							boxShadow: mode === "patient_only" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
							transition: "all 0.15s ease",
						}}
					>
						Только карта
					</button>
				</div>

				<form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{/* Инфо-карточка пациента с атрибуцией и предупреждением о постоянном пациенте (data-testid="lead-convert-existing-patient-alert") */}
					{lead ? (
						<LeadConvertAttributionCard lead={lead} borderColor={borderColor} />
					) : (
						<div
							style={{
								padding: "10px 12px",
								borderRadius: 10,
								background: "var(--paper-soft)",
								border: `1px solid ${borderColor}`,
								display: "flex",
								alignItems: "center",
								gap: 6,
							}}
							data-testid="lead-convert-attribution-card"
						>
							<User size={13} style={{ color: "var(--teal)" }} />
							<span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Пациент из воронки</span>
						</div>
					)}

					{/* Поля записи на приём */}
					{mode === "patient_and_appointment" && (
						<>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<label htmlFor="convert-lead-doctor" style={{ fontSize: 11.5, color: "var(--muted)" }}>
										Врач
									</label>
									<select
										id="convert-lead-doctor"
										value={selectedDoctorId}
										onChange={(e) => setSelectedDoctorId(e.target.value)}
										style={inputStyle}
									>
										{effectiveStaff.map((doc) => (
											<option key={doc.id} value={doc.id}>{doc.fullName}</option>
										))}
									</select>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<label htmlFor="convert-lead-chair" style={{ fontSize: 11.5, color: "var(--muted)" }}>
										Кресло
									</label>
									<select
										id="convert-lead-chair"
										value={selectedChairId}
										onChange={(e) => setSelectedChairId(e.target.value)}
										style={inputStyle}
									>
										{effectiveChairs.map((ch) => (
											<option key={ch.id} value={ch.id}>{ch.name}</option>
										))}
									</select>
								</div>
							</div>

							<div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 6 }}>
								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<label htmlFor="convert-lead-date" style={{ fontSize: 11.5, color: "var(--muted)" }}>
										Дата приёма
									</label>
									<input
										id="convert-lead-date"
										type="date"
										value={appointmentDate}
										onChange={(e) => setAppointmentDate(e.target.value)}
										style={inputStyle}
									>
									</input>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<label htmlFor="convert-lead-time" style={{ fontSize: 11.5, color: "var(--muted)" }}>
										Время
									</label>
									<select
										id="convert-lead-time"
										value={appointmentTime}
										onChange={(e) => setAppointmentTime(e.target.value)}
										style={inputStyle}
									>
										{["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"].map((t) => (
											<option key={t} value={t}>{t}</option>
										))}
									</select>
								</div>
							</div>

							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<label htmlFor="convert-lead-reason" style={{ fontSize: 11, color: "var(--muted)" }}>
										Причина приёма
									</label>
									<input
										id="convert-lead-reason"
										type="text"
										value={reason}
										onChange={(e) => setReason(e.target.value)}
										placeholder="Первичная консультация"
										style={inputStyle}
										data-testid="convert-lead-reason-input"
									/>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<label htmlFor="convert-lead-comment" style={{ fontSize: 11, color: "var(--muted)" }}>
										Клинический комментарий
									</label>
									<input
										id="convert-lead-comment"
										type="text"
										value={comment}
										onChange={(e) => setComment(e.target.value)}
										placeholder="Анамнез, жалобы..."
										style={inputStyle}
										data-testid="convert-lead-comment-input"
									/>
								</div>
							</div>
						</>
					)}

					{/* Согласия и уведомления пациента (Мандаты 8x и 8ap: чистый человеческий язык без 152-ФЗ / 38-ФЗ) */}
					<LeadConvertConsentSection
						borderColor={borderColor}
						consentMedical={consentMedical}
						setConsentMedical={setConsentMedical}
						consentMarketing={consentMarketing}
						setConsentMarketing={setConsentMarketing}
					/>

					{/* Единственная Primary CTA кнопка (Мандаты 8am, 8e) */}
					<button
						type="submit"
						className="primary-button"
						data-testid="lead-convert-submit-btn"
						disabled={isLeadBookingDisabled(isBooking)}
						title={submitTitle}
						style={{
							marginTop: 4,
							flexShrink: 0,
							width: "100%",
							height: 44,
							minHeight: 44,
							justifyContent: "center",
							fontSize: 14,
							fontWeight: 700,
							background: "var(--teal, #0d9488)",
							borderColor: "var(--teal, #0d9488)",
							color: "#ffffff",
						}}
					>
						{submitTitle}
					</button>
				</form>
			</motion.div>
		</div>
	);
};
