/**
 * DENTE Dental CRM — Doctor Shift Roster Filter Bar
 * Layer 4: Presentation Subcomponent (RosterFilterBar)
 * Filters: Chairs, Doctors, Specialties (Therapist, Orthopedist, Surgeon)
 */

import React from "react";
import type { RosterFilterBarProps } from "./types";

export const RosterFilterBar: React.FC<RosterFilterBarProps> = React.memo(
	function RosterFilterBar({
		doctors,
		allChairs,
		selectedDoctorId,
		onSelectDoctorId,
		selectedChairKey,
		onSelectChairKey,
		hasTemplateHandler,
		specialtyFilter,
		onSelectSpecialty,
	}) {
		if (!hasTemplateHandler) {
			return null;
		}

		return (
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "0.5rem",
					borderLeft: "1px solid var(--line)",
					paddingLeft: "0.75rem",
					marginLeft: "0.25rem",
				}}
			>
				{specialtyFilter !== undefined && onSelectSpecialty && (
					<>
						<span
							style={{
								fontSize: "0.75rem",
								fontWeight: 600,
								color: "var(--ink-muted)",
							}}
						>
							Специальность:
						</span>
						<select
							value={specialtyFilter}
							onChange={(e) => onSelectSpecialty(e.target.value)}
							className="roster-select h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--primary)]"
							title="Фильтр врачей по специальности"
						>
							<option value="all">Все специальности</option>
							<option value="therapist">Терапевт</option>
							<option value="orthopedist">Ортопед</option>
							<option value="surgeon">Хирург</option>
							<option value="orthodontist">Ортодонт</option>
							<option value="hygienist">Гигиенист</option>
						</select>
					</>
				)}

				<span
					style={{
						fontSize: "0.75rem",
						fontWeight: 600,
						color: "var(--ink-muted)",
					}}
				>
					Врач:
				</span>
				<select
					data-testid="toolbar-doctor-select"
					value={selectedDoctorId}
					onChange={(e) => onSelectDoctorId(e.target.value)}
					className="roster-select h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--primary)]"
					title="Выбрать врача для шаблона закрепления"
				>
					{doctors.map((d) => (
						<option key={d.id} value={d.id}>
							{d.shortName || d.fullName}
						</option>
					))}
				</select>
				<span
					style={{
						fontSize: "0.75rem",
						fontWeight: 600,
						color: "var(--ink-muted)",
						marginLeft: "0.25rem",
					}}
				>
					Кресло:
				</span>
				<select
					data-testid="toolbar-chair-select"
					value={selectedChairKey}
					onChange={(e) => onSelectChairKey(e.target.value)}
					className="roster-select h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--primary)]"
					title="Выбрать кресло и кабинет"
				>
					{allChairs.map((ch) => (
						<option
							key={`${ch.cabinetId}:::${ch.chairId}`}
							value={`${ch.cabinetId}:::${ch.chairId}`}
						>
							{ch.cabinetName} — {ch.chairName}
						</option>
					))}
				</select>
			</div>
		);
	},
);
