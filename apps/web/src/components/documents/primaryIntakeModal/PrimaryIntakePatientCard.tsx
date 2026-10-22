import React from "react";
import type { Patient } from "@dental/shared";
import { ShieldCheck, Sparkles } from "lucide-react";
import { formatShortDate } from "../../../AppHelpers";

interface PrimaryIntakePatientCardProps {
	patient: Patient | null;
	isNormApplied: boolean;
	onFillSomaticNorm: () => void;
	missingCount: number;
	isSignedPep: boolean;
}

export function PrimaryIntakePatientCard({
	patient,
	isNormApplied,
	onFillSomaticNorm,
	missingCount,
	isSignedPep,
}: PrimaryIntakePatientCardProps) {
	if (!patient) {
		return (
			<div className="empty-state-banner">
				Пациент не выбран. Выберите пациента в картотеке для автоматической привязки реквизитов.
			</div>
		);
	}

	return (
		<div className="document-package-patient-card">
			<div>
				<strong>{patient.fullName}</strong>
				<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
					{patient.birthDate ? `Дата рождения: ${formatShortDate(patient.birthDate)} · ` : ""}
					{patient.phone ? `Тел: ${patient.phone}` : "Телефон не указан"}
				</div>
			</div>
			<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
				<button
					type="button"
					className="secondary-button"
					data-testid="fill-somatic-norm-header-btn"
					onClick={onFillSomaticNorm}
					style={{
						fontSize: "12.5px",
						minHeight: "36px",
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						background: isNormApplied ? "var(--success-surface, rgba(16, 185, 129, 0.1))" : "var(--teal-surface, rgba(13, 148, 136, 0.08))",
						borderColor: isNormApplied ? "var(--success-fg, #10b981)" : "var(--teal, #0d9488)",
						color: isNormApplied ? "var(--success-fg, #10b981)" : "var(--teal, #0d9488)",
						fontWeight: 600,
					}}
					title="Заполнить все 10 пунктов соматической анкеты физиологической нормой: аллергий нет, анестетики переносит, гемостаз в норме"
				>
					<Sparkles size={14} aria-hidden="true" />
					<span>{isNormApplied ? "Анкета: соматически здоров (норма)" : "Заполнить анкету: Соматически здоров / норма"}</span>
				</button>
				<span className="document-patient-badge">
					<ShieldCheck size={14} aria-hidden="true" />
					{missingCount === 0 || isSignedPep ? "Пакет полностью укомплектован" : `Не хватает ${missingCount} из 4 документов`}
				</span>
			</div>
		</div>
	);
}
