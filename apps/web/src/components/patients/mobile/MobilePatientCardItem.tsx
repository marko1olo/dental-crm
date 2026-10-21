import type { Patient } from "@dental/shared";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
import React from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { PatientAvatar } from "../../PatientAvatar";
import { calculateAge, extractAllergy, extractSomaticNote, formatAgeRu } from "./patientFormatters";
import type { PatientInsight } from "./types";

export interface MobilePatientCardItemProps {
	readonly patient: Patient;
	readonly isSelected: boolean;
	readonly insight?: PatientInsight | undefined;
	readonly money: (amountRub: number) => string;
	readonly onSelectPatient: (patientId: string) => void;
}

export function MobilePatientCardItem({
	patient,
	isSelected,
	insight,
	money,
	onSelectPatient,
}: MobilePatientCardItemProps) {
	const age = calculateAge(patient.birthDate);
	const allergen = extractAllergy(patient.notes);
	const somatic = extractSomaticNote(patient.notes);
	const debt = insight?.balanceDueRub || (patient.balanceRub < 0 ? -patient.balanceRub : 0);

	const handleClick = () => {
		triggerHaptic("selection");
		onSelectPatient(patient.id);
	};

	const digits = patient.phone?.replace(/\D/g, "") || "";
	const waNumber = digits.startsWith("8") && digits.length === 11 ? `7${digits.slice(1)}` : digits;

	return (
		<div
			className={`mobile-patient-item ${isSelected ? "selected" : ""}`}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleClick();
				}
			}}
			role="button"
			tabIndex={0}
			aria-label={`Пациент: ${patient.fullName}`}
			data-patient-id={patient.id}
			data-testid={`mobile-patient-item-${patient.id}`}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 64px" }}
		>
			<PatientAvatar fullName={patient.fullName} size={34} mode="auto" className="shrink-0" />

			<div className="mobile-patient-info">
				<div className="mobile-patient-name" title={patient.fullName}>{patient.fullName}</div>
				<div className="mobile-patient-sub">
					{age !== null && <span className="mobile-patient-age">{formatAgeRu(age)}</span>}
					{age !== null && patient.phone && <span className="text-[var(--line-strong)]" aria-hidden="true">•</span>}
					{patient.phone ? (
						<span className="mobile-patient-phone">{formatPhoneNumber(patient.phone)}</span>
					) : (
						<span className="text-[var(--muted)] opacity-75">Без телефона</span>
					)}
				</div>
				{somatic && !allergen && <div className="mobile-patient-notes-snippet" title={somatic}>{somatic}</div>}
				{(allergen || debt > 0 || patient.status === "archived") && (
					<div className="mobile-patient-badges-row">
						{allergen && (
							<span className="mobile-patient-allergy-chip" title={`Аллергия: ${allergen}`}>
								<span aria-hidden="true">⚠</span>
								<span>Аллергия: {allergen}</span>
							</span>
						)}
						{debt > 0 && (
							<span className="mobile-patient-debt-chip" title={`Задолженность: ${money(debt)}`}>
								<span aria-hidden="true">⚡</span>
								<span>Долг: {money(debt)}</span>
							</span>
						)}
						{patient.status === "archived" && <span className="mobile-patient-archive-chip">Архив</span>}
					</div>
				)}
			</div>

			<div className="mobile-patient-actions">
				{patient.phone && (
					<>
						<a
							href={`tel:${patient.phone}`}
							className="mobile-patient-call-btn"
							onClick={(e) => { e.stopPropagation(); triggerHaptic("medium"); }}
							aria-label={`Позвонить ${patient.fullName}`}
							title={`Позвонить ${patient.phone}`}
							data-testid={`mobile-call-btn-${patient.id}`}
						>
							<Phone size={16} aria-hidden="true" />
						</a>
						<a
							href={`https://wa.me/${waNumber}`}
							target="_blank"
							rel="noopener noreferrer"
							className="mobile-patient-chat-btn"
							onClick={(e) => { e.stopPropagation(); triggerHaptic("light"); }}
							aria-label={`Чат WhatsApp с ${patient.fullName}`}
							title={`Написать в WhatsApp: ${patient.phone}`}
							data-testid={`mobile-chat-btn-${patient.id}`}
						>
							<MessageCircle size={16} aria-hidden="true" />
						</a>
					</>
				)}
				<div className="mobile-patient-chevron" aria-hidden="true"><ChevronRight size={18} /></div>
			</div>
		</div>
	);
}
