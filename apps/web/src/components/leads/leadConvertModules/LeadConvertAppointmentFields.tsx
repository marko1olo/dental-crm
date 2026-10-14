/**
 * DENTE Dental CRM — Leads Conversion Appointment Fields (Layer 4)
 * 
 * Mandate 8e & 8n: Solo Doctor Autonomy & Zero Dead-Ends
 */

import React from "react";
import { FALLBACK_DEFAULT_CHAIR, FALLBACK_SOLO_DOCTOR } from "../LeadsKanbanView";
import type { LeadConvertAppointmentFieldsProps } from "./leadConvertTypes";

export const LeadConvertAppointmentFields: React.FC<LeadConvertAppointmentFieldsProps> = ({
	staff,
	chairs,
	effectiveStaff,
	effectiveChairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	reason,
	setReason,
	comment,
	setComment,
	appointmentDate,
	setAppointmentDate,
	appointmentTime,
	setAppointmentTime,
	colBg,
	borderColor,
}) => {
	return (
		<>
			{/* Врач */}
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
						padding: "8px 12px",
						fontSize: 13,
						lineHeight: "1.4",
						minHeight: 40,
						borderRadius: 8,
						border: `1px solid ${borderColor}`,
						background: colBg,
						color: "var(--ink)",
					}}
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

			{/* Кресло */}
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
						padding: "8px 12px",
						fontSize: 13,
						lineHeight: "1.4",
						minHeight: 40,
						borderRadius: 8,
						border: `1px solid ${borderColor}`,
						background: colBg,
						color: "var(--ink)",
					}}
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

			{/* Причина приёма / жалоба */}
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<label
					htmlFor="convert-lead-reason"
					style={{ fontSize: 13, color: "var(--muted)" }}
				>
					Причина приёма / первичная жалоба
				</label>
				<input
					id="convert-lead-reason"
					type="text"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Первичная консультация"
					style={{
						padding: 10,
						borderRadius: 8,
						border: `1px solid ${borderColor}`,
						background: colBg,
						color: "var(--ink)",
						fontSize: 13,
					}}
					data-testid="convert-lead-reason-input"
				/>
			</div>

			{/* Клинический комментарий / примечание */}
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<label
					htmlFor="convert-lead-comment"
					style={{ fontSize: 13, color: "var(--muted)" }}
				>
					Клинический комментарий / примечание
				</label>
				<textarea
					id="convert-lead-comment"
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					placeholder="Анамнез, жалобы, пожелания пациента..."
					rows={2}
					style={{
						padding: 10,
						borderRadius: 8,
						border: `1px solid ${borderColor}`,
						background: colBg,
						color: "var(--ink)",
						fontSize: 13,
						resize: "vertical",
					}}
					data-testid="convert-lead-comment-input"
				/>
			</div>

			{/* Дата и время */}
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
					/>
				</div>
			</div>
		</>
	);
};
