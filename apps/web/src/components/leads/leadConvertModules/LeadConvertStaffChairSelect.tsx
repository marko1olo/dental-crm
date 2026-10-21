/**
 * DENTE Dental CRM — Leads Conversion Staff & Chair Selector
 * Mandate 8e & 8n: Solo Doctor Autonomy & Zero Dead-Ends, Mandate 8b (<= 120 lines)
 */

import React from "react";
import {
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
} from "../LeadsKanbanView";
import type { BookableChair, BookableDoctor } from "../leadsKanbanTypes";

interface LeadConvertStaffChairSelectProps {
	staff: BookableDoctor[];
	chairs: BookableChair[];
	effectiveStaff: BookableDoctor[];
	effectiveChairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	colBg?: string;
	borderColor: string;
}

export const LeadConvertStaffChairSelect: React.FC<
	LeadConvertStaffChairSelectProps
> = ({
	staff,
	chairs,
	effectiveStaff,
	effectiveChairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	colBg,
	borderColor,
}) => {
	const selectStyle: React.CSSProperties = {
		padding: "8px 12px",
		fontSize: 13,
		lineHeight: "1.4",
		minHeight: 40,
		borderRadius: 8,
		border: `1px solid ${borderColor}`,
		background: colBg,
		color: "var(--ink)",
	};

	return (
		<>
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
						selectedDoctorId || effectiveStaff[0]?.id || FALLBACK_SOLO_DOCTOR.id
					}
					onChange={(e) => setSelectedDoctorId(e.target.value)}
					style={selectStyle}
				>
					{effectiveStaff.map((s) => (
						<option key={s.id} value={s.id}>
							{s.fullName || s.name}
						</option>
					))}
				</select>
				{(staff.length === 0 ||
					(staff.length === 1 && staff[0]?.id === FALLBACK_SOLO_DOCTOR.id)) && (
					<p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
						В клинике пока не настроен список врачей. Автоматически назначен
						дежурный врач для соло-практики (Режим соло-практики).
					</p>
				)}
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
					style={selectStyle}
				>
					{effectiveChairs.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
				{(chairs.length === 0 ||
					(chairs.length === 1 &&
						chairs[0]?.id === FALLBACK_DEFAULT_CHAIR.id)) && (
					<p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
						В клинике пока не настроены кресла. Автоматически выбрано основное
						кресло №1 (Режим соло-практики).
					</p>
				)}
			</div>
		</>
	);
};
