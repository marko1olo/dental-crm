import type React from "react";
import { MapPin, Sparkles, X } from "lucide-react";
import {
	generateReceptionCheckinQrPayload,
	type PatientAppointment,
	type PatientPersonalCabinetData,
} from "../patientCabinetEngine";

export interface ReceptionQrSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly data: PatientPersonalCabinetData;
	readonly nextAppointment: PatientAppointment | null;
	readonly "data-testid"?: string;
}

export const ReceptionQrSheet: React.FC<ReceptionQrSheetProps> = ({
	isOpen,
	onClose,
	data,
	nextAppointment,
	"data-testid": testId = "reception-qr-modal",
}) => {
	if (!isOpen) return null;

	const qrResult = generateReceptionCheckinQrPayload(data);

	return (
		<div
			className="pc-sheet-overlay"
			data-testid={testId}
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="QR-код для стойки регистрации"
		>
			<div
				className="pc-sheet-window pc-reception-qr-card"
				onClick={(e) => e.stopPropagation()}
				style={{ textAlign: "center" }}
			>
				{/* Top Drag Handle */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--pc-teal, #0d9488)", fontWeight: 800, fontSize: "0.875rem" }}>
						<Sparkles size={18} />
						<span>МАКСИМАЛЬНАЯ ЯРКОСТЬ</span>
					</div>
					<button
						type="button"
						className="pc-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
					<h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "var(--pc-text-main)" }}>
						{data.fullName}
					</h3>
					<div style={{ fontSize: "0.875rem", color: "var(--pc-text-muted)", fontWeight: 600 }}>
						Карта пациента № {data.cardNumber}
					</div>
				</div>

				{/* High-Contrast Pure White & Black QR Matrix */}
				<div
					style={{
						background: "#ffffff",
						padding: "16px",
						borderRadius: "16px",
						border: "3px solid #0f172a",
						boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						margin: "0 auto",
						maxWidth: "240px",
					}}
					dangerouslySetInnerHTML={{
						__html: qrResult.qrCodeSvg,
					}}
				/>

				{nextAppointment && (
					<div
						style={{
							width: "100%",
							background: "var(--pc-surface)",
							border: "1px solid var(--pc-border)",
							borderRadius: "12px",
							padding: "12px 14px",
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							textAlign: "left",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--pc-primary)", textTransform: "uppercase" }}>
								Ближайший прием
							</span>
							<span className="pc-next-visit-time" style={{ color: "var(--pc-primary)" }}>
								{nextAppointment.timeRu}
							</span>
						</div>
						<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--pc-text-main)" }}>
							{nextAppointment.dateIso} &bull; {nextAppointment.titleRu}
						</div>
						<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>
							Врач: <strong>{nextAppointment.doctorName}</strong>
						</div>
						<div className="pc-next-visit-room" style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--pc-primary)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
							<MapPin size={14} />
							<span>{nextAppointment.roomNumber}</span>
						</div>
					</div>
				)}

				<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--pc-text-muted)", lineHeight: 1.4 }}>
					Поднесите экран к сканеру на стойке ресепшена или покажите администратору для мгновенной отметки о прибытии.
				</p>

				<button
					type="button"
					onClick={onClose}
					className="pc-btn-primary"
					style={{
						width: "100%",
						minHeight: "48px",
						fontSize: "1rem",
						fontWeight: 800,
						marginTop: "4px",
					}}
				>
					Готово
				</button>
			</div>
		</div>
	);
};
