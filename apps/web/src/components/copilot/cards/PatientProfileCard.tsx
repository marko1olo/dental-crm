import React, { useState, useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  Clock,
  CreditCard,
  FileSignature,
  FileText,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { PatientProfileCardProps } from "./types";
import { formatDateTime, formatMoney } from "../useCopilotFormat";

export const PatientProfileCard: React.FC<PatientProfileCardProps> = ({
	patient,
	onOpenCard,
	onSelectPatient,
	onBookAppointment,
	onSelectPlan,
}) => {
	const handleOpen = onOpenCard || onSelectPatient;

	const initials = useMemo(() => {
		if (!patient.fullName) return "П";
		const parts = patient.fullName.trim().split(/\s+/);
		const first = parts[0] || "П";
		const second = parts[1] || "";
		if (parts.length === 1) return first.slice(0, 2).toUpperCase();
		return (first.charAt(0) + second.charAt(0)).toUpperCase();
	}, [patient.fullName]);

	const rawBalance = useMemo(() => {
		if (
			typeof patient.balanceRub === "number" &&
			Number.isFinite(patient.balanceRub)
		) {
			return patient.balanceRub;
		}
		if (
			typeof patient.depositRub === "number" &&
			Number.isFinite(patient.depositRub)
		) {
			return patient.depositRub;
		}
		if (
			typeof patient.debtRub === "number" &&
			Number.isFinite(patient.debtRub)
		) {
			return -patient.debtRub;
		}
		return 0;
	}, [patient.balanceRub, patient.depositRub, patient.debtRub]);

	const isPositive = rawBalance >= 0;
	const statusLower = (patient.status || "active").toLowerCase();

	const allergiesList = patient.allergies || [];
	const hasAllergies = allergiesList.length > 0;

	return (
		<div
			className="copilot-gen-card copilot-patient-profile-card"
			data-testid="copilot-patient-profile-card"
		>
			{/* Top Identity Block */}
			<div className="copilot-pp-header">
				<div className="copilot-pp-identity">
					<div className="copilot-pp-avatar">{initials}</div>
					<div style={{ minWidth: 0 }}>
						<div className="copilot-pp-name-row">
							<h4 className="copilot-pp-name">{patient.fullName}</h4>
							<span
								className={`copilot-pp-status-badge ${statusLower.includes("vip") ? "vip" : statusLower.includes("active") ? "active" : "primary"}`}
							>
								{patient.status || "Пациент клиники"}
							</span>
						</div>
						<div className="copilot-pp-meta">
							{Boolean(patient.phone) && (
								<span className="copilot-pp-meta-item">
									<Phone size={12} />
									{patient.phone}
								</span>
							)}
							{Boolean(patient.birthDate) && (
								<span className="copilot-pp-meta-item">
									<Calendar size={12} />
									{patient.birthDate}
								</span>
							)}
							{Boolean(patient.cardNumber) && (
								<span className="copilot-pp-meta-item">
									<FileText size={12} />№ {patient.cardNumber}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Financial Metrics Strip */}
			<div className="copilot-pp-finance-strip">
				<div className="copilot-pp-finance-cell">
					<span className="copilot-pp-finance-label">Личный баланс</span>
					<span
						className={`copilot-pp-finance-val ${isPositive ? "positive" : "negative"} tabular-nums`}
					>
						{isPositive
							? `+${formatMoney(rawBalance)}`
							: formatMoney(rawBalance)}
					</span>
				</div>

				{patient.familyBalanceRub !== undefined && (
					<div className="copilot-pp-finance-cell">
						<span className="copilot-pp-finance-label flex items-center gap-1">
							<Users size={11} className="inline" />
							<span>Семейный счёт</span>
						</span>
						<span className="copilot-pp-finance-val tabular-nums">
							{formatMoney(patient.familyBalanceRub)}
						</span>
					</div>
				)}

				{Boolean(patient.activePlanStage) && (
					<div className="copilot-pp-finance-cell">
						<span className="copilot-pp-finance-label">Этап лечения</span>
						<span className="copilot-pp-finance-val text-xs text-[var(--teal-dark)] truncate">
							{patient.activePlanStage}
						</span>
					</div>
				)}
			</div>

			{/* Allergy & Safety Alert */}
			{hasAllergies ? (
				<div className="copilot-pp-allergy-alert danger">
					<ShieldAlert size={15} style={{ flexShrink: 0 }} />
					<span>
						<strong>Аллергический статус:</strong> {allergiesList.join(", ")}
					</span>
				</div>
			) : (
				<div className="copilot-pp-allergy-alert clean">
					<ShieldCheck
						size={14}
						style={{ flexShrink: 0, color: "var(--green, #15803d)" }}
					/>
					<span>Аллергоанамнез не отягощен</span>
				</div>
			)}

			{/* Clinical History & Next Visit */}
			{(patient.lastVisitDate ||
				patient.lastDiagnosis ||
				patient.nextAppointmentDate) && (
				<div className="copilot-pp-history-row">
					{patient.lastVisitDate && (
						<div className="copilot-pp-history-title">
							<Activity size={13} className="text-[var(--teal)]" />
							<span>Последний приём: {patient.lastVisitDate}</span>
							{patient.lastDoctorName && (
								<span className="text-[var(--muted)] font-normal">
									({patient.lastDoctorName})
								</span>
							)}
						</div>
					)}
					{patient.lastDiagnosis && (
						<div className="copilot-pp-history-text">
							Диагноз:{" "}
							<span className="font-semibold text-[var(--ink)]">
								{patient.lastDiagnosis}
							</span>
						</div>
					)}
					{patient.nextAppointmentDate && (
						<div className="copilot-pp-history-text flex items-center gap-1 text-[var(--teal-dark)] font-medium">
							<Clock size={12} />
							<span>Следующий визит: {patient.nextAppointmentDate}</span>
						</div>
					)}
				</div>
			)}

			{/* Action Buttons */}
			<div className="copilot-pp-actions">
				{handleOpen && (
					<button
						type="button"
						onClick={() => handleOpen(patient.id)}
						className="copilot-pp-primary-btn"
						title="Открыть электронную медицинскую карту"
					>
						<User size={15} />
						<span>Открыть карту</span>
						<ArrowRight size={14} />
					</button>
				)}

				{onBookAppointment ? (
					<button
						type="button"
						onClick={() => onBookAppointment(patient.id)}
						className="copilot-pp-secondary-btn"
						title="Записать пациента на приём"
					>
						<Calendar size={14} />
						<span>+ Запись</span>
					</button>
				) : onSelectPlan ? (
					<button
						type="button"
						onClick={() => onSelectPlan(patient.id)}
						className="copilot-pp-secondary-btn"
						title="Перейти к плану лечения"
					>
						<FileText size={14} />
						<span>План лечения</span>
					</button>
				) : null}
			</div>
		</div>
	);
};

// ============================================================================
// 2. ScheduleSlotPickerCard COMPONENT
// ============================================================================

