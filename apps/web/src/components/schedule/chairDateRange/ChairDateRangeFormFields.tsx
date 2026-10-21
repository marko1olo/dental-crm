import React from "react";
import type { ScheduleChair } from "../ScheduleFilterStrip";

export interface ChairDateRangeFormFieldsProps {
	doctors: Array<{ id: string; fullName: string; specialty?: any }>;
	chairs: Array<ScheduleChair>;
	rangeDoctorId: string;
	setRangeDoctorId: (id: string) => void;
	rangeChairId: string;
	setRangeChairId: (id: string) => void;
	rangeStartDate: string;
	setRangeStartDate: (date: string) => void;
	rangeEndDate: string;
	setRangeEndDate: (date: string) => void;
}

export function ChairDateRangeFormFields({
	doctors,
	chairs,
	rangeDoctorId,
	setRangeDoctorId,
	rangeChairId,
	setRangeChairId,
	rangeStartDate,
	setRangeStartDate,
	rangeEndDate,
	setRangeEndDate,
}: ChairDateRangeFormFieldsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<div>
				<label
					htmlFor="chair-range-modal-doctor-select"
					className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
				>
					Врач
				</label>
				<select
					id="chair-range-modal-doctor-select"
					data-testid="chair-range-modal-doctor-select"
					value={rangeDoctorId || doctors[0]?.id || ""}
					onChange={(e) => setRangeDoctorId(e.target.value)}
					className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
				>
					{doctors.map((d) => (
						<option key={d.id} value={d.id}>
							{d.fullName}{" "}
							{(d as any).specialty ? `(${String((d as any).specialty)})` : ""}
						</option>
					))}
				</select>
			</div>

			<div>
				<label
					htmlFor="chair-range-modal-chair-select"
					className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
				>
					Кресло
				</label>
				<select
					id="chair-range-modal-chair-select"
					data-testid="chair-range-modal-chair-select"
					value={rangeChairId || chairs[0]?.id || ""}
					onChange={(e) => setRangeChairId(e.target.value)}
					className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
				>
					{chairs.map((ch) => (
						<option key={ch.id} value={ch.id}>
							{ch.name}{" "}
							{(ch as any).roomNumber ? `(Каб. ${(ch as any).roomNumber})` : ""}
						</option>
					))}
				</select>
			</div>

			<div>
				<label
					htmlFor="chair-range-modal-start-date"
					className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
				>
					С даты
				</label>
				<input
					id="chair-range-modal-start-date"
					data-testid="chair-range-modal-start-date"
					type="date"
					value={rangeStartDate}
					onChange={(e) => setRangeStartDate(e.target.value)}
					className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
				></input>
			</div>

			<div>
				<label
					htmlFor="chair-range-modal-end-date"
					className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
				>
					По дату
				</label>
				<input
					id="chair-range-modal-end-date"
					data-testid="chair-range-modal-end-date"
					type="date"
					value={rangeEndDate}
					onChange={(e) => setRangeEndDate(e.target.value)}
					className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
				></input>
			</div>
		</div>
	);
}
