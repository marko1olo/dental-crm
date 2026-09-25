/**
 * DENTE Dental CRM — Leads Kanban Convert Modal
 *
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends):
 * - Instant fallback to Solo Doctor & Chair #1 when unconfigured
 * - Never blocks booking submission
 * - Non-blocking clean dialog
 */

import type React from "react";
import { motion } from "framer-motion";
import { Calendar, X } from "lucide-react";
import type { BookableChair, BookableDoctor } from "./LeadsKanbanView";
import {
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	isLeadBookingDisabled,
} from "./LeadsKanbanView";

export interface LeadConvertModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (e: React.FormEvent) => void;
	staff: BookableDoctor[];
	chairs: BookableChair[];
	effectiveStaff: BookableDoctor[];
	effectiveChairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	isBooking: boolean;
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}

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
	cardBg = "var(--paper)",
	colBg = "var(--paper-soft)",
	borderColor = "var(--line)",
}) => {
	if (!isOpen) return null;

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
					width: 400,
					maxWidth: "90%",
					border: `1px solid ${borderColor}`,
					boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 20,
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 18,
							fontWeight: 600,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<Calendar size={20} color="var(--teal)" /> Записать лида
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

				<form
					onSubmit={onSubmit}
					style={{ display: "flex", flexDirection: "column", gap: 16 }}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="convert-lead-doctor"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Врач
						</label>
						<select
							id="convert-lead-doctor"
							value={
								selectedDoctorId ||
								effectiveStaff[0]?.id ||
								FALLBACK_SOLO_DOCTOR.id
							}
							onChange={(e) => setSelectedDoctorId(e.target.value)}
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
							required
						>
							{effectiveStaff.map((s) => (
								<option key={s.id} value={s.id}>
									{s.fullName || s.name}
								</option>
							))}
						</select>
						{staff.length === 0 ||
						(staff.length === 1 &&
							staff[0]?.id === FALLBACK_SOLO_DOCTOR.id) ? (
							<p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
								В клинике пока не настроен список врачей. Автоматически назначен дежурный врач для соло-практики (Режим соло-практики).
							</p>
						) : null}
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="convert-lead-chair"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Кресло
						</label>
						<select
							id="convert-lead-chair"
							value={
								selectedChairId ||
								effectiveChairs[0]?.id ||
								FALLBACK_DEFAULT_CHAIR.id
							}
							onChange={(e) => setSelectedChairId(e.target.value)}
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
							required
						>
							{effectiveChairs.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						{chairs.length === 0 ||
						(chairs.length === 1 &&
							chairs[0]?.id === FALLBACK_DEFAULT_CHAIR.id) ? (
							<p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
								В клинике пока не настроены кресла. Автоматически выбрано основное кресло №1 (Режим соло-практики).
							</p>
						) : null}
					</div>

					<div style={{ display: "flex", gap: 12 }}>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 6,
								flex: 1,
							}}
						>
							<label
								htmlFor="convert-lead-date"
								style={{ fontSize: 13, color: "var(--muted)" }}
							>
								Дата
							</label>
							<input
								id="convert-lead-date"
								type="date"
								value={appointmentDate}
								onChange={(e) => setAppointmentDate(e.target.value)}
								style={{
									padding: 10,
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: colBg,
									color: "var(--ink)",
								}}
								required
							/>
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 6,
								flex: 1,
							}}
						>
							<label
								htmlFor="convert-lead-time"
								style={{ fontSize: 13, color: "var(--muted)" }}
							>
								Время
							</label>
							<input
								id="convert-lead-time"
								type="time"
								value={appointmentTime}
								onChange={(e) => setAppointmentTime(e.target.value)}
								style={{
									padding: 10,
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: colBg,
									color: "var(--ink)",
								}}
								required
							/>
						</div>
					</div>

					<button
						type="submit"
						className="primary-button"
						data-testid="lead-convert-submit-btn"
						disabled={isLeadBookingDisabled(isBooking)}
						title={
							isBooking
								? "Записываем..."
								: "Создать пациента и запись в расписании"
						}
						style={{
							marginTop: 8,
							width: "100%",
							justifyContent: "center",
						}}
					>
						{isBooking ? "Записываем..." : "Подтвердить запись"}
					</button>
				</form>
			</motion.div>
		</div>
	);
};
