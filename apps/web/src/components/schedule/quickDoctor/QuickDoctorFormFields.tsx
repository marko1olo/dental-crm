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
	activeChairs: Array<{ id: string; name: string; room?: string | null | undefined; [key: string]: unknown }>;
	defaultDoctorName: string;
}

export function QuickDoctorFormFields({
	fullName, setFullName, specialty, setSpecialty, phone, setPhone,
	preferredChairId, setPreferredChairId, activeChairs, defaultDoctorName,
}: QuickDoctorFormFieldsProps) {
	return (
		<>
			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-name" className="block text-xs font-semibold text-[var(--ink-muted)]">
					ФИО врача *
				</label>
				<input
					id="quick-doctor-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
					placeholder="Например: Иванов Иван Иванович"
					className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all"
					data-testid="quick-doctor-name" autoFocus
				/>
				<p className="text-[11px] text-[var(--ink-muted)]">
					Короткое имя для карточки:{" "}
					<span className="font-semibold text-[var(--ink)]">
						{formatDoctorShortName(fullName.trim() || defaultDoctorName)}
					</span>
				</p>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-specialty" className="block text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span>Специальность *</span>
				</label>
				<select
					id="quick-doctor-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value as DentalSpecialty)}
					className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all cursor-pointer"
					data-testid="quick-doctor-specialty"
				>
					{QUICK_DOCTOR_SPECIALTIES.map((spec) => (
						<option key={spec.id} value={spec.id}>{spec.label}</option>
					))}
				</select>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-phone" className="block text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5">
					<Phone className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span>Телефон (опционально)</span>
				</label>
				<input
					id="quick-doctor-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all"
					data-testid="quick-doctor-phone"
				/>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="quick-doctor-preferred-chair" className="block text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5">
					<DentalChairUnit className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span>Закрепленное кресло</span>
				</label>
				<select
					id="quick-doctor-preferred-chair" value={preferredChairId} onChange={(e) => setPreferredChairId(e.target.value)}
					className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all cursor-pointer"
					data-testid="quick-doctor-preferred-chair"
				>
					<option value="">-- Без закрепления (по выбору) --</option>
					{activeChairs.map((ch) => (
						<option key={ch.id} value={ch.id}>{ch.name} {ch.room ? `(${ch.room})` : ""}</option>
					))}
				</select>
				<p className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
					<Pin className="w-3 h-3 text-[var(--primary)] shrink-0" />
					<span>При выборе этого врача в записи кресло подставится автоматически</span>
				</p>
			</div>
		</>
	);
}
