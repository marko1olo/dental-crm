import React from "react";
import type { Appointment, Dashboard, GeneratedDocument } from "@dental/shared";
import { countLabel, formatTime } from "../../AppHelpers";
import { PatientAvatar } from "../PatientAvatar";
import { AlertTriangle, Clock, Activity, Image as ImageIcon, FileText } from "lucide-react";

interface DoctorDesktopHeaderProps {
	dashboard: Dashboard | null;
	activeAppointment: Appointment | null;
	activePatientName: string | null;
	activePatientPhone: string | null;
	onOpenOdontogram: () => void;
	onOpenInvoice: () => void;
	onOpenImaging: () => void;
}

export function DoctorDesktopHeader({
	dashboard,
	activeAppointment,
	activePatientName,
	activePatientPhone,
	onOpenOdontogram,
	onOpenInvoice,
	onOpenImaging,
}: DoctorDesktopHeaderProps) {
	if (!dashboard) return null;

	const now = Date.now();

	// Найти следующего пациента (подтверждённый приём в будущем)
	const upcomingAppointments = dashboard.appointments.filter(
		(a) =>
			(a.status === "confirmed" || a.status === "planned" || a.status === "arrived") &&
			new Date(a.startsAt).getTime() > now,
	);
	const nextAppointment = upcomingAppointments.sort(
		(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
	)[0];

	// Незавершённые ЭМК (черновики медкарт)
	const unfinishedEmks = dashboard.documents.filter(
		(d) =>
			d.status === "draft" &&
			(d.kind === "outpatient_medical_card_025u" ||
				d.kind === "dental_medical_card_043u"),
	);

	// Вычисляем время до конца приёма, если есть активный приём
	let timeRemainingMinutes: number | null = null;
	let isOvertime = false;
	if (activeAppointment) {
		const endTime = new Date(activeAppointment.endsAt).getTime();
		const diffMinutes = Math.round((endTime - now) / 60000);
		timeRemainingMinutes = Math.abs(diffMinutes);
		isOvertime = diffMinutes < 0;
	}

	const nextPatient = nextAppointment?.patientId
		? dashboard.patients.find((p) => p.id === nextAppointment.patientId)
		: null;

	return (
		<div
			className="doctor-desktop-header"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "16px",
				padding: "16px",
				backgroundColor: "var(--background-alt, #f8f9fa)",
				border: "1px solid var(--border, #e2e8f0)",
				borderRadius: "12px",
				marginBottom: "24px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					flexWrap: "wrap",
					gap: "16px",
				}}
			>
				{/* Текущий приём (Таймер) */}
				<div style={{ flex: "1 1 250px" }}>
					<h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "var(--muted)" }}>
						<Activity size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
						Текущий приём
					</h3>
					{activeAppointment && activePatientName ? (
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
								<PatientAvatar fullName={activePatientName} size={40} />
								<div>
									<strong style={{ display: "block", fontSize: "1.1rem" }}>{activePatientName}</strong>
									<span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
										{activePatientPhone ?? "нет телефона"}
									</span>
								</div>
							</div>
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									padding: "4px 8px",
									backgroundColor: isOvertime ? "var(--destructive-light, #fee2e2)" : "var(--primary-light, #e0f2fe)",
									color: isOvertime ? "var(--destructive, #ef4444)" : "var(--primary, #0ea5e9)",
									borderRadius: "16px",
									fontWeight: "bold",
									fontSize: "0.9rem",
								}}
							>
								<Clock size={16} />
								{isOvertime
									? `Задержка на ${timeRemainingMinutes} мин.`
									: `Осталось ${timeRemainingMinutes} мин.`}
							</div>
						</div>
					) : (
						<div style={{ color: "var(--muted)", fontStyle: "italic" }}>Нет активного приёма</div>
					)}
				</div>

				{/* Следующий пациент */}
				<div style={{ flex: "1 1 250px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
					<h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "var(--muted)" }}>
						Следующий пациент
					</h3>
					{nextAppointment ? (
						<div>
							<strong style={{ display: "block", fontSize: "1rem" }}>
								{nextPatient?.fullName || "Неизвестный пациент"}
							</strong>
							<div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "4px" }}>
								Начало в {formatTime(nextAppointment.startsAt)} · {nextAppointment.reason || "Приём"}
							</div>
						</div>
					) : (
						<div style={{ color: "var(--muted)", fontStyle: "italic" }}>Нет записей на сегодня</div>
					)}
				</div>

				{/* Незавершённые ЭМК */}
				<div style={{ flex: "1 1 200px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
					<h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "var(--muted)" }}>
						Незавершённые ЭМК
					</h3>
					{unfinishedEmks.length > 0 ? (
						<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--warning, #f59e0b)" }}>
							<AlertTriangle size={20} />
							<strong>
								{unfinishedEmks.length}{" "}
								{countLabel(unfinishedEmks.length, "карта", "карты", "карт")}
							</strong>
						</div>
					) : (
						<div style={{ color: "var(--success, #10b981)" }}>Все карты заполнены</div>
					)}
				</div>
			</div>

			{/* Панель быстрых действий (Одонтограмма, Наряд, Снимки) */}
			<div
				style={{
					display: "flex",
					gap: "12px",
					marginTop: "8px",
					paddingTop: "16px",
					borderTop: "1px solid var(--border)",
				}}
			>
				<button
					type="button"
					className="secondary-button"
					onClick={onOpenOdontogram}
					disabled={!activeAppointment}
					style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
				>
					Одонтограмма
				</button>
				<button
					type="button"
					className="secondary-button"
					onClick={onOpenInvoice}
					disabled={!activeAppointment}
					style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
				>
					<FileText size={18} />
					Наряд
				</button>
				<button
					type="button"
					className="secondary-button"
					onClick={onOpenImaging}
					disabled={!activeAppointment}
					style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
				>
					<ImageIcon size={18} />
					Снимки
				</button>
			</div>
		</div>
	);
}
