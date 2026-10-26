import React from "react";
import { Pause, ShieldCheck } from "lucide-react";
import { formatDoctorRole, getDoctorInitials, type DoctorProfile } from "../doctorPrivacyShieldHelpers";

interface PrivacyShieldCardHeaderProps {
	doctor?: DoctorProfile | null | undefined;
}

export function PrivacyShieldCardHeader({ doctor }: PrivacyShieldCardHeaderProps) {
	const doctorDisplayName = doctor?.fullName || doctor?.name || "Врач-стоматолог";
	const doctorInitials = getDoctorInitials(doctorDisplayName);
	const doctorRoleLabel = formatDoctorRole(doctor?.role);

	return (
		<>
			{/* Аватар текущего врача */}
			<div
				style={{
					position: "relative",
					width: "72px",
					height: "72px",
					borderRadius: "50%",
					background: "linear-gradient(135deg, #0d9488 0%, #047857 100%)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "24px",
					fontWeight: 700,
					color: "#ffffff",
					boxShadow: "0 8px 24px rgba(13, 148, 136, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)",
					border: "3px solid rgba(255, 255, 255, 0.2)",
					marginBottom: "12px",
				}}
			>
				{doctorInitials}
				<div
					style={{
						position: "absolute",
						bottom: "-2px",
						right: "-2px",
						width: "22px",
						height: "22px",
						borderRadius: "50%",
						backgroundColor: "#10b981",
						border: "2px solid #0a0f1d",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "#ffffff",
					}}
					title="Врачебная тайна защищена"
				>
					<ShieldCheck size={13} />
				</div>
			</div>

			{/* Имя врача */}
			<h3
				style={{
					fontSize: "17px",
					fontWeight: 600,
					color: "#ffffff",
					margin: "0 0 2px 0",
					textAlign: "center",
					letterSpacing: "-0.01em",
					maxWidth: "280px",
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			>
				{doctorDisplayName}
			</h3>

			{/* Роль врача */}
			<div
				style={{
					fontSize: "12px",
					color: "rgba(255, 255, 255, 0.7)",
					marginBottom: "10px",
					fontWeight: 400,
				}}
			>
				{doctorRoleLabel}
			</div>

			{/* Плашка паузы */}
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					padding: "4px 12px",
					borderRadius: "8px",
					backgroundColor: "rgba(245, 158, 11, 0.15)",
					border: "1px solid rgba(245, 158, 11, 0.35)",
					color: "#fbbf24",
					fontSize: "12px",
					fontWeight: 600,
					marginBottom: "14px",
				}}
			>
				<Pause size={13} className="shrink-0" />
				<span>Приём приостановлен</span>
			</div>

			{/* Описание сохранности данных */}
			<p
				style={{
					fontSize: "11px",
					color: "rgba(255, 255, 255, 0.65)",
					margin: "0 0 18px 0",
					lineHeight: 1.4,
					maxWidth: "280px",
				}}
			>
				Карточка пациента и набранный текст анамнеза сохранены. Введите 4-значный PIN-код для мгновенного возврата к работе.
			</p>
		</>
	);
}
