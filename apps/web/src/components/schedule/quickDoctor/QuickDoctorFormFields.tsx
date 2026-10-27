/**
 * QuickDoctorFormFields.tsx — Core input fields (name, specialty, phone, chair) for QuickAddDoctorModal.
 */

import React from "react";
import { Phone, Pin, Stethoscope } from "lucide-react";
import { DentalChairUnit } from "../../icons/DentalIcons";
import type { DentalSpecialty } from "@dental/shared";
import { QUICK_DOCTOR_SPECIALTIES, formatDoctorShortName } from "./quickDoctorTypes";

interface QuickDoctorFormFieldsProps {
	fullName: string;
	setFullName: (name: string) => void;
	specialty: DentalSpecialty;
	setSpecialty: (spec: DentalSpecialty) => void;
	phone: string;
	setPhone: (phone: string) => void;
	preferredChairId: string;
	setPreferredChairId: (chairId: string) => void;
	activeChairs: Array<{ id: string; name: string; room?: string | null }>;
	defaultDoctorName: string;
}

export function QuickDoctorFormFields({
	fullName, setFullName, specialty, setSpecialty, phone, setPhone,
	preferredChairId, setPreferredChairId, activeChairs, defaultDoctorName,
}: QuickDoctorFormFieldsProps) {
	return (
		<>
			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-name" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
					ФИО врача *
				</label>
				<input
					id="quick-doctor-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
					placeholder="Например: Иванов Иван Иванович"
					className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
					data-testid="quick-doctor-name" style={{ minHeight: "44px" }} autoFocus
				/>
				<p className="text-[11px] text-[var(--muted,#64748b)]">
					Короткое имя для карточки:{" "}
					<span className="font-semibold text-[var(--ink)]">
						{formatDoctorShortName(fullName.trim() || defaultDoctorName)}
					</span>
				</p>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-specialty" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Специальность *</span>
				</label>
				<select
					id="quick-doctor-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value as DentalSpecialty)}
					className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all cursor-pointer"
					data-testid="quick-doctor-specialty" style={{ minHeight: "44px" }}
				>
					{QUICK_DOCTOR_SPECIALTIES.map((spec) => (
						<option key={spec.id} value={spec.id}>{spec.label}</option>
					))}
				</select>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-phone" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Phone className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Телефон (опционально)</span>
				</label>
				<input
					id="quick-doctor-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
					data-testid="quick-doctor-phone" style={{ minHeight: "44px" }}
				/>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-preferred-chair" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<DentalChairUnit className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Закрепленное кресло</span>
				</label>
				<select
					id="quick-doctor-preferred-chair" value={preferredChairId} onChange={(e) => setPreferredChairId(e.target.value)}
					className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all cursor-pointer"
					data-testid="quick-doctor-preferred-chair" style={{ minHeight: "44px" }}
				>
					<option value="">-- Без закрепления (по выбору) --</option>
					{activeChairs.map((ch) => (
						<option key={ch.id} value={ch.id}>{ch.name} {ch.room ? `(${ch.room})` : ""}</option>
					))}
				</select>
				<p className="text-[11px] text-[var(--muted,#64748b)] flex items-center gap-1">
					<Pin className="w-3 h-3 text-[var(--teal)] shrink-0" />
					<span>При выборе этого врача в записи кресло подставится автоматически</span>
				</p>
			</div>
		</>
	);
}
