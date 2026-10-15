/**
 * DENTE Dental CRM — Leads Kanban Convert Modal (Canonical Facade Layer 5)
 *
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends)
 * Decomposed into modular structure: leadConvertModules/ (leadConvertTypes, LeadConvertPatientFields, LeadConvertAppointmentFields)
 * File budget: <= 250 lines (strictly compliant with /decomposer skill).
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, UserCheck, X } from "lucide-react";
import { isLeadBookingDisabled } from "./LeadsKanbanView";
import {
	type LeadConvertModalProps,
	type LeadConvertSubmitOptions,
	type LeadConvertMode,
	LeadConvertPatientFields,
	LeadConvertAppointmentFields,
} from "./leadConvertModules";

export type { LeadConvertModalProps, LeadConvertSubmitOptions, LeadConvertMode };

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

	const defaultReason = lead
		? (Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
			? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
			: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация"))
		: "Первичная консультация";

	const [reason, setReason] = useState(defaultReason);
	const [comment, setComment] = useState(lead?.notes || "");

	useEffect(() => {
		if (lead) {
			const initialReason =
				Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
					? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
					: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация");
			setReason(initialReason);
			setComment(lead.notes || "");
		}
	}, [lead?.id, lead?.notes, lead?.clinicalTags]);

	// Mandate 8e & 8n: Solo Doctor Autonomy — pre-fill date, time, doctor & chair so conversion works in 1 click
	useEffect(() => {
		if (isOpen) {
			if (!appointmentDate) {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				const yyyy = tomorrow.getFullYear();
				const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
				const dd = String(tomorrow.getDate()).padStart(2, "0");
				setAppointmentDate(`${yyyy}-${mm}-${dd}`);
			}
			if (!appointmentTime) {
				setAppointmentTime("10:00");
			}
			if (!selectedDoctorId && effectiveStaff.length > 0) {
				setSelectedDoctorId(effectiveStaff[0]?.id || "");
			}
			if (!selectedChairId && effectiveChairs.length > 0) {
				setSelectedChairId(effectiveChairs[0]?.id || "");
			}
		}
	}, [
		isOpen,
		appointmentDate,
		appointmentTime,
		selectedDoctorId,
		selectedChairId,
		effectiveStaff,
		effectiveChairs,
		setAppointmentDate,
		setAppointmentTime,
		setSelectedDoctorId,
		setSelectedChairId,
	]);

	const consentMedical =
		controlledConsentMedical !== undefined
			? controlledConsentMedical
			: localConsentMedical;
	const setConsentMedical =
		controlledSetConsentMedical || setLocalConsentMedical;

	const consentMarketing =
		controlledConsentMarketing !== undefined
			? controlledConsentMarketing
			: localConsentMarketing;
	const setConsentMarketing =
		controlledSetConsentMarketing || setLocalConsentMarketing;

	if (!isOpen) return null;

	const handleFormSubmit = (e: React.FormEvent) => {
		onSubmit(e, {
			mode,
			consentMedical,
			consentMarketing,
			reason: mode === "patient_and_appointment" ? reason.trim() || undefined : undefined,
			comment: comment.trim() || undefined,
		});
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,0.5)",
				backdropFilter: "blur(4px)",
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				style={{
					background: cardBg,
					borderRadius: 16,
					padding: 24,
					width: 440,
					maxWidth: "95%",
					maxHeight: "90vh",
					overflowY: "auto",
					border: `1px solid ${borderColor}`,
					boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 14,
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 17,
							fontWeight: 600,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						{mode === "patient_and_appointment" ? (
							<>
								<Calendar size={19} color="var(--teal)" /> Конвертация и запись на приём
							</>
						) : (
							<>
								<UserCheck size={19} color="var(--teal)" /> Создание карты пациента
							</>
						)}
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							cursor: "pointer",
						}}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Segmented Mode Selector (Apple HIG / Mandate 8e & 8n) */}
				<div
					style={{
						display: "flex",
						background: "var(--paper-soft)",
						padding: 3,
						borderRadius: 10,
						border: `1px solid ${borderColor}`,
						gap: 3,
						marginBottom: 14,
					}}
				>
					<button
						type="button"
						onClick={() => setMode("patient_only")}
						style={{
							flex: 1,
							padding: "7px 8px",
							borderRadius: 8,
							border: "none",
							cursor: "pointer",
							fontSize: 12,
							fontWeight: mode === "patient_only" ? 600 : 500,
							background: mode === "patient_only" ? "var(--paper)" : "transparent",
							color: mode === "patient_only" ? "var(--teal)" : "var(--muted)",
							boxShadow: mode === "patient_only" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
							transition: "all 0.15s ease",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
						}}
					>
						<UserCheck size={14} /> Только создать карту
					</button>
					<button
						type="button"
						onClick={() => setMode("patient_and_appointment")}
						style={{
							flex: 1,
							padding: "7px 8px",
							borderRadius: 8,
							border: "none",
							cursor: "pointer",
							fontSize: 12,
							fontWeight: mode === "patient_and_appointment" ? 600 : 500,
							background: mode === "patient_and_appointment" ? "var(--paper)" : "transparent",
							color: mode === "patient_and_appointment" ? "var(--teal)" : "var(--muted)",
							boxShadow: mode === "patient_and_appointment" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
							transition: "all 0.15s ease",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
						}}
					>
						<Calendar size={14} /> Карта + запись на приём
					</button>
				</div>

				<form
					onSubmit={handleFormSubmit}
					style={{ display: "flex", flexDirection: "column", gap: 14 }}
				>
					<LeadConvertPatientFields
						lead={lead}
						borderColor={borderColor}
						consentMedical={consentMedical}
						setConsentMedical={setConsentMedical}
						consentMarketing={consentMarketing}
						setConsentMarketing={setConsentMarketing}
					/>

					{mode === "patient_and_appointment" && (
						<LeadConvertAppointmentFields
							staff={staff}
							chairs={chairs}
							effectiveStaff={effectiveStaff}
							effectiveChairs={effectiveChairs}
							selectedDoctorId={selectedDoctorId}
							setSelectedDoctorId={setSelectedDoctorId}
							selectedChairId={selectedChairId}
							setSelectedChairId={setSelectedChairId}
							reason={reason}
							setReason={setReason}
							comment={comment}
							setComment={setComment}
							appointmentDate={appointmentDate}
							setAppointmentDate={setAppointmentDate}
							appointmentTime={appointmentTime}
							setAppointmentTime={setAppointmentTime}
							colBg={colBg}
							borderColor={borderColor}
						/>
					)}

					<button
						type="submit"
						className="primary-button"
						data-testid="lead-convert-submit-btn"
						disabled={isLeadBookingDisabled(isBooking)}
						title={
							isBooking
								? "Сохраняем..."
								: mode === "patient_only"
									? "Создать карту пациента в базе клиники"
									: lead?.existingPatient
										? "Записать на приём"
										: "Подтвердить запись и создать карту"
						}
						style={{
							marginTop: 8,
							width: "100%",
							justifyContent: "center",
						}}
					>
						{isBooking
							? "Сохраняем..."
							: mode === "patient_only"
								? "Создать карту пациента"
								: lead?.existingPatient
									? "Подтвердить запись на приём"
									: "Подтвердить запись и создать карту"}
					</button>
				</form>
			</motion.div>
		</div>
	);
};
