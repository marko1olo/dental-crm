/**
 * PatientSectionSearchDropdown.tsx — Live patient search, selection dropdown, and query conversion.
 */

import React from "react";
import { Search, UserPlus, X } from "lucide-react";
import type { Patient } from "@dental/shared";

interface PatientSectionSearchDropdownProps {
	patientId: string;
	setPatientId: (id: string) => void;
	patientSearchQuery: string;
	setPatientSearchQuery: (q: string) => void;
	allDisplayPatients: Patient[];
	isTechnicalBreak: boolean;
	setNewPatientFullName: (name: string) => void;
	setNewPatientPhone: (phone: string) => void;
	setIsInlineNewPatient: (val: boolean) => void;
}

export function PatientSectionSearchDropdown({
	patientId,
	setPatientId,
	patientSearchQuery,
	setPatientSearchQuery,
	allDisplayPatients,
	isTechnicalBreak,
	setNewPatientFullName,
	setNewPatientPhone,
	setIsInlineNewPatient,
}: PatientSectionSearchDropdownProps) {
	return (
		<div className="space-y-2">
			<div className="dente-search-wrap">
				<Search className="dente-search-icon" />
				<input
					type="text"
					value={patientSearchQuery}
					onChange={(e) => setPatientSearchQuery(e.target.value)}
					placeholder="Поиск по ФИО, телефону или номеру карты…"
					className="dente-search-input"
					data-testid="appointment-patient-search-input"
				/>
				{patientSearchQuery && (
					<button
						type="button"
						onClick={() => setPatientSearchQuery("")}
						className="dente-search-clear"
						title="Очистить поиск"
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>

			<select
				value={patientId}
				onChange={(e) => setPatientId(e.target.value)}
				className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
				data-testid="select-appointment-patient"
			>
				<option value="">-- Выберите пациента из базы ({allDisplayPatients.length}) --</option>
				{allDisplayPatients.map((p) => (
					<option key={p.id} value={p.id}>
						{p.fullName} {p.phone ? `(${p.phone})` : ""}
					</option>
				))}
			</select>

			{patientSearchQuery.trim() && (
				<div className="flex items-center justify-between gap-2 p-2 px-2.5 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal)]/25 text-xs">
					<span className="text-[11px] text-[var(--muted)] truncate">
						{allDisplayPatients.length === 0
							? "Пациент не найден в базе"
							: `Найдено совпадений: ${allDisplayPatients.length}`}
					</span>
					<button
						type="button"
						onClick={() => {
							const q = patientSearchQuery.trim();
							const isPhone = /^[0-9+()-\s]+$/.test(q);
							if (isPhone) {
								setNewPatientPhone(q);
								setNewPatientFullName("");
							} else {
								setNewPatientFullName(q);
								setNewPatientPhone("");
							}
							setIsInlineNewPatient(true);
						}}
						className="text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0 min-h-[36px]"
						data-testid="appointment-quick-create-from-search-btn"
					>
						<UserPlus size={13} />
						<span>+ Создать «{patientSearchQuery.trim()}»</span>
					</button>
				</div>
			)}

			{!patientId && !isTechnicalBreak && !patientSearchQuery.trim() && (
				<span
					className="text-[11px] text-[var(--muted)] block pl-0.5"
					data-testid="appointment-patient-helper"
				>
					Выберите пациента из базы или создайте быстрого пациента (ФИО + телефон)
				</span>
			)}
		</div>
	);
}
